type WorkflowArgumentType = "string" | "number" | "boolean"

type WorkflowArgument = {
  type?: WorkflowArgumentType
  default?: unknown
  description?: string
}

type WorkflowArguments = Record<string, WorkflowArgument>

type WorkflowArgumentValue<T extends WorkflowArgument> = T["type"] extends "number"
  ? number
  : T["type"] extends "boolean"
    ? boolean
    : string

type WorkflowArgs<Args extends WorkflowArguments | undefined> = Args extends WorkflowArguments
  ? { readonly [Key in keyof Args]?: WorkflowArgumentValue<Args[Key]> }
  : Record<string, unknown>

export type WorkflowAgentInput = {
  prompt: string
  agent?: string
  model?: string
  variant?: string
  files?: string[]
  schema?: Record<string, unknown>
  onError?: "fail" | "null"
}

export type WorkflowAgentResult = {
  data: unknown
  text: string
}

export type WorkflowParallelOptions = { concurrencyLimit?: number }
export type WorkflowPipelineOptions = { concurrencyLimit?: number }

export interface WorkflowToolFn {
  (name: string, args?: Record<string, unknown>, options?: { timeout?: number; onError: "null" }): Promise<{
    output: string
    metadata?: Record<string, unknown>
  } | null>
  (
    name: string,
    args?: Record<string, unknown>,
    options?: { timeout?: number; onError?: "fail" | "null" },
  ): Promise<{
    output: string
    metadata?: Record<string, unknown>
  }>
}

export interface WorkflowPipelineFn {
  <I, A>(
    items: readonly I[],
    s1: (prev: I, item: I, index: number) => Promise<A>,
    options?: WorkflowPipelineOptions,
  ): Promise<(A | null)[]>
  <I, A, B>(
    items: readonly I[],
    s1: (prev: I, item: I, index: number) => Promise<A>,
    s2: (prev: A, item: I, index: number) => Promise<B>,
    options?: WorkflowPipelineOptions,
  ): Promise<(B | null)[]>
  <I, A, B, C>(
    items: readonly I[],
    s1: (prev: I, item: I, index: number) => Promise<A>,
    s2: (prev: A, item: I, index: number) => Promise<B>,
    s3: (prev: B, item: I, index: number) => Promise<C>,
    options?: WorkflowPipelineOptions,
  ): Promise<(C | null)[]>
}

export type WorkflowContext = {
  readonly budgetRemaining: number
  readonly budget: {
    readonly total: null
    spent(): number
    remaining(): number
    readonly tokensTotal: null
    tokensSpent(): number
    tokensRemaining(): number
  }
  setPhase(phase: string): void
  log(message: string): void
  parallel<T>(tasks: readonly (() => Promise<T>)[], options?: WorkflowParallelOptions): Promise<(T | null)[]>
  pipeline: WorkflowPipelineFn
  agent(input: WorkflowAgentInput): Promise<WorkflowAgentResult | null>
  tool: WorkflowToolFn
  shell(command: string, opts?: { timeout?: number; cwd?: string }): Promise<{ output: string; exitCode: number }>
  workflow(name: string, args?: Record<string, unknown>): Promise<unknown>
  question(input: { question: string; options?: readonly string[]; timeout?: number }): Promise<{ answer: string }>
}

export type WorkflowPhase = string | { title: string; detail?: string; model?: string }

export type WorkflowDefinition<Args extends WorkflowArguments | undefined = WorkflowArguments | undefined> = {
  meta: {
    name: string
    description?: string
    whenToUse?: string
    phases?: readonly WorkflowPhase[]
    arguments?: Args
  }
  run(args: WorkflowArgs<Args>, ctx: WorkflowContext): Promise<unknown>
}

export function workflow<const Args extends WorkflowArguments | undefined = undefined>(input: {
  name: string
  description?: string
  whenToUse?: string
  phases?: readonly WorkflowPhase[]
  arguments?: Args
  run(args: WorkflowArgs<Args>, ctx: WorkflowContext): Promise<unknown>
}): WorkflowDefinition<Args> {
  return {
    meta: {
      name: input.name,
      description: input.description,
      whenToUse: input.whenToUse,
      phases: input.phases,
      arguments: input.arguments,
    },
    run: input.run,
  }
}
