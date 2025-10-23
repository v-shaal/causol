/**
 * Chat message types for the Causal Inference Assistant
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageType =
  | 'text'
  | 'code'
  | 'visualization'
  | 'agent-output'
  | 'error'
  | 'workflow-update';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  timestamp: number;
  agentName?: string;
  workflowStage?: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  executionTime?: number;
  executionSuccess?: boolean;
  pythonCode?: string;
  visualizationData?: unknown;
  checks?: unknown[];
  violations?: unknown[];
  suggestions?: string[];
}

export interface WorkflowState {
  currentStage:
    | 'idle'
    | 'formulation'
    | 'eda'
    | 'dag'
    | 'identification'
    | 'estimation'
    | 'complete';
  treatment?: string;
  outcome?: string;
  confounders?: string[];
  adjustmentSet?: string[];
  datasetLoaded: boolean;
}

export interface ChatState {
  messages: ChatMessage[];
  workflowState: WorkflowState;
  isProcessing: boolean;
  currentAgent?: string;
}
