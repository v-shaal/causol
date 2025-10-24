import * as vscode from 'vscode';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  testJupyterIntegrationCommand,
  testAgentsWithJupyterCommand,
  demoWorkflowCommand,
  testMastraWorkflowCommand,
  testMastraSimpleCommand,
  testMastraDetailedCommand,
  testEnvCommand,
} from '../commands';
import { ChatProvider } from '../chat';

// Module-level reference to chat provider (accessible from commands)
let chatProviderInstance: ChatProvider | undefined;

export function getChatProvider(): ChatProvider | undefined {
  return chatProviderInstance;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('🚀 Activating Causal Inference Assistant...');
  console.log('Extension path:', context.extensionPath);
  console.log('Workspace folders:', vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath));

  // Load environment variables from .env file IMMEDIATELY
  // Try multiple locations: workspace folder, then extension directory
  let envLoaded = false;

  // Option 1: Try workspace folder (when user has project open)
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    const envPath = path.join(workspaceFolder.uri.fsPath, '.env');
    console.log('🔍 Trying to load .env from workspace:', envPath);
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log('✅ Loaded .env from workspace:', envPath);
      console.log('✅ OPENAI_API_KEY loaded:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
      envLoaded = true;
    } else {
      console.log('❌ Failed to load from workspace:', result.error.message);
    }
  } else {
    console.log('⚠️  No workspace folder open');
  }

  // Option 2: Try extension's development directory (for testing in dev mode)
  if (!envLoaded) {
    // In development, context.extensionPath points to the source directory
    const devEnvPath = path.join(context.extensionPath, '.env');
    console.log('🔍 Trying to load .env from extension dir:', devEnvPath);
    const result = dotenv.config({ path: devEnvPath });
    if (!result.error) {
      console.log('✅ Loaded .env from extension dir:', devEnvPath);
      console.log('✅ OPENAI_API_KEY loaded:', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
      envLoaded = true;
    } else {
      console.log('❌ Failed to load from extension dir:', result.error.message);
    }
  }

  if (!envLoaded) {
    console.error('⚠️  No .env file found. Please open a workspace or add .env to extension directory.');
    vscode.window.showErrorMessage(
      'Causal Assistant: OPENAI_API_KEY not found. Please ensure .env file exists with your API key.'
    );
  }

  console.log('OPENAI_API_KEY available:', !!process.env.OPENAI_API_KEY);
  console.log('Causal Inference Assistant activation complete!');

  // Register chat webview provider
  const chatProvider = new ChatProvider(context.extensionUri);
  chatProviderInstance = chatProvider; // Store in module-level variable
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatProvider.viewType, chatProvider)
  );

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
      demoWorkflowCommand
    ),
    vscode.commands.registerCommand(
      'causal-assistant.testMastraWorkflow',
      testMastraWorkflowCommand
    ),
    vscode.commands.registerCommand(
      'causal-assistant.testMastraSimple',
      testMastraSimpleCommand
    ),
    vscode.commands.registerCommand(
      'causal-assistant.testMastraDetailed',
      testMastraDetailedCommand
    ),
    vscode.commands.registerCommand(
      'causal-assistant.testEnv',
      testEnvCommand
    ),
  ];

  context.subscriptions.push(...commands);
}

export function deactivate() {
  console.log('Causal Inference Assistant is now deactivated');
}
