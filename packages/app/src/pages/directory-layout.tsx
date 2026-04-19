import { DataProvider } from "@opencode-ai/ui/context"
import { showToast } from "@opencode-ai/ui/toast"
import { base64Encode } from "@opencode-ai/util/encode"
import { Navigate, useLocation, useNavigate, useParams } from "@solidjs/router"
import { createEffect, createMemo, createResource, type ParentProps, Show } from "solid-js"
import { useGlobalSDK } from "@/context/global-sdk"
import { useLanguage } from "@/context/language"
import { LocalProvider } from "@/context/local"
import { SDKProvider } from "@/context/sdk"
import { SyncProvider, useSync } from "@/context/sync"
import { decode64 } from "@/utils/base64"

function DirectoryDataProvider(props: ParentProps<{ directory: string; recent?: boolean }>) {
  const location = useLocation()
  const navigate = useNavigate()
  const sync = useSync()
  const slug = createMemo(() => base64Encode(props.directory))

  createEffect(() => {
    if (props.recent) return
    const next = sync.data.path.directory
    if (!next || next === props.directory) return
    const path = location.pathname.slice(slug().length + 1)
    navigate(`/${base64Encode(next)}${path}${location.search}${location.hash}`, { replace: true })
  })

  const nav = (id: string) => (props.recent ? `/recent/session/${id}` : `/${slug()}/session/${id}`)

  return (
    <DataProvider
      data={sync.data}
      directory={props.directory}
      onNavigateToSession={(id: string) => navigate(nav(id))}
      onSessionHref={(id: string) => nav(id)}
    >
      <LocalProvider>{props.children}</LocalProvider>
    </DataProvider>
  )
}

function RecentSessionLayout(props: ParentProps<{ id: string }>) {
  const globalSDK = useGlobalSDK()
  const navigate = useNavigate()

  const [directory] = createResource(
    () => props.id,
    (id) =>
      globalSDK.client.session
        .get({ sessionID: id })
        .then((x) => x.data?.directory ?? "")
        .catch(() => ""),
  )

  createEffect(() => {
    if (directory.state === "ready" && !directory()) navigate("/recent", { replace: true })
  })

  return (
    <Show when={directory()} keyed>
      {(dir) => (
        <SDKProvider directory={() => dir}>
          <SyncProvider>
            <DirectoryDataProvider directory={dir} recent>
              {props.children}
            </DirectoryDataProvider>
          </SyncProvider>
        </SDKProvider>
      )}
    </Show>
  )
}

export default function Layout(props: ParentProps) {
  const params = useParams()
  const language = useLanguage()
  const navigate = useNavigate()
  let invalid = ""

  const isRecent = createMemo(() => params.dir === "recent")

  const resolved = createMemo(() => {
    if (isRecent()) return ""
    if (!params.dir) return ""
    return decode64(params.dir) ?? ""
  })

  createEffect(() => {
    if (isRecent()) return
    const dir = params.dir
    if (!dir) return
    if (resolved()) {
      invalid = ""
      return
    }
    if (invalid === dir) return
    invalid = dir
    showToast({
      variant: "error",
      title: language.t("common.requestFailed"),
      description: language.t("directory.error.invalidUrl"),
    })
    navigate("/", { replace: true })
  })

  return (
    <Show
      when={isRecent()}
      fallback={
        <Show when={resolved()} keyed>
          {(dir) => (
            <SDKProvider directory={() => dir}>
              <SyncProvider>
                <DirectoryDataProvider directory={dir}>{props.children}</DirectoryDataProvider>
              </SyncProvider>
            </SDKProvider>
          )}
        </Show>
      }
    >
      <Show when={params.id} fallback={<Navigate href="/recent" />}>
        {(id) => <RecentSessionLayout id={id()}>{props.children}</RecentSessionLayout>}
      </Show>
    </Show>
  )
}
