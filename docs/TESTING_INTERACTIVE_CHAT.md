# Testing Interactive Chat with Workflow Orchestration

## Overview
The chat now supports interactive conversations where users can ask questions in natural language and the system automatically routes them to the appropriate agents.

## Prerequisites
- Extension compiled (`npm run compile`)
- Webview built (`npm run compile:webview`)
- Python environment with Jupyter
- Demo workflow command tested successfully

## Testing Interactive Chat

### Step 1: Launch Extension
1. Press **F5** to start Extension Development Host
2. Open **Causal Inference** sidebar (Activity Bar icon)
3. Chat interface should be visible

### Step 2: Test Formulation Agent

**Try these natural language questions:**

```
"Does education affect income?"
"What is the effect of smoking on lung cancer?"
"I want to analyze the impact of exercise on weight loss"
"Research question: Does aspirin reduce heart attacks?"
```

**Expected Response:**
- System message: "🎯 Analyzing your research question..."
- Formulation Agent analyzes and extracts:
  - Treatment variable
  - Outcome variable
  - Potential confounders
- Agent suggests next steps
- Stage automatically advances to EDA

### Step 3: Test Workflow Control Commands

**Try these commands:**

```
"start"          - Starts a new workflow session
"restart"        - Resets the current workflow
"continue"       - Shows current stage and options
"next"           - Proceeds to next stage
```

**Expected Response:**
- System message with workflow status
- Current stage indicator
- Next steps guidance

### Step 4: Test General Questions

**Try these queries:**

```
"help"
"What can you do?"
"How do I analyze causal effects?"
```

**Expected Response:**
- Helpful guidance message
- List of capabilities
- Example questions or commands

### Step 5: Test Full Workflow (With Dataset)

For this test, you'll need to create a dataset first using the demo workflow command, then continue with interactive chat.

**Steps:**
1. Run "Causal Assistant: Demo Workflow in Chat" command
2. Wait for dataset creation
3. In the chat input, type:
   ```
   "Explore the data and check assumptions"
   ```
4. EDA Agent should run automatically
5. Then type:
   ```
   "Estimate the causal effect"
   ```
6. Estimation Agent should run automatically

**Expected Flow:**
```
User: "Does aspirin reduce heart attacks?"
→ Formulation Agent extracts variables
→ Stage advances to EDA

User: "explore the data"
→ (Need dataset first - system prompts to load data)

[Run demo workflow command to create dataset]

User: "check assumptions"
→ EDA Agent runs analysis
→ Shows data quality checks

User: "estimate the effect"
→ Estimation Agent calculates causal effect
→ Shows treatment effect estimate
```

## Intent Detection Test Cases

### Formulation Intent
These should trigger the Formulation Agent:

| Input | Should Detect |
|-------|---------------|
| "Does X affect Y?" | ✅ Formulation |
| "What is the effect of treatment on outcome?" | ✅ Formulation |
| "I want to study the impact of..." | ✅ Formulation |
| "Research question about causality" | ✅ Formulation |

### EDA Intent
These should trigger the EDA Agent (if dataset loaded):

| Input | Should Detect |
|-------|---------------|
| "Explore the data" | ✅ EDA |
| "Check assumptions" | ✅ EDA |
| "Analyze data quality" | ✅ EDA |
| "Are there missing values?" | ✅ EDA |

### Estimation Intent
These should trigger the Estimation Agent (if formulation done):

| Input | Should Detect |
|-------|---------------|
| "Estimate the causal effect" | ✅ Estimation |
| "Calculate treatment effect" | ✅ Estimation |
| "What is the ATE?" | ✅ Estimation |
| "Run propensity score matching" | ✅ Estimation |

### Workflow Control
These should trigger workflow management:

| Input | Should Detect |
|-------|---------------|
| "start" | ✅ Workflow Control (restart) |
| "restart" | ✅ Workflow Control (restart) |
| "continue" | ✅ Workflow Control (continue) |
| "next" | ✅ Workflow Control (continue) |

## Conversation History Test

The orchestrator maintains conversation history:

**Test:**
1. Ask: "Does education affect income?"
2. Check Debug Console: Should see conversation history logged
3. Ask: "continue"
4. Check Debug Console: Both messages should be in history

**Expected:**
```javascript
conversationHistory: [
  { role: 'user', content: 'Does education affect income?', timestamp: ... },
  { role: 'user', content: 'continue', timestamp: ... }
]
```

## Session State Test

The orchestrator maintains workflow state:

**Test:**
1. Start fresh chat (reload extension if needed)
2. Ask: "Does smoking cause cancer?"
3. System should create new session automatically
4. SharedContext should contain:
   - treatment: "smoking"
   - outcome: "cancer"
   - confounders: [...]
5. currentStage should advance to EDA

**Verification:**
- Check Debug Console for session creation logs
- Verify SharedContext updates after each agent

## Error Handling Test

### No Dataset Error
**Test:**
```
User: "explore the data"
```
**Expected:**
```
"I need a dataset to perform exploratory data analysis.
Please load a dataset first or create one."
```

### No Formulation Error
**Test:**
```
User: "estimate the effect"
```
**Expected (if no treatment/outcome defined):**
```
"I need treatment and outcome variables defined before estimation.
Let's formulate the research question first."
```

## Performance Checks

### Response Time
- User message → System response: Should be < 500ms for intent detection
- Agent execution → Response: Varies (5-30s for LLM calls)
- Typing indicator should show during agent execution

### Memory Usage
- Each session should be reasonable (<1MB)
- Conversation history shouldn't grow indefinitely
- Consider limiting history to last N messages (future enhancement)

## Troubleshooting

### "Chat provider not initialized"
**Cause**: Orchestrator can't find ChatProvider
**Fix**:
1. Check extension activated correctly
2. Verify getChatProvider() returns valid instance
3. Reload Extension Development Host

### Agent not responding
**Cause**: Agent execution failing silently
**Fix**:
1. Check Debug Console for errors
2. Verify API keys in .env
3. Check agent prompts loading correctly
4. Test agents individually with test commands first

### Wrong intent detected
**Cause**: Intent analysis keywords not matching
**Fix**:
1. Check intent detection logic in analyzeUserIntent()
2. Add more keywords for your use case
3. Consider confidence thresholds
4. Fall back to general_question for unclear intents

### SharedContext not updating
**Cause**: Agent not returning expected data structure
**Fix**:
1. Check agent output format
2. Verify data.treatment, data.outcome, data.confounders exist
3. Log agent result to debug
4. Ensure agents return success: true

## Success Criteria

✅ User can ask natural language questions
✅ System detects intent correctly (>80% accuracy)
✅ Appropriate agent executes automatically
✅ SharedContext updates with agent results
✅ Stage advances automatically when ready
✅ Conversation history maintained
✅ Workflow control commands work
✅ Error messages are helpful
✅ Response times are reasonable
✅ Multiple sessions can be created

## Next Steps After Testing

If all tests pass:
1. ✅ User message handling working
2. Add conversation persistence (save/load across reloads)
3. Add visualization display for plots
4. Add workflow stage indicator in UI
5. Add retry/undo capabilities
6. Enhance intent detection with LLM
7. Add multi-turn conversation support
