/**
 * Jupyter Notebook Executor
 * Handles code execution in Jupyter notebooks via VS Code's Jupyter extension API
 */

import * as vscode from 'vscode';
import {
  JupyterExecutor,
  ExecutionOptions,
  ExecutionResult,
  CellOutput,
  ExecutionError,
  KernelInfo,
} from '../types/jupyter.types';

export class VSCodeJupyterExecutor implements JupyterExecutor {
  private notebookDocument?: vscode.NotebookDocument;

  /**
   * Connect to an active Jupyter notebook in VS Code
   */
  async connect(notebookUri: string): Promise<void> {
    try {
      // Find the notebook document
      const uri = vscode.Uri.parse(notebookUri);
      this.notebookDocument = await vscode.workspace.openNotebookDocument(uri);

      // Get the active kernel for this notebook
      // VS Code's Jupyter extension handles kernel management
      console.log(`Connected to notebook: ${notebookUri}`);
    } catch (error) {
      throw new Error(`Failed to connect to notebook: ${error}`);
    }
  }

  /**
   * Disconnect from the notebook
   */
  async disconnect(): Promise<void> {
    this.notebookDocument = undefined;
    console.log('Disconnected from Jupyter notebook');
  }

  /**
   * Execute Python code in the notebook
   */
  async execute(code: string, options?: ExecutionOptions): Promise<ExecutionResult> {
    if (!this.notebookDocument) {
      throw new Error('Not connected to a notebook. Call connect() first.');
    }

    const startTime = Date.now();

    try {
      // Create a new code cell with the provided code
      const edit = new vscode.WorkspaceEdit();
      const cellCount = this.notebookDocument.cellCount;

      // Add cell at the end of the notebook
      const cellData = new vscode.NotebookCellData(
        vscode.NotebookCellKind.Code,
        code,
        'python'
      );

      edit.set(this.notebookDocument.uri, [
        vscode.NotebookEdit.insertCells(cellCount, [cellData])
      ]);

      await vscode.workspace.applyEdit(edit);

      // Get the newly created cell
      const cell = this.notebookDocument.cellAt(cellCount);

      // Execute the cell using VS Code's notebook API
      const execution = await this.executeCell(cell, options);

      const executionTime = Date.now() - startTime;

      return {
        success: execution.success,
        outputs: execution.outputs,
        error: execution.error,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        outputs: [],
        error: {
          ename: 'ExecutionError',
          evalue: String(error),
          traceback: [String(error)],
        },
        executionTime,
      };
    }
  }

