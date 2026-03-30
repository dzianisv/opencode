import { Popover as Kobalte } from "@kobalte/core/popover"
import { Component, ComponentProps, createMemo, JSX, Show, ValidComponent } from "solid-js"
import { createStore } from "solid-js/store"
import { useLocal } from "@/context/local"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { popularProviders } from "@/hooks/use-providers"
import { Button } from "@opencode-ai/ui/button"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tag } from "@opencode-ai/ui/tag"
import { Dialog } from "@opencode-ai/ui/dialog"
import { List } from "@opencode-ai/ui/list"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { ModelTooltip } from "./model-tooltip"
import { useLanguage } from "@/context/language"

const isFree = (provider: string, cost: { input: number } | undefined) =>
  provider === "opencode" && (!cost || cost.input === 0)

type ModelState = ReturnType<typeof useLocal>["model"]
type RecentEntry = ReturnType<ModelState["recent"]>[number]
type ModelEntry = ReturnType<ModelState["list"]>[number]
type Item = {
  mode: "recent" | "model"
  group: string
  rank: number
  model: ModelEntry
  variant?: RecentEntry["variant"]
}

const ModelList: Component<{
  provider?: string
  class?: string
  onSelect: () => void
  action?: JSX.Element
  model?: ModelState
}> = (props) => {
  const model = props.model ?? useLocal().model
  const language = useLanguage()
  const recentGroup = () => language.t("dialog.model.group.recent")
  const [store, setStore] = createStore({
    filter: "",
  })

  const models = createMemo(() =>
    model
      .list()
      .filter((item) => model.visible({ modelID: item.id, providerID: item.provider.id }))
      .filter((item) => (props.provider ? item.provider.id === props.provider : true)),
  )

  const recents = createMemo(() =>
    model
      .recent()
      .filter((item) => model.visible({ modelID: item.model.id, providerID: item.model.provider.id }))
      .filter((item) => (props.provider ? item.model.provider.id === props.provider : true)),
  )

  const items = createMemo<Item[]>(() => {
    const showSections = store.filter.trim().length === 0
    const recent: Item[] = showSections
      ? recents().map((item, rank): Item => ({
          mode: "recent",
          group: recentGroup(),
          rank,
          model: item.model,
          variant: item.variant,
        }))
      : []

    const hidden = new Set(recent.map((item) => `${item.model.provider.id}:${item.model.id}`))
    const available: Item[] = models().flatMap((item) => {
      if (showSections && hidden.has(`${item.provider.id}:${item.id}`)) return []
      return [{ mode: "model", group: item.provider.name, rank: 0, model: item }]
    })

    return [...recent, ...available]
  })

  const current = createMemo(() => {
    const item = model.current()
    if (!item) return undefined

    const variant = model.variant.current() ?? undefined
    return (
      items().find(
        (entry) =>
          entry.model.provider.id === item.provider.id &&
          entry.model.id === item.id &&
          (entry.mode === "model" || (entry.variant ?? undefined) === variant),
      ) ?? items().find((entry) => entry.model.provider.id === item.provider.id && entry.model.id === item.id)
    )
  })

  return (
    <List
      class={`flex-1 min-h-0 [&_[data-slot=list-scroll]]:flex-1 [&_[data-slot=list-scroll]]:min-h-0 ${props.class ?? ""}`}
      filter={store.filter}
      onFilter={(value) => setStore("filter", value)}
      search={{ placeholder: language.t("dialog.model.search.placeholder"), autofocus: true, action: props.action }}
      emptyMessage={language.t("dialog.model.empty")}
      key={(item) => `${item.mode}:${item.model.provider.id}:${item.model.id}:${item.variant ?? ""}`}
      items={items()}
      current={current()}
      filterKeys={["model.provider.name", "model.name", "model.id", "variant"]}
      sortBy={(a, b) => {
        if (a.mode === "recent" && b.mode === "recent") return a.rank - b.rank
        return a.model.name.localeCompare(b.model.name)
      }}
      groupBy={(item) => item.group}
      sortGroupsBy={(a, b) => {
        if (a.category === recentGroup()) return -1
        if (b.category === recentGroup()) return 1

        const aProvider = a.items[0].model.provider.id
        const bProvider = b.items[0].model.provider.id
        if (popularProviders.includes(aProvider) && !popularProviders.includes(bProvider)) return -1
        if (!popularProviders.includes(aProvider) && popularProviders.includes(bProvider)) return 1
        if (popularProviders.includes(aProvider) && popularProviders.includes(bProvider)) {
          return popularProviders.indexOf(aProvider) - popularProviders.indexOf(bProvider)
        }
        return a.category.localeCompare(b.category)
      }}
      itemWrapper={(item, node) => (
        <Tooltip
          class="w-full"
          placement="right-start"
          gutter={12}
          value={
            <ModelTooltip
              model={item.model}
              latest={item.model.latest}
              free={isFree(item.model.provider.id, item.model.cost)}
            />
          }
        >
          {node}
        </Tooltip>
      )}
      onSelect={(item) => {
        model.set(
          item ? { modelID: item.model.id, providerID: item.model.provider.id } : undefined,
          item?.mode === "recent" ? { recent: true, variant: item.variant } : { recent: true },
        )
        props.onSelect()
      }}
    >
      {(item) => (
        <div class="w-full flex items-center gap-x-2 text-13-regular">
          <span class="truncate">{item.model.name}</span>
          <Show when={item.mode === "recent" && item.variant}>
            {(value) => <Tag class="capitalize">{value()}</Tag>}
          </Show>
          <Show when={isFree(item.model.provider.id, item.model.cost)}>
            <Tag>{language.t("model.tag.free")}</Tag>
          </Show>
          <Show when={item.model.latest}>
            <Tag>{language.t("model.tag.latest")}</Tag>
          </Show>
        </div>
      )}
    </List>
  )
}

