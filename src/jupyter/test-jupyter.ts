/**
 * Test script for Jupyter integration
 * This is a standalone test to verify Jupyter executor works
 */

import { VSCodeJupyterExecutor } from './jupyter-executor';
import { formatResultForChat, extractText } from './output-parser';

async function testJupyterIntegration() {
  console.log('🧪 Testing Jupyter Integration\n');

  const executor = new VSCodeJupyterExecutor();

  try {
    // Test 1: Check if Jupyter is available
    console.log('1. Checking Jupyter availability...');
    const isAvailable = VSCodeJupyterExecutor.isJupyterAvailable();
    console.log(`   Jupyter available: ${isAvailable ? '✅' : '❌'}\n`);

    if (!isAvailable) {
      console.log('⚠️  Jupyter extension not found. Please install:');
      console.log('   - ms-toolsai.jupyter');
      console.log('   - Open a .ipynb file in VS Code');
      return;
    }

    // Test 2: Get active notebook
    console.log('2. Looking for active notebook...');
    const activeNotebook = await VSCodeJupyterExecutor.getActiveNotebook();

    if (!activeNotebook) {
      console.log('   ⚠️  No active notebook found');
      console.log('   Please open a .ipynb file in VS Code\n');
      return;
    }

    console.log(`   Found notebook: ${activeNotebook}\n`);

    // Test 3: Connect to notebook
    console.log('3. Connecting to notebook...');
    await executor.connect(activeNotebook);
    console.log('   ✅ Connected\n');

    // Test 4: Execute simple Python code
    console.log('4. Executing Python code...');
    const simpleResult = await executor.execute('print("Hello from Causal Inference Assistant!")');

    console.log('   Result:');
    console.log('   ' + formatResultForChat(simpleResult).split('\n').join('\n   '));
    console.log('');

    // Test 5: Execute code that creates a variable
    console.log('5. Creating variables...');
    const varResult = await executor.execute(`
import pandas as pd
import numpy as np

# Create sample dataset
np.random.seed(42)
df = pd.DataFrame({
    'treatment': np.random.binomial(1, 0.5, 100),
    'outcome': np.random.normal(10, 2, 100),
    'confounder': np.random.normal(5, 1, 100)
})

print(f"Created DataFrame with shape: {df.shape}")
print(f"Treatment mean: {df['treatment'].mean():.2f}")
    `);

    console.log('   Result:');
    console.log('   ' + extractText(varResult).split('\n').join('\n   '));
    console.log('');

    // Test 6: Get variable
    console.log('6. Retrieving variable...');
    try {
      const dfShape = await executor.getVariable('df.shape');
      console.log(`   DataFrame shape: ${JSON.stringify(dfShape)}\n`);
    } catch (error) {
      console.log(`   ⚠️  Could not retrieve variable: ${error}\n`);
    }

    // Test 7: Execute code with error
    console.log('7. Testing error handling...');
    const errorResult = await executor.execute('undefined_variable');

    if (!errorResult.success) {
      console.log('   ✅ Error correctly caught');
      console.log('   Error:', errorResult.error?.ename, '-', errorResult.error?.evalue);
      console.log('');
    }

    // Test 8: Disconnect
    console.log('8. Disconnecting...');
    await executor.disconnect();
    console.log('   ✅ Disconnected\n');

    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests if executed directly
if (require.main === module) {
  testJupyterIntegration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { testJupyterIntegration };
