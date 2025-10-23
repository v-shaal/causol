# Testing Chat UI Integration

## Overview
This guide walks through testing the complete chat UI integration with the causal inference agents.

## Prerequisites
- Extension compiled successfully (`npm run compile`)
- Webview UI built (`npm run compile:webview`)
- Python environment with required packages installed
- Jupyter extension installed in VS Code

## Step 1: Launch Extension Development Host

1. Open VS Code in the `/Users/vishal/Projects/causol` directory
2. Press **F5** to start debugging
3. A new "Extension Development Host" window opens

## Step 2: Open the Chat Sidebar

In the **Extension Development Host** window:

1. Look for the **Causal Inference** icon in the Activity Bar (left sidebar)
   - If you don't see it, the icon should appear after activation
2. Click the icon to open the sidebar
3. You should see the **Assistant** panel with a chat interface

### What the Chat UI Should Look Like

```
┌─────────────────────────────────────┐
│ 👤 CAUSAL INFERENCE                 │
├─────────────────────────────────────┤
│                                     │
│  [Empty chat area]                  │
│                                     │
│  Type your message to start...      │
│                                     │
├─────────────────────────────────────┤
│ [Type your message here...]    [>]  │
└─────────────────────────────────────┘
```

## Step 3: Test Chat Input

1. Click in the input box at the bottom
2. Type a simple message: "Hello"
3. Press **Enter** or click the send button
4. You should see:
   - Your message appears in the chat with "You" label
   - A typing indicator appears briefly
   - System responds with confirmation

## Step 4: Run Demo Workflow Command

This tests the complete integration with agents:

1. Press **Cmd+Shift+P** (macOS) or **Ctrl+Shift+P** (Windows/Linux)
2. Type: **demo workflow**
3. Click: **Causal Assistant: Demo Workflow in Chat**

### Expected Output

The chat should display messages in sequence:

1. **System Message**: "🚀 Starting causal inference workflow demo..."

2. **Dataset Creation**:
   ```
   ✅ Dataset created successfully!

   Created a simulated causal inference dataset with:
   - Treatment: education (binary: 0=no degree, 1=degree)
   - Outcome: income (continuous)
   - Confounders: age, experience, location
   ```

3. **EDA Agent Output**:
   - Agent name: "EDA Agent"
   - Summary of exploratory data analysis
   - Python code used
   - Validation checks performed

4. **Estimation Agent Output**:
   - Causal effect estimation
   - Treatment effect explanation
   - Statistical significance
   - Next steps suggestions

## Step 5: Verify Message Features

Check that messages display correctly:

### User Messages
- ✅ "You" label on the left
- ✅ Blue/purple background color
- ✅ Timestamp displayed

### Assistant Messages
- ✅ Agent name label (e.g., "EDA Agent")
- ✅ Different background color from user messages
- ✅ Code blocks with syntax highlighting
- ✅ Execution status indicators (✅ success, ❌ failed)
- ✅ Collapsible sections for long code

### System Messages
- ✅ "System" label
- ✅ Distinct styling (neutral/gray)
- ✅ Clear visual separation

## Step 6: Test Interactive Features

1. **Auto-scroll**: Send multiple messages and verify chat scrolls to bottom automatically
2. **Code formatting**: Check that Python code blocks are syntax-highlighted
3. **Multi-line input**: Press Shift+Enter in input box to create new lines
4. **Disabled state**: While workflow runs, input should be disabled with cursor change

## Troubleshooting

### Chat Sidebar Not Appearing

**Symptoms**: No Causal Inference icon in Activity Bar

**Solutions**:
1. Reload window: Cmd+Shift+P → `reload window`
2. Restart debugging: Shift+F5, then F5
3. Check Debug Console for errors
4. Verify webview compiled: `npm run compile:webview`

### Blank Chat Panel

**Symptoms**: Sidebar opens but shows blank/white screen

**Solutions**:
1. Open Developer Tools: Help → Toggle Developer Tools
2. Check Console tab for errors
3. Look for CSP violations or script loading errors
4. Verify webview build files exist in `webview-ui/build/`
5. Check that `webview-ui/build/assets/index.js` and `index.css` exist

### Messages Not Appearing

**Symptoms**: Send button works but no messages show

**Solutions**:
1. Open Developer Tools (Help → Toggle Developer Tools)
2. Check Console for JavaScript errors
3. Verify message passing: Look for `postMessage` logs
4. Check React DevTools if available
5. Restart extension: Shift+F5, then F5

### Demo Workflow Errors

**Symptoms**: Workflow command fails or agents don't respond

**Solutions**:
1. Check Debug Console for error messages
2. Verify Python environment: Run "Test Jupyter Integration" first
3. Check that .env file has API keys configured
4. Verify agents compiled correctly: `npm run compile`
5. Check ChatProvider is registered: Look for activation logs

### CSP Errors in Console

**Symptoms**: "Content Security Policy" errors in Developer Tools

**Solutions**:
- This usually indicates script loading issues
- Check that nonce is generated correctly in ChatProvider
- Verify script src uses `asWebviewUri()`
- Ensure CSP header matches nonce in script tag

### Styling Issues

**Symptoms**: Chat looks unstyled or has wrong colors

**Solutions**:
1. Check that `index.css` is loaded in Developer Tools
2. Verify VS Code theme variables are available
3. Rebuild webview: `npm run compile:webview`
4. Check for CSS loading errors in Console

## Testing Checklist

Use this checklist to verify complete integration:

- [ ] Extension compiles without errors
- [ ] Webview UI builds successfully
- [ ] Chat sidebar opens in Activity Bar
- [ ] Chat interface displays correctly
- [ ] Input box accepts text
- [ ] Send button works
- [ ] User messages appear in chat
- [ ] Demo workflow command runs
- [ ] System messages display
- [ ] Agent messages appear with correct labels
- [ ] Code blocks are syntax-highlighted
- [ ] Execution status shows correctly
- [ ] Chat auto-scrolls to new messages
- [ ] Typing indicator works
- [ ] Multi-line input works (Shift+Enter)
- [ ] Input disables during processing
- [ ] VS Code theme colors apply correctly

## Success Criteria

The chat UI integration is working correctly when:

1. **Visual**: Clean, professional chat interface with VS Code theming
2. **Functional**: Messages send, receive, and display correctly
3. **Agent Integration**: Agents can send messages to chat
4. **Code Display**: Python code blocks render with syntax highlighting
5. **Status Indicators**: Execution success/failure shows clearly
6. **UX**: Auto-scroll, typing indicators, disabled states work properly

## Next Steps After Successful Testing

Once all tests pass:

1. Commit the chat integration changes
2. Implement user message handling (connect to actual agent workflow)
3. Add conversation history persistence
4. Add visualization display for matplotlib plots
5. Implement workflow stage tracking in UI
6. Add error recovery and retry mechanisms
