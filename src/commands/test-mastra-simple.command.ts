/**
 * Simple Mastra workflow test without Jupyter dependency
 * Tests just the workflow structure and agent initialization
 */

import * as vscode from 'vscode';
import { getChatProvider } from '../extension/extension';
import { chatWorkflowOrchestrator } from '../orchestration/chat-workflow-orchestrator';

export async function testMastraSimpleCommand() {
  const chatProvider = getChatProvider();

  if (!chatProvider) {
    vscode.window.showErrorMessage('Chat provider not initialized');
    return;
  }

  try {
    chatProvider.sendSystemMessage('🧪 Testing Mastra workflow (without Jupyter)...');

    // Start a new session
    const session = chatWorkflowOrchestrator.getCurrentSession() || chatWorkflowOrchestrator.startNewSession();

    // Set up a mock dataset context (no actual Jupyter execution)
    session.sharedContext.dataset = {
      name: 'mock_df',
      rows: 100,
      columns: ['age', 'treatment', 'outcome'],
    };

    chatProvider.sendAssistantMessage(
      '✅ Mock dataset created:\n\n' +
        '- **Name**: mock_df\n' +
        '- **Rows**: 100\n' +
        '- **Columns**: age, treatment, outcome\n\n' +
        'Now testing Mastra workflow orchestration...',
      { agentName: 'System', type: 'text' }
    );

    // Execute full workflow using Mastra
    chatProvider.sendSystemMessage('🚀 Executing Mastra workflow...');

    await chatWorkflowOrchestrator.executeFullWorkflow(
      'Does treatment affect outcome? Treatment variable is treatment, outcome is outcome, confounder is age.'
    );

    chatProvider.sendSystemMessage('✅ Mastra workflow test complete!');
    vscode.window.showInformationMessage('Mastra workflow test completed successfully!');

  } catch (error) {
    const errorMessage = `Mastra workflow test failed: ${error}`;
    chatProvider.sendError(errorMessage);
    console.error('Mastra workflow test error:', error);
    vscode.window.showErrorMessage(errorMessage);
  }
}
