import { MessageV2, StreamIdleTimeoutError } from "./message-v2"
import { Log } from "@/util/log"
import { Identifier } from "@/id/id"
import { Session } from "."
import { Agent } from "@/agent/agent"
import { Snapshot } from "@/snapshot"
import { SessionSummary } from "./summary"
import { Bus } from "@/bus"
import { SessionRetry } from "./retry"
import { SessionStatus } from "./status"
import { Plugin } from "@/plugin"
import type { Provider } from "@/provider/provider"
import { LLM } from "./llm"
import { Config } from "@/config/config"
import { SessionCompaction } from "./compaction"
import { PermissionNext } from "@/permission/next"
import { Question } from "@/question"

/**
 * Wraps an async iterable with an idle timeout. If no value is yielded within
 * the timeout period, throws a StreamIdleTimeoutError.
 * 
 * This prevents the streaming loop from hanging indefinitely when:
 * - Network connection drops mid-stream (TCP half-open)
 * - LLM provider stalls without closing the connection
 * - Proxy/gateway timeouts that don't properly terminate the stream
 */
async function* withIdleTimeout<T>(
  stream: AsyncIterable<T>,
  timeoutMs: number,
  abort: AbortSignal
): AsyncGenerator<T> {
  const iterator = stream[Symbol.asyncIterator]()
  
  while (true) {
    abort.throwIfAborted()
    
    let timer: ReturnType<typeof setTimeout> | undefined
    let rejectTimeout: ((error: Error) => void) | undefined
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      rejectTimeout = reject
      timer = setTimeout(() => {
        reject(new StreamIdleTimeoutError(timeoutMs))
      }, timeoutMs)
    })
    
    // Clean up timer when abort signal fires
    const abortHandler = () => {
      if (timer) clearTimeout(timer)
    }
    abort.addEventListener("abort", abortHandler, { once: true })
    
    try {
      const result = await Promise.race([
        iterator.next(),
        timeoutPromise
      ])
      
      // Clear the timer since we got a result
      if (timer) clearTimeout(timer)
      abort.removeEventListener("abort", abortHandler)
      
      if (result.done) return
      yield result.value
    } catch (e) {
      // Clean up on error too
      if (timer) clearTimeout(timer)
      abort.removeEventListener("abort", abortHandler)
      throw e
    }
  }
}

export namespace SessionProcessor {
  const DOOM_LOOP_THRESHOLD = 3
  const FLUSH_INTERVAL = 50
  const STREAM_IDLE_TIMEOUT = 60_000
  const log = Log.create({ service: "session.processor" })

  export type Info = Awaited<ReturnType<typeof create>>
  export type Result = Awaited<ReturnType<Info["process"]>>

