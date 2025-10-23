# Jupyter Notebook Integration

This document describes how the Causal Inference Assistant integrates with Jupyter notebooks in VS Code.

## Overview

The Jupyter integration allows agents (especially EDA and Estimation agents) to:
- Execute Python code in active Jupyter notebooks
- Capture outputs (text, DataFrames, plots)
- Parse execution errors
- Get/set variables in the notebook kernel

## Architecture

```
┌─────────────────┐
│  Agent (EDA/    │
│  Estimation)    │
└────────┬────────┘
         │
         │ generates Python code
         ▼
┌─────────────────────┐
│ JupyterExecutor     │
│ - connect()         │
│ - execute()         │
│ - getVariable()     │
└────────┬────────────┘
         │
         │ uses VS Code API
         ▼
┌─────────────────────┐
│ VS Code Jupyter     │
│ Extension           │
│ (ms-toolsai.jupyter)│
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Active Jupyter      │
│ Notebook (.ipynb)   │
└─────────────────────┘
```

## Components

### 1. VSCodeJupyterExecutor

Main class for Jupyter integration.

**Key Methods:**
- `connect(notebookUri)` - Connect to a notebook
- `execute(code, options)` - Execute Python code
- `getVariable(name)` - Retrieve variable value
- `setVariable(name, value)` - Set variable value
- `getKernelInfo()` - Get kernel status
- `restartKernel()` - Restart the Python kernel

**Static Helpers:**
- `getActiveNotebook()` - Get currently active notebook URI
- `isJupyterAvailable()` - Check if Jupyter extension is installed

### 2. Output Parser

Utilities for parsing Jupyter outputs.

**Functions:**
- `extractText(result)` - Get text output
- `extractError(result)` - Get error messages
- `formatResultForChat(result)` - Format for display
- `hasDataFrame(output)` - Check if output is a DataFrame
- `hasPlot(output)` - Check if output is a plot
- `parseDataFrameShape(result)` - Extract DataFrame dimensions
- `hasMissingData(result)` - Check for NaN/null values

## Usage Examples

### Basic Code Execution

```typescript
import { VSCodeJupyterExecutor } from './jupyter';

const executor = new VSCodeJupyterExecutor();

// Connect to active notebook
const notebookUri = await VSCodeJupyterExecutor.getActiveNotebook();
await executor.connect(notebookUri!);

// Execute code
const result = await executor.execute(`
import pandas as pd
df = pd.DataFrame({'A': [1, 2, 3], 'B': [4, 5, 6]})
print(df.shape)
`);

console.log(result.outputs);
```

### Handling Results

```typescript
import { formatResultForChat, extractError } from './jupyter';

if (!result.success) {
  console.error('Error:', extractError(result));
} else {
  console.log(formatResultForChat(result));
}
```

### Working with Variables

```typescript
// Set a variable
await executor.setVariable('treatment_col', 'aspirin');

// Get a variable
const shape = await executor.getVariable('df.shape');
console.log('DataFrame shape:', shape);
```

## Integration with Agents

### EDA Agent Example

```typescript
// In EDA Agent
const checkCode = `
import pandas as pd
import numpy as np

# Check positivity/overlap
treatment_col = '${treatment}'
df_treated = df[df[treatment_col] == 1]
df_control = df[df[treatment_col] == 0]

print(f"Treated: {len(df_treated)}")
print(f"Control: {len(df_control)}")
`;

const result = await this.jupyter.execute(checkCode);
const text = extractText(result);
// Parse and interpret results...
```

### Estimation Agent Example

```typescript
// In Estimation Agent
const estimationCode = this.generateEstimationCode(
  treatment,
  outcome,
  adjustmentSet
);

const result = await this.jupyter.execute(estimationCode);

if (!result.success) {
  return this.createErrorResult(
    new Error(extractError(result) || 'Execution failed')
  );
}

// Parse effect estimate from outputs
const effect = this.parseEffectFromOutput(result);
```

## Output Types

The executor returns outputs in the following types:

### Stream Output (stdout/stderr)
```typescript
{
  outputType: 'stream',
  text: 'Hello from Python\n'
}
```

### Execute Result (return values)
```typescript
{
  outputType: 'execute_result',
  text: '42',
  data: '42'
}
```

### Display Data (DataFrames, plots)
```typescript
{
  outputType: 'display_data',
  data: '<html>...</html>',
  metadata: { mime: 'text/html' }
}
```

### Error Output
```typescript
{
  outputType: 'error',
  data: {
    ename: 'NameError',
    evalue: "name 'x' is not defined",
    traceback: ['...']
  }
}
```

## Requirements

1. **VS Code Jupyter Extension**: The extension requires `ms-toolsai.jupyter` to be installed
2. **Active Notebook**: A `.ipynb` file must be open in VS Code
3. **Python Kernel**: A Python kernel must be available and running

## Checking Prerequisites

```typescript
// Check if Jupyter is available
if (!VSCodeJupyterExecutor.isJupyterAvailable()) {
  console.error('Please install the Jupyter extension');
  return;
}

// Check for active notebook
const notebook = await VSCodeJupyterExecutor.getActiveNotebook();
if (!notebook) {
  console.error('Please open a Jupyter notebook');
  return;
}
```

## Error Handling

```typescript
try {
  const result = await executor.execute(code, { timeout: 10000 });

  if (!result.success) {
    const error = extractError(result);
    // Handle Python execution error
    console.error('Python error:', error);
  }
} catch (error) {
  // Handle connection or other errors
  console.error('Execution failed:', error);
}
```

## Execution Options

```typescript
await executor.execute(code, {
  timeout: 30000,      // Max execution time (ms)
  silent: true,        // Don't show in notebook history
  storeHistory: false  // Don't store in IPython history
});
```

## Limitations

1. **Synchronous Only**: Currently executes code synchronously
2. **Python Only**: Only Python kernels supported (R, Julia not supported)
3. **Single Notebook**: Connects to one notebook at a time
4. **Output Timing**: 1-second delay to capture outputs (may miss very quick outputs)

## Future Enhancements

- Async/streaming execution
- Better output capture (real-time)
- Support for R and Julia kernels
- Multiple notebook connections
- Direct kernel protocol communication
- Variable inspection without execution
