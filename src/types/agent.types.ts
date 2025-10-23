/**
 * Agent interface types
 */

import { WorkflowStage, SharedContext } from './workflow.types';

export interface CausalAgent {
  id: string;
  name: string;
  stage: WorkflowStage;
  capabilities: string[];

  // Core methods
  canHandle(task: Task): boolean;
  execute(task: Task, context: SharedContext): Promise<AgentResult>;

  // Lifecycle
  initialize(config: AgentConfig): Promise<void>;
  shutdown(): Promise<void>;
}

export interface Task {
  id: string;
  stage: WorkflowStage;
  description: string;
  input: unknown;
  metadata?: Record<string, unknown>;
}

export interface AgentResult {
  success: boolean;
  data?: unknown;
  error?: Error;
  feedback?: Feedback;
  suggestedNextSteps?: string[];
  requiresIteration?: boolean;
}

export interface Feedback {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  details?: string;
  suggestedAction?: string;
}

export interface AgentConfig {
  llmProvider: string;
  llmModel: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: AgentTool[];
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: unknown) => Promise<unknown>;
}

export interface AgentMessage {
  id: string;
  type: 'task' | 'result' | 'query' | 'feedback';
  from: string; // Agent ID
  to: string; // Agent ID or 'orchestrator'
  payload: {
    stage?: WorkflowStage;
    data?: unknown;
    error?: Error;
    feedback?: Feedback;
  };
  timestamp: number;
  correlationId?: string;
}
