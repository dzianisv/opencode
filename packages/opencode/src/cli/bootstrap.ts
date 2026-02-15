import { InstanceBootstrap } from "../project/bootstrap"
import { Instance } from "../project/instance"
import { UI } from "./ui"
import path from "path"
import { Vcs } from "../project/vcs"
import { Bus } from "../bus"

export async function bootstrap<T>(directory: string, cb: () => Promise<T>) {
  return Instance.provide({
    directory,
    init: InstanceBootstrap,
    fn: async () => {
      const initTitle = async () => {
        const base = path.basename(Instance.directory)
        const branch = await Vcs.branch()
        UI.setTitle(`opencode::${base}::${branch ?? "nogit"}`)
        const unsub = Bus.subscribe(Vcs.Event.BranchUpdated, (event) => {
          const next = event.properties.branch
          UI.setTitle(`opencode::${base}::${next ?? "nogit"}`)
        })
        Bus.once(Bus.InstanceDisposed, () => {
          UI.setTitle("opencode")
          return "done"
        })
        return unsub
      }

      const unsub = process.stdout.isTTY ? await initTitle() : undefined
      try {
        const result = await cb()
        return result
      } finally {
        unsub?.()
        await Instance.dispose()
      }
    },
  })
}
