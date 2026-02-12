import { App } from "@slack/bolt"
import { createOpencode, type ToolPart } from "@opencode-ai/sdk"
import { createDedup } from "./dedup"

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
})

console.log("Bot configuration:")
console.log("- Bot token present:", !!process.env.SLACK_BOT_TOKEN)
console.log("- Signing secret present:", !!process.env.SLACK_SIGNING_SECRET)
console.log("- App token present:", !!process.env.SLACK_APP_TOKEN)

console.log("Starting opencode server...")
const opencode = await createOpencode({
  port: 0,
})
console.log("Opencode server ready")

const sessions = new Map<string, { client: any; server: any; sessionId: string; channel: string; thread: string }>()

// Deduplicate between app.message() and app.event('app_mention')
// which both fire for @mentions in channels where the bot is a member
const dedup = createDedup()

;(async () => {
  const events = await opencode.client.event.subscribe()
  for await (const event of events.stream) {
    if (event.type === "message.part.updated") {
      const part = event.properties.part
      if (part.type === "tool") {
        for (const [, session] of sessions.entries()) {
          if (session.sessionId === part.sessionID) {
            handleToolUpdate(part, session.channel, session.thread)
            break
          }
        }
      }
    }
  }
})()

async function handleToolUpdate(part: ToolPart, channel: string, thread: string) {
  if (part.state.status !== "completed") return
  const msg = `*${part.tool}* - ${part.state.title}`
  await app.client.chat
    .postMessage({
      channel,
      thread_ts: thread,
      text: msg,
    })
    .catch(() => {})
}

async function processMessage(text: string, channel: string, ts: string, threadTs?: string) {
  const thread = threadTs || ts

  if (dedup.check(ts)) {
    console.log("Skipping duplicate message:", ts)
    return
  }

  const key = `${channel}-${thread}`
  let session = sessions.get(key)

  if (!session) {
    console.log("Creating new opencode session...")
    const { client, server } = opencode

    const result = await client.session.create({
      body: { title: `Slack thread ${thread}` },
    })

    if (result.error) {
      console.error("Failed to create session:", result.error)
      await app.client.chat.postMessage({
        channel,
        thread_ts: thread,
        text: "Sorry, I had trouble creating a session. Please try again.",
      })
      return
    }

    console.log("Created opencode session:", result.data.id)

    session = { client, server, sessionId: result.data.id, channel, thread }
    sessions.set(key, session)

    const share = await client.session.share({ path: { id: result.data.id } })
    if (!share.error && share.data) {
      const url = share.data.share?.url!
      console.log("Session shared:", url)
      await app.client.chat.postMessage({ channel, thread_ts: thread, text: url })
    }
  }

  console.log("Sending to opencode:", text)
  const result = await session.client.session.prompt({
    path: { id: session.sessionId },
    body: { parts: [{ type: "text", text }] },
  })

  console.log("Opencode response:", JSON.stringify(result, null, 2))

  if (result.error) {
    console.error("Failed to send message:", result.error)
    await app.client.chat.postMessage({
      channel,
      thread_ts: thread,
      text: "Sorry, I had trouble processing your message. Please try again.",
    })
    return
  }

  const response = result.data
  const body =
    response.info?.content ||
    response.parts
      ?.filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("\n") ||
    "I received your message but didn't have a response."

  console.log("Sending response:", body)
  await app.client.chat.postMessage({ channel, thread_ts: thread, text: body })
}

app.use(async ({ next, context }) => {
  console.log("Raw Slack event:", JSON.stringify(context, null, 2))
  await next()
})

// Handle regular messages in channels where the bot is a member
app.message(async ({ message }) => {
  console.log("Received message event:", JSON.stringify(message, null, 2))

  if (message.subtype || !("text" in message) || !message.text) {
    console.log("Skipping message - no text or has subtype")
    return
  }

  console.log("Processing message:", message.text)
  await processMessage(message.text, message.channel, message.ts, (message as any).thread_ts)
})

// Handle @mention events - critical for thread replies where the bot is mentioned
// Slack sends app_mention when someone @mentions the bot, even in threads.
// Without this handler, thread @mentions like "@SupportEngineer please fix this"
// would be silently dropped if the message event wasn't received.
app.event("app_mention", async ({ event }) => {
  console.log("Received app_mention event:", JSON.stringify(event, null, 2))

  if (!event.text) {
    console.log("Skipping app_mention - no text")
    return
  }

  console.log("Processing app_mention:", event.text)
  await processMessage(event.text, event.channel, event.ts, event.thread_ts)
})

app.command("/test", async ({ command, ack, say }) => {
  await ack()
  console.log("Test command received:", JSON.stringify(command, null, 2))
  await say("Bot is working! I can hear you loud and clear.")
})

await app.start()
console.log("Slack bot is running!")
