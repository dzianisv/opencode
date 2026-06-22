# Persistent HTTPS Access (Tailscale)

The simplest way to expose `opencode serve` over stable HTTPS.

## Private (tailnet only — recommended)

```bash
opencode serve --hostname 127.0.0.1 --port 4096
tailscale serve 4096
# → https://<machine>.<tailnet>.ts.net (stable, auto-TLS)
```

## Public (off-tailnet)

```bash
OPENCODE_SERVER_PASSWORD=mysecret opencode serve --hostname 127.0.0.1 --port 4096
tailscale funnel 4096
# → https://<machine>.<tailnet>.ts.net (publicly reachable)
```

## Why Tailscale over alternatives

- **Stable domain** — hostname survives restarts (unlike cloudflared quick tunnels)
- **Free auto-TLS** — Let's Encrypt provisioned/renewed automatically
- **No account needed for private** — just install Tailscale on both devices

## Prerequisites

- Tailscale installed and authenticated on the server
- For Funnel: enable in Tailscale admin console → DNS → Funnel
