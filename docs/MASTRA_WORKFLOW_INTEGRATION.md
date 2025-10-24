# Mastra Workflow Integration - Status and Issues

## Overview

This document tracks the attempt to integrate Mastra workflows into the causal inference assistant for better orchestration of the multi-step causal analysis process.

## Goal

Replace the manual step-by-step orchestration in `ChatWorkflowOrchestrator` with Mastra's workflow engine to get:
- Graph-based orchestration with clear step dependencies
- Conditional branching (e.g., skip EDA if data quality is poor)
- Suspend/resume for user input (e.g., waiting for dataset upload)
- Progress streaming with `.watch()` events
- Better error handling and retry logic

## Current Status: ⚠️ BLOCKED

**Issue**: API mismatch between Mastra documentation and installed version

### Package Version History

1. **Initial Version**: `@mastra/core@0.1.26`
   - Did not include `Workflow` or `Step` classes
   - Only had low-level workflow types for API-based workflows
   - Missing: `createWorkflow`, `createStep`, `.then()`, `.commit()` methods

2. **Updated Version**: `@mastra/core@0.22.2` (latest as of 2025-10-23)
   - **DOES** include `Workflow` and `Step` classes
   - **BUT** API is completely different from documentation

### API Mismatch Details

#### Documentation Shows (from Context7 MCP):

```typescript
import { Workflow, Step } from '@mastra/core/workflows';

const myWorkflow = new Workflow({
  name: "my-workflow",
  triggerSchema: z.object({ input: z.number() }),
});

const stepOne = new Step({
  id: "stepOne",
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.object({ doubledValue: z.number() }),
  execute: async ({ context }) => {
    const doubledValue = context?.triggerData?.input * 2;
    return { doubledValue };
  },
});

myWorkflow.step(stepOne).commit();

const { runId, start } = myWorkflow.createRun();
const res = await start({ triggerData: { input: 90 } });
```

**Key features from docs:**
- Simple constructor with `name` and `triggerSchema`
- `execute` function receives `{ context }` with `triggerData`
- `.step()` and `.commit()` methods for chaining
- `.createRun()` returns `{ runId, start }`
- `.start({ triggerData })` to execute

#### Actual v0.22.2 API:

```typescript
// From node_modules/@mastra/core/dist/workflows/workflow.d.ts
export declare class Workflow<
  TEngineType = any,
  TSteps extends Step<string, any, any, any, any, any, TEngineType>[] = Step<...>[],
  TWorkflowId extends string = string,
  TState extends z.ZodObject<any> = z.ZodObject<any>,
  TInput extends z.ZodType<any> = z.ZodType<any>,
  TOutput extends z.ZodType<any> = z.ZodType<any>,
  TPrevSchema extends z.ZodType<any> = TInput
> extends MastraBase implements Step<TWorkflowId, TState, TInput, TOutput, any, any, DefaultEngineType>
```

**Key differences:**
1. **Complex generics**: 7 generic type parameters with intricate relationships
2. **Different execute signature**:
   ```typescript
   type ExecuteFunctionParams<TState, TStepInput, TResumeSchema, TSuspendSchema, EngineType> = {
     runId: string;
     resourceId?: string;
     workflowId: string;
     mastra: Mastra;  // Requires Mastra instance
     runtimeContext: RuntimeContext;  // Requires RuntimeContext
     inputData: TStepInput;  // Not context.triggerData
     state: TState;
     setState(state: TState): void;
     resumeData?: TResumeSchema;
     runCount: number;
     tracingContext: TracingContext;
     getInitData<T extends z.ZodType<any>>(): z.infer<T>;
     getStepResult<T extends Step<...>>(stepId: T): ...;
     suspend(...): Promise<any>;
     bail(result: any): any;
     abort(): any;
     [EMITTER_SYMBOL]: Emitter;
     [STREAM_FORMAT_SYMBOL]: 'legacy' | 'vnext' | undefined;
     engine: EngineType;
     abortSignal: AbortSignal;
     writer: ToolStream<ChunkType>;
     validateSchemas?: boolean;
   };
   ```
3. **Requires infrastructure**: Needs `Mastra` instance, `RuntimeContext`, tracing setup
4. **No simple chaining**: Methods like `.step()`, `.then()`, `.commit()` may have different signatures

### Why This Is Blocking

1. **Documentation is outdated**: The docs fetched from Context7 MCP are for a different (possibly newer or older) version
2. **Breaking API changes**: Mastra is pre-1.0 and has had significant breaking changes
3. **Insufficient type information**: Without working examples for v0.22.2, it's unclear how to:
   - Initialize a `Workflow` instance correctly
   - Set up the required `Mastra` and `RuntimeContext` infrastructure
   - Chain steps together
   - Execute the workflow

4. **Time investment**: Properly learning the v0.22.2 API would require:
   - Reading source code in `node_modules/@mastra/core/dist/workflows/`
   - Finding working examples (none in our docs)
   - Setting up Mastra infrastructure (may require database, etc.)
   - Rewriting all workflow code to match new API

## Files Created (Incomplete)

### `src/orchestration/causal-workflow.ts`

**Status**: Created but has compilation errors due to API mismatch

**What it was supposed to do**:
- Define three workflow steps: `formulationStep`, `edaStep`, `estimationStep`
- Chain them sequentially: formulation → eda → estimation → finalization
- Handle agent execution within each step
- Send progress updates to chat UI
- Return structured results

