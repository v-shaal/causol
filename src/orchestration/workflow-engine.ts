/**
 * Workflow Engine
 * Orchestrates the causal inference workflow through sequential stages
 */

import { WorkflowStage, WorkflowState, SharedContext } from '../types/workflow.types';
import {
  FormulationAgent,
  EDAAgent,
  DAGAgent,
  IdentificationAgent,
  EstimationAgent,
} from '../agents/index';

export class CausalWorkflowEngine {
  private agents: {
    formulation: FormulationAgent;
    eda: EDAAgent;
    dag: DAGAgent;
    identification: IdentificationAgent;
    estimation: EstimationAgent;
  };
  private workflowState: WorkflowState | null = null;

  constructor() {
    // Initialize all agents
    this.agents = {
      formulation: new FormulationAgent(),
      eda: new EDAAgent(),
      dag: new DAGAgent(),
      identification: new IdentificationAgent(),
      estimation: new EstimationAgent(),
    };
  }

  /**
   * Initialize a new causal analysis workflow
   */
  async initializeWorkflow(researchQuestion: string, userId: string): Promise<WorkflowState> {
    const workflowId = this.generateWorkflowId();

    // Create initial workflow state
    this.workflowState = {
      id: workflowId,
      userId,
      researchQuestion,
      currentStage: WorkflowStage.FORMULATION,
      stages: {
        [WorkflowStage.FORMULATION]: {
          name: WorkflowStage.FORMULATION,
          status: 'pending',
          attempts: 0,
          iterations: [],
        },
        [WorkflowStage.EDA]: {
          name: WorkflowStage.EDA,
          status: 'pending',
          attempts: 0,
          iterations: [],
        },
        [WorkflowStage.DAG]: {
          name: WorkflowStage.DAG,
          status: 'pending',
          attempts: 0,
          iterations: [],
        },
        [WorkflowStage.IDENTIFICATION]: {
          name: WorkflowStage.IDENTIFICATION,
          status: 'pending',
          attempts: 0,
          iterations: [],
        },
        [WorkflowStage.ESTIMATION]: {
          name: WorkflowStage.ESTIMATION,
          status: 'pending',
          attempts: 0,
          iterations: [],
        },
      },
      sharedContext: {
        confounders: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.workflowState;
  }

  /**
   * Execute the current stage
   */
  async executeCurrentStage(): Promise<{
    success: boolean;
    stage: WorkflowStage;
    result: any;
    message: string;
  }> {
    if (!this.workflowState) {
      throw new Error('Workflow not initialized. Call initializeWorkflow() first.');
    }

    const currentStage = this.workflowState.currentStage;
    const stageState = this.workflowState.stages[currentStage];

    // Mark stage as in_progress
    stageState.status = 'in_progress';
    stageState.attempts += 1;

    try {
      let result: any;

      // Execute appropriate agent based on stage
      switch (currentStage) {
        case WorkflowStage.FORMULATION:
          result = await this.agents.formulation.execute(
            {
              id: this.generateTaskId(),
              stage: currentStage,
              description: 'Formulate research question',
              input: this.workflowState.researchQuestion,
            },
            this.workflowState.sharedContext
          );
          break;

        case WorkflowStage.EDA:
          result = await this.agents.eda.execute(
            {
              id: this.generateTaskId(),
              stage: currentStage,
              description: 'Perform causal EDA',
              input: {},
            },
            this.workflowState.sharedContext
          );
          break;

        case WorkflowStage.DAG:
          result = await this.agents.dag.execute(
            {
              id: this.generateTaskId(),
              stage: currentStage,
              description: 'Construct causal DAG',
              input: {},
            },
            this.workflowState.sharedContext
          );
          break;

        case WorkflowStage.IDENTIFICATION:
          result = await this.agents.identification.execute(
            {
              id: this.generateTaskId(),
              stage: currentStage,
              description: 'Determine identifiability',
              input: {},
            },
            this.workflowState.sharedContext
          );
          break;

        case WorkflowStage.ESTIMATION:
          result = await this.agents.estimation.execute(
            {
              id: this.generateTaskId(),
              stage: currentStage,
              description: 'Estimate causal effect',
              input: {},
            },
            this.workflowState.sharedContext
          );
          break;

        default:
          throw new Error(`Unknown workflow stage: ${currentStage}`);
      }

      // Update stage state based on result
      if (result.success) {
        stageState.status = 'completed';
        stageState.result = result.data;
        this.workflowState.updatedAt = new Date();

        // Record iteration
        stageState.iterations.push({
          iteration: stageState.attempts,
          timestamp: new Date(),
          action: 'execute',
          result: result.data,
        });

        return {
          success: true,
          stage: currentStage,
          result: result.data,
          message: `${currentStage} stage completed successfully`,
        };
      } else {
        stageState.status = 'failed';
        stageState.result = result;

        return {
          success: false,
          stage: currentStage,
          result: result,
          message: result.error?.message || `${currentStage} stage failed`,
        };
      }
    } catch (error) {
      stageState.status = 'failed';
      return {
        success: false,
        stage: currentStage,
        result: null,
        message: (error as Error).message,
      };
    }
  }

  /**
   * Advance to next workflow stage
   */
  advanceToNextStage(): boolean {
    if (!this.workflowState) {
      return false;
    }

    const currentStage = this.workflowState.currentStage;
    const currentStageState = this.workflowState.stages[currentStage];

    // Only advance if current stage is completed
    if (currentStageState.status !== 'completed') {
      return false;
    }

    // Determine next stage
    const stages = [
      WorkflowStage.FORMULATION,
      WorkflowStage.EDA,
      WorkflowStage.DAG,
      WorkflowStage.IDENTIFICATION,
      WorkflowStage.ESTIMATION,
    ];

    const currentIndex = stages.indexOf(currentStage);
    if (currentIndex < stages.length - 1) {
      this.workflowState.currentStage = stages[currentIndex + 1];
      this.workflowState.updatedAt = new Date();
      return true;
    }

    return false; // Already at final stage
  }

  /**
   * Get current workflow state
   */
  getWorkflowState(): WorkflowState | null {
    return this.workflowState;
  }

  /**
   * Get shared context
   */
  getSharedContext(): SharedContext | null {
    return this.workflowState?.sharedContext || null;
  }

  /**
   * Update shared context
   */
  updateSharedContext(updates: Partial<SharedContext>): void {
    if (this.workflowState) {
      this.workflowState.sharedContext = {
        ...this.workflowState.sharedContext,
        ...updates,
      };
      this.workflowState.updatedAt = new Date();
    }
  }

  /**
   * Check if workflow is complete
   */
  isWorkflowComplete(): boolean {
    if (!this.workflowState) {
      return false;
    }

    const estimationStage = this.workflowState.stages[WorkflowStage.ESTIMATION];
    return estimationStage.status === 'completed';
  }

  /**
   * Get workflow progress (percentage)
   */
  getProgress(): number {
    if (!this.workflowState) {
      return 0;
    }

    const stages = Object.values(this.workflowState.stages);
    const completedStages = stages.filter((s) => s.status === 'completed').length;
    return (completedStages / stages.length) * 100;
  }

  /**
   * Reset workflow to a specific stage
   */
  resetToStage(stage: WorkflowStage): void {
    if (!this.workflowState) {
      return;
    }

    this.workflowState.currentStage = stage;
    this.workflowState.stages[stage].status = 'pending';
    this.workflowState.stages[stage].attempts = 0;
    this.workflowState.updatedAt = new Date();
  }

  private generateWorkflowId(): string {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
