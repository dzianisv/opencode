import { createEffect, createMemo, For, on, Show, type Accessor, type JSX } from "solid-js"
import { createStore } from "solid-js/store"
import { base64Encode } from "@opencode-ai/util/encode"
import { Button } from "@opencode-ai/ui/button"
import { HoverCard } from "@opencode-ai/ui/hover-card"
import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { type Session } from "@opencode-ai/sdk/v2/client"
import { useLanguage } from "@/context/language"
import { SessionItem, SessionSkeleton, type SessionItemProps } from "./sidebar-items"

const LIMIT = 20

type GlobalSession = Session & {
  project?: { id: string; name?: string; worktree: string } | null
}

async function query(opts: { search?: string; cursor?: number; limit?: number }) {
  const params = new URLSearchParams()
  params.set("roots", "true")
  params.set("limit", String(opts.limit ?? LIMIT))
  if (opts.search) params.set("search", opts.search)
  if (opts.cursor) params.set("cursor", String(opts.cursor))
  const res = await fetch(`/global/session?${params}`)
  if (!res.ok) return { items: [] as GlobalSession[], next: undefined as number | undefined }
  const items = (await res.json()) as GlobalSession[]
  const header = res.headers.get("x-next-cursor")
  return { items, next: header ? Number(header) : undefined }
}

export const RecentTile = (props: {
  selected: Accessor<boolean>
  onClick: () => void
  sidebarOpened: Accessor<boolean>
  sidebarHovering: Accessor<boolean>
  mobile?: boolean
  sessionProps: Omit<SessionItemProps, "session" | "list" | "slug" | "children" | "mobile" | "dense" | "popover">
}): JSX.Element => {
  const language = useLanguage()
  const [state, setState] = createStore({
    open: false,
    suppressHover: false,
  })

  const preview = createMemo(() => !props.mobile && props.sidebarOpened())
  const overlay = createMemo(() => !props.mobile && !props.sidebarOpened())

  createEffect(() => {
    if (preview()) return
    if (!state.open) return
    setState("open", false)
  })

  createEffect(() => {
    if (!props.selected()) return
    if (!state.open) return
    setState("open", false)
  })

  const tile = () => (
    <Tooltip placement="right" value={language.t("sidebar.project.recentSessions")}>
      <button
        type="button"
        aria-label={language.t("sidebar.project.recentSessions")}
        classList={{
          "flex items-center justify-center size-10 p-1 rounded-lg overflow-hidden transition-colors cursor-default": true,
          "bg-transparent border-2 border-icon-strong-base hover:bg-surface-base-hover": props.selected(),
          "bg-transparent border border-transparent hover:bg-surface-base-hover hover:border-border-weak-base":
            !props.selected(),
        }}
        onClick={() => {
          if (props.selected()) {
            setState("suppressHover", true)
          }
          props.onClick()
        }}
        onMouseEnter={() => {
          if (!overlay()) return
          if (state.suppressHover) return
          setState("open", true)
        }}
        onMouseLeave={() => {
          if (state.suppressHover) setState("suppressHover", false)
          if (!overlay()) return
          setState("open", false)
        }}
      >
        <div class="size-8 rounded flex items-center justify-center bg-surface-base-hover">
          <Icon name="status" class="text-icon-base" />
        </div>
      </button>
    </Tooltip>
  )

  return (
    <Show when={preview() && !props.selected()} fallback={tile()}>
      <HoverCard
        open={!state.suppressHover && state.open}
        openDelay={0}
        closeDelay={0}
        placement="right-start"
        gutter={6}
        trigger={tile()}
        onOpenChange={(value) => {
          if (value && state.suppressHover) return
          setState("open", value)
        }}
      >
        <RecentSidebarPanel
          mobile={props.mobile}
          merged={true}
          preview
          sessionProps={props.sessionProps}
          sidebarWidth={() => 280}
          sidebarOpened={() => true}
          sidebarHovering={props.sidebarHovering}
        />
      </HoverCard>
    </Show>
  )
}

