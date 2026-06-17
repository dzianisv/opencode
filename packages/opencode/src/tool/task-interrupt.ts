import { Agent } from "@/agent/agent"
import { Permission } from "@/permission"
import { Interrupt } from "@/session/interrupt"
import { SessionID } from "@/session/schema"
import { Session } from "@/session/session"
import { SessionRunState } from "@/session/run-state"
import { SessionStatus } from "@/session/status"
import { Effect, Option, Schema } from "effect"
import CANCEL_DESCRIPTION from "./task-cancel.txt"
import ABORT_DESCRIPTION from "./task-abort.txt"
import STEER_DESCRIPTION from "./task-steer.txt"
import * as Tool from "./tool"

const SteerParameters = Schema.Struct({
  task_id: Schema.String.annotate({ description: "task_id of subagent you spawned" }),
  reason: Schema.String.annotate({ description: "Short course-correction for subagent" }),
})

const CancelParameters = Schema.Struct({
  task_id: Schema.String.annotate({ description: "task_id of subagent you spawned" }),
  reason: Schema.String.annotate({ description: "Why subagent should stop" }),
})

const AbortParameters = Schema.Struct({
  task_id: Schema.String.annotate({ description: "task_id of subagent you spawned" }),
  reason: Schema.optional(Schema.String).annotate({ description: "Optional abort reason" }),
})

const resolveChild = (
  sessions: Session.Interface,
  status: SessionStatus.Interface,
  taskId: string,
  callerSessionID: SessionID,
) =>
  Effect.gen(function* () {
    const childID = SessionID.make(taskId)
    const child = yield* sessions.get(childID).pipe(Effect.option)
    if (Option.isNone(child) || child.value.parentID !== callerSessionID) return { kind: "not_found" as const }
    const running = (yield* status.get(childID)).type === "busy"
    return { kind: "resolved" as const, childID, running }
  })

const authorize = (
  permission: Permission.Interface,
  agents: Agent.Interface,
  ctx: Tool.Context,
  pattern: "task_steer" | "task_cancel" | "task_abort",
  taskID: string,
) =>
  Effect.gen(function* () {
    const agent = yield* agents.get(ctx.agent)
    if (!agent) return
    yield* permission.ask({
      permission: "interrupt",
      patterns: [pattern],
      sessionID: ctx.sessionID,
      metadata: { task_id: taskID },
      always: [pattern],
      ruleset: agent.permission,
    })
  })

export const TaskSteerTool = Tool.define(
  "task_steer",
  Effect.gen(function* () {
    const interrupt = yield* Interrupt.Service
    const sessions = yield* Session.Service
    const status = yield* SessionStatus.Service
    const permission = yield* Permission.Service
    const agents = yield* Agent.Service
    const run = Effect.fn("TaskSteerTool.execute")(function* (
      params: Schema.Schema.Type<typeof SteerParameters>,
      ctx: Tool.Context,
    ) {
      const resolved = yield* resolveChild(sessions, status, params.task_id, ctx.sessionID)
      if (resolved.kind === "not_found") {
        return {
          title: "Steer: not found",
          metadata: { task_id: params.task_id, state: "not_found" },
          output: `task_id ${params.task_id} is not a child of this session`,
        }
      }
      if (!resolved.running) {
        return {
          title: "Steer: already finished",
          metadata: { task_id: params.task_id, state: "already_finished" },
          output: `Subagent ${params.task_id} has already finished; nothing to steer.`,
        }
      }
      yield* authorize(permission, agents, ctx, "task_steer", params.task_id)
      yield* interrupt.request({
        sessionID: resolved.childID,
        intent: "steer",
        reason: params.reason,
        origin: "parent",
      })
      return {
        title: "Steered subagent",
        metadata: { task_id: params.task_id, state: "delivered" },
        output: "Steer delivered; subagent will adapt at next turn boundary.",
      }
    })
    return {
      description: STEER_DESCRIPTION,
      parameters: SteerParameters,
      execute: (params: Schema.Schema.Type<typeof SteerParameters>, ctx) => run(params, ctx).pipe(Effect.orDie),
    }
  }),
)

export const TaskCancelTool = Tool.define(
  "task_cancel",
  Effect.gen(function* () {
    const interrupt = yield* Interrupt.Service
    const sessions = yield* Session.Service
    const status = yield* SessionStatus.Service
    const permission = yield* Permission.Service
    const agents = yield* Agent.Service
    const run = Effect.fn("TaskCancelTool.execute")(function* (
      params: Schema.Schema.Type<typeof CancelParameters>,
      ctx: Tool.Context,
    ) {
      const resolved = yield* resolveChild(sessions, status, params.task_id, ctx.sessionID)
      if (resolved.kind === "not_found") {
        return {
          title: "Cancel: not found",
          metadata: { task_id: params.task_id, state: "not_found" },
          output: `task_id ${params.task_id} is not a child of this session`,
        }
      }
      if (!resolved.running) {
        return {
          title: "Cancel: already finished",
          metadata: { task_id: params.task_id, state: "already_finished" },
          output: `Subagent ${params.task_id} has already finished; nothing to cancel.`,
        }
      }
      yield* authorize(permission, agents, ctx, "task_cancel", params.task_id)
      yield* interrupt.request({
        sessionID: resolved.childID,
        intent: "cancel",
        reason: params.reason,
        origin: "parent",
      })
      return {
        title: "Cancelling subagent",
        metadata: { task_id: params.task_id, state: "delivered" },
        output: "Cancel delivered; subagent will wrap up and stop.",
      }
    })
    return {
      description: CANCEL_DESCRIPTION,
      parameters: CancelParameters,
      execute: (params: Schema.Schema.Type<typeof CancelParameters>, ctx) => run(params, ctx).pipe(Effect.orDie),
    }
  }),
)

export const TaskAbortTool = Tool.define(
  "task_abort",
  Effect.gen(function* () {
    const interrupt = yield* Interrupt.Service
    const sessions = yield* Session.Service
    const status = yield* SessionStatus.Service
    const runState = yield* SessionRunState.Service
    const permission = yield* Permission.Service
    const agents = yield* Agent.Service
    const run = Effect.fn("TaskAbortTool.execute")(function* (
      params: Schema.Schema.Type<typeof AbortParameters>,
      ctx: Tool.Context,
    ) {
      const resolved = yield* resolveChild(sessions, status, params.task_id, ctx.sessionID)
      if (resolved.kind === "not_found") {
        return {
          title: "Abort: not found",
          metadata: { task_id: params.task_id, state: "not_found" },
          output: `task_id ${params.task_id} is not a child of this session`,
        }
      }
      if (!resolved.running) {
        return {
          title: "Abort: already finished",
          metadata: { task_id: params.task_id, state: "already_finished" },
          output: `Subagent ${params.task_id} has already finished.`,
        }
      }
      yield* authorize(permission, agents, ctx, "task_abort", params.task_id)
      yield* Interrupt.abortChild(
        { sessions, cancel: runState.cancel, interrupt },
        { childID: resolved.childID, origin: "parent", reason: params.reason },
      )
      return {
        title: "Aborted subagent",
        metadata: { task_id: params.task_id, state: "aborted" },
        output: `Aborted subagent ${params.task_id}.`,
      }
    })
    return {
      description: ABORT_DESCRIPTION,
      parameters: AbortParameters,
      execute: (params: Schema.Schema.Type<typeof AbortParameters>, ctx) => run(params, ctx).pipe(Effect.orDie),
    }
  }),
)
