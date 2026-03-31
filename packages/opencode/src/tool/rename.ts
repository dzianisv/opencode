import z from "zod"
import { Tool } from "./tool"
import { Session } from "../session"

export const RenameTool = Tool.define("rename", {
  description: [
    "Rename the current session to reflect what you are working on.",
    "Call this tool early in the conversation once you understand the user's task.",
    "Use a short, descriptive title (3-7 words) that summarizes the task.",
    "When a pull request is created or updated, use the exact PR title format: '#<number> <title>'.",
    "Examples: 'Fix auth token refresh', 'Add dark mode toggle', 'Refactor database queries'",
    "PR example: '#524 fix: harden tenant bootstrap config seeding'",
  ].join("\n"),
  parameters: z.object({
    title: z
      .string()
      .describe("Session title. Use 3-7 words normally; use exact '#<number> <title>' format for PR sessions."),
  }),
  async execute(params, ctx) {
    await Session.setTitle({ sessionID: ctx.sessionID, title: params.title })
    return {
      title: params.title,
      output: `Session renamed to: "${params.title}"`,
      metadata: {},
    }
  },
})
