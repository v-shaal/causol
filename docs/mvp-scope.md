# MVP Scope - v0.1

## Executive Summary

This document defines the Minimum Viable Product (MVP) scope for the Causal Inference Assistant VS Code extension. The MVP focuses on validating the core value proposition: **providing AI-powered guidance through rigorous causal inference workflows**.

**Target Timeline**: 3 months
**Target Users**: 50 beta users
**Success Metric**: 70% of users complete at least one full workflow (Formulation → Estimation)

---

## Core Value Proposition

The MVP demonstrates that an AI assistant can:
1. **Understand causal concepts** (not just generic coding help)
2. **Guide users through proper methodology** (DAG construction, identification)
3. **Catch common mistakes** (conditioning on colliders, missing confounders)

---

## P0 Features (Must-Have for MVP)

### 1. VS Code Integration
- ✅ Sidebar chat interface
- ✅ Command palette integration
- ✅ Settings UI for API key configuration
- ✅ Workflow progress visualization (current stage indicator)

### 2. Jupyter Notebook Integration
- ✅ Connect to active Jupyter notebook (Python only)
- ✅ Execute Python code in notebook cells
- ✅ Capture outputs (text, dataframes, basic plots)
- ✅ Parse execution errors
- ⚠️ **NOT included**: R language support, multiple notebook connections

### 3. Specialized Agents (5 Total)

#### 3.1 Problem Formulation Agent
- Extract treatment, outcome, and population from natural language
- Identify potential causal issues (reverse causation, selection bias)
- Suggest refinements to research question

#### 3.2 EDA Agent (Basic)
- Check treatment/outcome distributions
- Identify missing data patterns
- Check for overlap/common support
- Basic summary statistics
- ⚠️ **NOT included**: Advanced visualizations, automated transformations

#### 3.3 DAG Builder Agent (Basic)
- Propose initial DAG based on research question
- Basic DAG validation (no cycles, temporal ordering)
- Simple text-based DAG representation
- ⚠️ **NOT included**: MCP domain knowledge queries, interactive visual editor

#### 3.4 Identification Agent
- Apply backdoor criterion
- Find adjustment sets
- Explain identifiability results
- ⚠️ **NOT included**: Frontdoor criterion, instrumental variables

#### 3.5 Estimation Agent
- Generate basic estimation code (propensity score weighting, regression)
- Execute code in Jupyter
- Parse and interpret results
- ⚠️ **NOT included**: SDK configuration, advanced methods (TMLE, DML)

### 4. Workflow Orchestration
- ✅ Sequential workflow (Formulation → EDA → DAG → Identification → Estimation)
- ✅ State management (track current stage, results)
- ✅ Basic error handling
- ⚠️ **NOT included**: Iterative feedback loops, automatic refinement, parallel execution

### 5. LLM Integration
- ✅ Anthropic Claude integration (Sonnet 4)
- ✅ Streaming responses
- ⚠️ **NOT included**: Multiple LLM providers, local model support

---

## P1 Features (Should-Have, but can defer to v0.2)

- ❌ Single MCP server connection
- ❌ Interactive DAG visual editor
- ❌ Enhanced EDA visualizations
- ❌ SDK configuration support
- ❌ Improved error messages with recovery suggestions
- ❌ Code execution error recovery

---

## P2 Features (Nice-to-Have, deferred to v0.3+)

- ❌ Multiple MCP server connections
- ❌ Iterative feedback loops
- ❌ Sensitivity analysis agent
- ❌ Report generation agent
- ❌ Workflow templates
- ❌ R language support
- ❌ Multiple notebook connections
- ❌ Cloud workflow storage

---

## Technical Architecture (MVP)

### Technology Stack
- **Language**: TypeScript 5.x
- **Runtime**: Node.js 18+
- **Framework**: VS Code Extension API 1.85+
- **Agent Framework**: Mastra AI (partial - agents + workflows only)
- **LLM**: Anthropic Claude (Sonnet 4)
- **UI**: React 18 (for webview)
- **State**: Zustand
- **Build**: Webpack
- **Testing**: Jest

### MVP Architecture Layers

