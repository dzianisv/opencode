import { Flag } from "@opencode-ai/core/flag/flag"
import { Effect } from "effect"
import { effectCmd } from "../effect-cmd"
import { resolveNetworkOptions, withNetworkOptions } from "../network"

export const ServeCommand = effectCmd({
  command: "serve",
  builder: (yargs) => withNetworkOptions(yargs),
  describe: "starts a headless opencode server",
  // Server loads instances per-request via x-opencode-directory header — no
  // need for an ambient project InstanceContext at startup.
  instance: false,
  handler: Effect.fn("Cli.serve")(function* (args) {
    const { Server } = yield* Effect.promise(() => import("../../server/server"))
    const { autoresume } = yield* Effect.promise(() => import("./serve-autoresume"))
    if (!Flag.OPENCODE_SERVER_PASSWORD) {
      console.log("Warning: OPENCODE_SERVER_PASSWORD is not set; server is unsecured.")
    }
    const opts = yield* resolveNetworkOptions(args)
    const server = yield* Effect.promise(() => Server.listen(opts))
    console.log(`opencode server listening on http://${server.hostname}:${server.port}`)

    yield* Effect.scoped(
      Effect.gen(function* () {
        yield* autoresume().pipe(
          Effect.catchCause((cause) => Effect.logWarning("auto resume process failed", { cause })),
          Effect.forkScoped,
          Effect.asVoid,
        )
        yield* Effect.never
      }),
    )
  }),
})
