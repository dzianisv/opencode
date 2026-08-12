import { SessionV2 } from "@opencode-ai/core/session"
import { LocationServiceMap } from "@opencode-ai/core/location-layer"
import { PermissionSaved } from "@opencode-ai/core/permission/saved"
import { PtyTicket } from "@opencode-ai/core/pty/ticket"
import { SessionStore } from "@opencode-ai/core/session/store"
import { SessionProjector } from "@opencode-ai/core/session/projector"
import { EventV2 } from "@opencode-ai/core/event"
import { Database } from "@opencode-ai/core/database/database"
import { ProjectV2 } from "@opencode-ai/core/project"
import { Layer } from "effect"
import { layer as locationLayer } from "./groups/location"
import { sessionLocationLayer } from "./middleware/session-location"
import { MessageHandler } from "./handlers/message"
import { ModelHandler } from "./handlers/model"
import { ProviderHandler } from "./handlers/provider"
import { SessionHandler } from "./handlers/session"
import { PermissionHandler } from "./handlers/permission"
import { FileSystemHandler } from "./handlers/fs"
import { CommandHandler } from "./handlers/command"
import { SkillHandler } from "./handlers/skill"
import { EventHandler } from "./handlers/event"
import { AgentHandler } from "./handlers/agent"
import { HealthHandler } from "./handlers/health"
import { PtyHandler } from "./handlers/pty"
import { QuestionHandler } from "./handlers/question"
import { ReferenceHandler } from "./handlers/reference"
import * as SessionExecutionLocal from "@opencode-ai/core/session/execution/local"
import { LocationHandler } from "./handlers/location"
import { IntegrationHandler } from "./handlers/integration"
import { CredentialHandler } from "./handlers/credential"
import { Credential } from "@opencode-ai/core/credential"
import { ProjectCopyHandler } from "./handlers/project-copy"

export const handlers = Layer.mergeAll(
  HealthHandler,
  LocationHandler,
  AgentHandler,
  SessionHandler,
  MessageHandler,
  ModelHandler,
  ProviderHandler,
  IntegrationHandler,
  CredentialHandler,
  PermissionHandler,
  FileSystemHandler,
  CommandHandler,
  SkillHandler,
  EventHandler,
  PtyHandler,
  QuestionHandler,
  ReferenceHandler,
  ProjectCopyHandler,
).pipe(
  Layer.provide(sessionLocationLayer),
  Layer.provide(locationLayer),
  // NOTE: intentionally NOT `SessionV2.defaultLayer`. That export bakes
  // `SessionExecution.noopLayer` into its own dependency graph (see
  // packages/core/src/session.ts), which permanently resolves the
  // session's SessionExecution.Service requirement to a no-op before this
  // layer is ever built. Providing `SessionExecutionLocal.defaultLayer`
  // from out here (as this file used to, right below) cannot reach past
  // that already-closed-over dependency: Effect's Layer.provide binds a
  // layer's requirement at the point the layer itself is constructed, not
  // at the point it's later merged in. The practical symptom was that
  // POST /session/{id}/prompt admitted durably (200, admittedSeq set) but
  // session.wake()/resume() were silently no-ops, so the agent loop never
  // ran (cost/tokens stayed 0, no assistant message was ever produced).
  // Compose the session layer here instead, swapping in the real local
  // executor, mirroring the (correct) pattern already used by
  // packages/core/src/public/opencode.ts's `SessionsLayer`.
  Layer.provide(
    SessionV2.layer.pipe(
      Layer.provide(SessionExecutionLocal.defaultLayer),
      Layer.provide(SessionStore.defaultLayer),
      Layer.provide(SessionProjector.defaultLayer),
      Layer.provide(EventV2.defaultLayer),
      Layer.provide(Database.defaultLayer),
      Layer.provide(ProjectV2.defaultLayer),
      Layer.orDie,
    ),
  ),
  Layer.provide(PermissionSaved.defaultLayer),
  Layer.provide(PtyTicket.defaultLayer),
  Layer.provide(LocationServiceMap.layer),
  Layer.provide(Credential.defaultLayer),
)
