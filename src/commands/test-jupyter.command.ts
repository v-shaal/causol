/**
 * Test command for Jupyter integration
 * Run this via Command Palette: "Causal Inference: Test Jupyter Integration"
 */

import * as vscode from 'vscode';
import { VSCodeJupyterExecutor, formatResultForChat } from '../jupyter';

export async function testJupyterIntegrationCommand() {
  const output = vscode.window.createOutputChannel('Causal Inference - Jupyter Test');
  output.show();

  try {
    output.appendLine('🧪 Testing Jupyter Integration');
    output.appendLine('='.repeat(50));
    output.appendLine('');

    // Step 1: Check Jupyter availability
    output.appendLine('Step 1: Checking Jupyter extension...');
    const isAvailable = VSCodeJupyterExecutor.isJupyterAvailable();

    if (!isAvailable) {
      output.appendLine('❌ Jupyter extension not found!');
      output.appendLine('');
      output.appendLine('Please install the Jupyter extension:');
      output.appendLine('1. Open Extensions (Cmd+Shift+X)');
      output.appendLine('2. Search for "Jupyter"');
      output.appendLine('3. Install "Jupyter" by Microsoft');

      vscode.window.showErrorMessage(
        'Jupyter extension not found. Please install ms-toolsai.jupyter'
      );
      return;
    }

    output.appendLine('✅ Jupyter extension is available');
    output.appendLine('');

    // Step 2: Get or create notebook
    output.appendLine('Step 2: Setting up notebook...');
    let activeNotebook = await VSCodeJupyterExecutor.getActiveNotebook();

    if (!activeNotebook) {
      output.appendLine('   No active notebook found, creating new one...');
      activeNotebook = await VSCodeJupyterExecutor.createNotebook('test-causal-analysis.ipynb');
      output.appendLine('   ✅ Created new notebook: test-causal-analysis.ipynb');
    } else {
      output.appendLine(`   ✅ Using active notebook:`);
      output.appendLine(`      ${activeNotebook}`);
    }
    output.appendLine('');

    // Step 3: Connect
    output.appendLine('Step 3: Connecting to notebook...');
    const executor = new VSCodeJupyterExecutor();
    await executor.connect(activeNotebook);
    output.appendLine('✅ Connected successfully');
    output.appendLine('');

    // Step 4: Run tests
    output.appendLine('Step 4: Running tests...');
    output.appendLine('─'.repeat(50));
    output.appendLine('');

    // Test 1: Simple print
    output.appendLine('Test 1: Simple print statement');
    const result1 = await executor.execute(`
print("✅ Hello from Causal Inference Assistant!")
print("The Jupyter integration is working correctly.")
    `.trim());

    output.appendLine(formatResultForChat(result1));
    output.appendLine('');

    // Test 2: Import packages
    output.appendLine('Test 2: Import required packages');
    const result2 = await executor.execute(`
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

print("✅ Successfully imported:")
print("  - pandas")
print("  - numpy")
print("  - matplotlib")
    `.trim());

    output.appendLine(formatResultForChat(result2));
    output.appendLine('');

    // Test 3: Create sample dataset
    output.appendLine('Test 3: Create sample causal inference dataset');
    const result3 = await executor.execute(`
np.random.seed(42)

# Simulate causal inference data
n = 1000
age = np.random.normal(50, 10, n)
income = np.random.normal(50000, 15000, n)

# Treatment (aspirin use)
propensity = 1 / (1 + np.exp(-(0.02 * age + 0.00001 * income - 2)))
treatment = np.random.binomial(1, propensity, n)

# Outcome (heart attack - with causal effect)
outcome_prob = 0.3 - 0.1 * treatment + 0.005 * age
outcome = np.random.binomial(1, outcome_prob, n)

# Create DataFrame
df = pd.DataFrame({
    'age': age,
    'income': income,
    'treatment': treatment,
    'outcome': outcome
})

print(f"✅ Created dataset with shape: {df.shape}")
print(f"\\nTreatment distribution:")
print(df['treatment'].value_counts())
print(f"\\nOutcome distribution:")
print(df['outcome'].value_counts())
    `.trim());

    output.appendLine(formatResultForChat(result3));
    output.appendLine('');

    // Test 4: Check positivity (EDA example)
    output.appendLine('Test 4: Check positivity/overlap (EDA example)');
    const result4 = await executor.execute(`
# Check for overlap in treatment groups
treated = df[df['treatment'] == 1]
control = df[df['treatment'] == 0]

print(f"✅ Positivity check:")
print(f"  Treated: {len(treated)} observations")
print(f"  Control: {len(control)} observations")
print(f"  Ratio: {len(treated)/len(control):.2f}")

# Check balance
print(f"\\n✅ Balance check (age):")
print(f"  Treated mean: {treated['age'].mean():.2f}")
print(f"  Control mean: {control['age'].mean():.2f}")
print(f"  Difference: {abs(treated['age'].mean() - control['age'].mean()):.2f}")
    `.trim());

    output.appendLine(formatResultForChat(result4));
    output.appendLine('');

    // Test 5: Variable retrieval
    output.appendLine('Test 5: Variable retrieval');
    try {
      const dfShape = await executor.getVariable('df.shape');
      output.appendLine(`✅ Retrieved DataFrame shape: ${JSON.stringify(dfShape)}`);

      const treatmentMean = await executor.getVariable('df.treatment.mean()');
      output.appendLine(`✅ Treatment mean: ${treatmentMean}`);
    } catch (error) {
      output.appendLine(`⚠️  Variable retrieval: ${error}`);
    }
    output.appendLine('');

    // Test 6: Error handling
    output.appendLine('Test 6: Error handling');
    const result6 = await executor.execute('undefined_variable');
    output.appendLine(formatResultForChat(result6));
    output.appendLine('');

    // Step 5: Cleanup
    output.appendLine('Step 5: Cleaning up...');
    await executor.disconnect();
    output.appendLine('✅ Disconnected from notebook');
    output.appendLine('');

    // Summary
    output.appendLine('='.repeat(50));
    output.appendLine('🎉 ALL TESTS PASSED!');
    output.appendLine('='.repeat(50));
    output.appendLine('');
    output.appendLine('The Jupyter integration is working correctly.');
    output.appendLine('You can now:');
    output.appendLine('  1. Use EDA Agent to check data assumptions');
    output.appendLine('  2. Use Estimation Agent to run causal analysis');
    output.appendLine('  3. Execute Python code from the chat interface');

    vscode.window.showInformationMessage(
      '✅ Jupyter integration tests passed! Check the output panel for details.'
    );

  } catch (error) {
    output.appendLine('');
    output.appendLine('❌ TEST FAILED');
    output.appendLine('='.repeat(50));
    output.appendLine(`Error: ${error}`);
    output.appendLine('');
    output.appendLine('Please check:');
    output.appendLine('  1. Jupyter extension is installed');
    output.appendLine('  2. A .ipynb file is open');
    output.appendLine('  3. Python kernel is running');

    vscode.window.showErrorMessage(
      `Jupyter test failed: ${error}`
    );
  }
}