```
┌─────────────────────────────────────────────┐
│        VS Code Extension (TypeScript)       │
│  - Sidebar Chat UI                          │
│  - Jupyter Connection                       │
│  - Settings Management                      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│    Orchestration (Mastra Workflows)         │
│  - Sequential workflow engine               │
│  - State management                         │
│  - Stage coordination                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         Agents (Mastra + Custom)            │
│  - Formulation Agent                        │
│  - EDA Agent                                │
│  - DAG Builder Agent                        │
│  - Identification Agent                     │
│  - Estimation Agent                         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│           Integrations                      │
│  - Jupyter Executor                         │
│  - Anthropic LLM Provider                   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│       Knowledge Base (Custom)               │
│  - Causal inference prompts                 │
│  - Basic validation rules                   │
└─────────────────────────────────────────────┘
```

### What Mastra Provides
- Agent framework wrapper
- Workflow orchestration (`.then()` chaining)
- LLM provider abstraction
- Context/memory management

### What We Build Custom
- VS Code extension UI/integration
- Jupyter notebook executor
- Causal inference domain knowledge/prompts
- Specialized validation logic
- All React webview components

---

## Excluded from MVP

### Features Explicitly NOT in v0.1
1. **MCP Integration** - Deferred to v0.2 (adds complexity, not core to validation)
2. **Iterative Feedback Loops** - Deferred to v0.3 (need MVP user data first)
3. **Sensitivity Analysis** - Deferred to v0.5 (not essential for workflow validation)
4. **Report Generation** - Deferred to v0.5 (manual copy-paste sufficient for MVP)
5. **Interactive DAG Editor** - Deferred to v0.2 (text representation sufficient for MVP)
6. **SDK Configuration** - Deferred to v0.2 (users can use standard libraries)
7. **R Language Support** - Deferred to v1.5 (Python-first approach)
8. **Multi-notebook Support** - Deferred to v0.2 (single notebook sufficient)

### Why These Exclusions?
- **Focus**: Validate core workflow guidance before adding complexity
- **Speed**: 3-month timeline requires ruthless prioritization
- **Learning**: Need user feedback before investing in polish
- **Risk**: MCP/SDK integration adds external dependencies

---

## Success Criteria

### Launch Metrics (Month 3)
- **Adoption**: 50 beta users
- **Engagement**: 70% complete at least one workflow
- **Completion**: 60% reach estimation stage
- **Quality**: System provides causal-specific guidance (not generic)
- **User Satisfaction**: Positive feedback on DAG construction and identification stages

### Key Validation Questions
1. Do users find the causal-specific guidance valuable vs. generic coding assistants?
2. Does the DAG construction stage catch mistakes users would have made?
3. Is the workflow intuitive enough for researchers with basic stats knowledge?
4. What is the biggest friction point in the workflow?

---

## Development Phases

### Phase 1: Foundation (Weeks 1-4)
- Set up repository structure ✅
- Configure build pipeline
- Implement basic extension activation
- Create webview chat UI skeleton
- Set up Jupyter integration scaffolding

### Phase 2: Core Agents (Weeks 5-8)
- Implement Formulation Agent
- Implement EDA Agent (basic)
- Implement DAG Builder Agent
- Implement Identification Agent
- Implement Estimation Agent

### Phase 3: Integration (Weeks 9-10)
- Wire agents to Mastra workflows
- Connect Jupyter executor
- Implement state management
- Build workflow progress UI

### Phase 4: Polish & Testing (Weeks 11-12)
- End-to-end testing
- Bug fixes
- Documentation
- Beta user recruitment
- Internal dogfooding

---

## Risk Mitigation

### Risk: LLM generates incorrect causal reasoning
**Mitigation**:
- Implement validation checks using formal algorithms (backdoor criterion)
- Flag low-confidence results
- User can always override
- Extensive prompt engineering and testing

### Risk: Jupyter integration fragility
**Mitigation**:
- Robust error handling
- Save state frequently
- Support kernel restart
- Fallback to manual execution

### Risk: Scope creep
**Mitigation**:
- This document! Strict P0/P1/P2 prioritization
- Weekly scope review
- Say "no" to non-P0 features
- Defer to post-MVP

---

## Post-MVP Roadmap

### v0.2 - Enhanced MVP (Months 4-5)
- Add MCP server integration
- Interactive DAG visual editor
- SDK configuration support
- Enhanced error recovery

### v0.3 - Beta (Month 6)
- Iterative feedback loops
- Advanced validation
- Workflow templates

### v0.5 - Feature Complete (Month 9)
- Sensitivity analysis
- Report generation
- Advanced methods

See [full PRD](../causal-inference-assistant-prd.md) for complete roadmap.

---

## Document Version

**Version**: 1.0
**Last Updated**: October 22, 2025
**Status**: Final for MVP Development
**Owner**: Product Team
