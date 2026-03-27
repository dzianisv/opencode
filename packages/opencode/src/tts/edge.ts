import { mkdtemp, stat, unlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { EdgeTTS } from "node-edge-tts"
import { Config } from "@/config/config"

const defaults = {
  voice: "en-US-MichelleNeural",
  lang: "en-US",
  output_format: "audio-24khz-48kbitrate-mono-mp3",
  timeout_ms: 30_000,
}

export async function synth(text: string) {
  if (!text.trim()) throw new Error("Empty text")
  // Use global config — TTS settings are not per-project and the
  // /tts/edge route is mounted before the Instance middleware.
  const cfg = await Config.getGlobal()
  const edge = cfg.voice?.edge
  // Only disable when explicitly set to false; undefined/missing = enabled
  if (edge?.enabled === false) throw new Error("Edge TTS is disabled")

  const dir = await mkdtemp(path.join(tmpdir(), "opencode-tts-"))
  const file = path.join(dir, `voice-${Date.now()}.mp3`)
  const tts = new EdgeTTS({
    voice: edge?.voice ?? defaults.voice,
    lang: edge?.lang ?? defaults.lang,
    outputFormat: edge?.output_format ?? defaults.output_format,
    rate: edge?.rate,
    pitch: edge?.pitch,
    volume: edge?.volume,
    timeout: edge?.timeout_ms ?? defaults.timeout_ms,
  })

  await tts.ttsPromise(text, file)
  const info = await stat(file)
  if (!info.size) throw new Error("Edge TTS produced empty audio file")

  const audio = await Bun.file(file).arrayBuffer()
  await unlink(file).catch(() => {})
  return new Uint8Array(audio)
}
