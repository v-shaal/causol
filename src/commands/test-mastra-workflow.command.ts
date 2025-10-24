/**
 * Test command for Mastra workflow integration
 * Tests the complete causal inference workflow with a demo dataset
 */

import * as vscode from 'vscode';
import { getChatProvider } from '../extension/extension';
import { chatWorkflowOrchestrator } from '../orchestration/chat-workflow-orchestrator';
import { VSCodeJupyterExecutor } from '../jupyter';

export async function testMastraWorkflowCommand() {
  const chatProvider = getChatProvider();

  if (!chatProvider) {
    vscode.window.showErrorMessage('Chat provider not initialized');
    return;
  }

  // Check if workspace is open
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      'Please open a workspace folder before running this test. ' +
      'Use File > Open Folder to open a workspace.'
    );
    return;
  }

  // Check if Jupyter extension is available
  if (!VSCodeJupyterExecutor.isJupyterAvailable()) {
    vscode.window.showErrorMessage(
      'Jupyter extension is not installed or not active. ' +
      'Please install the "Jupyter" extension from the VS Code marketplace.'
    );
    return;
  }

  try {
    chatProvider.sendSystemMessage('🧪 Testing Mastra workflow integration...');

    // Step 1: Create test dataset
    chatProvider.sendAssistantMessage(
      'Creating a sample dataset for demonstration...',
      { agentName: 'System', type: 'text' }
    );

    const setupCode = `
import pandas as pd
import numpy as np

np.random.seed(42)
n = 1000

# Simulate confounders
age = np.random.normal(50, 10, n)
income = np.random.normal(50000, 15000, n)
cholesterol = np.random.normal(200, 30, n)

# Treatment (aspirin) - influenced by confounders
propensity = 1 / (1 + np.exp(-(0.02 * age + 0.00001 * income - 2)))
treatment = np.random.binomial(1, propensity, n)

# Outcome (heart attack) - true causal effect = -0.08
outcome_prob = 0.3 - 0.08 * treatment + 0.005 * age + 0.001 * cholesterol/100
outcome = np.random.binomial(1, outcome_prob, n)

df = pd.DataFrame({
    'age': age,
    'income': income,
    'cholesterol': cholesterol,
    'treatment': treatment,
    'outcome': outcome
})

print(f"✅ Dataset created: {df.shape}")
print(f"Research question: Does aspirin (treatment) reduce heart attacks (outcome)?")
`.trim();

    const setupResult = await VSCodeJupyterExecutor.executeCode(setupCode);

    if (!setupResult.success) {
      chatProvider.sendError('Failed to create dataset. Please ensure Jupyter is available.');
      return;
    }

    chatProvider.sendAssistantMessage(
      '✅ Dataset created successfully!\n\n' +
        '**Research Question**: Does aspirin reduce the risk of heart attacks?\n\n' +
        '**Variables**:\n' +
        '- Treatment: Aspirin use (binary)\n' +
        '- Outcome: Heart attack (binary)\n' +
        '- Confounders: Age, Income, Cholesterol',
      { agentName: 'System', type: 'text' }
    );

    // Step 2: Initialize workflow session with dataset context
    const session = chatWorkflowOrchestrator.getCurrentSession() || chatWorkflowOrchestrator.startNewSession();
    session.sharedContext.dataset = {
      name: 'df',
      rows: 1000,
      columns: ['age', 'income', 'cholesterol', 'treatment', 'outcome'],
    };

    // Step 3: Execute full workflow using Mastra
    chatProvider.sendSystemMessage('🚀 Executing full workflow with Mastra orchestration...');

    await chatWorkflowOrchestrator.executeFullWorkflow(
      'Does aspirin reduce heart attacks? Treatment is aspirin (treatment), outcome is heart attacks (outcome), confounders are age, income, and cholesterol.'
    );

    chatProvider.sendSystemMessage('✅ Mastra workflow test complete!');

  } catch (error) {
    chatProvider.sendError(`Mastra workflow test failed: ${error}`);
    console.error('Mastra workflow test error:', error);
  }
}
