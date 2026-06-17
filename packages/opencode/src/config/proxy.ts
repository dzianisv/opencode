import { Schema } from "effect"

export const Info = Schema.Struct({
  url: Schema.optional(Schema.String).annotate({ description: "Proxy URL (e.g. http://proxy.example.com:8080)" }),
  noProxy: Schema.optional(Schema.mutable(Schema.Array(Schema.String))).annotate({
    description: "List of hosts to bypass the proxy for",
  }),
})
export type Info = Schema.Schema.Type<typeof Info>

export * as ConfigProxy from "./proxy"
