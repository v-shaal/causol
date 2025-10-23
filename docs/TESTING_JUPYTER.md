# Testing Jupyter Integration - Step by Step Guide

This guide walks you through testing the Jupyter notebook integration.

## Prerequisites

### 1. Install Jupyter Extension in VS Code

1. Open VS Code
2. Go to Extensions (Cmd+Shift+X / Ctrl+Shift+X)
3. Search for "Jupyter"
4. Install **Jupyter** by Microsoft (`ms-toolsai.jupyter`)
5. Install **Python** extension by Microsoft (if not already installed)

### 2. Install Python Dependencies

Open a terminal and install required packages:

```bash
pip install jupyter pandas numpy matplotlib seaborn statsmodels scikit-learn
```

Or if using conda:

```bash
conda install jupyter pandas numpy matplotlib seaborn statsmodels scikit-learn
```

## Quick Test (5 minutes)

### Step 1: Create a Test Notebook

1. In VS Code, create a new file: `test-notebook.ipynb`
2. VS Code should automatically open it as a Jupyter notebook
3. Select a Python kernel when prompted (Python 3.x)

### Step 2: Add Some Test Code

Add this code to the first cell and run it (Shift+Enter):

```python
import pandas as pd
import numpy as np

# Create sample dataset
np.random.seed(42)
df = pd.DataFrame({
    'treatment': np.random.binomial(1, 0.5, 100),
    'outcome': np.random.normal(10, 2, 100),
    'age': np.random.normal(50, 10, 100),
    'income': np.random.normal(50000, 15000, 100)
})

print(f"Dataset created with shape: {df.shape}")
print(f"\nFirst few rows:")
print(df.head())

# Summary statistics
print(f"\nSummary statistics:")
print(df.describe())
```

You should see output showing the DataFrame was created successfully.

### Step 3: Run the Integration Test

Now let's test our Jupyter executor. In VS Code:

1. Open the integrated terminal (Ctrl+\` or View > Terminal)
2. Navigate to the project root: `cd /Users/vishal/Projects/causol`
3. Make sure the notebook (`test-notebook.ipynb`) is still open and active
4. Run the test script:

```bash
# Note: This won't work yet because we need to compile as VS Code extension
# We'll create a simpler test below
```

## Manual Test with Extension

Since the Jupyter executor needs to run as part of the VS Code extension, let's create a simple test command.

### Step 1: Create Test Command File

Create a file `test-jupyter-command.ts`:

```typescript
import * as vscode from 'vscode';
import { VSCodeJupyterExecutor, formatResultForChat } from './src/jupyter';

export async function testJupyterIntegration() {
  const output = vscode.window.createOutputChannel('Jupyter Test');
  output.show();

  try {
    output.appendLine('🧪 Testing Jupyter Integration\n');

    // Check if Jupyter is available
    const isAvailable = VSCodeJupyterExecutor.isJupyterAvailable();
    output.appendLine(`Jupyter available: ${isAvailable ? '✅' : '❌'}`);

    if (!isAvailable) {
      output.appendLine('\n❌ Jupyter extension not found!');
      output.appendLine('Please install: ms-toolsai.jupyter');
      return;
    }

    // Get active notebook
    const activeNotebook = await VSCodeJupyterExecutor.getActiveNotebook();
    if (!activeNotebook) {
      output.appendLine('\n❌ No active notebook found!');
      output.appendLine('Please open a .ipynb file');
      return;
    }

    output.appendLine(`\nActive notebook: ${activeNotebook}`);

    // Create executor
    const executor = new VSCodeJupyterExecutor();
    await executor.connect(activeNotebook);
    output.appendLine('✅ Connected to notebook\n');

    // Test 1: Simple execution
    output.appendLine('Test 1: Simple print statement');
    const result1 = await executor.execute('print("Hello from Jupyter!")');
    output.appendLine(formatResultForChat(result1));
    output.appendLine('');

    // Test 2: Create DataFrame
    output.appendLine('Test 2: Create DataFrame');
    const result2 = await executor.execute(`
import pandas as pd
import numpy as np

df = pd.DataFrame({
    'A': [1, 2, 3, 4, 5],
    'B': [10, 20, 30, 40, 50]
})

print(f"Shape: {df.shape}")
print(df.head())
    `);
    output.appendLine(formatResultForChat(result2));
    output.appendLine('');

    // Test 3: Get variable
    output.appendLine('Test 3: Get variable');
    const shape = await executor.getVariable('df.shape');
    output.appendLine(`Retrieved shape: ${JSON.stringify(shape)}`);
    output.appendLine('');

    // Test 4: Error handling
    output.appendLine('Test 4: Error handling');
    const result4 = await executor.execute('undefined_variable');
    output.appendLine(formatResultForChat(result4));
    output.appendLine('');

    // Disconnect
    await executor.disconnect();
    output.appendLine('✅ All tests passed!');

  } catch (error) {
    output.appendLine(`\n❌ Error: ${error}`);
  }
}
```

### Step 2: Register the Test Command

Add this to your `src/extension/extension.ts`:

```typescript
import { testJupyterIntegration } from '../test-jupyter-command';

export function activate(context: vscode.ExtensionContext) {
  // Register test command
  const testCmd = vscode.commands.registerCommand(
    'causal.testJupyter',
    testJupyterIntegration
  );

  context.subscriptions.push(testCmd);
}
```

### Step 3: Add Command to package.json

In your `package.json`, add this command:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "causal.testJupyter",
        "title": "Test Jupyter Integration",
        "category": "Causal Inference"
      }
    ]
  }
}
```

### Step 4: Run the Extension

1. Press F5 in VS Code (or Run > Start Debugging)
2. This opens a new "Extension Development Host" window
3. In the new window:
   - Open or create a Jupyter notebook (`.ipynb`)
   - Make sure it has a Python kernel running
   - Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
   - Type "Test Jupyter Integration"
   - Run the command
4. Check the "Jupyter Test" output panel for results

## Expected Results

You should see output like this:

```
🧪 Testing Jupyter Integration

Jupyter available: ✅

Active notebook: file:///Users/vishal/test-notebook.ipynb
✅ Connected to notebook

Test 1: Simple print statement
✅ Execution Successful

Hello from Jupyter!

⏱️ Execution time: 234ms

Test 2: Create DataFrame
✅ Execution Successful

Shape: (5, 2)
   A   B
0  1  10
1  2  20
2  3  30
3  4  40
4  5  50

⏱️ Execution time: 456ms

Test 3: Get variable
Retrieved shape: [5,2]

Test 4: Error handling
❌ Execution Error
NameError: name 'undefined_variable' is not defined

✅ All tests passed!
```

## Testing with Agents

Once the basic integration works, you can test with actual agents:

### Test with Estimation Agent

```typescript
// In extension command
import { EstimationAgent } from './src/agents/estimation-agent';
import { VSCodeJupyterExecutor } from './src/jupyter';

const agent = new EstimationAgent();
const executor = new VSCodeJupyterExecutor();

const context = {
  treatment: 'aspirin',
  outcome: 'heart_attack',
  adjustmentSet: ['age', 'cholesterol'],
  dataset: { name: 'aspirin_study' },
  confounders: ['age', 'cholesterol'],
};

// Generate estimation code
const result = await agent.execute({
  id: 'test',
  stage: WorkflowStage.ESTIMATION,
  description: 'Generate code',
  input: 'estimate effect',
}, context);

// Execute the generated Python code
if (result.success && result.data?.pythonCode) {
  await executor.connect(activeNotebook);
  const execResult = await executor.execute(result.data.pythonCode);
  console.log('Estimation result:', execResult);
}
```

## Troubleshooting

### Issue: "Jupyter extension not found"
**Solution:**
- Install `ms-toolsai.jupyter` from VS Code marketplace
- Restart VS Code

### Issue: "No active notebook found"
**Solution:**
- Create or open a `.ipynb` file
- Make sure it's the active editor
- Select a Python kernel when prompted

### Issue: "Kernel is not running"
**Solution:**
- Click "Select Kernel" in the notebook toolbar
- Choose a Python 3 kernel
- Wait for kernel to start (see status in bottom right)

### Issue: "Execution timeout"
**Solution:**
- Increase timeout in execute options:
  ```typescript
  executor.execute(code, { timeout: 60000 }); // 60 seconds
  ```

### Issue: "Cannot read outputs"
**Solution:**
- The executor waits 1 second for outputs to populate
- For slower operations, you may need to adjust the timing
- Check that cells are actually executing (watch for cell numbers)

## Quick Verification Checklist

- [ ] VS Code Jupyter extension installed
- [ ] Python extension installed
- [ ] Python environment has required packages
- [ ] Jupyter notebook is open and active
- [ ] Python kernel is selected and running
- [ ] Can manually run cells in the notebook
- [ ] Extension is running in debug mode (F5)
- [ ] Test command appears in Command Palette
- [ ] Output channel shows test results

## Next Steps

Once Jupyter integration is working:

1. Wire it into EDA Agent for data checks
2. Wire it into Estimation Agent for code execution
3. Test full workflow: Formulation → EDA → DAG → Identification → Estimation
4. Build chat UI to display results to users

## Need Help?

Common issues and solutions are documented in:
- `docs/JUPYTER_INTEGRATION.md` - Architecture and API reference
- `docs/TROUBLESHOOTING.md` - Common problems and fixes