**Issues**:
```
ERROR: Module not found: '@mastra/core/workflows'
- Tried importing { Workflow, Step } from '@mastra/core/workflows'
- Actual import should be from '@mastra/core' but API is different

ERROR: context parameter has implicit 'any' type
- execute: async ({ context }) => { ... }
- v0.22.2 has different parameter structure with many required fields

ERROR: Property 'violations' does not exist
- Tried accessing result.data?.violations
- Type inference broken due to API mismatch
```

### `src/commands/test-mastra-workflow.command.ts`

**Status**: Created but references non-working workflow

**Purpose**: Test command to execute full workflow with demo dataset

**Would have tested**:
- Dataset creation
- Full workflow execution through Mastra
- Progress streaming to chat UI

### Updated Files

1. **`src/orchestration/chat-workflow-orchestrator.ts`**
   - Added `executeFullWorkflow()` method (now broken)
   - Imports `executeCausalWorkflow` (doesn't exist)

2. **`src/orchestration/index.ts`**
   - Exports `causalInferenceWorkflow, executeCausalWorkflow` (broken)

3. **`package.json`**
   - Added command: `causal-assistant.testMastraWorkflow`

4. **`src/extension/extension.ts`**
   - Registered `testMastraWorkflowCommand` (broken)

## What's Working (Current System)

The existing orchestration in `ChatWorkflowOrchestrator` **DOES WORK** and provides:

✅ **LLM-powered intent detection** via `PlannerAgent`
✅ **Conversational improvements**:
- Greeting detection ("what's your name" → friendly introduction)
- Help detection ("how do i load data" → specific instructions)
- Affirmative detection ("yes" → contextual next steps)

✅ **Multi-agent orchestration**:
- Routes to appropriate agent based on intent
- Checks prerequisites before execution
- Shows execution plans to users
- Suggests next steps after completion

✅ **Session management**:
- Maintains conversation history
- Tracks current workflow stage
- Preserves shared context across steps

## Recommendations

### Option 1: Wait for Mastra Stability (RECOMMENDED)

**Pros**:
- Mastra is pre-1.0, will likely stabilize API
- Documentation will catch up to implementation
- Community examples will emerge

**Cons**:
- Timeline unknown
- May have more breaking changes

**Action**:
- Keep current orchestration working
- Monitor Mastra releases
- Revisit when v1.0 is released

### Option 2: Deep Dive into v0.22.2 API

**Pros**:
- Would get Mastra benefits now
- Learning opportunity

**Cons**:
- Significant time investment (4-8 hours estimated)
- May break again with next Mastra update
- Requires understanding Mastra infrastructure (Mastra class, RuntimeContext, etc.)

**Action**:
- Read source code in `node_modules/@mastra/core/dist/workflows/`
- Look for examples in Mastra GitHub repo
- Set up required infrastructure
- Rewrite workflow from scratch

### Option 3: Build Custom Workflow Engine

**Pros**:
- Full control over API
- No external dependency risk
- Tailored to our needs

**Cons**:
- Reinventing the wheel
- Miss out on Mastra features (streaming, suspend/resume, etc.)

**Action**:
- Create simple `WorkflowEngine` class
- Implement step chaining, error handling, progress tracking
- Keep door open to Mastra migration later

## Next Steps

**Immediate** (User's choice to keep Mastra work):
1. ✅ Document issues thoroughly (this file)
2. ⏳ Comment out broken imports/exports to allow compilation
3. ⏳ Add TODO markers in code referencing this document
4. ⏳ Keep Mastra in package.json for future use

**Short-term** (Focus on what works):
1. ✅ Conversational improvements are complete and working
2. ⏳ Test the improved conversation flow with real user interactions
3. ⏳ Polish existing orchestration based on user feedback
4. ⏳ Add more sophisticated intent detection patterns

**Long-term** (When ready for Mastra):
1. Monitor Mastra releases and documentation updates
2. Test new versions against our use case
3. Implement when API stabilizes

## References

- Mastra docs: https://mastra.ai/en/docs/workflows/overview
- Installed version: `@mastra/core@0.22.2`
- Type definitions: `node_modules/@mastra/core/dist/workflows/*.d.ts`
- Context7 documentation: May be for different version (needs verification)

## Compilation Errors Log

```
ERROR in ./src/orchestration/causal-workflow.ts 9:20-53
Module not found: Error: Can't resolve '@mastra/core/workflows'

ERROR in /Users/vishal/Projects/causol/src/orchestration/causal-workflow.ts(6,32)
TS2307: Cannot find module '@mastra/core/workflows' or its corresponding type declarations.

ERROR in /Users/vishal/Projects/causol/src/orchestration/causal-workflow.ts(37,7)
TS6133: 'CausalWorkflowOutput' is declared but its value is never read.

ERROR in /Users/vishal/Projects/causol/src/orchestration/causal-workflow.ts(53,21)
TS7031: Binding element 'context' implicitly has an 'any' type.

ERROR in /Users/vishal/Projects/causol/src/orchestration/causal-workflow.ts(106,21)
TS7031: Binding element 'context' implicitly has an 'any' type.

ERROR in /Users/vishal/Projects/causol/src/orchestration/causal-workflow.ts(160,35)
TS2339: Property 'violations' does not exist on type '{}'.

ERROR in /Users/vishal/Projects/causol/src/orchestration/causal-workflow.ts(170,21)
TS7031: Binding element 'context' implicitly has an 'any' type.

ERROR in /Users/vishal/Projects/causol/src/orchestration/causal-workflow.ts(222,36)
TS2339: Property 'interpretation' does not exist on type '{}'.

ERROR in /Users/vishal/Projects/causol/src/orchestration/causal-workflow.ts(232,21)
TS7031: Binding element 'context' implicitly has an 'any' type.
```

---

**Last Updated**: 2025-10-23
**Status**: Documentation complete, awaiting decision on next steps