export const RecentSidebarPanel = (props: {
  mobile?: boolean
  merged?: boolean
  preview?: boolean
  sessionProps: Omit<SessionItemProps, "session" | "list" | "slug" | "children" | "mobile" | "dense" | "popover">
  sidebarWidth: Accessor<number>
  sidebarOpened: Accessor<boolean>
  sidebarHovering: Accessor<boolean>
}): JSX.Element => {
  const language = useLanguage()
  const merged = createMemo(() => props.mobile || (props.merged ?? props.sidebarOpened()))
  const hover = createMemo(() => !props.mobile && props.merged === false && !props.sidebarOpened())
  const popover = createMemo(() => !!props.mobile || props.merged === false || props.sidebarOpened())

  const [store, setStore] = createStore({
    sessions: [] as GlobalSession[],
    loading: true,
    cursor: undefined as number | undefined,
    search: "",
    booted: false,
  })

  const children = createMemo(() => {
    const map = new Map<string, string[]>()
    for (const session of store.sessions) {
      if (!session.parentID) continue
      const list = map.get(session.parentID) ?? []
      list.push(session.id)
      map.set(session.parentID, list)
    }
    return map
  })

  const roots = createMemo(() => store.sessions.filter((s) => !s.parentID))

  const load = async (reset?: boolean) => {
    setStore("loading", true)
    const result = await query({
      search: store.search || undefined,
      cursor: reset ? undefined : store.cursor,
      limit: LIMIT,
    })
    if (reset) {
      setStore("sessions", result.items)
    } else {
      setStore("sessions", (prev) => [...prev, ...result.items])
    }
    setStore("cursor", result.next)
    setStore("loading", false)
    setStore("booted", true)
  }

  createEffect(
    on(
      () => store.search,
      () => load(true),
    ),
  )

  let timer: ReturnType<typeof setTimeout> | undefined
  const onSearch = (val: string) => {
    clearTimeout(timer)
    timer = setTimeout(() => setStore("search", val), 300)
  }

  const slug = (session: GlobalSession) => base64Encode(session.directory)

  return (
    <div
      classList={{
        "flex flex-col min-h-0 min-w-0 box-border rounded-tl-[12px] px-3": true,
        "border border-b-0 border-border-weak-base": !merged(),
        "border-l border-t border-border-weaker-base": merged(),
        "bg-background-base": merged() || hover(),
        "bg-background-stronger": !merged() && !hover(),
        "flex-1 min-w-0": props.mobile,
        "max-w-full overflow-hidden": props.mobile,
      }}
      style={{
        width: props.mobile
          ? undefined
          : props.preview
            ? "280px"
            : `${Math.max(Math.max(props.sidebarWidth(), 244) - 64, 0)}px`,
      }}
    >
      <div class="shrink-0 pl-1 py-1">
        <div class="flex items-start justify-between gap-2 py-2 pl-2 pr-0">
          <div class="flex flex-col min-w-0">
            <span class="text-14-medium text-text-strong truncate">{language.t("sidebar.project.recentSessions")}</span>
            <Show when={!props.preview}>
              <span class="text-12-regular text-text-base truncate">{language.t("sidebar.recent.description")}</span>
            </Show>
          </div>
        </div>
      </div>

      <Show when={!props.preview}>
        <div class="shrink-0 px-1 pb-2">
          <input
            type="text"
            placeholder={`${language.t("common.search")}...`}
            class="w-full px-3 py-1.5 text-14-regular bg-transparent border border-border rounded-md text-text-strong placeholder:text-text-weak focus:outline-none focus:border-text-weak"
            onInput={(e) => onSearch(e.currentTarget.value)}
          />
        </div>
      </Show>

      <div class="flex-1 min-h-0 overflow-y-auto no-scrollbar [overflow-anchor:none] py-2">
        <Show when={store.loading && !store.booted}>
          <SessionSkeleton />
        </Show>

        <Show when={store.booted && roots().length === 0 && !store.loading}>
          <div class="flex items-center justify-center py-8 text-text-weak text-14-regular">
            {language.t("common.noResults")}
          </div>
        </Show>

        <nav class="flex flex-col gap-1">
          <For each={props.preview ? roots().slice(0, 5) : roots()}>
            {(session) => (
              <SessionItem
                {...props.sessionProps}
                session={session}
                list={roots()}
                slug={slug(session)}
                mobile={props.mobile}
                popover={popover()}
                children={children()}
              />
            )}
          </For>

          <Show when={!props.preview && store.cursor !== undefined && !store.loading}>
            <div class="relative w-full py-1">
              <Button
                variant="ghost"
                class="flex w-full text-left justify-start text-14-regular text-text-weak pl-9 pr-10"
                size="large"
                onClick={(e: MouseEvent) => {
                  load()
                  ;(e.currentTarget as HTMLButtonElement).blur()
                }}
              >
                {language.t("common.loadMore")}
              </Button>
            </div>
          </Show>
        </nav>
      </div>
    </div>
  )
}
