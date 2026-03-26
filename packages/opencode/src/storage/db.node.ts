import { createRequire } from "node:module"
import { DatabaseSync } from "node:sqlite"

const drizzle = createRequire(import.meta.url)("drizzle-orm/node-sqlite").drizzle as (
  input: { client: DatabaseSync },
) => {
  run(sql: string): void
  $client: DatabaseSync
}

export function init(path: string) {
  const sqlite = new DatabaseSync(path)
  return drizzle({ client: sqlite })
}
