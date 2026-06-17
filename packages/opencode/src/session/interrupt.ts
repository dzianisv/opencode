import { Context, Effect, Layer, Option, Schema } from "effect"
import { InstanceState } from "@/effect/instance-state"
import { MessageV2 } from "@/session/message-v2"
import * as Session from "@/session/session"
import { MessageID, PartID, SessionID } from "@/session/schema"

export const CANCEL_GRACE_TURNS = 2
export const MAX_REASON_LENGTH = 16_000

export const Intent = Schema.Literals(["steer", "cancel"])
export type Intent = typeof Intent.Type

export const Origin = Schema.Literals(["user", "parent"])
export type Origin = typeof Origin.Type

type Pending = { intent: Intent; reason: string; origin: Origin }
type TerminalRecord = { reason: string }
type State = {
  pending: Map<SessionID, Pending>
  terminal: Map<SessionID, TerminalRecord>
}

export interface Interface {
  readonly request: (input: { sessionID: SessionID; intent: Intent; reason: string; origin: Origin }) => Effect.Effect<void>
  readonly consume: (sessionID: SessionID) => Effect.Effect<Option.Option<Pending>>
  readonly recordTerminal: (input: { sessionID: SessionID; reason: string }) => Effect.Effect<void>
  readonly terminal: (sessionID: SessionID) => Effect.Effect<Option.Option<TerminalRecord>>
  readonly clear: (sessionID: SessionID) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/Interrupt") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const state = yield* InstanceState.make<State>(
      Effect.fn("Interrupt.state")(() =>
        Effect.succeed({
          pending: new Map<SessionID, Pending>(),
          terminal: new Map<SessionID, TerminalRecord>(),
        }),
      ),
    )

    const request: Interface["request"] = Effect.fn("Interrupt.request")(function* (input) {
      const value = yield* InstanceState.get(state)
      const existing = value.pending.get(input.sessionID)
      if (existing?.intent === "cancel" && input.intent === "steer") return
      value.pending.set(input.sessionID, {
        intent: input.intent,
        reason: input.reason.slice(0, MAX_REASON_LENGTH),
        origin: input.origin,
      })
    })

    const consume: Interface["consume"] = Effect.fn("Interrupt.consume")(function* (sessionID) {
      const value = yield* InstanceState.get(state)
      const existing = value.pending.get(sessionID)
      if (!existing) return Option.none()
      value.pending.delete(sessionID)
      return Option.some(existing)
    })

    const recordTerminal: Interface["recordTerminal"] = Effect.fn("Interrupt.recordTerminal")(function* (input) {
      const value = yield* InstanceState.get(state)
      value.terminal.set(input.sessionID, { reason: input.reason.slice(0, MAX_REASON_LENGTH) })
    })

    const terminal: Interface["terminal"] = Effect.fn("Interrupt.terminal")(function* (sessionID) {
      const value = yield* InstanceState.get(state)
      const record = value.terminal.get(sessionID)
      return record ? Option.some(record) : Option.none<TerminalRecord>()
    })

    const clear: Interface["clear"] = Effect.fn("Interrupt.clear")(function* (sessionID) {
      const value = yield* InstanceState.get(state)
      value.pending.delete(sessionID)
      value.terminal.delete(sessionID)
    })

    return Service.of({ request, consume, recordTerminal, terminal, clear })
  }),
)

export const defaultLayer = layer

function escapeReason(reason: string) {
  return reason.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function renderMarker(input: { intent: "steer" | "cancel" | "abort"; origin: Origin; reason?: string }) {
  const verb =
    input.intent === "cancel" ? "Cancelled" : input.intent === "abort" ? "Aborted" : "Steered"
  const suffix = input.reason ? `: ${escapeReason(input.reason)}` : ""
  return `⊘ ${verb} by ${input.origin}${suffix}`
}

export function renderSteer(reason: string) {
  return [
    "<steer>",
    "A course correction from your orchestrator. Adjust your approach accordingly, then continue your task.",
    `<reason>${escapeReason(reason)}</reason>`,
    "</steer>",
  ].join("\n")
}

export function renderCancel(reason: string) {
  return [
    "<cancel>",
    "Your orchestrator is stopping this task. Wrap up now: briefly summarize what you completed and what remains, acknowledging the reason. Do not start new work.",
    `<reason>${escapeReason(reason)}</reason>`,
    "</cancel>",
  ].join("\n")
}

export const abortChild = (
  deps: {
    sessions: Session.Interface
    cancel: (sessionID: SessionID) => Effect.Effect<void>
    interrupt: Interface
  },
  input: { childID: SessionID; origin: Origin; reason?: string },
) =>
  Effect.gen(function* () {
    const reason = input.reason?.slice(0, MAX_REASON_LENGTH)
    const messages = yield* deps.sessions.messages({ sessionID: input.childID }).pipe(Effect.option)
    if (Option.isSome(messages)) {
      const lastUser = messages.value.findLast((item) => item.info.role === "user")
      if (lastUser?.info.role === "user") {
        const msg: MessageV2.User = {
          id: MessageID.ascending(),
          sessionID: input.childID,
          role: "user",
          time: { created: Date.now() },
          agent: lastUser.info.agent,
          model: lastUser.info.model,
        }
        yield* deps.sessions.updateMessage(msg)
        yield* deps.sessions.updatePart({
          id: PartID.ascending(),
          messageID: msg.id,
          sessionID: input.childID,
          type: "text",
          text: renderMarker({ intent: "abort", origin: input.origin, reason }),
          ignored: true,
          metadata: { interrupt: { intent: "abort", origin: input.origin } },
        } satisfies MessageV2.TextPart)
      }
    }
    yield* deps.interrupt.recordTerminal({
      sessionID: input.childID,
      reason: reason ?? `Aborted by ${input.origin}`,
    })
    yield* deps.cancel(input.childID)
  })

export * as Interrupt from "./interrupt"
