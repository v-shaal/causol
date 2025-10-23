/**
 * Jupyter Output Parser Utilities
 * Helpers for parsing and formatting Jupyter notebook outputs
 */

import { CellOutput, ExecutionResult } from '../types/jupyter.types';

/**
 * Extract text content from execution results
 */
export function extractText(result: ExecutionResult): string {
  return result.outputs
    .filter((output) => output.text)
    .map((output) => output.text)
    .join('\n');
}

/**
 * Extract error message from execution results
 */
export function extractError(result: ExecutionResult): string | null {
  if (!result.error) {
    return null;
  }

  const { ename, evalue, traceback } = result.error;
  return `${ename}: ${evalue}\n${traceback.join('\n')}`;
}

/**
 * Check if output contains a pandas DataFrame
 */
export function hasDataFrame(output: CellOutput): boolean {
  if (output.outputType !== 'display_data' && output.outputType !== 'execute_result') {
    return false;
  }

  const data = output.data;
  if (typeof data === 'string') {
    return data.includes('</table>') || data.includes('DataFrame');
  }

  return false;
}

/**
 * Check if output contains a plot/image
 */
export function hasPlot(output: CellOutput): boolean {
  return (
    output.metadata?.mime === 'image/png' ||
    output.metadata?.mime === 'image/svg+xml' ||
    (typeof output.data === 'string' && output.data.startsWith('data:image'))
  );
}

/**
 * Format execution result for display in chat
 */
export function formatResultForChat(result: ExecutionResult): string {
  if (!result.success && result.error) {
    return `❌ **Execution Error**\n\`\`\`\n${extractError(result)}\n\`\`\``;
  }

  const text = extractText(result);
  const hasData = result.outputs.some(hasDataFrame);
  const hasImage = result.outputs.some(hasPlot);

  let formatted = '✅ **Execution Successful**\n\n';

  if (text) {
    formatted += `\`\`\`\n${text}\n\`\`\`\n\n`;
  }

  if (hasData) {
    formatted += '📊 Output includes DataFrame\n';
  }

  if (hasImage) {
    formatted += '📈 Output includes plot/visualization\n';
  }

  formatted += `\n⏱️ Execution time: ${result.executionTime}ms`;

  return formatted;
}

/**
 * Extract summary statistics from execution result
 */
export function extractSummaryStats(result: ExecutionResult): Record<string, number> | null {
  const text = extractText(result);

  // Simple pattern matching for common stats
  const stats: Record<string, number> = {};

  // Match patterns like "mean: 123.45" or "count    1000"
  const patterns = [
    /mean[:\s]+([0-9.]+)/i,
    /std[:\s]+([0-9.]+)/i,
    /min[:\s]+([0-9.]+)/i,
    /max[:\s]+([0-9.]+)/i,
    /count[:\s]+([0-9]+)/i,
  ];

  patterns.forEach((pattern) => {
    const match = text.match(pattern);
    if (match) {
      const key = pattern.source.split('[')[0];
      stats[key] = parseFloat(match[1]);
    }
  });

  return Object.keys(stats).length > 0 ? stats : null;
}

/**
 * Check if execution result indicates missing data
 */
export function hasMissingData(result: ExecutionResult): boolean {
  const text = extractText(result).toLowerCase();
  return (
    text.includes('nan') ||
    text.includes('null') ||
    text.includes('missing') ||
    text.includes('none')
  );
}

/**
 * Parse DataFrame shape from output
 * Returns [rows, columns] or null
 */
export function parseDataFrameShape(result: ExecutionResult): [number, number] | null {
  const text = extractText(result);

  // Match patterns like "(1000, 5)" or "[1000 rows x 5 columns]"
  const shapePattern = /\((\d+),\s*(\d+)\)/;
  const rowsColsPattern = /\[(\d+)\s+rows?\s+x\s+(\d+)\s+columns?\]/;

  let match = text.match(shapePattern) || text.match(rowsColsPattern);

  if (match) {
    return [parseInt(match[1]), parseInt(match[2])];
  }

  return null;
}
