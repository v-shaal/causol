/**
 * Mastra workflow for causal inference process
 * Orchestrates: Formulation → EDA → Estimation
 *
 * Uses modern Workflow API (v0.22.2): createWorkflow + createStep
 * See: /docs/MASTRA_INTEGRATION_PLAN.md for implementation details
 */

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { FormulationAgent } from '../agents/formulation-agent';
import { EDAAgent } from '../agents/eda-agent';
import { EstimationAgent } from '../agents/estimation-agent';
import { WorkflowStage, SharedContext } from '../types/workflow.types';
import { Task } from '../types/agent.types';
import { getChatProvider } from '../extension/extension';

// ============================================================================
// Schemas
// ============================================================================

const SharedContextSchema = z.object({
  treatment: z.string().optional(),
  outcome: z.string().optional(),
  confounders: z.array(z.string()).optional(),
  researchQuestion: z.string().optional(),
  dataset: z
    .object({
      name: z.string(),
      rows: z.number(),
      columns: z.array(z.string()),
    })
    .optional(),
  adjustmentSet: z.array(z.string()).optional(),
});

const WorkflowInputSchema = z.object({
  userMessage: z.string(),
  sharedContext: SharedContextSchema.optional(),
});

const FormulationOutputSchema = z.object({
  success: z.boolean(),
  treatment: z.string().optional(),
  outcome: z.string().optional(),
  confounders: z.array(z.string()).optional(),
  researchQuestion: z.string().optional(),
  sharedContext: SharedContextSchema,
});

const EDAOutputSchema = z.object({
  success: z.boolean(),
  hasViolations: z.boolean(),
  sharedContext: SharedContextSchema,
});

const EstimationOutputSchema = z.object({
  success: z.boolean(),
  interpretation: z.string().optional(),
  sharedContext: SharedContextSchema,
});

const WorkflowOutputSchema = z.object({
  formulation: FormulationOutputSchema,
  eda: EDAOutputSchema,
  estimation: EstimationOutputSchema,
});

// ============================================================================
// Step 1: Formulation - Define causal question and identify variables
// ============================================================================

const formulationStep = createStep({
  id: 'formulation',
  inputSchema: WorkflowInputSchema,
  outputSchema: FormulationOutputSchema,
  execute: async ({ inputData }) => {
    const chatProvider = getChatProvider();
    chatProvider?.sendSystemMessage('🔍 Analyzing your causal question...');

    const sharedContext: SharedContext = {
      confounders: [],
      ...(inputData.sharedContext || {}),
    };

    const agent = new FormulationAgent();
    const task: Task = {
      id: 'workflow-formulation',
      stage: WorkflowStage.FORMULATION,
      description: 'Formulate causal question',
      input: inputData.userMessage,
    };

    const result = await agent.execute(task, sharedContext);

    if (result.success && result.data) {
      const formData = result.data as any;

      // Update shared context
      sharedContext.treatment = formData.treatment;
      sharedContext.outcome = formData.outcome;
      sharedContext.confounders = formData.confounders || [];
      sharedContext.researchQuestion = formData.researchQuestion;

      chatProvider?.sendAssistantMessage(
        `**Causal Question Formulated:**\n\n${formData.researchQuestion || 'Question structured'}\n\n` +
          `- **Treatment**: ${formData.treatment || 'Not identified'}\n` +
          `- **Outcome**: ${formData.outcome || 'Not identified'}\n` +
          `- **Confounders**: ${formData.confounders?.join(', ') || 'To be determined'}`,
        {
          agentName: 'Formulation Agent',
          type: 'agent-output',
          workflowStage: 'formulation',
        }
      );
    } else {
      chatProvider?.sendError('Failed to formulate causal question. Please try rephrasing.');
    }

    return {
      success: result.success,
      treatment: sharedContext.treatment,
      outcome: sharedContext.outcome,
      confounders: sharedContext.confounders || [],
      researchQuestion: sharedContext.researchQuestion as string | undefined,
      sharedContext: sharedContext as any,
    };
  },
});

// ============================================================================
// Step 2: EDA - Exploratory data analysis and assumption checking
// ============================================================================

