/**
 * Demo workflow command that shows full agent interaction through chat
 */

import * as vscode from 'vscode';
import { EDAAgent } from '../agents/eda-agent';
import { EstimationAgent } from '../agents/estimation-agent';
import { WorkflowStage, SharedContext } from '../types/workflow.types';
import { Task } from '../types/agent.types';
import { VSCodeJupyterExecutor } from '../jupyter';
import { getChatProvider } from '../extension/extension';

export async function demoWorkflowCommand() {
  // Get the chat provider
  const chatProvider = getChatProvider();

  if (!chatProvider) {
    vscode.window.showErrorMessage('Chat provider not initialized');
    return;
  }

  try {
    chatProvider.sendSystemMessage('🚀 Starting causal inference workflow demo...');

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
      '✅ Dataset created successfully!\n\n**Research Question**: Does aspirin reduce the risk of heart attacks?\n\n**Variables**:\n- Treatment: Aspirin use (binary)\n- Outcome: Heart attack (binary)\n- Confounders: Age, Income, Cholesterol',
      { agentName: 'System', type: 'text' }
    );

    // Step 2: Run EDA Agent
    chatProvider.sendSystemMessage('Running EDA Agent to check causal assumptions...');

    const edaAgent = new EDAAgent();
    const sharedContext: SharedContext = {
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
      id: 'demo-eda',
      stage: WorkflowStage.EDA,
      description: 'Check causal assumptions',
      input: 'Perform exploratory data analysis',
    };

    const edaResult = await edaAgent.execute(edaTask, sharedContext);

    if (edaResult.success && edaResult.data) {
      const data = edaResult.data as any;

      chatProvider.sendAssistantMessage(
        data.summary || 'EDA analysis completed',
        {
          agentName: 'EDA Agent',
          type: 'agent-output',
          workflowStage: 'eda',
          metadata: {
            executionSuccess: data.executionSuccess,
            pythonCode: data.pythonCode,
            checks: data.checks,
            violations: data.violations,
            suggestions: edaResult.suggestedNextSteps,
          },
        }
      );

      if (data.executionOutput) {
        chatProvider.sendAssistantMessage(
          data.executionOutput,
          { agentName: 'EDA Agent', type: 'text' }
        );
      }
    }

    // Step 3: Run Estimation Agent
    chatProvider.sendSystemMessage('Running Estimation Agent to calculate causal effect...');

    const estimationAgent = new EstimationAgent();
    sharedContext.adjustmentSet = ['age', 'income', 'cholesterol'];

    const estTask: Task = {
      id: 'demo-estimation',
      stage: WorkflowStage.ESTIMATION,
      description: 'Estimate causal effect',
      input: 'Estimate the causal effect of aspirin on heart attacks',
    };

    const estResult = await estimationAgent.execute(estTask, sharedContext);

    if (estResult.success && estResult.data) {
      const data = estResult.data as any;

      chatProvider.sendAssistantMessage(
        `**Causal Effect Estimation**\n\n${data.explanation || 'Estimation completed'}`,
        {
          agentName: 'Estimation Agent',
          type: 'agent-output',
          workflowStage: 'estimation',
          metadata: {
            executionSuccess: data.executionSuccess,
            pythonCode: data.pythonCode,
            suggestions: estResult.suggestedNextSteps,
          },
        }
      );

      if (data.executionOutput) {
        chatProvider.sendAssistantMessage(
          data.executionOutput,
          { agentName: 'Estimation Agent', type: 'text' }
        );
      }

      if (data.interpretation) {
        chatProvider.sendAssistantMessage(
          `**Interpretation**: ${data.interpretation}`,
          { agentName: 'Estimation Agent', type: 'text' }
        );
      }
    }

    // Summary
    chatProvider.sendSystemMessage(
      '✅ Workflow demo complete! The agents analyzed the data and estimated the causal effect.'
    );

  } catch (error) {
    chatProvider.sendError(`Workflow failed: ${error}`);
    console.error('Demo workflow error:', error);
  }
}
