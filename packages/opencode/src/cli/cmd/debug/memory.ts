import { EOL } from "os"
import { Memory } from "@/diagnostic/memory"
import { cmd } from "../cmd"

export const MemoryCommand = cmd({
  command: "memory",
  describe: "show memory diagnostics and optionally write a snapshot",
  builder: (yargs) =>
    yargs
      .option("children", {
        type: "boolean",
        default: false,
        describe: "include process-tree memory",
      })
      .option("snapshot", {
        type: "boolean",
        default: false,
        describe: "write memory snapshot artifacts",
      }),
  async handler(args) {
    const sample = await Memory.sample({ children: args.children })
    process.stdout.write(JSON.stringify(sample, null, 2) + EOL)
    if (!args.snapshot) return
    const dir = await Memory.snapshot({ reason: "manual", sample })
    process.stderr.write(`memory snapshot: ${dir}` + EOL)
  },
})