const edaStep = createStep({
  id: 'eda',
  inputSchema: FormulationOutputSchema,
  outputSchema: EDAOutputSchema,
  execute: async ({ inputData }) => {
    const chatProvider = getChatProvider();
    chatProvider?.sendSystemMessage('📊 Checking causal assumptions in your data...');

    // Use shared context from formulation step
    const sharedContext = inputData.sharedContext as SharedContext;

    if (!sharedContext) {
      chatProvider?.sendError('No context from formulation step.');
      return {
        success: false,
        hasViolations: false,
        sharedContext: { confounders: [] } as any,
      };
    }

    // Check if we have a dataset
    if (!sharedContext.dataset) {
      chatProvider?.sendError(
        '⚠️ No dataset loaded. Please load data before running EDA.\n\n' +
          'Try running the demo: `Cmd+Shift+P` → "Demo Workflow in Chat"'
      );
      return {
        success: false,
        hasViolations: false,
        sharedContext: sharedContext as any,
      };
    }

    const agent = new EDAAgent();
    const task: Task = {
      id: 'workflow-eda',
      stage: WorkflowStage.EDA,
      description: 'Check causal assumptions',
      input: 'Perform exploratory data analysis and assumption checking',
    };

    const result = await agent.execute(task, sharedContext);

    if (result.success && result.data) {
      const edaData = result.data as any;

      chatProvider?.sendAssistantMessage(
        `**Data Analysis Complete:**\n\n${edaData.summary || 'Analysis completed'}`,
        {
          agentName: 'EDA Agent',
          type: 'agent-output',
          workflowStage: 'eda',
        }
      );

      if (edaData.executionOutput) {
        chatProvider?.sendAssistantMessage(edaData.executionOutput, {
          agentName: 'EDA Agent',
          type: 'text',
        });
      }

      return {
        success: result.success,
        hasViolations: edaData.violations?.length > 0 || false,
        sharedContext: sharedContext as any,
      };
    } else {
      chatProvider?.sendError('EDA analysis failed.');
      return {
        success: false,
        hasViolations: false,
        sharedContext: sharedContext as any,
      };
    }
  },
});

// ============================================================================
// Step 3: Estimation - Causal effect estimation
// ============================================================================

const estimationStep = createStep({
  id: 'estimation',
  inputSchema: EDAOutputSchema,
  outputSchema: EstimationOutputSchema,
  execute: async ({ inputData }) => {
    const chatProvider = getChatProvider();
    chatProvider?.sendSystemMessage('📈 Estimating causal effect...');

    const sharedContext = inputData.sharedContext as SharedContext;

    if (!sharedContext) {
      chatProvider?.sendError('No context from EDA step.');
      return {
        success: false,
        interpretation: undefined,
        sharedContext: { confounders: [] } as any,
      };
    }

    // Set adjustment set
    sharedContext.adjustmentSet = sharedContext.confounders || [];

    const agent = new EstimationAgent();
    const task: Task = {
      id: 'workflow-estimation',
      stage: WorkflowStage.ESTIMATION,
      description: 'Estimate causal effect',
      input: `Estimate effect of ${sharedContext.treatment} on ${sharedContext.outcome}`,
    };

    const result = await agent.execute(task, sharedContext);

    if (result.success && result.data) {
      const estData = result.data as any;

      chatProvider?.sendAssistantMessage(
        `**Causal Effect Estimation:**\n\n${estData.explanation || 'Estimation completed'}`,
        {
          agentName: 'Estimation Agent',
          type: 'agent-output',
          workflowStage: 'estimation',
        }
      );

      if (estData.executionOutput) {
        chatProvider?.sendAssistantMessage(estData.executionOutput, {
          agentName: 'Estimation Agent',
          type: 'text',
        });
      }

      if (estData.interpretation) {
        chatProvider?.sendAssistantMessage(`**Interpretation:** ${estData.interpretation}`, {
          agentName: 'Estimation Agent',
          type: 'text',
        });
      }

      return {
        success: result.success,
        interpretation: estData.interpretation,
        sharedContext: sharedContext as any,
      };
    } else {
      chatProvider?.sendError('Estimation failed.');
      return {
        success: false,
        interpretation: undefined,
        sharedContext: sharedContext as any,
      };
    }
  },
});

// ============================================================================
// Workflow Definition
// ============================================================================

export const causalInferenceWorkflow = createWorkflow({
  id: 'causal-inference-workflow',
  inputSchema: WorkflowInputSchema,
  outputSchema: WorkflowOutputSchema,
  steps: [formulationStep, edaStep, estimationStep],
})
  .then(formulationStep)
  .then(edaStep)
  .then(estimationStep)
  .commit();

// ============================================================================
// Execution Helper
// ============================================================================

/**
 * Execute the complete causal inference workflow
 */
export async function executeCausalWorkflow(
  userMessage: string,
  sharedContext?: SharedContext
): Promise<any> {
  console.log('[Workflow] Starting causal inference workflow...');

  try {
    const run = await causalInferenceWorkflow.createRunAsync();

    const result = await run.start({
      inputData: {
        userMessage,
        sharedContext: sharedContext || { confounders: [] },
      },
    });

    console.log('[Workflow] Completed. Status:', result.status);

    return result;
  } catch (error) {
    console.error('[Workflow] Execution error:', error);
    throw error;
  }
}
