/**
 * Identification Agent
 * Determines causal identifiability and finds adjustment sets
 */

import { BaseCausalAgent } from './base-agent';
import { WorkflowStage, SharedContext, DAG } from '../types/workflow.types';
import { Task, AgentResult } from '../types/agent.types';
import { identificationSystemPrompt } from '../knowledge/prompts/identification/system.prompt';

export interface IdentificationResult {
  isIdentifiable: boolean;
  criterion: 'backdoor' | 'frontdoor' | 'instrumental_variable' | 'not_identifiable';
  adjustmentSets: AdjustmentSet[];
  recommendedSet: string[];
  backdoorPaths: BackdoorPath[];
  explanation: string;
  assumptions: string[];
  warnings: string[];
}

export interface AdjustmentSet {
  variables: string[];
  isMinimal: boolean;
  isOptimal: boolean;
  explanation: string;
}

export interface BackdoorPath {
  path: string;
  isBlocked: boolean;
  blockedBy: string[];
}

export class IdentificationAgent extends BaseCausalAgent {
  constructor() {
    super(
      WorkflowStage.IDENTIFICATION,
      'Identification Agent',
      [
        'check_identifiability',
        'apply_backdoor_criterion',
        'find_adjustment_sets',
        'recommend_optimal_set',
      ],
      identificationSystemPrompt
    );
  }

  canHandle(task: Task): boolean {
    return task.stage === WorkflowStage.IDENTIFICATION;
  }

  async execute(_task: Task, context: SharedContext): Promise<AgentResult> {
    try {
      const { dag, treatment, outcome } = context;

      if (!dag || !treatment || !outcome) {
        return this.createErrorResult(
          new Error('DAG, treatment, and outcome must be defined for identification'),
          'Complete the DAG Construction stage first'
        );
      }

      // Build identification prompt
      const identPrompt = this.buildIdentificationPrompt(dag, treatment, outcome, context);
      const response = await this.generate(identPrompt, context);

      // Parse identification results
      const result = this.parseIdentificationResponse(response);

      // Update shared context
      if (result.isIdentifiable && result.recommendedSet.length > 0) {
        context.adjustmentSet = result.recommendedSet;
      }

      // Check identifiability
      if (!result.isIdentifiable) {
        return this.createIterationResult(
          result,
          'Causal effect is not identifiable with current DAG',
          'Consider: 1) Adding more measured confounders, 2) Finding instrumental variables, 3) Re-evaluating the DAG structure'
        );
      }

      if (result.warnings.length > 0) {
        return this.createIterationResult(
          result,
          `Identifiable but with ${result.warnings.length} warnings`,
          'Review warnings carefully before proceeding to estimation'
        );
      }

      return this.createSuccessResult(result, [
        `Use adjustment set: [${result.recommendedSet.join(', ')}]`,
        'Proceed to Estimation stage',
        'Verify data availability for adjustment variables',
      ]);
    } catch (error) {
      return this.createErrorResult(
        error as Error,
        'Check the DAG structure and try again'
      );
    }
  }

  private buildIdentificationPrompt(
    dag: DAG,
    treatment: string,
    outcome: string,
    _context: SharedContext
  ): string {
    return `Apply the backdoor criterion to determine if the causal effect is identifiable:

**Treatment**: ${treatment}
**Outcome**: ${outcome}

**Causal DAG**:
Nodes: ${dag.nodes.map((n) => `${n.label} (${n.type})`).join(', ')}

Edges:
${dag.edges.map((e) => {
  const from = dag.nodes.find((n) => n.id === e.from)?.label || e.from;
  const to = dag.nodes.find((n) => n.id === e.to)?.label || e.to;
  return `  ${from} → ${to}`;
}).join('\n')}

Apply the **backdoor criterion** to determine:
1. Is the causal effect identifiable?
2. What are ALL valid adjustment sets?
3. What is the MINIMAL sufficient adjustment set?
4. What is the RECOMMENDED adjustment set (considering data availability)?

Provide analysis in JSON format:

{
  "isIdentifiable": true|false,
  "criterion": "backdoor",
  "adjustmentSets": [
    {
      "variables": ["list of variables"],
      "isMinimal": true|false,
      "isOptimal": true|false,
      "explanation": "Why this set satisfies backdoor criterion"
    }
  ],
  "recommendedSet": ["optimal adjustment variables"],
  "backdoorPaths": [
    {
      "path": "Treatment ← Var1 → Outcome",
      "isBlocked": true|false,
      "blockedBy": ["variables blocking this path"]
    }
  ],
  "explanation": "Clear explanation of identifiability decision",
  "assumptions": ["Required assumptions for identification"],
  "warnings": ["Potential concerns or limitations"]
}

Be rigorous and conservative in your assessment.`;
  }

  private parseIdentificationResponse(response: string): IdentificationResult {
    try {
      // Extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        return {
          isIdentifiable: parsed.isIdentifiable ?? false,
          criterion: parsed.criterion || 'not_identifiable',
          adjustmentSets: Array.isArray(parsed.adjustmentSets) ? parsed.adjustmentSets : [],
          recommendedSet: Array.isArray(parsed.recommendedSet) ? parsed.recommendedSet : [],
          backdoorPaths: Array.isArray(parsed.backdoorPaths) ? parsed.backdoorPaths : [],
          explanation: parsed.explanation || 'Identification analysis completed',
          assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        };
      }

      // Fallback
      return this.createFallbackResult();
    } catch (error) {
      console.error('Error parsing identification response:', error);
      return this.createFallbackResult();
    }
  }

  private createFallbackResult(): IdentificationResult {
    return {
      isIdentifiable: false,
      criterion: 'not_identifiable',
      adjustmentSets: [],
      recommendedSet: [],
      backdoorPaths: [],
      explanation: 'Failed to parse identification response',
      assumptions: [],
      warnings: ['Response parsing failed - manual review required'],
    };
  }
}
