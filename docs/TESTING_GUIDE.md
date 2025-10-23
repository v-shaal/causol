# Agent Testing Guide

**Purpose**: Manual testing instructions to verify all 5 agents work correctly with real LLM calls.

---

## Prerequisites

1. **OpenAI API Key**: Set in your environment
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   # OR create .env file with OPENAI_API_KEY=your-api-key-here
   ```

2. **Dependencies Installed**:
   ```bash
   npm install
   ```

3. **Build the Project**:
   ```bash
   npm run compile
   ```

---

## Test 1: FormulationAgent

### What It Tests
- Extracts treatment, outcome, population from natural language
- Identifies causal issues (reverse causation, vagueness)
- Provides refinement suggestions
- Assesses feasibility

### Test Script

Create: `scripts/test-formulation-agent.ts`

```typescript
import { FormulationAgent } from '../src/agents/formulation-agent';
import { WorkflowStage } from '../src/types/workflow.types';

async function testFormulationAgent() {
  console.log('🧪 Testing FormulationAgent\n');

  const agent = new FormulationAgent();

  // Test Case 1: Clear research question
  console.log('📋 Test Case 1: Clear Question');
  const task1 = {
    id: 'test-1',
    stage: WorkflowStage.FORMULATION,
    description: 'Formulate research question',
    input: 'Does regular aerobic exercise reduce the risk of heart disease in adults aged 40-65?',
  };

  const context1 = { confounders: [] };
  const result1 = await agent.execute(task1, context1);

  console.log('Result:', JSON.stringify(result1, null, 2));
  console.log('\n---\n');

  // Test Case 2: Vague research question
  console.log('📋 Test Case 2: Vague Question');
  const task2 = {
    id: 'test-2',
    stage: WorkflowStage.FORMULATION,
    description: 'Formulate research question',
    input: 'Does social media make people unhappy?',
  };

  const context2 = { confounders: [] };
  const result2 = await agent.execute(task2, context2);

  console.log('Result:', JSON.stringify(result2, null, 2));
  console.log('\n---\n');

  // Test Case 3: Potential reverse causation
  console.log('📋 Test Case 3: Reverse Causation Risk');
  const task3 = {
    id: 'test-3',
    stage: WorkflowStage.FORMULATION,
    description: 'Formulate research question',
    input: 'Does poverty cause crime?',
  };

  const context3 = { confounders: [] };
  const result3 = await agent.execute(task3, context3);

  console.log('Result:', JSON.stringify(result3, null, 2));
}

testFormulationAgent().catch(console.error);
```

### Run Test
```bash
npx ts-node scripts/test-formulation-agent.ts
```

### Expected Output
✅ **Success Criteria**:
- `result.success` = true
- `result.data.treatment` is extracted
- `result.data.outcome` is extracted
- `result.data.issues` contains relevant causal concerns
- `result.data.suggestions` provides actionable refinements
- `result.data.feasibility` is HIGH/MEDIUM/LOW

---

## Test 2: EDAAgent

### What It Tests
- Generates Python code for causal assumption checking
- Checks: positivity, balance, missing data, overlap
- Identifies assumption violations
- Provides severity levels

### Test Script

Create: `scripts/test-eda-agent.ts`

```typescript
import { EDAAgent } from '../src/agents/eda-agent';
import { WorkflowStage } from '../src/types/workflow.types';

async function testEDAAgent() {
  console.log('🧪 Testing EDAAgent\n');

  const agent = new EDAAgent();

  const task = {
    id: 'test-eda-1',
    stage: WorkflowStage.EDA,
    description: 'Perform causal EDA',
    input: {},
  };

  const context = {
    treatment: 'exercise_hours_per_week',
    outcome: 'heart_disease',
    confounders: ['age', 'gender', 'bmi', 'smoking_status'],
    dataset: {
      name: 'health_study',
      rows: 5000,
      columns: ['exercise_hours_per_week', 'heart_disease', 'age', 'gender', 'bmi', 'smoking_status'],
    },
  };

  const result = await agent.execute(task, context);

  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.success && result.data) {
    const edaResult = result.data as any;
    console.log('\n📊 Generated Python Code:\n');
    console.log(edaResult.pythonCode);
  }
}

