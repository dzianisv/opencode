Task: Fix gpt-5.3-codex stopping after identifying work instead of executing it.

  Done:

   - Analyzed the failing session — codex wrote todos then stopped
   - Reviewed OpenAI's Codex prompting guide for best practices
   - Identified root cause: prompt led with questions → triggered "report mode"
   - Crafted improved prompt: action-first, unconditional
   - Submitted to session — codex executed the release end-to-end (tag, push, GH release, CI watch)

  Remaining:

   - Add "Autonomy and Persistence" + "Plan closure" sections to AGENTS.md so this behavior is the default (not just when you use the right prompt phrasing)

