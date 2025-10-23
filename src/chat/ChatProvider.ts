/**
 * Chat webview provider for VS Code sidebar
 */

import * as vscode from 'vscode';

export class ChatProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'causal-assistant-chat';

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case 'user-message':
          this.handleUserMessage(data.payload.message);
          break;
        case 'start-workflow':
          this.handleStartWorkflow(data.payload.stage);
          break;
        case 'execute-code':
          this.handleExecuteCode(data.payload.code);
          break;
        case 'load-dataset':
          this.handleLoadDataset(data.payload.path);
          break;
      }
    });
  }

  /**
   * Send a message to the webview
   */
  public sendMessage(type: string, payload: unknown) {
    if (this._view) {
      this._view.webview.postMessage({ type, payload });
    }
  }

  /**
   * Send an assistant message to the chat
   */
  public sendAssistantMessage(content: string, metadata?: {
    type?: string;
    agentName?: string;
    workflowStage?: string;
    metadata?: unknown;
  }) {
    this.sendMessage('assistant-message', {
      content,
      type: metadata?.type || 'text',
      agentName: metadata?.agentName,
      workflowStage: metadata?.workflowStage,
      metadata: metadata?.metadata,
    });
  }

  /**
   * Send a system message to the chat
   */
  public sendSystemMessage(content: string) {
    this.sendMessage('system-message', { content });
  }

  /**
   * Send an error message to the chat
   */
  public sendError(error: string) {
    this.sendMessage('error', { error });
  }

  private async handleUserMessage(message: string) {
    console.log('User message:', message);

    // Import orchestrator dynamically to avoid circular dependencies
    const { chatWorkflowOrchestrator } = await import('../orchestration/chat-workflow-orchestrator');

    // Process message through workflow orchestrator
    await chatWorkflowOrchestrator.processUserMessage(message);
  }

  private handleStartWorkflow(stage: string) {
    console.log('Start workflow:', stage);
    this.sendSystemMessage(`Starting workflow at stage: ${stage}`);
  }

  private handleExecuteCode(code: string) {
    console.log('Execute code:', code);
    this.sendSystemMessage('Code execution requested');
  }

  private handleLoadDataset(path: string) {
    console.log('Load dataset:', path);
    this.sendSystemMessage(`Loading dataset from: ${path}`);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the local path to the webview build
    const buildPath = vscode.Uri.joinPath(this._extensionUri, 'webview-ui', 'build');

    // Get URIs for the webview resources
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(buildPath, 'assets', 'index.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(buildPath, 'assets', 'index.css'));

    // Use a nonce to allow only specific scripts to run
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>Causal Inference Assistant</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
