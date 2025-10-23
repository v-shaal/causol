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
import { getChatProvider } from '../extension/extension';

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

    // Add user message to history
    this.currentSession!.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });

    // Analyze user intent and route to appropriate handler
    const intent = this.analyzeUserIntent(message);

    try {
      switch (intent.type) {
        case 'formulation':
          await this.handleFormulation(message, intent);
          break;

        case 'eda':
          await this.handleEDA(message, intent);
          break;

        case 'estimation':
          await this.handleEstimation(message, intent);
          break;

        case 'general_question':
          await this.handleGeneralQuestion(message);
          break;

        case 'workflow_control':
          await this.handleWorkflowControl(intent.action || 'continue');
          break;

        default:
          await this.handleUnknownIntent(message);
      }
    } catch (error) {
      chatProvider.sendError(`Error processing message: ${error}`);
      console.error('Workflow orchestration error:', error);
    }
  }

  /**
   * Analyze user intent from their message
   */
  private analyzeUserIntent(message: string): {
    type: 'formulation' | 'eda' | 'estimation' | 'general_question' | 'workflow_control';
    action?: string;
    confidence?: number;
  } {
    const lowerMsg = message.toLowerCase();

    // Workflow control keywords
    if (
      lowerMsg.includes('start') ||
      lowerMsg.includes('begin') ||
      lowerMsg.includes('restart') ||
      lowerMsg.includes('reset')
    ) {
      return { type: 'workflow_control', action: 'restart' };
    }

    if (lowerMsg.includes('next') || lowerMsg.includes('continue') || lowerMsg.includes('proceed')) {
      return { type: 'workflow_control', action: 'continue' };
    }

    // Formulation stage keywords
    if (
      lowerMsg.includes('effect of') ||
      lowerMsg.includes('does') ||
      lowerMsg.includes('impact') ||
      lowerMsg.includes('cause') ||
      lowerMsg.includes('research question') ||
      lowerMsg.includes('treatment') ||
      lowerMsg.includes('outcome')
    ) {
      return { type: 'formulation', confidence: 0.8 };
    }

    // EDA stage keywords
    if (
      lowerMsg.includes('explore') ||
      lowerMsg.includes('analyze data') ||
      lowerMsg.includes('check assumptions') ||
      lowerMsg.includes('eda') ||
      lowerMsg.includes('data quality') ||
      lowerMsg.includes('missing values') ||
      lowerMsg.includes('distribution')
    ) {
      return { type: 'eda', confidence: 0.7 };
    }

    // Estimation stage keywords
    if (
      lowerMsg.includes('estimate') ||
      lowerMsg.includes('calculate effect') ||
      lowerMsg.includes('causal effect') ||
      lowerMsg.includes('treatment effect') ||
      lowerMsg.includes('ate') ||
      lowerMsg.includes('propensity')
    ) {
      return { type: 'estimation', confidence: 0.7 };
    }

    // Default to general question
    return { type: 'general_question' };
  }

  /**
   * Handle formulation stage workflow
   */
  private async handleFormulation(message: string, _intent: any): Promise<void> {
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
  private async handleEDA(message: string, _intent: any): Promise<void> {
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
  private async handleEstimation(message: string, _intent: any): Promise<void> {
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
   * Handle general questions about causal inference
   */
  private async handleGeneralQuestion(_message: string): Promise<void> {
    const chatProvider = getChatProvider();
    if (!chatProvider) return;

    // For now, provide helpful response
    chatProvider.sendAssistantMessage(
      `I can help you with causal inference workflows. Here's what I can do:\n\n` +
        `- **Formulate** your research question (e.g., "Does education affect income?")\n` +
        `- **Analyze** your data to check causal assumptions\n` +
        `- **Estimate** causal effects using appropriate methods\n\n` +
        `What would you like to explore?`,
      { agentName: 'Assistant', type: 'text' }
    );
  }

  /**
   * Handle workflow control commands (restart, continue, etc.)
   */
  private async handleWorkflowControl(action: string): Promise<void> {
    const chatProvider = getChatProvider();
    if (!chatProvider) return;

    switch (action) {
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
