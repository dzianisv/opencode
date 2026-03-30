import { test, expect, describe, beforeAll, afterAll } from "bun:test"
import crypto from "node:crypto"
import { Hono } from "hono"
import {
  verifyWebhookSignature,
  formatPrivateKey,
  extractCommand,
  isAgentUser,
  createAppJwt,
  loadConfig,
  GitHubWebhookRoutes,
} from "../../src/server/routes/github"

// ---------------------------------------------------------------------------
// verifyWebhookSignature
// ---------------------------------------------------------------------------

describe("verifyWebhookSignature", () => {
  const secret = "test-secret-123"
  const payload = '{"action":"opened"}'

  function sign(s: string, p: string): string {
    return "sha256=" + crypto.createHmac("sha256", s).update(p).digest("hex")
  }

  test("returns true for valid signature", () => {
    const sig = sign(secret, payload)
    expect(verifyWebhookSignature(secret, payload, sig)).toBe(true)
  })

  test("returns false for invalid signature", () => {
    expect(verifyWebhookSignature(secret, payload, "sha256=deadbeef")).toBe(false)
  })

  test("returns false when signature is undefined", () => {
    expect(verifyWebhookSignature(secret, payload, undefined)).toBe(false)
  })

  test("returns false when signature is empty string", () => {
    expect(verifyWebhookSignature(secret, payload, "")).toBe(false)
  })

  test("returns false for wrong secret", () => {
    const sig = sign("wrong-secret", payload)
    expect(verifyWebhookSignature(secret, payload, sig)).toBe(false)
  })

  test("returns false for tampered payload", () => {
    const sig = sign(secret, payload)
    expect(verifyWebhookSignature(secret, '{"action":"closed"}', sig)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// formatPrivateKey
// ---------------------------------------------------------------------------

describe("formatPrivateKey", () => {
  const PEM_HEADER = "-----BEGIN RSA PRIVATE KEY-----"
  const PEM_FOOTER = "-----END RSA PRIVATE KEY-----"
  const BODY = "MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn" // truncated for test

  test("returns PEM as-is when it contains header", () => {
    const pem = `${PEM_HEADER}\n${BODY}\n${PEM_FOOTER}`
    expect(formatPrivateKey(pem)).toBe(pem)
  })

  test("handles escaped newlines in PEM", () => {
    const escaped = `${PEM_HEADER}\\n${BODY}\\n${PEM_FOOTER}`
    const result = formatPrivateKey(escaped)
    expect(result).toContain("\n")
    expect(result).not.toContain("\\n")
  })

  test("decodes base64-encoded PEM", () => {
    const pem = `${PEM_HEADER}\n${BODY}\n${PEM_FOOTER}`
    const b64 = Buffer.from(pem).toString("base64")
    const result = formatPrivateKey(b64)
    expect(result).toBe(pem)
  })

  test("handles PKCS8 format (BEGIN PRIVATE KEY)", () => {
    const pem = `-----BEGIN PRIVATE KEY-----\n${BODY}\n-----END PRIVATE KEY-----`
    expect(formatPrivateKey(pem)).toBe(pem)
  })
})

// ---------------------------------------------------------------------------
// extractCommand
// ---------------------------------------------------------------------------

describe("extractCommand", () => {
  test("extracts /oc command", () => {
    expect(extractCommand("/oc fix the bug")).toBe("fix the bug")
  })

  test("extracts /opencode command", () => {
    expect(extractCommand("/opencode refactor this")).toBe("refactor this")
  })

  test("trims whitespace around body", () => {
    expect(extractCommand("  /oc do something  ")).toBe("do something")
  })

  test("returns null for body without command prefix", () => {
    expect(extractCommand("This is a normal comment")).toBeNull()
  })

  test("returns null for empty string", () => {
    expect(extractCommand("")).toBeNull()
  })

  test("returns null for /oc without space (not a valid prefix)", () => {
    // "/oc " (with space) is the prefix, "/ocfoo" should not match
    expect(extractCommand("/ocfoo")).toBeNull()
  })

  test("handles multi-line commands", () => {
    expect(extractCommand("/oc fix this\nand that too")).toBe("fix this\nand that too")
  })
})

// ---------------------------------------------------------------------------
// isAgentUser
// ---------------------------------------------------------------------------

describe("isAgentUser", () => {
  // Save and restore GITHUB_AGENT_USERNAME
  const originalUsername = process.env.GITHUB_AGENT_USERNAME

  afterAll(() => {
    if (originalUsername !== undefined) {
      process.env.GITHUB_AGENT_USERNAME = originalUsername
    } else {
      delete process.env.GITHUB_AGENT_USERNAME
    }
  })

  test("matches bot usernames (ending with [bot])", () => {
    // Default AGENT_USERNAME is read at module load time, but [bot] suffix check is always true
    expect(isAgentUser("some-app[bot]")).toBe(true)
  })

  test("does not match regular users by default", () => {
    // This depends on AGENT_USERNAME not being "*" or matching the login
    // With default config, regular users should not match unless AGENT_USERNAME is "*"
    const agentUsername = process.env.GITHUB_AGENT_USERNAME || "opencode-agent[bot]"
    if (agentUsername === "*") {
      expect(isAgentUser("regularuser")).toBe(true) // * matches all
    } else {
      expect(isAgentUser("regularuser")).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// createAppJwt
// ---------------------------------------------------------------------------

describe("createAppJwt", () => {
  // Generate a test RSA key pair
  let testPrivateKey: string

  beforeAll(() => {
    const { privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
    })
    testPrivateKey = privateKey
  })

  test("returns a valid JWT with three parts", () => {
    const jwt = createAppJwt(12345, testPrivateKey)
    const parts = jwt.split(".")
    expect(parts.length).toBe(3)
  })

  test("JWT header specifies RS256", () => {
    const jwt = createAppJwt(12345, testPrivateKey)
    const header = JSON.parse(Buffer.from(jwt.split(".")[0], "base64url").toString())
    expect(header.alg).toBe("RS256")
    expect(header.typ).toBe("JWT")
  })

  test("JWT payload contains correct app ID as issuer", () => {
    const jwt = createAppJwt(99999, testPrivateKey)
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString())
    expect(payload.iss).toBe(99999)
  })

  test("JWT payload has valid timestamps", () => {
    const before = Math.floor(Date.now() / 1000)
    const jwt = createAppJwt(12345, testPrivateKey)
    const after = Math.floor(Date.now() / 1000)

    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString())
    // iat should be ~60s before now
    expect(payload.iat).toBeGreaterThanOrEqual(before - 61)
    expect(payload.iat).toBeLessThanOrEqual(after - 59)
    // exp should be ~10 min from now
    expect(payload.exp).toBeGreaterThanOrEqual(before + 9 * 60)
    expect(payload.exp).toBeLessThanOrEqual(after + 11 * 60)
  })

  test("JWT signature is verifiable", () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
    })

    const jwt = createAppJwt(12345, privateKey)
    const [h, p, sig] = jwt.split(".")
    const unsigned = `${h}.${p}`
    const isValid = crypto.verify("RSA-SHA256", Buffer.from(unsigned), publicKey, Buffer.from(sig, "base64url"))
    expect(isValid).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// loadConfig
// ---------------------------------------------------------------------------

describe("loadConfig", () => {
  const savedEnv: Record<string, string | undefined> = {}
  const envKeys = [
    "GITHUB_APP_ID",
    "GITHUB_APP_PRIVATE_KEY",
    "GITHUB_APP_INSTALLATION_ID",
    "GITHUB_WEBHOOK_SECRET",
    "GITHUB_WORKSPACES_DIR",
  ]

  beforeAll(() => {
    for (const key of envKeys) {
      savedEnv[key] = process.env[key]
    }
  })

  afterAll(() => {
    for (const key of envKeys) {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key]
      } else {
        delete process.env[key]
      }
    }
  })

  test("returns null when GITHUB_APP_ID is missing", () => {
    delete process.env.GITHUB_APP_ID
    process.env.GITHUB_APP_PRIVATE_KEY = "test-key"
    process.env.GITHUB_APP_INSTALLATION_ID = "123"
    expect(loadConfig()).toBeNull()
  })

  test("returns null when GITHUB_APP_PRIVATE_KEY is missing", () => {
    process.env.GITHUB_APP_ID = "456"
    delete process.env.GITHUB_APP_PRIVATE_KEY
    process.env.GITHUB_APP_INSTALLATION_ID = "123"
    expect(loadConfig()).toBeNull()
  })

  test("returns null when GITHUB_APP_INSTALLATION_ID is missing", () => {
    process.env.GITHUB_APP_ID = "456"
    process.env.GITHUB_APP_PRIVATE_KEY = "test-key"
    delete process.env.GITHUB_APP_INSTALLATION_ID
    expect(loadConfig()).toBeNull()
  })

  test("returns config when all required env vars are set", () => {
    process.env.GITHUB_APP_ID = "456"
    process.env.GITHUB_APP_PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----"
    process.env.GITHUB_APP_INSTALLATION_ID = "789"
    delete process.env.GITHUB_WEBHOOK_SECRET
    delete process.env.GITHUB_WORKSPACES_DIR

    const config = loadConfig()
    expect(config).not.toBeNull()
    expect(config!.appId).toBe(456)
    expect(config!.installationId).toBe(789)
    expect(config!.webhookSecret).toBeUndefined()
    expect(config!.workspacesDir).toContain("github-workspaces")
  })

  test("uses custom workspaces dir when set", () => {
    process.env.GITHUB_APP_ID = "1"
    process.env.GITHUB_APP_PRIVATE_KEY = "key"
    process.env.GITHUB_APP_INSTALLATION_ID = "2"
    process.env.GITHUB_WORKSPACES_DIR = "/custom/path"

    const config = loadConfig()
    expect(config!.workspacesDir).toBe("/custom/path")
  })
})

// ---------------------------------------------------------------------------
// Route handler (HTTP-level tests)
// ---------------------------------------------------------------------------

describe("webhook route handler", () => {
  test("returns 503 when config is not set", async () => {
    // Save env
    const saved = {
      GITHUB_APP_ID: process.env.GITHUB_APP_ID,
      GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
      GITHUB_APP_INSTALLATION_ID: process.env.GITHUB_APP_INSTALLATION_ID,
    }

    // Clear env to ensure loadConfig returns null
    delete process.env.GITHUB_APP_ID
    delete process.env.GITHUB_APP_PRIVATE_KEY
    delete process.env.GITHUB_APP_INSTALLATION_ID

    try {
      const app = new Hono().route("/github", GitHubWebhookRoutes())
      const res = await app.request("/github/webhook", {
        method: "POST",
        body: JSON.stringify({ action: "opened" }),
        headers: { "Content-Type": "application/json" },
      })
      expect(res.status).toBe(503)
      const json = (await res.json()) as { error: string }
      expect(json.error).toContain("not configured")
    } finally {
      // Restore env
      for (const [k, v] of Object.entries(saved)) {
        if (v !== undefined) process.env[k] = v
        else delete process.env[k]
      }
    }
  })

  test("returns 401 when signature verification fails", async () => {
    const saved = {
      GITHUB_APP_ID: process.env.GITHUB_APP_ID,
      GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
      GITHUB_APP_INSTALLATION_ID: process.env.GITHUB_APP_INSTALLATION_ID,
      GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    }

    process.env.GITHUB_APP_ID = "1"
    process.env.GITHUB_APP_PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----"
    process.env.GITHUB_APP_INSTALLATION_ID = "2"
    process.env.GITHUB_WEBHOOK_SECRET = "my-secret"

    try {
      const app = new Hono().route("/github", GitHubWebhookRoutes())
      const res = await app.request("/github/webhook", {
        method: "POST",
        body: JSON.stringify({ action: "opened" }),
        headers: {
          "Content-Type": "application/json",
          "x-hub-signature-256": "sha256=invalidsignature",
          "x-github-event": "issues",
        },
      })
      expect(res.status).toBe(401)
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v !== undefined) process.env[k] = v
        else delete process.env[k]
      }
    }
  })

  test("accepts webhook without secret when GITHUB_WEBHOOK_SECRET is not set", async () => {
    const saved = {
      GITHUB_APP_ID: process.env.GITHUB_APP_ID,
      GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
      GITHUB_APP_INSTALLATION_ID: process.env.GITHUB_APP_INSTALLATION_ID,
      GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    }

    process.env.GITHUB_APP_ID = "1"
    process.env.GITHUB_APP_PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----"
    process.env.GITHUB_APP_INSTALLATION_ID = "2"
    delete process.env.GITHUB_WEBHOOK_SECRET

    try {
      const app = new Hono().route("/github", GitHubWebhookRoutes())
      const payload = JSON.stringify({
        action: "opened",
        repository: { owner: { login: "testowner" }, name: "testrepo" },
        issue: { number: 1 },
      })
      const res = await app.request("/github/webhook", {
        method: "POST",
        body: payload,
        headers: {
          "Content-Type": "application/json",
          "x-github-event": "issues",
          "x-github-delivery": "test-delivery-123",
        },
      })
      expect(res.status).toBe(200)
      const json = (await res.json()) as { status: string; event: string }
      expect(json.status).toBe("accepted")
      expect(json.event).toBe("issues")
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v !== undefined) process.env[k] = v
        else delete process.env[k]
      }
    }
  })

  test("passes signature verification with valid HMAC", async () => {
    const saved = {
      GITHUB_APP_ID: process.env.GITHUB_APP_ID,
      GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
      GITHUB_APP_INSTALLATION_ID: process.env.GITHUB_APP_INSTALLATION_ID,
      GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    }

    const secret = "webhook-secret-for-test"
    process.env.GITHUB_APP_ID = "1"
    process.env.GITHUB_APP_PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----"
    process.env.GITHUB_APP_INSTALLATION_ID = "2"
    process.env.GITHUB_WEBHOOK_SECRET = secret

    try {
      const app = new Hono().route("/github", GitHubWebhookRoutes())
      const payload = JSON.stringify({
        action: "opened",
        repository: { owner: { login: "testowner" }, name: "testrepo" },
        issue: { number: 42 },
      })
      const signature =
        "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex")
      const res = await app.request("/github/webhook", {
        method: "POST",
        body: payload,
        headers: {
          "Content-Type": "application/json",
          "x-github-event": "issues",
          "x-github-delivery": "test-delivery-456",
          "x-hub-signature-256": signature,
        },
      })
      expect(res.status).toBe(200)
      const json = (await res.json()) as { status: string }
      expect(json.status).toBe("accepted")
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v !== undefined) process.env[k] = v
        else delete process.env[k]
      }
    }
  })
})
