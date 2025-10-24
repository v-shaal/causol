/**
 * Base agent implementation with multi-LLM support
 * Currently using OpenAI SDK directly, structured for future Mastra integration
 */

import OpenAI from 'openai';
import { WorkflowStage, SharedContext } from '../types/workflow.types';
import { CausalAgent, Task, AgentResult, AgentConfig } from '../types/agent.types';

// LLM provider configuration - lazily evaluated to allow dotenv to load first
function getLLMConfig() {
  return {
    provider: process.env.LLM_PROVIDER || 'openai', // 'openai' | 'anthropic' | 'groq'
    model: process.env.LLM_MODEL || 'gpt-4o',
    apiKey: process.env.OPENAI_API_KEY,
  };
}

export abstract class BaseCausalAgent implements CausalAgent {
  protected llmClient: OpenAI;
  public readonly id: string;
  public readonly name: string;
  public readonly stage: WorkflowStage;
  public readonly capabilities: string[];
  protected systemPrompt: string;

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
    this.systemPrompt = systemPrompt;

    // Initialize LLM client based on provider
    // TODO: Add Mastra integration when exports are fixed
    // TODO: Support Anthropic, Groq, and other providers
    const config = getLLMConfig();

    if (!config.apiKey) {
      throw new Error(
        `Missing OPENAI_API_KEY environment variable. ` +
        `Please ensure your .env file exists with OPENAI_API_KEY set. ` +
        `Current API key value: ${config.apiKey === undefined ? 'undefined' : 'empty string'}`
      );
    }

    this.llmClient = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  abstract canHandle(task: Task): boolean;
  abstract execute(task: Task, context: SharedContext): Promise<AgentResult>;

  async initialize(_config: AgentConfig): Promise<void> {
    const llmConfig = getLLMConfig();
    console.log(`Initializing ${this.name} with ${llmConfig.provider}...`);
  }

  async shutdown(): Promise<void> {
    console.log(`Shutting down ${this.name}...`);
  }

  /**
   * Helper to generate agent response using configured LLM
   * Structured for easy migration to Mastra framework
   */
  protected async generate(prompt: string, _context?: SharedContext): Promise<string> {
    try {
      // Using OpenAI SDK directly for now
      // TODO: Replace with Mastra's createAgent when properly exported
      const config = getLLMConfig();
      const completion = await this.llmClient.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || '';
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
