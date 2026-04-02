import { ServiceMap } from "effect"

// Avoid importing from @/project/instance to prevent circular dependency:
// instance-ref.ts → instance.ts → project.ts → run-service.ts → instance-ref.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const InstanceRef = ServiceMap.Reference<any>("~opencode/InstanceRef", {
  defaultValue: () => undefined,
})