testEDAAgent().catch(console.error);
```

### Run Test
```bash
npx ts-node scripts/test-eda-agent.ts
```

### Expected Output
✅ **Success Criteria**:
- `result.success` = true
- `result.data.pythonCode` contains executable Python code
- Code includes: imports, positivity check, balance check
- `result.data.checks` array has multiple check types
- `result.data.summary` provides overview
- Code uses pandas, numpy, statsmodels

---

## Test 3: DAGAgent

### What It Tests
- Constructs causal DAG with nodes and edges
- Validates: no cycles, temporal ordering
- Identifies confounders, mediators, colliders
- Creates text visualization

### Test Script

Create: `scripts/test-dag-agent.ts`

```typescript
import { DAGAgent } from '../src/agents/dag-agent';
import { WorkflowStage } from '../src/types/workflow.types';

async function testDAGAgent() {
  console.log('🧪 Testing DAGAgent\n');

  const agent = new DAGAgent();

  const task = {
    id: 'test-dag-1',
    stage: WorkflowStage.DAG,
    description: 'Construct causal DAG',
    input: {},
  };

  const context = {
    treatment: 'exercise',
    outcome: 'heart_disease',
    confounders: ['age', 'gender', 'bmi'],
  };

  const result = await agent.execute(task, context);

  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.success && result.data) {
    const dagResult = result.data as any;
    console.log('\n📊 DAG Visualization:\n');
    console.log(dagResult.visualRepresentation);
    console.log('\n🔍 Validation:');
    console.log('No Cycles:', dagResult.validation.hasNoCycles);
    console.log('Treatment→Outcome Path:', dagResult.validation.hasTreatmentOutcomePath);
    console.log('Issues:', dagResult.validation.issues);
  }
}

testDAGAgent().catch(console.error);
```

### Run Test
```bash
npx ts-node scripts/test-dag-agent.ts
```

### Expected Output
✅ **Success Criteria**:
- `result.success` = true
- `result.data.dag.nodes` includes treatment, outcome, confounders
- `result.data.dag.edges` connects nodes with directed edges
- `result.data.validation.hasNoCycles` = true
- `result.data.validation.hasTreatmentOutcomePath` = true
- `result.data.visualRepresentation` shows DAG structure
- `result.data.suggestedConfounders` provides recommendations

---

## Test 4: IdentificationAgent

### What It Tests
- Applies backdoor criterion
- Finds all valid adjustment sets
- Recommends minimal/optimal adjustment set
- Explains backdoor paths

### Test Script

Create: `scripts/test-identification-agent.ts`

```typescript
import { IdentificationAgent } from '../src/agents/identification-agent';
import { WorkflowStage, DAG } from '../src/types/workflow.types';

async function testIdentificationAgent() {
  console.log('🧪 Testing IdentificationAgent\n');

  const agent = new IdentificationAgent();

  // Create a simple DAG
  const dag: DAG = {
    nodes: [
      { id: 'treatment', label: 'Exercise', type: 'treatment', observed: true },
      { id: 'outcome', label: 'Heart Disease', type: 'outcome', observed: true },
      { id: 'age', label: 'Age', type: 'confounder', observed: true },
      { id: 'bmi', label: 'BMI', type: 'confounder', observed: true },
    ],
    edges: [
      { from: 'age', to: 'treatment', type: 'causal' },
      { from: 'age', to: 'outcome', type: 'causal' },
      { from: 'bmi', to: 'treatment', type: 'causal' },
      { from: 'bmi', to: 'outcome', type: 'causal' },
      { from: 'treatment', to: 'outcome', type: 'causal' },
    ],
    assumptions: ['No unmeasured confounding'],
    metadata: { source: 'user', confidence: 0.9, lastModified: new Date() },
  };

  const task = {
    id: 'test-ident-1',
    stage: WorkflowStage.IDENTIFICATION,
    description: 'Determine identifiability',
    input: {},
  };

  const context = {
    treatment: 'Exercise',
    outcome: 'Heart Disease',
    dag,
    confounders: ['age', 'bmi'],
  };

  const result = await agent.execute(task, context);

  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.success && result.data) {
    const identResult = result.data as any;
    console.log('\n✅ Identifiable:', identResult.isIdentifiable);
    console.log('📋 Recommended Adjustment Set:', identResult.recommendedSet);
    console.log('🔍 All Adjustment Sets:', identResult.adjustmentSets);
  }
}

