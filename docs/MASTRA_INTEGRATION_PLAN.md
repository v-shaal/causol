# Mastra Workflow Integration Plan

**Date**: 2025-10-23
**Mastra Version**: @mastra/core@0.22.2
**Goal**: Integrate Mastra workflows for orchestrating causal inference analysis

---

## API Analysis

### Available Workflow APIs in v0.22.2

Mastra v0.22.2 provides **TWO** workflow APIs:

#### 1. **Legacy API** (Stable, Well-Documented)
```typescript
import { Workflow, Step } from "@mastra/core/workflows";

// Create workflow
const workflow = new Workflow({
  name: "my-workflow",
  triggerSchema: z.object({ input: z.string() }),
});

// Create steps
const step1 = new Step({
  id: "step1",
  inputSchema: z.object({ value: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ context }) => {
    // Access trigger data
    const input = context?.triggerData?.input;
    return { result: `Processed: ${input}` };
  },
});

// Chain steps
workflow.step(step1).commit();

// Execute
const { runId, start } = workflow.createRun();
const result = await start({ triggerData: { input: "test" } });
```

**Pros:**
- ✅ Simple API, clear documentation
- ✅ Direct access to `context.triggerData`
- ✅ Step results accessible via `context.steps.stepId.output`
- ✅ `.step()`, `.then()`, `.commit()` chaining
- ✅ Event-driven with `.afterEvent()` for suspend/resume

**Cons:**
- ⚠️ Marked as "legacy" (may be deprecated in future)

#### 2. **VNext API** (Modern, Less Documented)
```typescript
import { createWorkflow, createStep } from "@mastra/core/workflows/vNext";

// Create steps
const step1 = createStep({
  id: "step-1",
  inputSchema: z.object({ value: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }) => {
    return { result: `Processed: ${inputData.value}` };
  },
});

// Create workflow
const workflow = createWorkflow({
  id: "my-workflow",
  inputSchema: z.object({ value: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  steps: [step1],
})
  .then(step1)
  .commit();
```

**Pros:**
- ✅ Modern API design
- ✅ Functional approach with `createWorkflow`/`createStep`

**Cons:**
- ⚠️ Less documentation available
- ⚠️ Different parameter structure (`inputData` vs `context`)
- ⚠️ May require Mastra instance for tool integration

---

## Recommended Approach: Legacy API

**Decision**: Use **Legacy Workflow API** for implementation

**Rationale**:
1. **Better Documentation**: More examples and clearer patterns
2. **Proven Stability**: Widely used in documentation examples
3. **Easier Context Access**: `context.triggerData` and `context.steps` are straightforward
4. **Event Support**: Built-in `.afterEvent()` for future dataset loading suspension
5. **Migration Path**: Can migrate to VNext later if needed

---

## Implementation Plan

### Phase 1: Create Workflow Steps

#### Step 1: Formulation Step
```typescript
const formulationStep = new Step({
  id: "formulation",
  inputSchema: z.object({
    userMessage: z.string(),
    sharedContext: z.any().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    treatment: z.string().optional(),
    outcome: z.string().optional(),
    confounders: z.array(z.string()).optional(),
    researchQuestion: z.string().optional(),
    sharedContext: z.any(),
  }),
  execute: async ({ context }) => {
    const chatProvider = getChatProvider();
    chatProvider?.sendSystemMessage('🔍 Analyzing your causal question...');

    const userMessage = context?.triggerData?.userMessage;
    const sharedContext = context?.triggerData?.sharedContext || {};

    const agent = new FormulationAgent();
    const task = {
      id: 'workflow-formulation',
      stage: WorkflowStage.FORMULATION,
      description: 'Formulate causal question',
      input: userMessage,
    };

    const result = await agent.execute(task, sharedContext);

    if (result.success && result.data) {
      const formData = result.data;
      Object.assign(sharedContext, {
        treatment: formData.treatment,
        outcome: formData.outcome,
        confounders: formData.confounders || [],
        researchQuestion: formData.researchQuestion,
      });

      chatProvider?.sendAssistantMessage(
        `**Causal Question Formulated:**\n\n${formData.researchQuestion}\n\n` +
        `- Treatment: ${formData.treatment}\n` +
        `- Outcome: ${formData.outcome}\n` +
        `- Confounders: ${formData.confounders?.join(', ')}`,
        { agentName: 'Formulation Agent', type: 'agent-output' }
      );
    }

    return {
      success: result.success,
      treatment: sharedContext.treatment,
      outcome: sharedContext.outcome,
      confounders: sharedContext.confounders,
      researchQuestion: sharedContext.researchQuestion,
      sharedContext,
    };
  },
});
```

