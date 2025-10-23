/**
 * Base agent implementation using Mastra
 */

import { Agent } from '@mastra/core';
import { WorkflowStage, SharedContext } from '@types/workflow.types';
import { CausalAgent, Task, AgentResult, AgentConfig } from '@types/agent.types';

export abstract class BaseCausalAgent implements CausalAgent {
  protected agent: Agent;
  public readonly id: string;
  public readonly name: string;
  public readonly stage: WorkflowStage;
  public readonly capabilities: string[];

  constructor(
    stage: WorkflowStage,
    name: string,
    capabilities: string[],
    systemPrompt: string
  ) {
    this.id = `${stage}-agent`;
    this.name = name;
    this.stage = stage;
    this.capabilities = capabilities;

    // Initialize Mastra agent with system prompt (OpenAI)
    this.agent = new Agent({
      name: this.name,
      instructions: systemPrompt,
      model: {
        provider: 'openai',
        name: 'gpt-4o',
        toolChoice: 'auto',
      },
    });
  }

  abstract canHandle(task: Task): boolean;
  abstract execute(task: Task, context: SharedContext): Promise<AgentResult>;

  async initialize(config: AgentConfig): Promise<void> {
    // Override in subclasses if needed
    console.log(`Initializing ${this.name}...`);
  }

  async shutdown(): Promise<void> {
    // Override in subclasses if needed
    console.log(`Shutting down ${this.name}...`);
  }

  /**
   * Helper to generate agent response using Mastra
   */
  protected async generate(prompt: string, context?: SharedContext): Promise<string> {
    try {
      const response = await this.agent.generate(prompt, {
        ...(context && { context }),
      });
      return response.text;
    } catch (error) {
      console.error(`Error generating response from ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Helper to create successful result
   */
  protected createSuccessResult(
    data: unknown,
    suggestedNextSteps?: string[]
  ): AgentResult {
    return {
      success: true,
      data,
      suggestedNextSteps,
      requiresIteration: false,
    };
  }

  /**
   * Helper to create error result
   */
  protected createErrorResult(error: Error, suggestedAction?: string): AgentResult {
    return {
      success: false,
      error,
      feedback: {
        type: 'error',
        message: error.message,
        suggestedAction,
      },
      requiresIteration: false,
    };
  }

  /**
   * Helper to create result requiring iteration
   */
  protected createIterationResult(
    data: unknown,
    feedbackMessage: string,
    suggestedAction: string
  ): AgentResult {
    return {
      success: true,
      data,
      feedback: {
        type: 'warning',
        message: feedbackMessage,
        suggestedAction,
      },
      requiresIteration: true,
    };
  }
}
