import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  testJupyterIntegrationCommand,
  testAgentsWithJupyterCommand,
  demoWorkflowCommand,
} from '../commands';
import { ChatProvider } from '../chat';

export function activate(context: vscode.ExtensionContext) {
  // Load environment variables from .env file
  // Try multiple locations: workspace folder, then extension directory
  let envLoaded = false;

  // Option 1: Try workspace folder (when user has project open)
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    const envPath = path.join(workspaceFolder.uri.fsPath, '.env');
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log('✅ Loaded .env from workspace:', envPath);
      envLoaded = true;
    }
  }

  // Option 2: Try extension's development directory (for testing in dev mode)
  if (!envLoaded) {
    // In development, context.extensionPath points to the source directory
    const devEnvPath = path.join(context.extensionPath, '.env');
    const result = dotenv.config({ path: devEnvPath });
    if (!result.error) {
      console.log('✅ Loaded .env from extension dir:', devEnvPath);
      envLoaded = true;
    }
  }

  if (!envLoaded) {
    console.warn('⚠️  No .env file found. Please open a workspace or add .env to extension directory.');
  }

  console.log('OPENAI_API_KEY available:', !!process.env.OPENAI_API_KEY);
  console.log('Causal Inference Assistant is now active!');

  // Register chat webview provider
  const chatProvider = new ChatProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatProvider.viewType, chatProvider)
  );

  // Store provider for access from commands/agents
  context.workspaceState.update('chatProvider', chatProvider);

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
    vscode.commands.registerCommand(
      'causal-assistant.testAgents',
      testAgentsWithJupyterCommand
    ),
    vscode.commands.registerCommand(
      'causal-assistant.demoWorkflow',
      () => demoWorkflowCommand(context)
    ),
  ];

  context.subscriptions.push(...commands);
}

export function deactivate() {
  console.log('Causal Inference Assistant is now deactivated');
}
