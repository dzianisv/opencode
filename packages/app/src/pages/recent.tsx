import { createResource, createSignal, For, Show, createMemo } from "solid-js"
import { useNavigate } from "@solidjs/router"
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { base64Encode } from "@opencode-ai/util/encode"
import { useGlobalSync } from "@/context/global-sync"
import { DateTime } from "luxon"

export default function Recent() {
  const navigate = useNavigate()
  const sync = useGlobalSync()
  const [search, setSearch] = createSignal("")
  const homedir = createMemo(() => sync.data.path.home)

  const [sessions] = createResource(
    () => search(),
    async (query) => {
      const res = await fetch(
        `/global/session?roots=true&limit=50${query ? `&search=${encodeURIComponent(query)}` : ""}`,
      )
      if (!res.ok) return []
      return res.json() as Promise<
        Array<{
          id: string
          title: string
          directory: string
          project?: { id: string; name?: string; worktree: string } | null
          time: { created: number; updated: number; archived?: number }
          summary?: { additions?: number; deletions?: number; files?: number }
          parentID?: string
        }>
      >
    },
  )

  function ago(ts: number) {
    return DateTime.fromMillis(ts).toRelative() ?? ""
  }

  function label(session: { directory: string; project?: { name?: string; worktree: string } | null }) {
    if (session.project?.name) return session.project.name
    return session.directory.replace(homedir(), "~")
  }

  function open(session: { id: string; directory: string }) {
    navigate(`/${base64Encode(session.directory)}/session/${session.id}`)
  }

  let timer: ReturnType<typeof setTimeout> | undefined

  function onSearch(val: string) {
    clearTimeout(timer)
    timer = setTimeout(() => setSearch(val), 300)
  }

  return (
    <div class="mx-auto mt-20 w-full md:w-auto px-4 max-w-2xl">
      <div class="flex gap-2 items-center justify-between pl-3 mb-6">
        <div class="flex items-center gap-2">
          <Button icon="arrow-left" size="normal" variant="ghost" onClick={() => navigate("/")}>
            Back
          </Button>
          <div class="text-14-medium text-text-strong">Recently Active Sessions</div>
        </div>
      </div>

      <div class="mb-4 px-3">
        <input
          type="text"
          placeholder="Search sessions..."
          class="w-full px-3 py-2 text-14-regular bg-transparent border border-border rounded-md text-text-strong placeholder:text-text-weak focus:outline-none focus:border-text-weak"
          onInput={(e) => onSearch(e.currentTarget.value)}
        />
      </div>

      <Show when={sessions.loading}>
        <div class="flex items-center justify-center py-12 text-text-weak text-14-regular">Loading...</div>
      </Show>

      <Show when={!sessions.loading && sessions()?.length === 0}>
        <div class="flex items-center justify-center py-12 text-text-weak text-14-regular">No sessions found</div>
      </Show>

      <ul class="flex flex-col gap-2">
        <For each={sessions()}>
          {(session) => (
            <Button
              size="large"
              variant="ghost"
              class="text-14-mono text-left justify-between px-3"
              onClick={() => open(session)}
            >
              <div class="flex flex-col gap-0.5 min-w-0 flex-1">
                <div class="text-14-regular text-text-strong truncate">{session.title}</div>
                <div class="text-12-regular text-text-weak truncate">{label(session)}</div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <Show when={session.summary && (session.summary.additions || session.summary.deletions)}>
                  <div class="flex items-center gap-1">
                    <Show when={session.summary!.additions}>
                      <span class="text-12-regular text-green-500">+{session.summary!.additions}</span>
                    </Show>
                    <Show when={session.summary!.deletions}>
                      <span class="text-12-regular text-red-400">-{session.summary!.deletions}</span>
                    </Show>
                  </div>
                </Show>
                <div class="text-14-regular text-text-weak">{ago(session.time.updated)}</div>
              </div>
            </Button>
          )}
        </For>
      </ul>
    </div>
  )
}
