/**
 * Chat Workflow Orchestrator
 *
 * Handles user messages from chat and orchestrates the appropriate
 * agent workflow based on the current stage and user intent.
 */

import * as vscode from 'vscode';
import { WorkflowStage, SharedContext } from '../types/workflow.types';
import { Task } from '../types/agent.types';
import { FormulationAgent } from '../agents/formulation-agent';
import { EDAAgent } from '../agents/eda-agent';
import { EstimationAgent } from '../agents/estimation-agent';
import { PlannerAgent, PlannerResult } from '../agents/planner-agent';
import { getChatProvider } from '../extension/extension';
import { executeCausalWorkflow } from './causal-workflow';

export interface WorkflowSession {
  id: string;
  startedAt: number;
  currentStage: WorkflowStage;
  sharedContext: SharedContext;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
  }>;
}

export class ChatWorkflowOrchestrator {
  private currentSession: WorkflowSession | null = null;
  private plannerAgent: PlannerAgent;

  constructor() {
    this.plannerAgent = new PlannerAgent();
  }

  /**
   * Start a new workflow session
   */
  public startNewSession(): WorkflowSession {
    this.currentSession = {
      id: `session-${Date.now()}`,
      startedAt: Date.now(),
      currentStage: WorkflowStage.FORMULATION,
      sharedContext: {
        confounders: [], // Initialize required field
      },
      conversationHistory: [],
    };
    return this.currentSession;
  }

  /**
   * Get the current workflow session
   */
  public getCurrentSession(): WorkflowSession | null {
    return this.currentSession;
  }

  /**
   * Execute full workflow using Mastra orchestration
   * This runs all three steps (Formulation → EDA → Estimation) automatically
   */
  public async executeFullWorkflow(userMessage: string): Promise<void> {
    const chatProvider = getChatProvider();
    if (!chatProvider) {
      vscode.window.showErrorMessage('Chat provider not initialized');
      return;
    }

    // Initialize session if needed
    if (!this.currentSession) {
      this.startNewSession();
    }

    chatProvider.sendSystemMessage('🚀 Starting complete causal inference workflow...');

    try {
      const result = await executeCausalWorkflow(
        userMessage,
        this.currentSession!.sharedContext
      );

      if (result.status === 'success') {
        // Update session with final context from estimation step
        if (result.steps?.estimation?.output?.sharedContext) {
          this.currentSession!.sharedContext = result.steps.estimation.output.sharedContext;
        }

        // Update workflow stage
        this.currentSession!.currentStage = WorkflowStage.ESTIMATION;

        chatProvider.sendSystemMessage('✅ Full workflow completed successfully!');
      } else {
        chatProvider.sendError(`Workflow failed with status: ${result.status}`);
      }
    } catch (error) {
      chatProvider.sendError(`Workflow execution failed: ${error}`);
      console.error('Mastra workflow error:', error);
    }
  }