#### Step 2: EDA Step
```typescript
const edaStep = new Step({
  id: "eda",
  inputSchema: z.object({
    sharedContext: z.any(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    hasViolations: z.boolean().optional(),
    sharedContext: z.any(),
  }),
  execute: async ({ context }) => {
    const chatProvider = getChatProvider();
    chatProvider?.sendSystemMessage('📊 Checking causal assumptions...');

    // Get shared context from formulation step
    const sharedContext = context?.steps?.formulation?.output?.sharedContext;

    if (!sharedContext?.dataset) {
      chatProvider?.sendError('No dataset loaded. Please load data first.');
      return {
        success: false,
        hasViolations: false,
        sharedContext,
      };
    }

    const agent = new EDAAgent();
    const task = {
      id: 'workflow-eda',
      stage: WorkflowStage.EDA,
      description: 'Check causal assumptions',
      input: 'Perform exploratory data analysis',
    };

    const result = await agent.execute(task, sharedContext);

    if (result.success && result.data) {
      chatProvider?.sendAssistantMessage(
        `**Data Analysis Complete:**\n\n${result.data.summary}`,
        { agentName: 'EDA Agent', type: 'agent-output' }
      );
    }

    return {
      success: result.success,
      hasViolations: result.data?.violations?.length > 0,
      sharedContext,
    };
  },
});
```

#### Step 3: Estimation Step
```typescript
const estimationStep = new Step({
  id: "estimation",
  inputSchema: z.object({
    sharedContext: z.any(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    interpretation: z.string().optional(),
    sharedContext: z.any(),
  }),
  execute: async ({ context }) => {
    const chatProvider = getChatProvider();
    chatProvider?.sendSystemMessage('📈 Estimating causal effect...');

    const sharedContext = context?.steps?.eda?.output?.sharedContext;

    // Set adjustment set from confounders
    sharedContext.adjustmentSet = sharedContext.confounders || [];

    const agent = new EstimationAgent();
    const task = {
      id: 'workflow-estimation',
      stage: WorkflowStage.ESTIMATION,
      description: 'Estimate causal effect',
      input: `Estimate effect of ${sharedContext.treatment} on ${sharedContext.outcome}`,
    };

    const result = await agent.execute(task, sharedContext);

    if (result.success && result.data) {
      chatProvider?.sendAssistantMessage(
        `**Causal Effect Estimation:**\n\n${result.data.explanation}`,
        { agentName: 'Estimation Agent', type: 'agent-output' }
      );

      if (result.data.interpretation) {
        chatProvider?.sendAssistantMessage(
          `**Interpretation:** ${result.data.interpretation}`,
          { agentName: 'Estimation Agent', type: 'text' }
        );
      }
    }

    return {
      success: result.success,
      interpretation: result.data?.interpretation,
      sharedContext,
    };
  },
});
```

### Phase 2: Create and Chain Workflow

```typescript
// Create workflow
export const causalInferenceWorkflow = new Workflow({
  name: "causal-inference-workflow",
  triggerSchema: z.object({
    userMessage: z.string(),
    sharedContext: z.any().optional(),
  }),
});

// Chain steps sequentially
causalInferenceWorkflow
  .step(formulationStep)
  .then(edaStep)
  .then(estimationStep)
  .commit();
```

### Phase 3: Execute Workflow

```typescript
export async function executeCausalWorkflow(
  userMessage: string,
  sharedContext?: SharedContext
): Promise<any> {
  const { runId, start } = causalInferenceWorkflow.createRun();

  const result = await start({
    triggerData: {
      userMessage,
      sharedContext: sharedContext || {},
    },
  });

  return result;
}
```

### Phase 4: Integrate into ChatOrchestrator

```typescript
// In chat-workflow-orchestrator.ts

public async executeFullWorkflow(userMessage: string): Promise<void> {
  const chatProvider = getChatProvider();
  if (!chatProvider) return;

  if (!this.currentSession) {
    this.startNewSession();
  }

  chatProvider.sendSystemMessage('🚀 Starting complete causal inference workflow...');

  try {
    const result = await executeCausalWorkflow(
      userMessage,
      this.currentSession!.sharedContext
    );

    if (result.results) {
      // Update session context from final step
      const finalContext = result.results.estimation?.output?.sharedContext;
      if (finalContext) {
        this.currentSession!.sharedContext = finalContext;
      }

      // Update workflow stage
      this.currentSession!.currentStage = WorkflowStage.ESTIMATION;

      chatProvider.sendSystemMessage('✅ Workflow completed successfully!');
    } else {
      chatProvider.sendError(`Workflow failed: ${result.status || 'Unknown error'}`);
    }
  } catch (error) {
    chatProvider.sendError(`Workflow execution failed: ${error}`);
    console.error('Mastra workflow error:', error);
  }
}
```

---

## File Structure