  export function create(input: {
    assistantMessage: MessageV2.Assistant
    sessionID: string
    model: Provider.Model
    abort: AbortSignal
  }) {
    const toolcalls: Record<string, MessageV2.ToolPart> = {}
    let snapshot: string | undefined
    let blocked = false
    let attempt = 0
    let needsCompaction = false

    const result = {
      get message() {
        return input.assistantMessage
      },
      partFromToolCall(toolCallID: string) {
        return toolcalls[toolCallID]
      },
      async process(streamInput: LLM.StreamInput) {
        log.info("process")
        needsCompaction = false
        const cfg = await Config.get()
        const idle = cfg.experimental?.stream_idle_timeout ?? STREAM_IDLE_TIMEOUT
        const shouldBreak = cfg.experimental?.continue_loop_on_deny !== true
        while (true) {
          let idleTriggered = false
          let timer: ReturnType<typeof setTimeout> | undefined
          let flushTimer: ReturnType<typeof setTimeout> | undefined
          let flushAllDeltas = () => {}
          try {
            const idleController = new AbortController()
            let currentText: MessageV2.TextPart | undefined
            let reasoningMap: Record<string, MessageV2.ReasoningPart> = {}
            const resetIdle = () => {
              if (!idle) return
              if (timer) clearTimeout(timer)
              timer = setTimeout(() => {
                idleTriggered = true
                idleController.abort()
              }, idle)
            }
            const clearIdle = () => {
              if (!timer) return
              clearTimeout(timer)
            }

            const stream = await LLM.stream({
              ...streamInput,
              abort: AbortSignal.any([streamInput.abort, idleController.signal]),
            })
            resetIdle()
            // Throttled flush state for text/reasoning deltas.
            // ALL text is accumulated in arrays and joined only on flush
            // (at most every FLUSH_INTERVAL ms) to avoid:
            //   1. O(n²) string concatenation on part.text per token
            //   2. Per-token Storage.write + Bus.publish serialization
            const accumulated = new Map<string, { chunks: string[]; flushed: number }>()

            const scheduleFlush = (partID: string, delta: string) => {
              const entry = accumulated.get(partID)
              if (entry) entry.chunks.push(delta)
              else accumulated.set(partID, { chunks: [delta], flushed: 0 })
              if (!flushTimer) {
                flushTimer = setTimeout(flushAllDeltas, FLUSH_INTERVAL)
              }
            }

            flushAllDeltas = () => {
              flushTimer = undefined
              for (const [partID, entry] of accumulated) {
                if (entry.flushed >= entry.chunks.length) continue
                const delta = entry.chunks.slice(entry.flushed).join("")
                entry.flushed = entry.chunks.length
                const text = entry.chunks.join("")

                if (currentText?.id === partID) {
                  currentText.text = text
                  Session.updatePart({ part: currentText, delta })
                  continue
                }
                const reasoning = Object.values(reasoningMap).find((p) => p.id === partID)
                if (reasoning) {
                  reasoning.text = text
                  Session.updatePart({ part: reasoning, delta })
                }
              }
            }

            const finalizePart = (partID: string) => {
              const entry = accumulated.get(partID)
              if (!entry || entry.chunks.length === 0) return
              const text = entry.chunks.join("")
              accumulated.delete(partID)
              return text
            }

            // Wrap the stream with idle timeout to prevent hanging on stalled connections
            const wrappedStream = idle > 0
              ? withIdleTimeout(stream.fullStream, idle, input.abort)
              : stream.fullStream

            for await (const value of wrappedStream) {
              input.abort.throwIfAborted()
              resetIdle()
              switch (value.type) {
                case "start":
                  SessionStatus.set(input.sessionID, { type: "busy" })
                  break

                case "reasoning-start":
                  if (value.id in reasoningMap) {
                    continue
                  }
                  const reasoningPart = {
                    id: Identifier.ascending("part"),
                    messageID: input.assistantMessage.id,
                    sessionID: input.assistantMessage.sessionID,
                    type: "reasoning" as const,
                    text: "",
                    time: {
                      start: Date.now(),
                    },
                    metadata: value.providerMetadata,
                  }
                  reasoningMap[value.id] = reasoningPart
                  await Session.updatePart(reasoningPart)
                  break

                case "reasoning-delta":
                  if (value.id in reasoningMap) {
                    const part = reasoningMap[value.id]
                    if (value.providerMetadata) part.metadata = value.providerMetadata
                    scheduleFlush(part.id, value.text)
                  }
                  break

                case "reasoning-end":
                  if (value.id in reasoningMap) {
                    const part = reasoningMap[value.id]
                    const text = finalizePart(part.id)
                    if (text) part.text = text
                    part.text = part.text.trimEnd()

                    part.time = {
                      ...part.time,
                      end: Date.now(),
                    }
                    if (value.providerMetadata) part.metadata = value.providerMetadata
                    await Session.updatePart(part)
                    delete reasoningMap[value.id]
                  }
                  break

                case "tool-input-start":
                  const part = await Session.updatePart({
                    id: toolcalls[value.id]?.id ?? Identifier.ascending("part"),
                    messageID: input.assistantMessage.id,
                    sessionID: input.assistantMessage.sessionID,
                    type: "tool",
                    tool: value.toolName,
                    callID: value.id,
                    state: {
                      status: "pending",
                      input: {},
                      raw: "",
                    },
                  })
                  toolcalls[value.id] = part as MessageV2.ToolPart
                  break

                case "tool-input-delta":
                  break

                case "tool-input-end":
                  break

                case "tool-call": {
                  const match = toolcalls[value.toolCallId]
                  if (match) {
                    const part = await Session.updatePart({
                      ...match,
                      tool: value.toolName,
                      state: {
                        status: "running",
                        input: value.input,
                        time: {
                          start: Date.now(),
                        },
                      },
                      metadata: value.providerMetadata,
                    })
                    toolcalls[value.toolCallId] = part as MessageV2.ToolPart

                    const parts = await MessageV2.parts(input.assistantMessage.id)
                    const lastThree = parts.slice(-DOOM_LOOP_THRESHOLD)

                    if (
                      lastThree.length === DOOM_LOOP_THRESHOLD &&
                      lastThree.every(
                        (p: MessageV2.Part) =>
                          p.type === "tool" &&
                          p.tool === value.toolName &&
                          p.state.status !== "pending" &&
                          JSON.stringify(p.state.input) === JSON.stringify(value.input),
                      )
                    ) {
                      const agent = await Agent.get(input.assistantMessage.agent)
                      await PermissionNext.ask({
                        permission: "doom_loop",
                        patterns: [value.toolName],
                        sessionID: input.assistantMessage.sessionID,
                        metadata: {
                          tool: value.toolName,
                          input: value.input,
                        },
                        always: [value.toolName],
                        ruleset: agent.permission,
                      })
                    }
                  }
                  break
                }
                case "tool-result": {
                  const match = toolcalls[value.toolCallId]
                  if (match && match.state.status === "running") {
                    await Session.updatePart({
                      ...match,
                      state: {
                        status: "completed",
                        input: value.input ?? match.state.input,
                        output: value.output.output,
                        metadata: value.output.metadata,
                        title: value.output.title,
                        time: {
                          start: match.state.time.start,
                          end: Date.now(),
                        },
                        attachments: value.output.attachments,
                      },
                    })

                    delete toolcalls[value.toolCallId]
                  }
                  break
                }

                case "tool-error": {
                  const match = toolcalls[value.toolCallId]
                  if (match && match.state.status === "running") {
                    await Session.updatePart({
                      ...match,
                      state: {
                        status: "error",
                        input: value.input ?? match.state.input,
                        error: (value.error as any).toString(),
                        time: {
                          start: match.state.time.start,
                          end: Date.now(),
                        },
                      },
                    })

                    if (
                      value.error instanceof PermissionNext.RejectedError ||
                      value.error instanceof Question.RejectedError
                    ) {
                      blocked = shouldBreak
                    }
                    delete toolcalls[value.toolCallId]
                  }
                  break
                }
                case "error":
                  throw value.error

                case "start-step":
                  snapshot = await Snapshot.track()
                  await Session.updatePart({
                    id: Identifier.ascending("part"),
                    messageID: input.assistantMessage.id,
                    sessionID: input.sessionID,
                    snapshot,
                    type: "step-start",
                  })
                  break

                case "finish-step":
                  const usage = Session.getUsage({
                    model: input.model,
                    usage: value.usage,
                    metadata: value.providerMetadata,
                  })
                  input.assistantMessage.finish = value.finishReason
                  input.assistantMessage.cost += usage.cost
                  input.assistantMessage.tokens = usage.tokens
                  await Session.updatePart({
                    id: Identifier.ascending("part"),
                    reason: value.finishReason,
                    snapshot: await Snapshot.track(),
                    messageID: input.assistantMessage.id,
                    sessionID: input.assistantMessage.sessionID,
                    type: "step-finish",
                    tokens: usage.tokens,
                    cost: usage.cost,
                  })
                  await Session.updateMessage(input.assistantMessage)
                  if (snapshot) {
                    const patch = await Snapshot.patch(snapshot)
                    if (patch.files.length) {
                      await Session.updatePart({
                        id: Identifier.ascending("part"),
                        messageID: input.assistantMessage.id,
                        sessionID: input.sessionID,
                        type: "patch",
                        hash: patch.hash,
                        files: patch.files,
                      })
                    }
                    snapshot = undefined
                  }
                  SessionSummary.summarize({
                    sessionID: input.sessionID,
                    messageID: input.assistantMessage.parentID,
                  })
                  if (await SessionCompaction.isOverflow({ tokens: usage.tokens, model: input.model })) {
                    needsCompaction = true
                  }
                  break

                case "text-start":
                  currentText = {
                    id: Identifier.ascending("part"),
                    messageID: input.assistantMessage.id,
                    sessionID: input.assistantMessage.sessionID,
                    type: "text",
                    text: "",
                    time: {
                      start: Date.now(),
                    },
                    metadata: value.providerMetadata,
                  }
                  await Session.updatePart(currentText)
                  break

                case "text-delta":
                  if (currentText) {
                    if (value.providerMetadata) currentText.metadata = value.providerMetadata
                    scheduleFlush(currentText.id, value.text)
                  }
                  break

                case "text-end":
                  if (currentText) {
                    const text = finalizePart(currentText.id)
                    if (text) currentText.text = text
                    currentText.text = currentText.text.trimEnd()
                    const textOutput = await Plugin.trigger(
                      "experimental.text.complete",
                      {
                        sessionID: input.sessionID,
                        messageID: input.assistantMessage.id,
                        partID: currentText.id,
                      },
                      { text: currentText.text },
                    )
                    currentText.text = textOutput.text
                    currentText.time = {
                      start: Date.now(),
                      end: Date.now(),
                    }
                    if (value.providerMetadata) currentText.metadata = value.providerMetadata
                    await Session.updatePart(currentText)
                  }
                  currentText = undefined
                  break

                case "finish":
                  break

                default:
                  log.info("unhandled", {
                    ...value,
                  })
                  continue
              }
              if (needsCompaction) break
            }
            // Flush any remaining throttled deltas before exiting
            if (flushTimer) clearTimeout(flushTimer)
            flushAllDeltas()
            clearIdle()
          } catch (e: any) {
            if (flushTimer) clearTimeout(flushTimer)
            flushAllDeltas()
            if (timer) clearTimeout(timer)
            log.error("process", {
              error: e,
              stack: JSON.stringify(e.stack),
            })
            const error = idleTriggered
              ? new MessageV2.APIError(
                  {
                    message: `Stream idle timeout after ${idle}ms`,
                    isRetryable: true,
                    metadata: {
                      reason: "stream_idle_timeout",
                    },
                  },
                  { cause: e },
                ).toObject()
              : MessageV2.fromError(e, { providerID: input.model.providerID })
            if (MessageV2.ContextOverflowError.isInstance(error)) {
              // TODO: Handle context overflow error
            }
            const retry = SessionRetry.retryable(error)
            if (retry !== undefined) {
              attempt++
              const delay = SessionRetry.delay(attempt, error.name === "APIError" ? error : undefined)
              SessionStatus.set(input.sessionID, {
                type: "retry",
                attempt,
                message: retry,
                next: Date.now() + delay,
              })
              await SessionRetry.sleep(delay, input.abort).catch(() => {})
              continue
            }
            input.assistantMessage.error = error
            Bus.publish(Session.Event.Error, {
              sessionID: input.assistantMessage.sessionID,
              error: input.assistantMessage.error,
            })
            SessionStatus.set(input.sessionID, { type: "idle" })
          }
          if (snapshot) {
            const patch = await Snapshot.patch(snapshot)
            if (patch.files.length) {
              await Session.updatePart({
                id: Identifier.ascending("part"),
                messageID: input.assistantMessage.id,
                sessionID: input.sessionID,
                type: "patch",
                hash: patch.hash,
                files: patch.files,
              })
            }
            snapshot = undefined
          }
          const p = await MessageV2.parts(input.assistantMessage.id)
          for (const part of p) {
            if (part.type === "tool" && part.state.status !== "completed" && part.state.status !== "error") {
              await Session.updatePart({
                ...part,
                state: {
                  ...part.state,
                  status: "error",
                  error: "Tool execution aborted",
                  time: {
                    start: Date.now(),
                    end: Date.now(),
                  },
                },
              })
            }
          }
          input.assistantMessage.time.completed = Date.now()
          await Session.updateMessage(input.assistantMessage)
          if (needsCompaction) return "compact"
          if (blocked) return "stop"
          if (input.assistantMessage.error) return "stop"
          return "continue"
        }
      },
    }
    return result
  }
}