testIdentificationAgent().catch(console.error);
```

### Run Test
```bash
npx ts-node scripts/test-identification-agent.ts
```

### Expected Output
✅ **Success Criteria**:
- `result.success` = true
- `result.data.isIdentifiable` = true (for this simple DAG)
- `result.data.adjustmentSets` contains valid sets
- `result.data.recommendedSet` includes ['age', 'bmi'] or similar
- `result.data.criterion` = 'backdoor'
- `result.data.explanation` explains the decision

---

## Test 5: EstimationAgent

### What It Tests
- Selects appropriate estimation method
- Generates executable Python code
- Includes confidence intervals
- Provides diagnostics

### Test Script

Create: `scripts/test-estimation-agent.ts`

```typescript
import { EstimationAgent } from '../src/agents/estimation-agent';
import { WorkflowStage } from '../src/types/workflow.types';

async function testEstimationAgent() {
  console.log('🧪 Testing EstimationAgent\n');

  const agent = new EstimationAgent();

  const task = {
    id: 'test-est-1',
    stage: WorkflowStage.ESTIMATION,
    description: 'Estimate causal effect',
    input: {},
  };

  const context = {
    treatment: 'exercise',
    outcome: 'heart_disease',
    adjustmentSet: ['age', 'gender', 'bmi'],
    dataset: {
      name: 'health_study',
      rows: 5000,
      columns: ['exercise', 'heart_disease', 'age', 'gender', 'bmi'],
    },
  };

  const result = await agent.execute(task, context);

  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.success && result.data) {
    const estResult = result.data as any;
    console.log('\n📊 Method:', estResult.method);
    console.log('\n💻 Generated Python Code:\n');
    console.log(estResult.pythonCode);
    console.log('\n📖 Interpretation:', estResult.interpretation);
  }
}

testEstimationAgent().catch(console.error);
```

### Run Test
```bash
npx ts-node scripts/test-estimation-agent.ts
```

### Expected Output
✅ **Success Criteria**:
- `result.success` = true
- `result.data.method` = 'regression' or 'ipw'
- `result.data.pythonCode` contains complete executable code
- Code includes: imports, model fitting, coefficient extraction
- Code calculates confidence intervals
- `result.data.diagnostics` lists checks to perform
- `result.data.interpretation` explains how to read results

---

## Test 6: Full Workflow Integration

### Test Script

Create: `scripts/test-full-workflow.ts`

```typescript
import { CausalWorkflowEngine } from '../src/orchestration/workflow-engine';

