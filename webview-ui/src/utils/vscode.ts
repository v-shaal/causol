/**
 * VS Code API utilities for webview communication
 */

// Get VS Code API instance
declare const acquireVsCodeApi: () => {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

let vscodeApi: ReturnType<typeof acquireVsCodeApi> | undefined;

export function getVSCodeAPI() {
  if (!vscodeApi) {
    vscodeApi = acquireVsCodeApi();
  }
  return vscodeApi;
}

export interface VSCodeMessage {
  type: string;
  payload?: unknown;
}

export function sendMessageToExtension(message: VSCodeMessage) {
  const api = getVSCodeAPI();
  api.postMessage(message);
}

export function sendUserMessage(message: string) {
  sendMessageToExtension({
    type: 'user-message',
    payload: { message },
  });
}

export function startWorkflow(stage: string) {
  sendMessageToExtension({
    type: 'start-workflow',
    payload: { stage },
  });
}

export function executeCode(code: string) {
  sendMessageToExtension({
    type: 'execute-code',
    payload: { code },
  });
}

export function loadDataset(path: string) {
  sendMessageToExtension({
    type: 'load-dataset',
    payload: { path },
  });
}
