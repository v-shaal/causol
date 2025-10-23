/**
 * Workflow stage types for causal inference pipeline
 */

export enum WorkflowStage {
  FORMULATION = 'formulation',
  EDA = 'eda',
  DAG = 'dag',
  IDENTIFICATION = 'identification',
  ESTIMATION = 'estimation',
  // Future stages:
  // SENSITIVITY = 'sensitivity',
  // REPORTING = 'reporting',
}

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface WorkflowState {
  id: string;
  userId: string;
  researchQuestion: string;
  currentStage: WorkflowStage;
  stages: Record<WorkflowStage, StageState>;
  sharedContext: SharedContext;
  createdAt: Date;
  updatedAt: Date;
}

export interface StageState {
  name: WorkflowStage;
  status: StageStatus;
  attempts: number;
  result?: unknown;
  validationResult?: ValidationResult;
  iterations: IterationRecord[];
}

export interface SharedContext {
  treatment?: string;
  outcome?: string;
  confounders: string[];
  dag?: DAG;
  dataset?: DatasetInfo;
  adjustmentSet?: string[];
  estimate?: CausalEstimate;
  [key: string]: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score?: number;
}

export interface IterationRecord {
  iteration: number;
  timestamp: Date;
  action: string;
  result: unknown;
}

export interface DAG {
  nodes: DAGNode[];
  edges: DAGEdge[];
  assumptions: string[];
  metadata: {
    source: 'user' | 'agent' | 'mcp';
    confidence: number;
    lastModified: Date;
  };
}

export interface DAGNode {
  id: string;
  label: string;
  type: 'treatment' | 'outcome' | 'confounder' | 'mediator' | 'collider';
  observed: boolean;
}

export interface DAGEdge {
  from: string;
  to: string;
  type: 'causal' | 'confounding' | 'selection';
}

export interface DatasetInfo {
  name: string;
  rows: number;
  columns: string[];
  treatmentColumn?: string;
  outcomeColumn?: string;
}

export interface CausalEstimate {
  effect: number;
  standardError?: number;
  confidenceInterval?: [number, number];
  pValue?: number;
  method: string;
}
