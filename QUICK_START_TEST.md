# Quick Start - Testing Jupyter Integration

## ⚠️ CRITICAL: Where to Type Commands

**DO NOT type commands in:**
- ❌ Debug Console (has `>` prompt)
- ❌ Terminal (has `$` or `%` prompt)
- ❌ JavaScript console

**Type commands ONLY in the Command Palette:**
- ✅ Press **Cmd+Shift+P** (macOS) or **Ctrl+Shift+P** (Windows/Linux)
- ✅ A search box appears at the TOP of the window
- ✅ Type the command name there

---

## Step 1: Start the Extension

1. Open VS Code in the `/Users/vishal/Projects/causol` directory
2. Press **F5** to start debugging
3. A new "Extension Development Host" window will open

## Step 2: Run the Test Command

In the **Extension Development Host** window:

1. Press **Cmd+Shift+P** (opens Command Palette at TOP of screen)
2. In the search box, type: **test jupyter**
3. Click: **Causal Assistant: Test Jupyter Integration**

That's it! The test will run automatically.

## What Should Happen

When the test command runs successfully, you'll see:

1. A new output panel opens: **"Causal Inference - Jupyter Test"**
2. The test automatically creates a new Jupyter notebook
3. Runs 6 automated tests:
   - Simple print statement
   - Package imports (pandas, numpy, matplotlib)
   - Create sample causal inference dataset
   - Check positivity/overlap
   - Variable retrieval
   - Error handling
4. Shows results for each test
5. Final message: **"🎉 ALL TESTS PASSED!"**

## Troubleshooting

### "SyntaxError: Unexpected identifier 'Assistant'"

This means you typed the command in the **wrong place**!

**Wrong** ❌: You typed it in the Debug Console or Terminal
**Right** ✅: Press **Cmd+Shift+P** first, THEN type in the search box that appears at the top

The Command Palette is a floating search box at the TOP of your screen, not a console at the bottom.

### Command doesn't appear in Command Palette

1. Try typing just: `causal` or `jupyter` to see all related commands
2. Try: **Causal Assistant: Start Causal Analysis** first to activate the extension
3. Reload the window: Press Cmd+Shift+P → type `reload window` → select **Developer: Reload Window**
4. Restart debugging: Press Shift+F5 to stop, then F5 to start again

### "Jupyter extension not found"
- Install the Jupyter extension: `ms-toolsai.jupyter`
- Restart VS Code

### "Python kernel not available"
- Make sure Python is installed
- Install Jupyter: `pip install jupyter`

### Extension compilation errors
- Check the Debug Console (View > Debug Console) for errors
- Make sure extension compiled successfully (check Terminal output)

---

## Visual Guide: Where to Type Commands

### ✅ CORRECT: Command Palette (at TOP of screen)

```
Press: Cmd+Shift+P

┌──────────────────────────────────────────────────┐
│ > test jupyter                                   │ ← Type here!
├──────────────────────────────────────────────────┤
│ 🔍 Causal Assistant: Test Jupyter Integration   │ ← Click this
│ 🔍 Causal Assistant: Start Causal Analysis      │
│ 🔍 Developer: Reload Window                      │
└──────────────────────────────────────────────────┘
           ↑
    Floating search box
    at TOP of screen
```

### ❌ WRONG: Debug Console or Terminal (at BOTTOM)

```
DON'T TYPE HERE:

┌──────────────────────────────────────────────────┐
│ Debug Console                              [x]   │
├──────────────────────────────────────────────────┤
│ > Causal Assistant: Test Jupyter                │ ← NO! This gives
│ SyntaxError: Unexpected identifier 'Assistant'   │    syntax error
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Terminal                                   [x]   │
├──────────────────────────────────────────────────┤
│ $ Causal Assistant: Test Jupyter                │ ← NO! This is
│ Command not found                                │    a shell
└──────────────────────────────────────────────────┘
```

---

## Quick Reference

| Action | Keyboard Shortcut |
|--------|-------------------|
| Open Command Palette | **Cmd+Shift+P** (macOS)<br>**Ctrl+Shift+P** (Windows/Linux) |
| Start Debugging | **F5** |
| Stop Debugging | **Shift+F5** |
| Reload Window | Cmd+Shift+P → `reload window` |

