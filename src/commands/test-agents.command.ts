/**
 * Test command for EDA and Estimation agents with Jupyter integration
 */

import * as vscode from 'vscode';
import { EDAAgent } from '../agents/eda-agent';
import { EstimationAgent } from '../agents/estimation-agent';
import { WorkflowStage, SharedContext } from '../types/workflow.types';
import { Task } from '../types/agent.types';
import { VSCodeJupyterExecutor } from '../jupyter';

export async function testAgentsWithJupyterCommand() {
  const output = vscode.window.createOutputChannel('Causal Inference - Agent Test');
  output.show();

  try {
    output.appendLine('🧪 Testing Agents with Jupyter Integration');
    output.appendLine('='.repeat(50));
    output.appendLine('');

    // Step 1: Check Jupyter availability
    output.appendLine('Step 1: Checking Jupyter availability...');
    const isAvailable = VSCodeJupyterExecutor.isJupyterAvailable();
    if (!isAvailable) {
      output.appendLine('❌ Jupyter extension not found!');
      vscode.window.showErrorMessage('Jupyter extension required. Install ms-toolsai.jupyter');
      return;
    }
    output.appendLine('✅ Jupyter extension available');
    output.appendLine('');

    // Step 2: Setup test data
    output.appendLine('Step 2: Creating test dataset...');
    const setupCode = `
import pandas as pd
import numpy as np

# Create sample causal inference dataset
np.random.seed(42)
n = 1000

# Simulate confounders
age = np.random.normal(50, 10, n)
income = np.random.normal(50000, 15000, n)
cholesterol = np.random.normal(200, 30, n)

# Treatment (aspirin use) - influenced by confounders
propensity = 1 / (1 + np.exp(-(0.02 * age + 0.00001 * income - 2)))
treatment = np.random.binomial(1, propensity, n)

# Outcome (heart attack) - causal effect of treatment
outcome_prob = 0.3 - 0.08 * treatment + 0.005 * age + 0.001 * cholesterol/100
outcome = np.random.binomial(1, outcome_prob, n)

# Create DataFrame
df = pd.DataFrame({
    'age': age,
    'income': income,
    'cholesterol': cholesterol,
    'treatment': treatment,
    'outcome': outcome
})

print(f"✅ Created dataset: {df.shape}")
print(f"Treatment rate: {df['treatment'].mean():.2%}")
print(f"Outcome rate: {df['outcome'].mean():.2%}")
`.trim();

    const setupResult = await VSCodeJupyterExecutor.executeCode(setupCode);
    if (!setupResult.success) {
      output.appendLine(`❌ Failed to create test dataset: ${setupResult.error?.ename}`);
      return;
    }
    output.appendLine('✅ Test dataset created successfully');
    output.appendLine('');

    // Step 3: Test EDA Agent
    output.appendLine('Step 3: Testing EDA Agent...');
    output.appendLine('─'.repeat(50));
    output.appendLine('');

    const edaAgent = new EDAAgent();
    const context: SharedContext = {
      treatment: 'treatment',
      outcome: 'outcome',
      confounders: ['age', 'income', 'cholesterol'],
      dataset: {
        name: 'df',
        rows: 1000,
        columns: ['age', 'income', 'cholesterol', 'treatment', 'outcome'],
      },
    };

    const edaTask: Task = {
      id: 'test-eda',
      stage: WorkflowStage.EDA,
      description: 'Test EDA with Jupyter',
      input: 'Check causal assumptions for aspirin effect on heart attack',
    };

    output.appendLine('Running EDA Agent...');
    const edaResult = await edaAgent.execute(edaTask, context);

    output.appendLine(`Status: ${edaResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (edaResult.feedback) {
      output.appendLine(`Feedback: ${edaResult.feedback.message}`);
    }
    output.appendLine('');

    if (edaResult.data) {
      const data = edaResult.data as any;
      if (data.executionSuccess) {
        output.appendLine('✅ EDA Code Execution: SUCCESS');
        output.appendLine('');
        output.appendLine('Execution Output:');
        output.appendLine(data.executionOutput || 'No output captured');
      } else {
        output.appendLine('⚠️  EDA Code Execution: FAILED or UNAVAILABLE');
        output.appendLine('');
        output.appendLine('Generated Code:');
        output.appendLine(data.pythonCode || 'No code generated');
      }
    }
    output.appendLine('');

    // Step 4: Test Estimation Agent
    output.appendLine('Step 4: Testing Estimation Agent...');
    output.appendLine('─'.repeat(50));
    output.appendLine('');

    const estimationAgent = new EstimationAgent();
    context.adjustmentSet = ['age', 'income', 'cholesterol'];

    const estTask: Task = {
      id: 'test-estimation',
      stage: WorkflowStage.ESTIMATION,
      description: 'Test Estimation with Jupyter',
      input: 'Estimate causal effect of aspirin on heart attack',
    };

    output.appendLine('Running Estimation Agent...');
    const estResult = await estimationAgent.execute(estTask, context);

    output.appendLine(`Status: ${estResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (estResult.feedback) {
      output.appendLine(`Feedback: ${estResult.feedback.message}`);
    }
    output.appendLine('');

    if (estResult.data) {
      const data = estResult.data as any;
      if (data.executionSuccess) {
        output.appendLine('✅ Estimation Code Execution: SUCCESS');
        output.appendLine('');
        output.appendLine('Execution Output:');
        output.appendLine(data.executionOutput || 'No output captured');
      } else {
        output.appendLine('⚠️  Estimation Code Execution: FAILED or UNAVAILABLE');
        output.appendLine('');
        output.appendLine('Generated Code:');
        output.appendLine(data.pythonCode || 'No code generated');
      }
    }
    output.appendLine('');

    // Summary
    output.appendLine('='.repeat(50));
    output.appendLine('🎉 AGENT INTEGRATION TEST COMPLETE!');
    output.appendLine('='.repeat(50));
    output.appendLine('');
    output.appendLine('Summary:');
    output.appendLine(`  EDA Agent: ${edaResult.success ? '✅ PASS' : '❌ FAIL'}`);
    output.appendLine(`  Estimation Agent: ${estResult.success ? '✅ PASS' : '❌ FAIL'}`);
    output.appendLine('');
    output.appendLine('Next Steps:');
    output.appendLine('  1. Review the execution outputs above');
    output.appendLine('  2. Verify agents generated valid Python code');
    output.appendLine('  3. Check that Jupyter integration works seamlessly');
    output.appendLine('  4. Build VS Code sidebar chat UI next');

    vscode.window.showInformationMessage(
      '✅ Agent integration tests complete! Check output panel for details.'
    );
  } catch (error) {
    output.appendLine('');
    output.appendLine('❌ TEST FAILED');
    output.appendLine('='.repeat(50));
    output.appendLine(`Error: ${error}`);

    vscode.window.showErrorMessage(`Agent test failed: ${error}`);
  }
}
