import z from "zod"
import { createReadStream } from "fs"
import { open, readdir, stat as fsStat } from "fs/promises"
import * as path from "path"
import { createInterface } from "readline"
import { Tool } from "./tool"
import { AppFileSystem } from "../filesystem"
import { LSP } from "../lsp"
import { FileTime } from "../file/time"
import DESCRIPTION from "./read.txt"
import { Instance } from "../project/instance"
import { assertExternalDirectory } from "./external-directory"
import { Instruction } from "../session/instruction"
import { Filesystem } from "../util/filesystem"

const DEFAULT_READ_LIMIT = 2000
const MAX_LINE_LENGTH = 2000
const MAX_LINE_SUFFIX = `... (line truncated to ${MAX_LINE_LENGTH} chars)`
const MAX_BYTES = 50 * 1024
const MAX_BYTES_LABEL = `${MAX_BYTES / 1024} KB`

export const ReadTool = Tool.define("read", {
  description: DESCRIPTION,
  parameters: z.object({
    filePath: z.string().describe("The absolute path to the file or directory to read"),
    offset: z.coerce.number().describe("The line number to start reading from (1-indexed)").optional(),
    limit: z.coerce.number().describe("The maximum number of lines to read (defaults to 2000)").optional(),
  }),
  async execute(params, ctx) {
    if (params.offset !== undefined && params.offset < 1) {
      throw new Error("offset must be greater than or equal to 1")
    }

    let filepath = params.filePath
    if (!path.isAbsolute(filepath)) {
      filepath = path.resolve(Instance.directory, filepath)
    }
    if (process.platform === "win32") {
      filepath = AppFileSystem.normalizePath(filepath)
    }
    const title = path.relative(Instance.worktree, filepath)
    const stat = Filesystem.stat(filepath)

    await assertExternalDirectory(ctx, filepath, {
      bypass: Boolean(ctx.extra?.["bypassCwdCheck"]),
      kind: stat?.isDirectory() ? "directory" : "file",
    })

    await ctx.ask({
      permission: "read",
      patterns: [filepath],
      always: ["*"],
      metadata: {},
    })

    if (!stat) {
      const dir = path.dirname(filepath)
      const base = path.basename(filepath)
      const suggestions = await readdir(dir)
        .then((entries) =>
          entries
            .filter(
              (entry) =>
                entry.toLowerCase().includes(base.toLowerCase()) || base.toLowerCase().includes(entry.toLowerCase()),
            )
            .map((entry) => path.join(dir, entry))
            .slice(0, 3),
        )
        .catch(() => [])
      if (suggestions.length > 0) {
        throw new Error(`File not found: ${filepath}\n\nDid you mean one of these?\n${suggestions.join("\n")}`)
      }
      throw new Error(`File not found: ${filepath}`)
    }

    if (stat.isDirectory()) {
      const dirents = await readdir(filepath, { withFileTypes: true })
      const entries = await Promise.all(
        dirents.map(async (dirent) => {
          if (dirent.isDirectory()) return dirent.name + "/"
          if (dirent.isSymbolicLink()) {
            const target = await fsStat(path.join(filepath, dirent.name)).catch(() => undefined)
            if (target?.isDirectory()) return dirent.name + "/"
          }
          return dirent.name
        }),
      )
      entries.sort((a, b) => a.localeCompare(b))

      const limit = params.limit ?? DEFAULT_READ_LIMIT
      const offset = params.offset ?? 1
      const start = offset - 1
      const sliced = entries.slice(start, start + limit)
      const truncated = start + sliced.length < entries.length

      return {
        title,
        output: [
          `<path>${filepath}</path>`,
          `<type>directory</type>`,
          `<entries>`,
          sliced.join("\n"),
          truncated
            ? `\n(Showing ${sliced.length} of ${entries.length} entries. Use 'offset' parameter to read beyond entry ${offset + sliced.length})`
            : `\n(${entries.length} entries)`,
          `</entries>`,
        ].join("\n"),
        metadata: {
          preview: sliced.slice(0, 20).join("\n"),
          truncated,
          loaded: [] as string[],
        },
      }
    }

    const loaded = await Instruction.resolve(ctx.messages, filepath, ctx.messageID)

    const mime = AppFileSystem.mimeType(filepath)
    const isImage = mime.startsWith("image/") && mime !== "image/svg+xml" && mime !== "image/vnd.fastbidsheet"
    const isPdf = mime === "application/pdf"
    if (isImage || isPdf) {
      const msg = `${isImage ? "Image" : "PDF"} read successfully`
      return {
        title,
        output: msg,
        metadata: {
          preview: msg,
          truncated: false,
          loaded: loaded.map((item) => item.filepath),
        },
        attachments: [
          {
            type: "file" as const,
            mime,
            url: `data:${mime};base64,${Buffer.from(await Filesystem.readBytes(filepath)).toString("base64")}`,
          },
        ],
      }
    }

    if (await isBinaryFile(filepath, Number(stat.size))) {
      throw new Error(`Cannot read binary file: ${filepath}`)
    }

    const file = await lines(filepath, { limit: params.limit ?? DEFAULT_READ_LIMIT, offset: params.offset ?? 1 })
    if (file.count < file.offset && !(file.count === 0 && file.offset === 1)) {
      throw new Error(`Offset ${file.offset} is out of range for this file (${file.count} lines)`)
    }

    let output = [`<path>${filepath}</path>`, `<type>file</type>`, "<content>" + "\n"].join("\n")
    output += file.raw.map((line, i) => `${i + file.offset}: ${line}`).join("\n")

    const last = file.offset + file.raw.length - 1
    const next = last + 1
    const truncated = file.more || file.cut
    if (file.cut) {
      output += `\n\n(Output capped at ${MAX_BYTES_LABEL}. Showing lines ${file.offset}-${last}. Use offset=${next} to continue.)`
    } else if (file.more) {
      output += `\n\n(Showing lines ${file.offset}-${last} of ${file.count}. Use offset=${next} to continue.)`
    } else {
      output += `\n\n(End of file - total ${file.count} lines)`
    }
    output += "\n</content>"

    void LSP.touchFile(filepath, false).catch(() => {})
    await FileTime.read(ctx.sessionID, filepath)

    if (loaded.length > 0) {
      output += `\n\n<system-reminder>\n${loaded.map((item) => item.content).join("\n\n")}\n</system-reminder>`
    }

    return {
      title,
      output,
      metadata: {
        preview: file.raw.slice(0, 20).join("\n"),
        truncated,
        loaded: loaded.map((item) => item.filepath),
      },
    }
  },
})