```
src/orchestration/
├── causal-workflow.ts          # Workflow definition and steps
├── chat-workflow-orchestrator.ts   # Integration with chat orchestrator
└── index.ts                    # Exports

src/commands/
└── test-mastra-workflow.command.ts  # Test command for full workflow
```

---

## Testing Strategy

### Test 1: Individual Step Testing
```typescript
// Test each step independently
const testFormulation = async () => {
  const step = formulationStep;
  const mockContext = {
    triggerData: {
      userMessage: "Does education affect income?",
      sharedContext: {},
    },
  };

  const result = await step.execute({ context: mockContext });
  console.log('Formulation result:', result);
};
```

### Test 2: Full Workflow Testing
```typescript
// Test complete workflow with demo dataset
const testFullWorkflow = async () => {
  // 1. Create demo dataset
  // 2. Execute workflow with causal question
  // 3. Verify all steps complete
  // 4. Check final results
};
```

### Test 3: Chat Integration Testing
```typescript
// Test workflow through chat UI
// 1. User asks causal question
// 2. PlannerAgent detects full workflow intent
// 3. executeFullWorkflow() is called
// 4. Progress updates appear in chat
// 5. Final results displayed
```

---

## Benefits of Mastra Integration

### What We Get:

1. **Declarative Workflow**: Steps and dependencies defined clearly
2. **Better Error Handling**: Built-in error propagation between steps
3. **Context Passing**: Automatic context passing between steps via `context.steps.stepId.output`
4. **Execution Tracking**: RunId and status tracking for each workflow execution
5. **Event Support**: Ready for `.afterEvent()` to suspend for dataset loading
6. **Reproducibility**: Workflow can be executed multiple times with different inputs

### Future Enhancements:

1. **Conditional Branching**:
   ```typescript
   workflow
     .step(formulation)
     .then(eda)
     .then(estimationMethodA, {
       when: { ref: { step: eda, path: "hasViolations" }, query: { $eq: false } }
     })
     .then(estimationMethodB, {
       when: { ref: { step: eda, path: "hasViolations" }, query: { $eq: true } }
     });
   ```

2. **Dataset Loading Suspension**:
   ```typescript
   workflow
     .step(formulation)
     .afterEvent("datasetLoaded")  // Suspend until user loads data
     .then(eda)
     .then(estimation);
   ```

3. **Progress Streaming**:
   - Watch workflow events for real-time updates
   - Stream progress to chat UI

---

## Migration from Current System

### Current Architecture:
```
User Message → PlannerAgent → ChatOrchestrator → Agent (Formulation/EDA/Estimation)
                                      ↓
                              Manual orchestration with if/else
```

### New Architecture:
```
User Message → PlannerAgent → ChatOrchestrator → executeCausalWorkflow()
                                                         ↓
                                                  Mastra Workflow Engine
                                                         ↓
                                        Formulation → EDA → Estimation
```

### Coexistence Strategy:

**Keep both approaches:**
1. **Current**: Step-by-step with PlannerAgent (for chat interactions)
2. **New**: Full workflow with Mastra (for complete analysis)

**User Choice**:
- Chat interactions: Use current PlannerAgent approach (more flexible)
- "Run full analysis" command: Use Mastra workflow (automated, reproducible)

---

## Implementation Timeline

### Phase 1: Core Workflow (2-3 hours)
- ✅ API analysis and planning
- ⏳ Create workflow file with 3 steps
- ⏳ Implement step execution logic
- ⏳ Add Zod schemas
- ⏳ Test individual steps

### Phase 2: Integration (1-2 hours)
- ⏳ Add executeFullWorkflow() to ChatOrchestrator
- ⏳ Connect to PlannerAgent intent detection
- ⏳ Add progress updates to chat UI
- ⏳ Error handling and recovery

### Phase 3: Testing (1 hour)
- ⏳ Create test command
- ⏳ Test with demo dataset
- ⏳ Test through chat UI
- ⏳ Verify all steps complete correctly

### Phase 4: Polish (30 mins)
- ⏳ Update documentation
- ⏳ Add comments and type safety
- ⏳ Clean up unused code

**Total Estimated Time**: 4-6 hours

---

## Success Criteria

✅ Workflow compiles without errors
✅ All three steps execute in sequence
✅ Context passes correctly between steps
✅ Results displayed in chat UI
✅ Error handling works properly
✅ Demo dataset test passes
✅ Full workflow accessible via chat command

---

## Next Steps

1. **Create** `src/orchestration/causal-workflow.ts` with steps
2. **Implement** workflow chaining and execution function
3. **Update** ChatOrchestrator with executeFullWorkflow()
4. **Create** test command for validation
5. **Test** end-to-end with demo dataset
6. **Document** usage and examples

---

**Status**: Ready to implement
**API**: Legacy Workflow API from `@mastra/core/workflows`
**Estimated Completion**: 4-6 hours
