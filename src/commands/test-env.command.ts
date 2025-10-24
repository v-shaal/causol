/**
 * Test command to verify environment variables are loaded
 */

import * as vscode from 'vscode';

export async function testEnvCommand() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const provider = process.env.LLM_PROVIDER || 'openai';
    const model = process.env.LLM_MODEL || 'gpt-4o';

    const message = `Environment Variables Status:

- LLM Provider: ${provider}
- LLM Model: ${model}
- API Key: ${apiKey ? `Loaded (${apiKey.substring(0, 10)}...)` : 'NOT FOUND'}

${!apiKey ? '\nWARNING: OPENAI_API_KEY is not set!\n\nPlease ensure:\n1. The .env file exists in your workspace root\n2. The file contains: OPENAI_API_KEY=your-key-here\n3. You have reloaded VS Code after creating/editing .env' : ''}
    `.trim();

    // Show in popup
    vscode.window.showInformationMessage(
      apiKey ? 'Environment loaded successfully!' : 'Environment NOT loaded!'
    );

    // Log to console
    console.log('='.repeat(60));
    console.log('Environment Variables Test');
    console.log('='.repeat(60));
    console.log(message);
    console.log('='.repeat(60));

    // Show in output channel
    const outputChannel = vscode.window.createOutputChannel('Causal Assistant - Environment Test');
    outputChannel.clear();
    outputChannel.appendLine(message);
    outputChannel.show();
  } catch (error) {
    console.error('Error in testEnvCommand:', error);
    vscode.window.showErrorMessage(`Environment test failed: ${error}`);
  }
}
