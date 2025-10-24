/**
 * Planner Agent
 *
 * High-level orchestration agent that uses LLM to:
 * - Analyze user intent and conversation context
 * - Generate causal inference specifications
 * - Create execution plans with sub-agent delegation
 * - Route tasks to specialized agents (Formulation, EDA, Estimation, etc.)
 */

import OpenAI from 'openai';
import { WorkflowStage, SharedContext } from '../types/workflow.types';

export interface PlannerResult {
  intent: PlannerIntent;
  causalSpec: CausalSpecification;
  executionPlan: ExecutionPlan;
  confidence: number;
  reasoning: string;
}

export interface PlannerIntent {
  type: 'formulation' | 'eda' | 'estimation' | 'dag' | 'identification' | 'general_question' | 'workflow_control' | 'dataset_operation';
  subtype?: string;
  userGoal: string;
  requiresDataset: boolean;
  requiresPriorStages: WorkflowStage[];
}

export interface CausalSpecification {
  researchQuestion?: string;
  treatment?: string;
  outcome?: string;
  confounders?: string[];
  assumptionsToCheck?: string[];
  estimationMethod?: string;
  dataRequirements?: string[];
}

export interface ExecutionPlan {
  steps: ExecutionStep[];
  estimatedDuration: string;
  prerequisites: string[];
  expectedOutputs: string[];
}

export interface ExecutionStep {
  stepNumber: number;
  agent: string;
  action: string;
  input: string;
  expectedOutput: string;
  dependsOn?: number[];
}

export class PlannerAgent {
  private llmClient: OpenAI;