async function testFullWorkflow() {
  console.log('🧪 Testing Full Workflow\n');

  const engine = new CausalWorkflowEngine();

  // Initialize workflow
  const workflowState = await engine.initializeWorkflow(
    'Does regular exercise reduce heart disease risk?',
    'test-user-1'
  );

  console.log('✅ Workflow initialized:', workflowState.id);
  console.log('Current stage:', workflowState.currentStage);
  console.log('\n');

  // Execute each stage
  const stages = ['FORMULATION', 'EDA', 'DAG', 'IDENTIFICATION', 'ESTIMATION'];

  for (const stageName of stages) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Executing ${stageName} stage...`);
    console.log('='.repeat(60));

    const result = await engine.executeCurrentStage();

    console.log('Success:', result.success);
    console.log('Message:', result.message);

    if (result.success) {
      console.log('Result preview:', JSON.stringify(result.result, null, 2).substring(0, 500) + '...');

      // Advance to next stage
      const advanced = engine.advanceToNextStage();
      if (!advanced && stageName !== 'ESTIMATION') {
        console.log('⚠️  Could not advance to next stage');
        break;
      }
    } else {
      console.log('❌ Stage failed:', result.message);
      break;
    }

    console.log('\nProgress:', engine.getProgress() + '%');
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('📊 FINAL WORKFLOW STATE');
  console.log('='.repeat(60));

  const finalState = engine.getWorkflowState();
  console.log('Complete:', engine.isWorkflowComplete());
  console.log('Progress:', engine.getProgress() + '%');

  if (finalState) {
    console.log('\nStage Status:');
    Object.entries(finalState.stages).forEach(([stage, state]) => {
      console.log(`  ${stage}: ${state.status} (${state.attempts} attempts)`);
    });

    console.log('\nShared Context:');
    console.log('  Treatment:', finalState.sharedContext.treatment);
    console.log('  Outcome:', finalState.sharedContext.outcome);
    console.log('  Confounders:', finalState.sharedContext.confounders);
    console.log('  Adjustment Set:', finalState.sharedContext.adjustmentSet);
  }
}

testFullWorkflow().catch(console.error);
```

### Run Test
```bash
npx ts-node scripts/test-full-workflow.ts
```

### Expected Output
✅ **Success Criteria**:
- All 5 stages execute successfully
- Progress reaches 100%
- `isWorkflowComplete()` = true
- Each stage status = 'completed'
- Shared context populated with:
  - Treatment and outcome from formulation
  - DAG from dag stage
  - Adjustment set from identification
  - Estimation code from estimation stage

---

## Quick Test All

Create: `scripts/test-all-agents.sh`

```bash
#!/bin/bash

echo "🧪 Running All Agent Tests"
echo "=========================="

echo ""
echo "1️⃣  Testing FormulationAgent..."
npx ts-node scripts/test-formulation-agent.ts

echo ""
echo "2️⃣  Testing EDAAgent..."
npx ts-node scripts/test-eda-agent.ts

echo ""
echo "3️⃣  Testing DAGAgent..."
npx ts-node scripts/test-dag-agent.ts

echo ""
echo "4️⃣  Testing IdentificationAgent..."
npx ts-node scripts/test-identification-agent.ts

echo ""
echo "5️⃣  Testing EstimationAgent..."
npx ts-node scripts/test-estimation-agent.ts

echo ""
echo "6️⃣  Testing Full Workflow..."
npx ts-node scripts/test-full-workflow.ts

echo ""
echo "✅ All tests complete!"
```

### Run All Tests
```bash
chmod +x scripts/test-all-agents.sh
./scripts/test-all-agents.sh
```

---

## Troubleshooting

### Issue: "Module not found"
**Solution**: Ensure paths use the webpack aliases or update tsconfig paths
```bash
npm run compile
```

### Issue: "OpenAI API Error"
**Solution**: Check API key is set
```bash
echo $OPENAI_API_KEY
# OR
cat .env | grep OPENAI
```

### Issue: "Timeout"
**Solution**: Increase timeout for LLM calls (they can take 10-20 seconds)

### Issue: "JSON Parse Error"
**Solution**: Normal - fallback parsing should handle it. Check that result.success is still true.

---

## Success Summary

After running all tests, you should see:

✅ **FormulationAgent**: Extracts components, identifies issues
✅ **EDAAgent**: Generates Python checking code
✅ **DAGAgent**: Builds valid DAG with no cycles
✅ **IdentificationAgent**: Finds adjustment sets
✅ **EstimationAgent**: Generates estimation code
✅ **Full Workflow**: All stages complete successfully

**Total Time**: ~3-5 minutes (depends on OpenAI API response times)

---

## Next Steps After Testing

Once all tests pass:
1. ✅ Commit the working agents
2. 🔄 Build Jupyter integration
3. 🎨 Build VS Code webview UI
4. 🔗 Wire up extension commands
5. 🚀 End-to-end testing in VS Code

