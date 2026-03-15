import z from "zod"
import { Tool } from "./tool"
import { Session } from "../session"

export const RenameTool = Tool.define("rename", {
  description: [
    "Rename the current session to reflect what you are working on.",
    "Call this tool early in the conversation once you understand the user's task.",
    "Use a short, descriptive title (3-7 words) that summarizes the task.",
    "Examples: 'Fix auth token refresh', 'Add dark mode toggle', 'Refactor database queries'",
  ].join("\n"),
  parameters: z.object({
    title: z.string().describe("Short descriptive title for the session (3-7 words)"),
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
