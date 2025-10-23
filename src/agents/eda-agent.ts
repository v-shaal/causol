/**
 * EDA (Exploratory Data Analysis) Agent
 * Performs causal-aware data analysis checking critical assumptions
 */

import { BaseCausalAgent } from './base-agent';
import { WorkflowStage, SharedContext } from '../types/workflow.types';
import { Task, AgentResult } from '../types/agent.types';
import { edaSystemPrompt } from '../knowledge/prompts/eda/system.prompt';
import { VSCodeJupyterExecutor, formatResultForChat } from '../jupyter';

export interface EDAResult {
  checks: EDACheck[];
  violations: AssumptionViolation[];
  pythonCode: string;
  executionOutput?: string;
  executionSuccess?: boolean;
  summary: string;
  recommendations: string[];
}

export interface EDACheck {
  name: string;
  type: 'positivity' | 'balance' | 'missing_data' | 'overlap' | 'distribution';
  status: 'pass' | 'warning' | 'fail';
  details: string;
}

export interface AssumptionViolation {
  assumption: string;
  severity: 'critical' | 'moderate' | 'minor';
  description: string;
  suggestedAction: string;
}

export class EDAAgent extends BaseCausalAgent {
  constructor() {
    super(
      WorkflowStage.EDA,
      'EDA Agent',
      [
        'check_positivity',
        'check_balance',
        'check_missing_data',
        'check_overlap',
        'generate_visualizations',
      ],
      edaSystemPrompt
    );
  }

  canHandle(task: Task): boolean {
    return task.stage === WorkflowStage.EDA;
  }

  async execute(_task: Task, context: SharedContext): Promise<AgentResult> {
    try {
      const { treatment, outcome, dataset } = context;

      if (!treatment || !outcome) {
        return this.createErrorResult(
          new Error('Treatment and outcome must be defined before EDA'),
          'Complete the Problem Formulation stage first'
        );
      }

      // Build EDA analysis prompt
      const analysisPrompt = this.buildEDAPrompt(treatment, outcome, dataset, context);
      const response = await this.generate(analysisPrompt, context);

      // Parse EDA results
      const result = this.parseEDAResponse(response);

      // Execute the generated Python code if Jupyter is available
      if (result.pythonCode && result.pythonCode !== '# No code generated') {
        try {
          const executionResult = await VSCodeJupyterExecutor.executeCode(result.pythonCode);
          result.executionOutput = formatResultForChat(executionResult);
          result.executionSuccess = executionResult.success;

          // If execution failed, add to violations
          if (!executionResult.success && executionResult.error) {
            result.violations.push({
              assumption: 'Code Execution',
              severity: 'moderate',
              description: `Failed to execute EDA code: ${executionResult.error.ename}`,
              suggestedAction: 'Check data availability and column names',
            });
          }
        } catch (error) {
          console.warn('Jupyter execution not available:', error);
          // Continue without execution - user can run manually
        }
      }

      // Check for critical violations
      const criticalViolations = result.violations.filter((v) => v.severity === 'critical');

      if (criticalViolations.length > 0) {
        return this.createIterationResult(
          result,
          `Found ${criticalViolations.length} critical assumption violations`,
          'Address data quality issues before proceeding to causal analysis'
        );
      }

      const nextSteps = result.executionSuccess
        ? [
            '✅ EDA checks executed successfully',
            'Review the analysis output above',
            'Address any warnings before proceeding',
            'Continue to DAG Construction stage',
          ]
        : [
            'Generated EDA code (execution unavailable)',
            'Copy and run the Python code in your Jupyter notebook',
            'Review the output and address any warnings',
            'Proceed to DAG Construction stage',
          ];

      return this.createSuccessResult(result, nextSteps);
    } catch (error) {
      return this.createErrorResult(
        error as Error,
        'Ensure dataset information is available and try again'
      );
    }
  }

  private buildEDAPrompt(
    treatment: string,
    outcome: string,
    dataset: any,
    context: SharedContext
  ): string {
    const confounders = context.confounders || [];

    return `Perform causal-aware EDA for the following analysis:

**Treatment**: ${treatment}
**Outcome**: ${outcome}
**Confounders**: ${confounders.length > 0 ? confounders.join(', ') : 'To be determined'}
${dataset ? `**Dataset**: ${dataset.rows} rows, ${dataset.columns?.length || 0} columns` : '**Dataset**: Not loaded yet'}

Generate Python code to check the following causal assumptions:

1. **Positivity/Overlap**: Check if all covariate patterns have both treated and control units
2. **Balance**: Calculate standardized mean differences for confounders
3. **Missing Data**: Check for patterns in missing data related to treatment/outcome
4. **Distributions**: Compare treatment and outcome distributions

Provide your analysis in JSON format:

{
  "checks": [
    {
      "name": "Check name",
      "type": "positivity|balance|missing_data|overlap|distribution",
      "status": "pass|warning|fail",
      "details": "Description of findings"
    }
  ],
  "violations": [
    {
      "assumption": "Assumption name",
      "severity": "critical|moderate|minor",
      "description": "Description of violation",
      "suggestedAction": "How to address it"
    }
  ],
  "pythonCode": "# Complete Python code to execute\\nimport pandas as pd\\n...",
  "summary": "Brief summary of EDA findings",
  "recommendations": ["List of recommendations"]
}

Focus on causal validity. Be conservative - flag potential issues even if uncertain.`;
  }

  private parseEDAResponse(response: string): EDAResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          checks: Array.isArray(parsed.checks) ? parsed.checks : [],
          violations: Array.isArray(parsed.violations) ? parsed.violations : [],
          pythonCode: parsed.pythonCode || '# No code generated',
          summary: parsed.summary || 'EDA analysis completed',
          recommendations: Array.isArray(parsed.recommendations)
            ? parsed.recommendations
            : [],
        };
      }

      // Fallback parsing
      return this.parseStructuredEDAText(response);
    } catch (error) {
      console.error('Error parsing EDA response:', error);
      return {
        checks: [],
        violations: [
          {
            assumption: 'Response Parsing',
            severity: 'moderate',
            description: 'Failed to parse EDA agent response',
            suggestedAction: 'Try running the analysis again',
          },
        ],
        pythonCode: '# Response parsing failed',
        summary: 'Unable to complete EDA analysis',
        recommendations: ['Retry the EDA stage'],
      };
    }
  }

  private parseStructuredEDAText(response: string): EDAResult {
    // Simple fallback - extract code blocks and basic info
    const codeMatch = response.match(/```python\n([\s\S]*?)```/);
    const pythonCode = codeMatch ? codeMatch[1] : '# No code found in response';

    return {
      checks: [
        {
          name: 'Basic EDA',
          type: 'distribution',
          status: 'warning',
          details: 'Fallback parsing used - review response manually',
        },
      ],
      violations: [],
      pythonCode,
      summary: 'EDA analysis completed with fallback parsing',
      recommendations: ['Review the agent response and generated code manually'],
    };
  }
}
