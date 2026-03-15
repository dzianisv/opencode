import { createResource, createSignal, For, Show, createMemo } from "solid-js"
import { useNavigate } from "@solidjs/router"
import { Icon } from "@opencode-ai/ui/icon"
import { base64Encode } from "@opencode-ai/util/encode"
import { useGlobalSync } from "@/context/global-sync"
import { DateTime } from "luxon"

export default function Recent() {
  const navigate = useNavigate()
  const sync = useGlobalSync()
  const [search, setSearch] = createSignal("")

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

  const projects = createMemo(() => {
    const map = new Map<string, string>()
    for (const p of sync.data.project) {
      map.set(p.worktree, p.name || p.worktree.split("/").pop() || p.worktree)
    }
    return map
  })

  function ago(ts: number) {
    return DateTime.fromMillis(ts).toRelative() ?? ""
  }

  function label(session: { directory: string; project?: { name?: string; worktree: string } | null }) {
    if (session.project?.name) return session.project.name
    return projects().get(session.directory) || session.directory.split("/").pop() || session.directory
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
    <div class="flex flex-col h-full bg-background-base">
      <div class="flex items-center gap-3 px-6 py-4 border-b border-border-base">
        <button
          class="flex items-center gap-1.5 text-color-secondary-base hover:text-color-primary-base transition-colors"
          onClick={() => navigate("/")}
        >
          <Icon name="arrow-left" class="size-4" />
        </button>
        <h1 class="text-16-semibold text-color-primary-base">Recently Active</h1>
        <div class="flex-1" />
        <div class="relative">
          <Icon name="magnifying-glass" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-color-dimmed-base" />
          <input
            type="text"
            placeholder="Search sessions..."
            class="pl-8 pr-3 py-1.5 text-13-regular bg-background-surface-base border border-border-base rounded-md w-56 text-color-primary-base placeholder:text-color-dimmed-base focus:outline-none focus:border-border-focus-base"
            onInput={(e) => onSearch(e.currentTarget.value)}
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto">
        <Show when={sessions.loading}>
          <div class="flex items-center justify-center py-12 text-color-dimmed-base text-13-regular">Loading...</div>
        </Show>

        <Show when={!sessions.loading && sessions()?.length === 0}>
          <div class="flex items-center justify-center py-12 text-color-dimmed-base text-13-regular">
            No sessions found
          </div>
        </Show>

        <div class="divide-y divide-border-base">
          <For each={sessions()}>
            {(session) => (
              <button
                class="w-full flex items-start gap-3 px-6 py-3 hover:bg-background-hover-base transition-colors text-left"
                onClick={() => open(session)}
              >
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-13-medium text-color-primary-base truncate">{session.title}</span>
                    <Show when={session.summary && session.summary.files}>
                      <span class="shrink-0 text-11-regular text-color-dimmed-base">
                        {session.summary!.files} file{session.summary!.files !== 1 ? "s" : ""}
                      </span>
                    </Show>
                  </div>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-12-regular text-color-secondary-base truncate">{label(session)}</span>
                    <span class="text-11-regular text-color-dimmed-base">{ago(session.time.updated)}</span>
                  </div>
                  <Show when={session.summary && (session.summary.additions || session.summary.deletions)}>
                    <div class="flex items-center gap-1.5 mt-1">
                      <Show when={session.summary!.additions}>
                        <span class="text-11-regular text-icon-success-base">+{session.summary!.additions}</span>
                      </Show>
                      <Show when={session.summary!.deletions}>
                        <span class="text-11-regular text-icon-critical-base">-{session.summary!.deletions}</span>
                      </Show>
                    </div>
                  </Show>
                </div>
                <Icon name="chevron-right" class="size-4 text-color-dimmed-base shrink-0 mt-1" />
              </button>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}
