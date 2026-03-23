import { useFilteredList } from "@opencode-ai/ui/hooks"
import { ProviderIcon } from "@opencode-ai/ui/provider-icon"
import { Switch } from "@opencode-ai/ui/switch"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Select } from "@opencode-ai/ui/select"
import { TextField } from "@opencode-ai/ui/text-field"
import { type Component, For, Show, createMemo } from "solid-js"
import { useLanguage } from "@/context/language"
import { useModels } from "@/context/models"
import { useSettings } from "@/context/settings"
import { popularProviders } from "@/hooks/use-providers"
import { SettingsList } from "./settings-list"

type ModelItem = ReturnType<ReturnType<typeof useModels>["list"]>[number]

const ListLoadingState: Component<{ label: string }> = (props) => {
  return (
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <span class="text-14-regular text-text-weak">{props.label}</span>
    </div>
  )
}

const ListEmptyState: Component<{ message: string; filter: string }> = (props) => {
  return (
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <span class="text-14-regular text-text-weak">{props.message}</span>
      <Show when={props.filter}>
        <span class="text-14-regular text-text-strong mt-1">&quot;{props.filter}&quot;</span>
      </Show>
    </div>
  )
}

export const SettingsModels: Component = () => {
  const language = useLanguage()
  const models = useModels()
  const settings = useSettings()

  const options = createMemo(() =>
    models
      .list()
      .map((item) => ({
        providerID: item.provider.id,
        modelID: item.id,
        name: item.name,
        provider: item.provider.name,
      }))
      .sort((a, b) => {
        const x = a.provider.localeCompare(b.provider)
        if (x !== 0) return x
        return a.name.localeCompare(b.name)
      }),
  )

  const find = (model: { providerID: string; modelID: string } | undefined) => {
    if (!model) return
    return options().find((item) => item.providerID === model.providerID && item.modelID === model.modelID)
  }

  const currentDefault = createMemo(() => find(settings.models.defaultModel()))
  const currentReview = createMemo(() => find(settings.models.reviewModel()))

  const pick = (model: { providerID: string; modelID: string } | undefined) => {
    if (!model) return
    return { providerID: model.providerID, modelID: model.modelID }
  }

  const list = useFilteredList<ModelItem>({
    items: (_filter) => models.list(),
    key: (x) => `${x.provider.id}:${x.id}`,
    filterKeys: ["provider.name", "name", "id"],
    sortBy: (a, b) => a.name.localeCompare(b.name),
    groupBy: (x) => x.provider.id,
    sortGroupsBy: (a, b) => {
      const aIndex = popularProviders.indexOf(a.category)
      const bIndex = popularProviders.indexOf(b.category)
      const aPopular = aIndex >= 0
      const bPopular = bIndex >= 0

      if (aPopular && !bPopular) return -1
      if (!aPopular && bPopular) return 1
      if (aPopular && bPopular) return aIndex - bIndex

      const aName = a.items[0].provider.name
      const bName = b.items[0].provider.name
      return aName.localeCompare(bName)
    },
  })

  return (
    <div class="flex flex-col h-full overflow-y-auto no-scrollbar px-4 pb-10 sm:px-10 sm:pb-10">
      <div class="sticky top-0 z-10 bg-[linear-gradient(to_bottom,var(--surface-stronger-non-alpha)_calc(100%_-_24px),transparent)]">
        <div class="flex flex-col gap-4 pt-6 pb-6 max-w-[720px]">
          <h2 class="text-16-medium text-text-strong">{language.t("settings.models.title")}</h2>
          <div class="flex items-center gap-2 px-3 h-9 rounded-lg bg-surface-base">
            <Icon name="magnifying-glass" class="text-icon-weak-base flex-shrink-0" />
            <TextField
              variant="ghost"
              type="text"
              value={list.filter()}
              onChange={list.onInput}
              placeholder={language.t("dialog.model.search.placeholder")}
              spellcheck={false}
              autocorrect="off"
              autocomplete="off"
              autocapitalize="off"
              class="flex-1"
            />
            <Show when={list.filter()}>
              <IconButton icon="circle-x" variant="ghost" onClick={list.clear} />
            </Show>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-8 max-w-[720px]">
        <div class="flex flex-col gap-1">
          <h3 class="text-14-medium text-text-strong px-1 pb-2">{language.t("settings.models.section.session")}</h3>
          <SettingsList>
            <div class="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border-weak-base">
              <div class="min-w-0">
                <div class="text-14-medium text-text-strong">{language.t("settings.models.row.default.title")}</div>
                <div class="text-13-regular text-text-weak mt-0.5">
                  {language.t("settings.models.row.default.description")}
                </div>
              </div>
              <div class="flex-shrink-0 min-w-[240px]" data-action="settings-model-default">
                <Select
                  options={options()}
                  current={currentDefault()}
                  value={(item) => `${item.providerID}/${item.modelID}`}
                  label={(item) => `${item.provider} / ${item.name}`}
                  onSelect={(item) => settings.models.setDefaultModel(pick(item))}
                  variant="secondary"
                  size="small"
                  triggerVariant="settings"
                />
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border-weak-base">
              <div class="min-w-0">
                <div class="text-14-medium text-text-strong">{language.t("settings.models.row.review.title")}</div>
                <div class="text-13-regular text-text-weak mt-0.5">
                  {language.t("settings.models.row.review.description")}
                </div>
              </div>
              <div class="flex-shrink-0 min-w-[240px]" data-action="settings-model-review">
                <Select
                  options={options()}
                  current={currentReview()}
                  value={(item) => `${item.providerID}/${item.modelID}`}
                  label={(item) => `${item.provider} / ${item.name}`}
                  onSelect={(item) => settings.models.setReviewModel(pick(item))}
                  variant="secondary"
                  size="small"
                  triggerVariant="settings"
                />
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-4 py-3">
              <div class="min-w-0">
                <div class="text-14-medium text-text-strong">{language.t("settings.models.row.autoReview.title")}</div>
                <div class="text-13-regular text-text-weak mt-0.5">
                  {language.t("settings.models.row.autoReview.description")}
                </div>
              </div>
              <div class="flex-shrink-0" data-action="settings-model-auto-review">
                <Switch
                  checked={settings.models.autoReview()}
                  onChange={(checked) => settings.models.setAutoReview(checked)}
                />
              </div>
            </div>
          </SettingsList>
        </div>

        <Show
          when={!list.grouped.loading}
          fallback={
            <ListLoadingState label={`${language.t("common.loading")}${language.t("common.loading.ellipsis")}`} />
          }
        >
          <Show
            when={list.flat().length > 0}
            fallback={<ListEmptyState message={language.t("dialog.model.empty")} filter={list.filter()} />}
          >
            <For each={list.grouped.latest}>
              {(group) => (
                <div class="flex flex-col gap-1">
                  <div class="flex items-center gap-2 pb-2">
                    <ProviderIcon id={group.category} class="size-5 shrink-0 icon-strong-base" />
                    <span class="text-14-medium text-text-strong">{group.items[0].provider.name}</span>
                  </div>
                  <SettingsList>
                    <For each={group.items}>
                      {(item) => {
                        const key = { providerID: item.provider.id, modelID: item.id }
                        return (
                          <div class="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border-weak-base last:border-none">
                            <div class="min-w-0">
                              <span class="text-14-regular text-text-strong truncate block">{item.name}</span>
                            </div>
                            <div class="flex-shrink-0">
                              <Switch
                                checked={models.visible(key)}
                                onChange={(checked) => {
                                  models.setVisibility(key, checked)
                                }}
                                hideLabel
                              >
                                {item.name}
                              </Switch>
                            </div>
                          </div>
                        )
                      }}
                    </For>
                  </SettingsList>
                </div>
              )}
            </For>
          </Show>
        </Show>
      </div>
    </div>
  )
}