async function lines(filepath: string, opts: { limit: number; offset: number }) {
  const stream = createReadStream(filepath, { encoding: "utf8" })
  const rl = createInterface({
    input: stream,
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in file as a single line break.
    crlfDelay: Infinity,
  })

  const start = opts.offset - 1
  const raw: string[] = []
  let bytes = 0
  let count = 0
  let cut = false
  let more = false
  try {
    for await (const text of rl) {
      count += 1
      if (count <= start) continue

      if (raw.length >= opts.limit) {
        more = true
        continue
      }

      const line = text.length > MAX_LINE_LENGTH ? text.substring(0, MAX_LINE_LENGTH) + MAX_LINE_SUFFIX : text
      const size = Buffer.byteLength(line, "utf-8") + (raw.length > 0 ? 1 : 0)
      if (bytes + size > MAX_BYTES) {
        cut = true
        more = true
        break
      }

      raw.push(line)
      bytes += size
    }
  } finally {
    rl.close()
    stream.destroy()
  }

  return { raw, count, cut, more, offset: opts.offset }
}

async function isBinaryFile(filepath: string, fileSize: number): Promise<boolean> {
  const ext = path.extname(filepath).toLowerCase()
  // binary check for common non-text extensions
  switch (ext) {
    case ".zip":
    case ".tar":
    case ".gz":
    case ".exe":
    case ".dll":
    case ".so":
    case ".class":
    case ".jar":
    case ".war":
    case ".7z":
    case ".doc":
    case ".docx":
    case ".xls":
    case ".xlsx":
    case ".ppt":
    case ".pptx":
    case ".odt":
    case ".ods":
    case ".odp":
    case ".bin":
    case ".dat":
    case ".obj":
    case ".o":
    case ".a":
    case ".lib":
    case ".wasm":
    case ".pyc":
    case ".pyo":
      return true
    default:
      break
  }

  if (fileSize === 0) return false

  const fh = await open(filepath, "r")
  try {
    const sampleSize = Math.min(4096, fileSize)
    const bytes = Buffer.alloc(sampleSize)
    const result = await fh.read(bytes, 0, sampleSize, 0)
    if (result.bytesRead === 0) return false

    let nonPrintableCount = 0
    for (let i = 0; i < result.bytesRead; i++) {
      if (bytes[i] === 0) return true
      if (bytes[i] < 9 || (bytes[i] > 13 && bytes[i] < 32)) {
        nonPrintableCount++
      }
    }
    // If >30% non-printable characters, consider it binary
    return nonPrintableCount / result.bytesRead > 0.3
  } finally {
    await fh.close()
  }
}
