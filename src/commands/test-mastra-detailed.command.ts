/**
 * Detailed Mastra workflow test with step-by-step verification
 * Tests the complete causal inference workflow with detailed logging
 */

import * as vscode from 'vscode';
import { getChatProvider } from '../extension/extension';
import { executeCausalWorkflow } from '../orchestration/causal-workflow';

export async function testMastraDetailedCommand() {
  const chatProvider = getChatProvider();

  if (!chatProvider) {
    vscode.window.showErrorMessage('Chat provider not initialized');
    return;
  }

  try {
    chatProvider.sendSystemMessage('🧪 **Detailed Mastra Workflow Test**\n\nTesting all three workflow steps with detailed verification...');

    // Mock shared context with dataset
    const mockContext = {
      confounders: [],
      dataset: {
        name: 'test_df',
        rows: 500,
        columns: ['age', 'income', 'treatment', 'outcome'],
      },
    };

    console.log('==========================================');
    console.log('MASTRA WORKFLOW DETAILED TEST');
    console.log('==========================================');
    console.log('Starting workflow execution...');
    console.log('Input:', {
      userMessage: 'Does treatment affect outcome controlling for age and income?',
      context: mockContext,
    });

    // Execute workflow
    const startTime = Date.now();
    const result = await executeCausalWorkflow(
      'Does treatment affect outcome? Treatment is treatment variable, outcome is outcome variable, confounders are age and income.',
      mockContext
    );
    const executionTime = Date.now() - startTime;

    console.log('==========================================');
    console.log('WORKFLOW EXECUTION COMPLETE');
    console.log('==========================================');
    console.log('Execution time:', executionTime, 'ms');
    console.log('Result status:', result.status);
    console.log('Full result:', JSON.stringify(result, null, 2));

    // Analyze result
    chatProvider.sendSystemMessage('📊 **Workflow Analysis**');

    const analysis = [];

    // Check formulation step
    if (result.steps?.formulation) {
      const formOutput = result.steps.formulation.output;
      analysis.push('✅ **Step 1: Formulation**');
      analysis.push(`   - Status: ${formOutput?.success ? 'Success' : 'Failed'}`);
      analysis.push(`   - Treatment: ${formOutput?.treatment || 'Not identified'}`);
      analysis.push(`   - Outcome: ${formOutput?.outcome || 'Not identified'}`);
      analysis.push(`   - Confounders: ${formOutput?.confounders?.join(', ') || 'None'}`);
      console.log('Formulation step output:', formOutput);
    } else {
      analysis.push('❌ **Step 1: Formulation** - Not executed');
    }

    // Check EDA step
    if (result.steps?.eda) {
      const edaOutput = result.steps.eda.output;
      analysis.push('\n✅ **Step 2: EDA (Exploratory Data Analysis)**');
      analysis.push(`   - Status: ${edaOutput?.success ? 'Success' : 'Failed'}`);
      analysis.push(`   - Violations detected: ${edaOutput?.hasViolations ? 'Yes' : 'No'}`);
      console.log('EDA step output:', edaOutput);
    } else {
      analysis.push('\n❌ **Step 2: EDA** - Not executed');
    }

    // Check estimation step
    if (result.steps?.estimation) {
      const estOutput = result.steps.estimation.output;
      analysis.push('\n✅ **Step 3: Estimation**');
      analysis.push(`   - Status: ${estOutput?.success ? 'Success' : 'Failed'}`);
      analysis.push(`   - Effect estimate: ${estOutput?.effectEstimate || 'Not calculated'}`);
      console.log('Estimation step output:', estOutput);
    } else {
      analysis.push('\n❌ **Step 3: Estimation** - Not executed');
    }

    // Final status
    analysis.push(`\n**Overall Status**: ${result.status}`);
    analysis.push(`**Execution Time**: ${executionTime}ms`);

    chatProvider.sendAssistantMessage(
      analysis.join('\n'),
      { agentName: 'Test System', type: 'text' }
    );

    // Summary
    const stepsExecuted = [
      result.steps?.formulation ? 'Formulation' : null,
      result.steps?.eda ? 'EDA' : null,
      result.steps?.estimation ? 'Estimation' : null,
    ].filter(Boolean);

    chatProvider.sendSystemMessage(
      `✅ **Test Complete!**\n\n` +
      `Steps executed: ${stepsExecuted.length}/3 (${stepsExecuted.join(' → ')})\n` +
      `Total time: ${executionTime}ms\n` +
      `Status: ${result.status}`
    );

    vscode.window.showInformationMessage(
      `Mastra workflow test complete: ${stepsExecuted.length}/3 steps executed successfully`
    );

    console.log('==========================================');
    console.log('TEST COMPLETE');
    console.log(`${stepsExecuted.length}/3 steps executed`);
    console.log('==========================================');

  } catch (error) {
    const errorMessage = `Detailed workflow test failed: ${error}`;
    chatProvider.sendError(errorMessage);
    console.error('==========================================');
    console.error('TEST FAILED');
    console.error('==========================================');
    console.error('Error:', error);
    console.error('Stack:', (error as Error).stack);
    vscode.window.showErrorMessage(errorMessage);
  }
}
