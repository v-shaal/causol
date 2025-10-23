/**
 * Jupyter notebook integration types
 */

export interface JupyterExecutor {
  connect(notebookUri: string): Promise<void>;
  disconnect(): Promise<void>;
  execute(code: string, options?: ExecutionOptions): Promise<ExecutionResult>;
  getVariable(name: string): Promise<unknown>;
  setVariable(name: string, value: unknown): Promise<void>;
  getKernelInfo(): KernelInfo;
  restartKernel(): Promise<void>;
}

export interface ExecutionOptions {
  timeout?: number;
  silent?: boolean;
  storeHistory?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  outputs: CellOutput[];
  error?: ExecutionError;
  executionTime: number;
}

export interface CellOutput {
  outputType: 'stream' | 'display_data' | 'execute_result' | 'error';
  data?: unknown;
  text?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionError {
  ename: string;
  evalue: string;
  traceback: string[];
}

export interface KernelInfo {
  id: string;
  name: string;
  language: string;
  version: string;
  status: 'idle' | 'busy' | 'dead';
}