  /**
   * Execute a specific notebook cell
   */
  private async executeCell(
    cell: vscode.NotebookCell,
    options?: ExecutionOptions
  ): Promise<{ success: boolean; outputs: CellOutput[]; error?: ExecutionError }> {
    return new Promise((resolve) => {
      const timeout = options?.timeout || 30000; // 30 seconds default
      const outputs: CellOutput[] = [];
      let error: ExecutionError | undefined;

      // Set up timeout
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          outputs,
          error: {
            ename: 'TimeoutError',
            evalue: `Execution exceeded ${timeout}ms`,
            traceback: [`Cell execution timed out after ${timeout}ms`],
          },
        });
      }, timeout);

      // Execute the cell via VS Code commands
      Promise.resolve(
        vscode.commands.executeCommand('notebook.cell.execute', {
          ranges: [{ start: cell.index, end: cell.index + 1 }],
        })
      ).then(() => {
          // Wait a bit for outputs to be populated
          setTimeout(() => {
            clearTimeout(timeoutId);

            // Parse cell outputs
            cell.outputs.forEach((output) => {
              const parsedOutput = this.parseOutput(output);
              if (parsedOutput) {
                outputs.push(parsedOutput);

                // Check for errors
                if (parsedOutput.outputType === 'error' && parsedOutput.data) {
                  const errorData = parsedOutput.data as any;
                  error = {
                    ename: errorData.ename || 'Error',
                    evalue: errorData.evalue || 'Unknown error',
                    traceback: errorData.traceback || [],
                  };
                }
              }
            });

            resolve({
              success: !error,
              outputs,
              error,
            });
          }, 1000); // Give 1 second for outputs to populate
        })
        .catch((err: any) => {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            outputs,
            error: {
              ename: 'ExecutionError',
              evalue: String(err),
              traceback: [String(err)],
            },
          });
        });
    });
  }

  /**
   * Parse VS Code notebook output to our format
   */
  private parseOutput(output: vscode.NotebookCellOutput): CellOutput | null {
    const items = output.items;
    if (items.length === 0) {
      return null;
    }

    // Get the primary output item
    const item = items[0];
    const mimeType = item.mime;

    // Determine output type based on mime type
    if (mimeType === 'application/vnd.code.notebook.error') {
      const errorData = JSON.parse(new TextDecoder().decode(item.data));
      return {
        outputType: 'error',
        data: errorData,
      };
    }

    if (mimeType === 'application/vnd.code.notebook.stdout') {
      return {
        outputType: 'stream',
        text: new TextDecoder().decode(item.data),
      };
    }

    if (mimeType === 'text/plain') {
      return {
        outputType: 'execute_result',
        text: new TextDecoder().decode(item.data),
      };
    }

    if (mimeType === 'text/html' || mimeType === 'image/png' || mimeType === 'application/json') {
      return {
        outputType: 'display_data',
        data: new TextDecoder().decode(item.data),
        metadata: { mime: mimeType },
      };
    }

    // Default: treat as execute result
    return {
      outputType: 'execute_result',
      data: new TextDecoder().decode(item.data),
      metadata: { mime: mimeType },
    };
  }

  /**
   * Get a variable value from the notebook kernel
   * Note: Requires executing Python code to retrieve the value
   */
  async getVariable(name: string): Promise<unknown> {
    const code = `import json; print(json.dumps(${name}))`;
    const result = await this.execute(code, { silent: true });

    if (!result.success || result.outputs.length === 0) {
      throw new Error(`Failed to get variable: ${name}`);
    }

    const output = result.outputs.find((o) => o.text);
    if (!output?.text) {
      throw new Error(`Variable ${name} not found or has no value`);
    }

    try {
      return JSON.parse(output.text);
    } catch {
      return output.text;
    }
  }

  /**
   * Set a variable value in the notebook kernel
   */
  async setVariable(name: string, value: unknown): Promise<void> {
    const jsonValue = JSON.stringify(value);
    const code = `import json; ${name} = json.loads('${jsonValue}')`;

    const result = await this.execute(code, { silent: true });

    if (!result.success) {
      throw new Error(`Failed to set variable: ${name}`);
    }
  }

  /**
   * Get kernel information
   */
  getKernelInfo(): KernelInfo {
    if (!this.notebookDocument) {
      throw new Error('Not connected to a notebook');
    }

    // Basic kernel info - VS Code manages the actual kernel
    return {
      id: 'vscode-kernel',
      name: 'Python',
      language: 'python',
      version: '3.x',
      status: 'idle',
    };
  }

  /**
   * Restart the notebook kernel
   */
  async restartKernel(): Promise<void> {
    if (!this.notebookDocument) {
      throw new Error('Not connected to a notebook');
    }

    await vscode.commands.executeCommand('notebook.restartKernel', {
      notebookEditor: this.notebookDocument,
    });

    console.log('Kernel restarted');
  }

  /**
   * Helper: Get the currently active notebook in VS Code
   */
  static async getActiveNotebook(): Promise<string | null> {
    const activeEditor = vscode.window.activeNotebookEditor;
    if (!activeEditor) {
      return null;
    }

    return activeEditor.notebook.uri.toString();
  }

  /**
   * Helper: Check if Jupyter extension is available
   */
  static isJupyterAvailable(): boolean {
    const jupyterExtension = vscode.extensions.getExtension('ms-toolsai.jupyter');
    return jupyterExtension !== undefined && jupyterExtension.isActive;
  }
}
