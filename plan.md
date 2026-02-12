# Fix: Slack bot doesn't deliver thread messages with @mentions to agents

## Issue

https://github.com/anomalyco/opencode/issues/13251

## Goal

When VibeTeam (the Slack bot) has participated in a thread, ALL messages from that thread should be delivered to agents — including @mention messages.

## Root Cause

The Slack bot only registers `app.message()` handler. When a user @mentions the bot in a thread, Slack sends an `app_mention` event which the bot ignores completely. The code has no `app.event('app_mention', ...)` handler.

Additionally, Slack may send both `message` and `app_mention` events for the same @mention message, so deduplication is needed.

## Plan

- [x] Research existing Slack message handling code
- [x] Identify the root cause
- [x] Create GitHub issue (#13251)
- [x] Create branch `fix/slack-thread-mention-delivery`
- [ ] Implement fix:
  - [ ] Extract shared message processing logic into a reusable function
  - [ ] Add `app.event('app_mention', ...)` handler that routes to the same processing logic
  - [ ] Add deduplication to prevent processing the same message twice (Slack sends both `message` and `app_mention` for @mentions)
  - [ ] Ensure both handlers correctly resolve thread_ts and session mapping
- [ ] Write tests
- [ ] Verify typecheck passes
- [ ] Create PR