  constructor() {
    // Initialize OpenAI client
    this.llmClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze user message and create execution plan
   */
  public async analyze(
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }>,
    currentContext: SharedContext,
    currentStage: WorkflowStage
  ): Promise<PlannerResult> {
    // Build context for LLM
    const contextSummary = this.buildContextSummary(currentContext, currentStage);
    const historyText = this.formatConversationHistory(conversationHistory);

    // Create analysis prompt
    const analysisPrompt = `${this.getPlannerInstructions()}

## Current Workflow State
${contextSummary}

## Conversation History
${historyText}

## User Message
"${userMessage}"

## Your Task
Analyze this user message and provide a detailed plan in JSON format:

{
  "intent": {
    "type": "formulation | eda | estimation | dag | identification | general_question | workflow_control | dataset_operation",
    "subtype": "more specific intent if applicable",
    "userGoal": "what the user wants to accomplish",
    "requiresDataset": true/false,
    "requiresPriorStages": ["list of prerequisite stages"]
  },
  "causalSpec": {
    "researchQuestion": "clear causal question",
    "treatment": "treatment variable",
    "outcome": "outcome variable",
    "confounders": ["list of potential confounders"],
    "assumptionsToCheck": ["list of assumptions to verify"],
    "estimationMethod": "recommended method",
    "dataRequirements": ["what data is needed"]
  },
  "executionPlan": {
    "steps": [
      {
        "stepNumber": 1,
        "agent": "FormulationAgent | EDAAgent | EstimationAgent | etc",
        "action": "what this agent should do",
        "input": "specific input for the agent",
        "expectedOutput": "what we expect to get",
        "dependsOn": [optional array of step numbers]
      }
    ],
    "estimatedDuration": "e.g., 30 seconds, 2 minutes",
    "prerequisites": ["what's needed before starting"],
    "expectedOutputs": ["what the user will receive"]
  },
  "confidence": 0.0-1.0,
  "reasoning": "explain your analysis and plan"
}

IMPORTANT: Return ONLY valid JSON, no markdown or explanation outside the JSON.`;

    try {
      // Call LLM to analyze
      const completion = await this.llmClient.chat.completions.create({
        model: process.env.LLM_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: this.getPlannerInstructions() },
          { role: 'user', content: analysisPrompt },
        ],
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || '';

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in LLM response');
      }

      const plannerResult: PlannerResult = JSON.parse(jsonMatch[0]);

      // Validate and enrich the result
      return this.validateAndEnrich(plannerResult, currentContext, currentStage);

    } catch (error) {
      console.error('Planner agent error:', error);

      // Fallback to keyword-based analysis
      return this.fallbackAnalysis(userMessage, currentContext, currentStage);
    }
  }

  /**
   * Get planner agent instructions
   */
  private getPlannerInstructions(): string {
    return `You are a Planner Agent specialized in causal inference workflows.

## Your Role
- Analyze user messages to understand their causal inference goals
- Extract causal specifications (treatment, outcome, confounders)
- Create step-by-step execution plans
- Delegate tasks to specialized sub-agents

## Available Sub-Agents
1. **FormulationAgent**: Formulates research questions, identifies treatment/outcome/confounders
2. **EDAAgent**: Exploratory data analysis, checks causal assumptions, data quality
3. **EstimationAgent**: Estimates causal effects using appropriate methods
4. **DAGAgent**: (Future) Constructs and validates causal DAGs
5. **IdentificationAgent**: (Future) Determines identifiability of causal effects

## Causal Inference Workflow Stages
1. **Formulation**: Define research question, treatment, outcome, confounders
2. **EDA**: Check assumptions (positivity, SUTVA, no unmeasured confounding)
3. **DAG**: Construct causal graph, identify adjustment sets
4. **Identification**: Determine if causal effect is identifiable
5. **Estimation**: Calculate causal effect estimate
6. **Sensitivity**: (Future) Test robustness to violations

## Analysis Guidelines
- Extract causal variables from natural language
- Identify what stage the user is asking about
- Determine prerequisites (e.g., estimation needs formulation first)
- Check if dataset is required
- Plan concrete, actionable steps
- Be specific about agent inputs/outputs
- Consider conversation context and current workflow state

## Example Intents
- "Does X affect Y?" → Formulation stage, extract treatment/outcome
- "Explore the data" → EDA stage, check if dataset exists
- "Estimate the effect" → Estimation stage, check if formulation done
- "Load dataset" → Dataset operation
- "What assumptions should I check?" → General question about EDA

## Causal Inference Best Practices
- A causal question asks: "What is the effect of X (treatment) on Y (outcome) in population P?"
- Treatment must be well-defined and manipulable
- Outcome must be measurable and occur after treatment
- Always identify potential confounders
- Check positivity, SUTVA, and no unmeasured confounding assumptions
- Use appropriate estimation methods (regression, matching, IPW, etc.)

Provide detailed, structured plans that guide the user through rigorous causal analysis.`;
  }

  /**
   * Build summary of current workflow context
   */
  private buildContextSummary(context: SharedContext, stage: WorkflowStage): string {
    const parts = [
      `Current Stage: ${stage}`,
      context.treatment ? `Treatment: ${context.treatment}` : 'Treatment: Not defined',
      context.outcome ? `Outcome: ${context.outcome}` : 'Outcome: Not defined',
      context.confounders?.length ? `Confounders: ${context.confounders.join(', ')}` : 'Confounders: Not defined',
      context.dataset ? `Dataset: ${context.dataset.name} (${context.dataset.rows} rows, ${context.dataset.columns.length} columns)` : 'Dataset: Not loaded',
      context.adjustmentSet ? `Adjustment Set: ${context.adjustmentSet.join(', ')}` : 'Adjustment Set: Not identified',
      context.estimate ? `Previous Estimate: ${context.estimate.effect} (method: ${context.estimate.method})` : 'Causal Effect: Not estimated',
    ];

    return parts.join('\n');
  }

  /**
   * Format conversation history for LLM context
   */
  private formatConversationHistory(history: Array<{ role: string; content: string }>): string {
    if (history.length === 0) {
      return '(No previous conversation)';
    }

    // Get last 5 messages to keep context manageable
    const recentHistory = history.slice(-5);

    return recentHistory
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Validate and enrich planner result
   */
  private validateAndEnrich(
    result: PlannerResult,
    context: SharedContext,
    _stage: WorkflowStage
  ): PlannerResult {
    // Ensure confidence is between 0 and 1
    if (result.confidence < 0) result.confidence = 0;
    if (result.confidence > 1) result.confidence = 1;

    // Fill in missing causal spec from context
    if (!result.causalSpec.treatment && context.treatment) {
      result.causalSpec.treatment = context.treatment;
    }
    if (!result.causalSpec.outcome && context.outcome) {
      result.causalSpec.outcome = context.outcome;
    }
    if (!result.causalSpec.confounders?.length && context.confounders?.length) {
      result.causalSpec.confounders = context.confounders;
    }

    // Add implicit prerequisites based on intent
    if (result.intent.type === 'estimation' && !result.intent.requiresPriorStages?.includes(WorkflowStage.FORMULATION)) {
      result.intent.requiresPriorStages = result.intent.requiresPriorStages || [];
      if (!result.intent.requiresPriorStages.includes(WorkflowStage.FORMULATION)) {
        result.intent.requiresPriorStages.push(WorkflowStage.FORMULATION);
      }
    }

    if (result.intent.type === 'eda' && result.intent.requiresDataset === undefined) {
      result.intent.requiresDataset = true;
    }

    return result;
  }

  /**
   * Fallback analysis using keyword matching (when LLM fails)
   */
  private fallbackAnalysis(
    message: string,
    context: SharedContext,
    _stage: WorkflowStage
  ): PlannerResult {
    const lowerMsg = message.toLowerCase();

    // Simple keyword-based intent detection
    let intent: PlannerIntent;
    let causalSpec: CausalSpecification = {};
    let executionPlan: ExecutionPlan;

    // Check for greetings and conversational queries first
    if (
      lowerMsg.includes('hello') ||
      lowerMsg.includes('hi') ||
      lowerMsg.includes('hey') ||
      lowerMsg.match(/what.*(your|ur).*name/) ||
      lowerMsg.match(/who.*are.*you/)
    ) {
      intent = {
        type: 'general_question',
        subtype: 'greeting',
        userGoal: 'Greet or learn about the assistant',
        requiresDataset: false,
        requiresPriorStages: [],
      };

      executionPlan = {
        steps: [
          {
            stepNumber: 1,
            agent: 'Assistant',
            action: 'Introduce myself and explain capabilities',
            input: message,
            expectedOutput: 'Friendly greeting and overview',
          },
        ],
        estimatedDuration: '5 seconds',
        prerequisites: [],
        expectedOutputs: ['Introduction and capabilities overview'],
      };

      return {
        intent,
        causalSpec,
        executionPlan,
        confidence: 0.95,
        reasoning: 'Detected greeting or introduction request',
      };
    }

    // Check for help requests
    if (
      lowerMsg.includes('help') ||
      lowerMsg.includes('how do i') ||
      lowerMsg.includes('how to') ||
      lowerMsg.includes('can you help')
    ) {
      intent = {
        type: 'general_question',
        subtype: 'help',
        userGoal: 'Get help with specific task',
        requiresDataset: false,
        requiresPriorStages: [],
      };

      executionPlan = {
        steps: [
          {
            stepNumber: 1,
            agent: 'Assistant',
            action: 'Provide specific help based on question',
            input: message,
            expectedOutput: 'Actionable guidance',
          },
        ],
        estimatedDuration: '5 seconds',
        prerequisites: [],
        expectedOutputs: ['Step-by-step instructions or guidance'],
      };

      return {
        intent,
        causalSpec,
        executionPlan,
        confidence: 0.9,
        reasoning: 'Detected help request',
      };
    }

    // Check for affirmative responses (yes, sure, okay, etc.)
    if (
      lowerMsg === 'yes' ||
      lowerMsg === 'yeah' ||
      lowerMsg === 'sure' ||
      lowerMsg === 'ok' ||
      lowerMsg === 'okay' ||
      lowerMsg === 'y'
    ) {
      intent = {
        type: 'workflow_control',
        subtype: 'affirmative',
        userGoal: 'Confirm or agree to previous suggestion',
        requiresDataset: false,
        requiresPriorStages: [],
      };

      executionPlan = {
        steps: [
          {
            stepNumber: 1,
            agent: 'Assistant',
            action: 'Act on previous question or suggestion',
            input: message,
            expectedOutput: 'Follow-up action',
          },
        ],
        estimatedDuration: '5 seconds',
        prerequisites: [],
        expectedOutputs: ['Appropriate follow-up action'],
      };

      return {
        intent,
        causalSpec,
        executionPlan,
        confidence: 0.85,
        reasoning: 'Detected affirmative response',
      };
    }

    if (lowerMsg.includes('effect of') || lowerMsg.includes('does') || lowerMsg.includes('cause')) {
      intent = {
        type: 'formulation',
        userGoal: 'Formulate a causal research question',
        requiresDataset: false,
        requiresPriorStages: [],
      };

      causalSpec = {
        researchQuestion: message,
      };

      executionPlan = {
        steps: [
          {
            stepNumber: 1,
            agent: 'FormulationAgent',
            action: 'Extract treatment, outcome, and confounders from research question',
            input: message,
            expectedOutput: 'Structured causal specification',
          },
        ],
        estimatedDuration: '30 seconds',
        prerequisites: [],
        expectedOutputs: ['Treatment variable', 'Outcome variable', 'List of confounders'],
      };
    } else if (lowerMsg.includes('explore') || lowerMsg.includes('check assumptions') || lowerMsg.includes('eda')) {
      intent = {
        type: 'eda',
        userGoal: 'Perform exploratory data analysis',
        requiresDataset: true,
        requiresPriorStages: [WorkflowStage.FORMULATION],
      };

      causalSpec = {
        treatment: context.treatment,
        outcome: context.outcome,
        confounders: context.confounders,
        assumptionsToCheck: ['Positivity', 'SUTVA', 'No unmeasured confounding'],
      };

      executionPlan = {
        steps: [
          {
            stepNumber: 1,
            agent: 'EDAAgent',
            action: 'Check causal assumptions and data quality',
            input: message,
            expectedOutput: 'Assumption validation results',
          },
        ],
        estimatedDuration: '1-2 minutes',
        prerequisites: ['Dataset loaded', 'Variables defined'],
        expectedOutputs: ['Data quality report', 'Assumption checks', 'Visualization suggestions'],
      };
    } else if (lowerMsg.includes('estimate') || lowerMsg.includes('calculate')) {
      intent = {
        type: 'estimation',
        userGoal: 'Estimate causal effect',
        requiresDataset: true,
        requiresPriorStages: [WorkflowStage.FORMULATION, WorkflowStage.EDA],
      };

      causalSpec = {
        treatment: context.treatment,
        outcome: context.outcome,
        confounders: context.confounders,
        estimationMethod: 'Regression adjustment with confounders',
      };

      executionPlan = {
        steps: [
          {
            stepNumber: 1,
            agent: 'EstimationAgent',
            action: 'Estimate average treatment effect',
            input: message,
            expectedOutput: 'Causal effect estimate with confidence interval',
          },
        ],
        estimatedDuration: '1-2 minutes',
        prerequisites: ['Dataset loaded', 'Variables defined', 'Assumptions checked'],
        expectedOutputs: ['Treatment effect estimate', 'Standard error', 'Confidence interval'],
      };
    } else {
      intent = {
        type: 'general_question',
        userGoal: 'Get information or guidance',
        requiresDataset: false,
        requiresPriorStages: [],
      };

      executionPlan = {
        steps: [
          {
            stepNumber: 1,
            agent: 'PlannerAgent',
            action: 'Provide guidance',
            input: message,
            expectedOutput: 'Helpful response',
          },
        ],
        estimatedDuration: '5 seconds',
        prerequisites: [],
        expectedOutputs: ['Guidance message'],
      };
    }

    return {
      intent,
      causalSpec,
      executionPlan,
      confidence: 0.6, // Lower confidence for keyword-based
      reasoning: 'Fallback keyword-based analysis (LLM analysis failed)',
    };
  }

  /**
   * Extract causal variables from natural language using LLM
   */
  public async extractCausalVariables(researchQuestion: string): Promise<{
    treatment: string;
    outcome: string;
    confounders: string[];
    confidence: number;
  }> {
    const prompt = `Extract causal variables from this research question:

"${researchQuestion}"

Return JSON format:
{
  "treatment": "the intervention or exposure variable",
  "outcome": "the outcome variable of interest",
  "confounders": ["list of potential confounding variables"],
  "confidence": 0.0-1.0
}

IMPORTANT: Return ONLY valid JSON.`;

    try {
      const completion = await this.llmClient.chat.completions.create({
        model: process.env.LLM_MODEL || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Variable extraction error:', error);
    }

    // Fallback to empty result
    return {
      treatment: '',
      outcome: '',
      confounders: [],
      confidence: 0.0,
    };
  }

  /**
   * Suggest next steps based on current workflow state
   */
  public async suggestNextSteps(
    context: SharedContext,
    stage: WorkflowStage,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<string[]> {
    const contextSummary = this.buildContextSummary(context, stage);
    const historyText = this.formatConversationHistory(conversationHistory);

    const prompt = `Given the current workflow state, suggest 3-5 next steps for the user.

## Current State
${contextSummary}

## Recent Conversation
${historyText}

Provide actionable suggestions as a JSON array of strings:
["Step 1", "Step 2", "Step 3"]

IMPORTANT: Return ONLY a valid JSON array.`;

    try {
      const completion = await this.llmClient.chat.completions.create({
        model: process.env.LLM_MODEL || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || '';
      const jsonMatch = response.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Next steps suggestion error:', error);
    }

    // Fallback suggestions based on stage
    return this.getDefaultNextSteps(stage, context);
  }

  /**
   * Get default next steps based on workflow stage
   */
  private getDefaultNextSteps(_stage: WorkflowStage, context: SharedContext): string[] {
    const stage = _stage; // Use the parameter
    switch (stage) {
      case WorkflowStage.FORMULATION:
        return [
          'Load or create a dataset',
          'Run exploratory data analysis to check assumptions',
          'Review and refine the causal variables',
        ];

      case WorkflowStage.EDA:
        if (!context.dataset) {
          return ['Load a dataset to begin analysis'];
        }
        return [
          'Check positivity and overlap assumptions',
          'Visualize treatment and outcome distributions',
          'Proceed to causal effect estimation',
        ];

      case WorkflowStage.ESTIMATION:
        return [
          'Review the causal effect estimate',
          'Check sensitivity to unmeasured confounding',
          'Generate a summary report',
        ];

      default:
        return [
          'Ask me a causal inference question',
          'Load a dataset to analyze',
          'Start a new workflow',
        ];
    }
  }
}
