/**
 * Rename Plugin for OpenCode
 *
 * Registers a `session` tool that lets the agent rename the current session.
 * Also injects session-naming guidance into the system prompt.
 *
 * Replaces the fork's packages/opencode/src/tool/session.ts
 */

import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin/tool"

export const id = "rename"

const SESSION_NAMING_GUIDANCE = [
  "# Session Naming",
  "Once you understand the user's task, call the `session` tool early with a short descriptive title (3-7 words).",
  "If the task changes significantly, call `session` again to update the title.",
].join("\n")

export const server: Plugin = async ({ client }) => {
  return {
    tool: {
      session: tool({
        description: [
          "Get or rename the current session.",
          "Call without arguments to get the current session title.",
          "Pass a title to rename the session. Renaming is skipped if the user already set a custom title.",
          "Call this tool early once you understand the user's task.",
          "Use a short, descriptive title (3-7 words). For PRs use '#<number> <title>'.",
        ].join("\n"),
        args: {
          title: tool.schema.string().optional().describe(
            "New session title. Omit to get current title. Use 3-7 words normally; '#<number> <title>' for PRs.",
          ),
        },
        execute: async (args, ctx) => {
          const { data: session } = await client.session.get({ path: { id: ctx.sessionID } })
          if (!args.title) return `Current session title: "${session?.title}"`

          // Skip if user already set a custom title (not a default generated one)
          const isDefault = !session?.title || /^New session/.test(session.title) || /^\d{4}-\d{2}-\d{2}/.test(session.title)
          if (!isDefault) return `Session already has a custom title: "${session?.title}". Rename skipped.`

          await client.session.update({ path: { id: ctx.sessionID }, body: { title: args.title } })
          return `Session renamed to: "${args.title}"`
        },
      }),
    },

    "experimental.chat.system.transform": async (_input, output) => {
      output.system.push(SESSION_NAMING_GUIDANCE)
    },
  }
}