  /**
   * Process a user message and orchestrate the appropriate agent workflow
   */
  public async processUserMessage(message: string): Promise<void> {
    const chatProvider = getChatProvider();
    if (!chatProvider) {
      vscode.window.showErrorMessage('Chat provider not initialized');
      return;
    }

    // Initialize session if needed
    if (!this.currentSession) {
      this.startNewSession();
      chatProvider.sendSystemMessage(
        '🚀 Starting new causal inference workflow. Let\'s begin by formulating your research question.'
      );
    }

    // Check if user is confirming dataset is loaded
    const datasetConfirmationPatterns = [
      /dataset.*loaded.*df/i,
      /df.*loaded/i,
      /already.*loaded/i,
      /data.*in.*df/i,
      /using.*df/i,
    ];

    if (datasetConfirmationPatterns.some((pattern) => pattern.test(message))) {
      // User confirmed dataset exists - update context
      if (!this.currentSession!.sharedContext.dataset) {
        this.currentSession!.sharedContext.dataset = {
          name: 'df',
          rows: -1, // Unknown size
          columns: [], // Will be determined during EDA
        };
        chatProvider.sendSystemMessage('✅ Noted: Dataset is loaded as `df`. Proceeding with analysis...');
      }
    }

    // Add user message to history
    this.currentSession!.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });

    // Use Planner Agent to analyze intent and create execution plan
    chatProvider.sendSystemMessage('🤔 Analyzing your request...');

    let plannerResult: PlannerResult;
    try {
      plannerResult = await this.plannerAgent.analyze(
        message,
        this.currentSession!.conversationHistory,
        this.currentSession!.sharedContext,
        this.currentSession!.currentStage
      );

      // Log planner analysis for debugging
      console.log('Planner analysis:', JSON.stringify(plannerResult, null, 2));

      // Show planner reasoning if confidence is low
      if (plannerResult.confidence < 0.7) {
        chatProvider.sendSystemMessage(
          `⚠️ I'm ${Math.round(plannerResult.confidence * 100)}% confident about this. ${plannerResult.reasoning}`
        );
      }

    } catch (error) {
      console.error('Planner analysis failed:', error);
      chatProvider.sendError('Failed to analyze your request. Please try rephrasing.');
      return;
    }

    // Execute the plan
    try {
      await this.executePlan(plannerResult, message);
    } catch (error) {
      chatProvider.sendError(`Error executing plan: ${error}`);
      console.error('Plan execution error:', error);
    }
  }

  /**
   * Execute the planner's execution plan
   */
  private async executePlan(plannerResult: PlannerResult, originalMessage: string): Promise<void> {
    const chatProvider = getChatProvider();
    if (!chatProvider) return;

    const { intent, causalSpec, executionPlan } = plannerResult;

    // Check prerequisites
    const missingPrereqs = this.checkPrerequisites(plannerResult);
    if (missingPrereqs.length > 0) {
      chatProvider.sendAssistantMessage(
        `Before we proceed, we need:\n${missingPrereqs.map((p) => `- ${p}`).join('\n')}\n\nWould you like help with these?`,
        { agentName: 'Assistant', type: 'text' }
      );
      return;
    }

    // Show execution plan
    if (executionPlan.steps.length > 1) {
      const planSummary = `📋 **Execution Plan** (${executionPlan.estimatedDuration}):\n${executionPlan.steps
        .map((step) => `${step.stepNumber}. ${step.action} (${step.agent})`)
        .join('\n')}`;
      chatProvider.sendSystemMessage(planSummary);
    }

    // Update shared context with causal spec
    if (causalSpec.treatment) this.currentSession!.sharedContext.treatment = causalSpec.treatment;
    if (causalSpec.outcome) this.currentSession!.sharedContext.outcome = causalSpec.outcome;
    if (causalSpec.confounders) this.currentSession!.sharedContext.confounders = causalSpec.confounders;

    // Route to appropriate handler based on intent type
    switch (intent.type) {
      case 'formulation':
        await this.handleFormulation(originalMessage, plannerResult);
        break;

      case 'eda':
        await this.handleEDA(originalMessage, plannerResult);
        break;

      case 'estimation':
        await this.handleEstimation(originalMessage, plannerResult);
        break;

      case 'workflow_control':
        await this.handleWorkflowControl(intent.subtype || 'continue');
        break;

      case 'dataset_operation':
        await this.handleDatasetOperation(originalMessage, plannerResult);
        break;

      case 'general_question':
        await this.handleGeneralQuestion(originalMessage, plannerResult);
        break;

      default:
        await this.handleUnknownIntent(originalMessage);
    }

    // Suggest next steps after execution
    const nextSteps = await this.plannerAgent.suggestNextSteps(
      this.currentSession!.sharedContext,
      this.currentSession!.currentStage,
      this.currentSession!.conversationHistory
    );

    if (nextSteps.length > 0) {
      chatProvider.sendSystemMessage(
        `✨ **Suggested Next Steps:**\n${nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`
      );
    }
  }

  /**
   * Check if prerequisites are met for the plan
   */
  private checkPrerequisites(plannerResult: PlannerResult): string[] {
    const missing: string[] = [];
    const { intent, executionPlan } = plannerResult;
    const context = this.currentSession!.sharedContext;

    // Check if dataset is required but not loaded
    if (intent.requiresDataset && !context.dataset) {
      missing.push('Dataset needs to be loaded');
    }

    // Check if prior stages are required
    if (intent.requiresPriorStages) {
      for (const requiredStage of intent.requiresPriorStages) {
        if (requiredStage === WorkflowStage.FORMULATION) {
          if (!context.treatment || !context.outcome) {
            missing.push('Research question needs to be formulated (treatment and outcome defined)');
          }
        }
        if (requiredStage === WorkflowStage.EDA) {
          if (!context.dataset) {
            missing.push('Exploratory data analysis needs to be completed');
          }
        }
      }
    }

    // Check explicit prerequisites from execution plan
    for (const prereq of executionPlan.prerequisites) {
      if (prereq.toLowerCase().includes('dataset') && !context.dataset) {
        if (!missing.some(m => m.includes('Dataset'))) {
          missing.push(prereq);
        }
      }
    }

    return missing;
  }

  /**
   * Analyze user intent from their message (DEPRECATED - now using Planner Agent)
   */
  private async handleFormulation(message: string, _plannerResult: PlannerResult): Promise<void> {
    const chatProvider = getChatProvider();
    if (!chatProvider) return;

    chatProvider.sendSystemMessage('🎯 Analyzing your research question...');

    const agent = new FormulationAgent();
    const task: Task = {
      id: `formulation-${Date.now()}`,
      stage: WorkflowStage.FORMULATION,
      description: 'Formulate causal research question',
      input: message,
    };

    const result = await agent.execute(task, this.currentSession!.sharedContext);

    if (result.success && result.data) {
      const data = result.data as any;

      // Update shared context with formulation results
      if (data.treatment) this.currentSession!.sharedContext.treatment = data.treatment;
      if (data.outcome) this.currentSession!.sharedContext.outcome = data.outcome;
      if (data.confounders) this.currentSession!.sharedContext.confounders = data.confounders;

      // Send agent response
      chatProvider.sendAssistantMessage(data.summary || 'Formulation completed', {
        agentName: 'Formulation Agent',
        type: 'agent-output',
        workflowStage: 'formulation',
        metadata: {
          treatment: data.treatment,
          outcome: data.outcome,
          confounders: data.confounders,
          assumptions: data.assumptions,
        },
      });

      // Add suggested next steps
      if (result.suggestedNextSteps && result.suggestedNextSteps.length > 0) {
        chatProvider.sendSystemMessage(
          `✅ Research question formulated!\n\n**Next Steps:**\n${result.suggestedNextSteps.map((s) => `- ${s}`).join('\n')}`
        );
      }

      // Automatically advance to EDA stage
      this.currentSession!.currentStage = WorkflowStage.EDA;

    } else {
      chatProvider.sendError('Failed to formulate research question. Please try rephrasing your question.');
    }
  }

  /**
   * Handle EDA stage workflow
   */
  private async handleEDA(message: string, _plannerResult: PlannerResult): Promise<void> {
    const chatProvider = getChatProvider();
    if (!chatProvider) return;

    // Check if we have necessary context
    if (!this.currentSession!.sharedContext.dataset) {
      chatProvider.sendAssistantMessage(
        'I need a dataset to perform exploratory data analysis. Please load a dataset first or create one.',
        { agentName: 'System', type: 'text' }
      );
      return;
    }

    chatProvider.sendSystemMessage('🔍 Running exploratory data analysis...');

    const agent = new EDAAgent();
    const task: Task = {
      id: `eda-${Date.now()}`,
      stage: WorkflowStage.EDA,
      description: 'Exploratory data analysis for causal assumptions',
      input: message,
    };

    const result = await agent.execute(task, this.currentSession!.sharedContext);

    if (result.success && result.data) {
      const data = result.data as any;

      chatProvider.sendAssistantMessage(data.summary || 'EDA completed', {
        agentName: 'EDA Agent',
        type: 'agent-output',
        workflowStage: 'eda',
        metadata: {
          executionSuccess: data.executionSuccess,
          pythonCode: data.pythonCode,
          checks: data.checks,
          violations: data.violations,
        },
      });

      // Show execution output if available
      if (data.executionOutput) {
        chatProvider.sendAssistantMessage(data.executionOutput, {
          agentName: 'EDA Agent',
          type: 'text',
        });
      }

      // Add suggested next steps
      if (result.suggestedNextSteps && result.suggestedNextSteps.length > 0) {
        chatProvider.sendSystemMessage(
          `✅ EDA completed!\n\n**Next Steps:**\n${result.suggestedNextSteps.map((s) => `- ${s}`).join('\n')}`
        );
      }

      // Advance to estimation if EDA looks good
      if (!data.violations || data.violations.length === 0) {
        this.currentSession!.currentStage = WorkflowStage.ESTIMATION;
      }
    } else {
      chatProvider.sendError('Failed to complete EDA. Please check your dataset and try again.');
    }
  }

  /**
   * Handle estimation stage workflow
   */
  private async handleEstimation(message: string, _plannerResult: PlannerResult): Promise<void> {
    const chatProvider = getChatProvider();
    if (!chatProvider) return;

    // Check prerequisites
    if (!this.currentSession!.sharedContext.treatment || !this.currentSession!.sharedContext.outcome) {
      chatProvider.sendAssistantMessage(
        'I need treatment and outcome variables defined before estimation. Let\'s formulate the research question first.',
        { agentName: 'System', type: 'text' }
      );
      return;
    }

    chatProvider.sendSystemMessage('📊 Estimating causal effect...');

    const agent = new EstimationAgent();
    const task: Task = {
      id: `estimation-${Date.now()}`,
      stage: WorkflowStage.ESTIMATION,
      description: 'Estimate causal effect',
      input: message,
    };

    const result = await agent.execute(task, this.currentSession!.sharedContext);

    if (result.success && result.data) {
      const data = result.data as any;

      chatProvider.sendAssistantMessage(
        `**Causal Effect Estimation**\n\n${data.explanation || 'Estimation completed'}`,
        {
          agentName: 'Estimation Agent',
          type: 'agent-output',
          workflowStage: 'estimation',
          metadata: {
            executionSuccess: data.executionSuccess,
            pythonCode: data.pythonCode,
            estimate: data.estimate,
          },
        }
      );

      // Show execution output
      if (data.executionOutput) {
        chatProvider.sendAssistantMessage(data.executionOutput, {
          agentName: 'Estimation Agent',
          type: 'text',
        });
      }

      // Show interpretation
      if (data.interpretation) {
        chatProvider.sendAssistantMessage(`**Interpretation**: ${data.interpretation}`, {
          agentName: 'Estimation Agent',
          type: 'text',
        });
      }

      // Add suggested next steps
      if (result.suggestedNextSteps && result.suggestedNextSteps.length > 0) {
        chatProvider.sendSystemMessage(
          `✅ Estimation completed!\n\n**Next Steps:**\n${result.suggestedNextSteps.map((s) => `- ${s}`).join('\n')}`
        );
      }
    } else {
      chatProvider.sendError('Failed to estimate causal effect. Please check your data and try again.');
    }
  }

  /**
   * Handle dataset operations (load, create, preview)
   */
  private async handleDatasetOperation(_message: string, _plannerResult: PlannerResult): Promise<void> {
    const chatProvider = getChatProvider();
    if (!chatProvider) return;

    chatProvider.sendSystemMessage('📁 Processing dataset operation...');

    // For now, suggest using the demo workflow command
    chatProvider.sendAssistantMessage(
      `Dataset operations are not fully implemented yet. You can:\n\n` +
        `1. Run the **"Demo Workflow in Chat"** command to create a sample dataset\n` +
        `2. Or I can help you formulate your research question first, then we'll work on data loading\n\n` +
        `What would you like to do?`,
      { agentName: 'Assistant', type: 'text' }
    );
  }

  /**
   * Handle general questions about causal inference
   */
  private async handleGeneralQuestion(message: string, plannerResult: PlannerResult): Promise<void> {
    const chatProvider = getChatProvider();
    if (!chatProvider) return;

    const { intent } = plannerResult;

    // Handle different subtypes of general questions
    switch (intent.subtype) {
      case 'greeting':
        chatProvider.sendAssistantMessage(
          `👋 Hello! I'm your Causal Inference Assistant.\n\n` +
          `I help you analyze cause-and-effect relationships in data using rigorous statistical methods.\n\n` +
          `**What I can do:**\n` +
          `- Formulate causal research questions\n` +
          `- Check data quality and assumptions (EDA)\n` +
          `- Estimate treatment effects\n` +
          `- Validate causal assumptions\n\n` +
          `**Get started:**\n` +
          `- Try asking: "Does education affect income?"\n` +
          `- Or: "How do I load my data?"\n` +
          `- Or run the demo: Cmd+Shift+P → "Demo Workflow"`,
          { agentName: 'Assistant', type: 'text' }
        );
        break;

      case 'help':
        // Extract what they need help with from the message
        const helpTopic = this.extractHelpTopic(message);

        if (helpTopic === 'dataset') {
          chatProvider.sendAssistantMessage(
            `**Loading Data - Two Options:**\n\n` +
            `**Option 1: Demo Dataset** (Quickest)\n` +
            `- Press \`Cmd+Shift+P\` (Mac) or \`Ctrl+Shift+P\` (Windows)\n` +
            `- Type "Causal Assistant: Demo Workflow in Chat"\n` +
            `- This creates a sample heart attack prevention study\n\n` +
            `**Option 2: Your Own Data**\n` +
            `First, tell me your research question (e.g., "Does X affect Y?"), then I'll guide you on:\n` +
            `- What data you need\n` +
            `- How to prepare it\n` +
            `- How to load it\n\n` +
            `Which option would you prefer?`,
            { agentName: 'Assistant', type: 'text' }
          );
        } else if (helpTopic === 'formulation') {
          chatProvider.sendAssistantMessage(
            `**Formulating Causal Questions:**\n\n` +
            `A good causal question has:\n` +
            `1. **Treatment** (what you want to change): e.g., "education level"\n` +
            `2. **Outcome** (what you want to measure): e.g., "income"\n` +
            `3. **Population** (who you're studying): e.g., "adults in US"\n\n` +
            `**Example:** "Does education level affect income for adults in the US?"\n\n` +
            `Try stating your question, and I'll help refine it!`,
            { agentName: 'Assistant', type: 'text' }
          );
        } else {
          // General help
          chatProvider.sendAssistantMessage(
            `**How to Use This Assistant:**\n\n` +
            `**1. Formulate** your causal question\n` +
            `   Example: "Does aspirin reduce heart attacks?"\n\n` +
            `**2. Load or describe** your data\n` +
            `   Run demo or describe your dataset\n\n` +
            `**3. I'll guide you** through:\n` +
            `   - Data exploration and assumption checking\n` +
            `   - Causal effect estimation\n` +
            `   - Results interpretation\n\n` +
            `What would you like to start with?`,
            { agentName: 'Assistant', type: 'text' }
          );
        }
        break;

      default:
        // Use planner's reasoning for other general questions
        const response = plannerResult.reasoning || `I can help you with causal inference workflows. Here's what I can do:\n\n` +
          `- **Formulate** your research question (e.g., "Does education affect income?")\n` +
          `- **Analyze** your data to check causal assumptions\n` +
          `- **Estimate** causal effects using appropriate methods\n\n` +
          `What would you like to explore?`;

        chatProvider.sendAssistantMessage(response, { agentName: 'Assistant', type: 'text' });
    }
  }

  /**
   * Extract help topic from user message
   */
  private extractHelpTopic(message: string): string {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('data') || lowerMsg.includes('dataset') || lowerMsg.includes('load')) {
      return 'dataset';
    }
    if (lowerMsg.includes('question') || lowerMsg.includes('formulate') || lowerMsg.includes('start')) {
      return 'formulation';
    }
    if (lowerMsg.includes('estimate') || lowerMsg.includes('effect')) {
      return 'estimation';
    }
    if (lowerMsg.includes('assumption') || lowerMsg.includes('check') || lowerMsg.includes('explore')) {
      return 'eda';
    }

    return 'general';
  }

  /**
   * Handle workflow control commands (restart, continue, etc.)
   */
  private async handleWorkflowControl(action: string): Promise<void> {
    const chatProvider = getChatProvider();
    if (!chatProvider) return;

    switch (action) {
      case 'affirmative':
        // User said "yes" - provide helpful next steps based on context
        // Check if we have a dataset loaded
        const hasDataset = this.currentSession?.sharedContext?.dataset !== undefined;

        if (!hasDataset) {
          // Most likely context: user needs help loading data
          chatProvider.sendAssistantMessage(
            `Great! Let me help you get started.\n\n` +
            `**Quickest Way - Demo Dataset:**\n` +
            `1. Press \`Cmd+Shift+P\` (Mac) or \`Ctrl+Shift+P\` (Windows)\n` +
            `2. Type "Causal Assistant: Demo Workflow in Chat"\n` +
            `3. Press Enter\n\n` +
            `This will create a sample dataset analyzing whether aspirin reduces heart attacks.\n\n` +
            `**Or:** Tell me about your research question and I'll guide you through your own data.\n\n` +
            `What would you prefer?`,
            { agentName: 'Assistant', type: 'text' }
          );
        } else {
          // We have data, continue with workflow
          const stage = this.currentSession?.currentStage || WorkflowStage.FORMULATION;
          if (stage === WorkflowStage.FORMULATION) {
            chatProvider.sendSystemMessage(
              `✅ Perfect! Let's analyze your data. I'll check the causal assumptions first.`
            );
            // Trigger EDA automatically
            await this.handleEDA('Check causal assumptions', {
              intent: {
                type: 'eda',
                userGoal: 'Check causal assumptions',
                requiresDataset: true,
                requiresPriorStages: [],
              },
              causalSpec: {},
              executionPlan: {
                steps: [],
                estimatedDuration: '2-3 minutes',
                prerequisites: [],
                expectedOutputs: ['Data quality assessment', 'Assumption validation'],
              },
              confidence: 0.9,
              reasoning: 'User confirmed to proceed with analysis',
            });
          } else {
            chatProvider.sendSystemMessage(
              `📍 Continuing from ${stage}. Processing next steps...`
            );
          }
        }
        break;

      case 'restart':
        this.startNewSession();
        chatProvider.sendSystemMessage(
          '🔄 Workflow restarted. Let\'s begin with your research question.'
        );
        break;

      case 'continue':
        const stage = this.currentSession?.currentStage || WorkflowStage.FORMULATION;
        chatProvider.sendSystemMessage(
          `📍 Currently at: ${stage}. What would you like to do next?`
        );
        break;

      default:
        chatProvider.sendAssistantMessage(
          'I can help you navigate the workflow. Try:\n- "restart" to start over\n- "continue" to proceed\n- Ask a specific question',
          { agentName: 'Assistant', type: 'text' }
        );
    }
  }

  /**
   * Handle unknown intents
   */
  private async handleUnknownIntent(_message: string): Promise<void> {
    const chatProvider = getChatProvider();
    if (!chatProvider) return;

    chatProvider.sendAssistantMessage(
      `I'm not sure what you're asking. Could you rephrase? Here are some things I can help with:\n\n` +
        `- Formulate causal research questions\n` +
        `- Explore data for causal assumptions\n` +
        `- Estimate causal effects\n\n` +
        `Or try commands like "start", "continue", "help".`,
      { agentName: 'Assistant', type: 'text' }
    );
  }
}

// Export singleton instance
export const chatWorkflowOrchestrator = new ChatWorkflowOrchestrator();