type ModelSelectorTriggerProps = Omit<ComponentProps<typeof Kobalte.Trigger>, "as" | "ref">

export function ModelSelectorPopover(props: {
  provider?: string
  model?: ModelState
  children?: JSX.Element
  triggerAs?: ValidComponent
  triggerProps?: ModelSelectorTriggerProps
}) {
  const [store, setStore] = createStore<{
    open: boolean
    dismiss: "escape" | "outside" | null
  }>({
    open: false,
    dismiss: null,
  })
  const dialog = useDialog()

  const handleManage = () => {
    setStore("open", false)
    void import("./dialog-manage-models").then((x) => {
      dialog.show(() => <x.DialogManageModels />)
    })
  }

  const handleConnectProvider = () => {
    setStore("open", false)
    void import("./dialog-select-provider").then((x) => {
      dialog.show(() => <x.DialogSelectProvider />)
    })
  }
  const language = useLanguage()

  return (
    <Kobalte
      open={store.open}
      onOpenChange={(next) => {
        if (next) setStore("dismiss", null)
        setStore("open", next)
      }}
      modal={false}
      placement="top-start"
      gutter={4}
    >
      <Kobalte.Trigger as={props.triggerAs ?? "div"} {...props.triggerProps}>
        {props.children}
      </Kobalte.Trigger>
      <Kobalte.Portal>
        <Kobalte.Content
          class="w-72 h-80 flex flex-col p-2 rounded-md border border-border-base bg-surface-raised-stronger-non-alpha shadow-md z-50 outline-none overflow-hidden"
          onEscapeKeyDown={(event) => {
            setStore("dismiss", "escape")
            setStore("open", false)
            event.preventDefault()
            event.stopPropagation()
          }}
          onPointerDownOutside={() => {
            setStore("dismiss", "outside")
            setStore("open", false)
          }}
          onFocusOutside={() => {
            setStore("dismiss", "outside")
            setStore("open", false)
          }}
          onCloseAutoFocus={(event) => {
            if (store.dismiss === "outside") event.preventDefault()
            setStore("dismiss", null)
          }}
        >
          <Kobalte.Title class="sr-only">{language.t("dialog.model.select.title")}</Kobalte.Title>
          <ModelList
            provider={props.provider}
            model={props.model}
            onSelect={() => setStore("open", false)}
            class="p-1"
            action={
              <div class="flex items-center gap-1">
                <Tooltip placement="top" value={language.t("command.provider.connect")}>
                  <IconButton
                    icon="plus-small"
                    variant="ghost"
                    iconSize="normal"
                    class="size-6"
                    aria-label={language.t("command.provider.connect")}
                    onClick={handleConnectProvider}
                  />
                </Tooltip>
                <Tooltip placement="top" value={language.t("dialog.model.manage")}>
                  <IconButton
                    icon="sliders"
                    variant="ghost"
                    iconSize="normal"
                    class="size-6"
                    aria-label={language.t("dialog.model.manage")}
                    onClick={handleManage}
                  />
                </Tooltip>
              </div>
            }
          />
        </Kobalte.Content>
      </Kobalte.Portal>
    </Kobalte>
  )
}

export const DialogSelectModel: Component<{ provider?: string; model?: ModelState }> = (props) => {
  const dialog = useDialog()
  const language = useLanguage()

  const provider = () => {
    void import("./dialog-select-provider").then((x) => {
      dialog.show(() => <x.DialogSelectProvider />)
    })
  }

  const manage = () => {
    void import("./dialog-manage-models").then((x) => {
      dialog.show(() => <x.DialogManageModels />)
    })
  }

  return (
    <Dialog
      title={language.t("dialog.model.select.title")}
      action={
        <Button class="h-7 -my-1 text-14-medium" icon="plus-small" tabIndex={-1} onClick={provider}>
          {language.t("command.provider.connect")}
        </Button>
      }
    >
      <ModelList provider={props.provider} model={props.model} onSelect={() => dialog.close()} />
      <Button variant="ghost" class="ml-3 mt-5 mb-6 text-text-base self-start" onClick={manage}>
        {language.t("dialog.model.manage")}
      </Button>
    </Dialog>
  )
}
