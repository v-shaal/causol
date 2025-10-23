# Quick Test Guide - Jupyter Integration

**Testing Time: ~2 minutes**

## Automated Testing (Recommended)

The extension now **automatically creates a notebook** and runs all tests. No manual setup required!

### Steps:

1. **Open VS Code** with the project
   ```bash
   cd /Users/vishal/Projects/causol
   code .
   ```

2. **Install Jupyter Extension** (one-time setup)
   - Open Extensions (`Cmd+Shift+X`)
   - Search for "Jupyter"
   - Install **Jupyter** by Microsoft
   - Install **Python** by Microsoft (if needed)

3. **Start Extension in Debug Mode**
   - Press **F5**
   - A new "Extension Development Host" window will open

4. **Run the Test Command**
   - In the Extension Development Host window
   - Open Command Palette (`Cmd+Shift+P`)
   - Type: `Causal Assistant: Test Jupyter`
   - Press Enter

5. **Watch the Magic** ✨
   - The extension will automatically:
     - ✅ Create a new notebook (`test-causal-analysis.ipynb`)
     - ✅ Connect to it
     - ✅ Add and execute test cells
     - ✅ Check outputs
     - ✅ Verify everything works

6. **Check Results**
   - An output panel will show test progress
   - The notebook will remain open with all test results
   - You should see: "🎉 ALL TESTS PASSED!"

## What Gets Tested

The automated test runs through a complete causal inference workflow:

### 1. Basic Execution ✅
```python
print("Hello from Causal Inference Assistant!")
```

### 2. Package Imports ✅
```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
```

### 3. Dataset Creation ✅
```python
# Creates synthetic causal inference dataset
# - 1000 observations
# - Treatment variable (aspirin)
# - Outcome variable (heart attack)
# - Confounders (age, income)
```

### 4. EDA Checks ✅
```python
# Positivity/overlap check
# Balance checking
# Distribution comparisons
```

### 5. Variable Operations ✅
```python
# Get DataFrame shape
# Get treatment mean
```

### 6. Error Handling ✅
```python
# Tests that errors are caught properly
```

## Expected Output

### In Output Panel:
```
🧪 Testing Jupyter Integration
==================================================

Step 1: Checking Jupyter extension...
✅ Jupyter extension is available

Step 2: Setting up notebook...
   No active notebook found, creating new one...
   ✅ Created new notebook: test-causal-analysis.ipynb

Step 3: Connecting to notebook...
✅ Connected successfully

Step 4: Running tests...
──────────────────────────────────────────────────

Test 1: Simple print statement
✅ Execution Successful

Hello from Causal Inference Assistant!
The Jupyter integration is working correctly.

⏱️ Execution time: 245ms

[... more tests ...]

==================================================
🎉 ALL TESTS PASSED!
==================================================

The Jupyter integration is working correctly.
You can now:
  1. Use EDA Agent to check data assumptions
  2. Use Estimation Agent to run causal analysis
  3. Execute Python code from the chat interface
```

### In Notebook:
You'll see a Jupyter notebook with:
- Multiple cells with test code
- Output from each cell
- Sample dataset created
- EDA analysis results

## Troubleshooting

### "Jupyter extension not found"
**Solution:** Install `ms-toolsai.jupyter` and restart VS Code

### "Tests timeout"
**Solution:**
- First time may be slow while kernel starts
- Just run the test again
- Or increase timeout in code

### "Kernel not starting"
**Solution:**
- Check Python is installed: `python --version`
- Install Jupyter: `pip install jupyter`
- Restart VS Code

## Manual Testing (Alternative)

If you want to test manually:

1. Create a notebook yourself: `test.ipynb`
2. Add this code and run it:
   ```python
   import pandas as pd
   import numpy as np

   np.random.seed(42)
   df = pd.DataFrame({
       'treatment': np.random.binomial(1, 0.5, 100),
       'outcome': np.random.normal(10, 2, 100)
   })
   print(df.shape)
   ```
3. Run the test command (it will use your open notebook)

## Quick Verification

After testing, you can verify:

- [ ] Notebook was created automatically
- [ ] Cells were added with test code
- [ ] All cells executed successfully
- [ ] Output panel shows "ALL TESTS PASSED"
- [ ] Sample dataset is created in notebook
- [ ] Can see DataFrame shape and statistics
- [ ] Error handling works

## What This Proves

✅ Jupyter integration is fully functional
✅ Can create notebooks programmatically
✅ Can execute Python code
✅ Can capture outputs
✅ Can handle errors
✅ Ready for agent integration

## Next Steps

Once tests pass:
1. ✅ Jupyter works → proceed to wire agents
2. ✅ Agents can execute code → build chat UI
3. ✅ Chat UI ready → test full workflow
4. ✅ Full workflow works → ready for beta users!

---

**Total Testing Time:** ~2 minutes
**Manual Setup Required:** None (fully automated!)
**Success Indicator:** "🎉 ALL TESTS PASSED!" in output panel
