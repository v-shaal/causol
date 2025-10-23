import * as vscode from 'vscode';
import { testJupyterIntegrationCommand } from '../commands';

export function activate(context: vscode.ExtensionContext) {
  console.log('Causal Inference Assistant is now active!');

  // Register commands
  const commands = [
    // Workflow commands
    vscode.commands.registerCommand(
      'causal-assistant.startWorkflow',
      () => {
        vscode.window.showInformationMessage('Causal Inference Assistant: Start Workflow');
      }
    ),

    // Test commands
    vscode.commands.registerCommand(
      'causal-assistant.testJupyter',
      testJupyterIntegrationCommand
    ),
  ];

  context.subscriptions.push(...commands);
}

export function deactivate() {
  console.log('Causal Inference Assistant is now deactivated');
}
