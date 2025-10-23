import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Causal Inference Assistant is now active!');

  // TODO: Initialize components
  // - Webview provider
  // - Command handlers
  // - Workflow engine
  // - Jupyter integration

  const disposable = vscode.commands.registerCommand(
    'causal-assistant.startWorkflow',
    () => {
      vscode.window.showInformationMessage('Causal Inference Assistant: Start Workflow');
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {
  console.log('Causal Inference Assistant is now deactivated');
}
