/**
 * Estimation Agent
 * Generates code to estimate causal effects
 */

import { BaseCausalAgent } from './base-agent';
import { WorkflowStage, SharedContext } from '../types/workflow.types';
import { Task, AgentResult } from '../types/agent.types';
import { estimationSystemPrompt } from '../knowledge/prompts/estimation/system.prompt';
import { VSCodeJupyterExecutor, formatResultForChat } from '../jupyter';

export interface EstimationResult {
  method: 'regression' | 'ipw' | 'matching' | 'doubly_robust' | 'other';
  pythonCode: string;
  executionOutput?: string;
  executionSuccess?: boolean;
  explanation: string;
  interpretation: string;
  diagnostics: string[];
  limitations: string[];
  codeComments: {
    setup: string;
    estimation: string;
    inference: string;
  };
}

export class EstimationAgent extends BaseCausalAgent {
  constructor() {
    super(
      WorkflowStage.ESTIMATION,
      'Estimation Agent',
      ['select_method', 'generate_code', 'interpret_results', 'provide_diagnostics'],
      estimationSystemPrompt
    );
  }

  canHandle(task: Task): boolean {
    return task.stage === WorkflowStage.ESTIMATION;
  }

  async execute(_task: Task, context: SharedContext): Promise<AgentResult> {
    try {
      const { treatment, outcome, adjustmentSet, dataset } = context;

      if (!treatment || !outcome) {
        return this.createErrorResult(
          new Error('Treatment and outcome must be defined for estimation'),
          'Complete earlier workflow stages first'
        );
      }

      if (!adjustmentSet || adjustmentSet.length === 0) {
        return this.createIterationResult(
          {},
          'No adjustment set specified',
          'Complete the Identification stage to determine which variables to adjust for'
        );
      }

      // Build estimation prompt
      const estPrompt = this.buildEstimationPrompt(
        treatment,
        outcome,
        adjustmentSet,
        dataset,
        context
      );
      const response = await this.generate(estPrompt, context);

      // Parse estimation results
      const result = this.parseEstimationResponse(response);

      // Execute the generated Python code if Jupyter is available
      if (result.pythonCode && result.pythonCode !== '# No code generated') {
        try {
          const executionResult = await VSCodeJupyterExecutor.executeCode(result.pythonCode);
          result.executionOutput = formatResultForChat(executionResult);
          result.executionSuccess = executionResult.success;

          // If execution failed, add to limitations
          if (!executionResult.success && executionResult.error) {
            result.limitations.push(
              `Code execution failed: ${executionResult.error.ename}. Check data availability.`
            );
          }
        } catch (error) {
          console.warn('Jupyter execution not available:', error);
          // Continue without execution - user can run manually
        }
      }

      // Update shared context with estimation approach
      context.estimate = {
        effect: 0, // Will be filled after code execution
        method: result.method,
      };

      const nextSteps = result.executionSuccess
        ? [
            '✅ Estimation code executed successfully',
            'Review the estimated causal effect above',
            'Check diagnostics to ensure validity',
            'Consider sensitivity analysis (future stage)',
          ]
        : [
            'Generated estimation code (execution unavailable)',
            'Copy and run the Python code in your Jupyter notebook',
            'Review the estimated causal effect',
            'Check diagnostics to ensure validity',
          ];

      return this.createSuccessResult(result, nextSteps);
    } catch (error) {
      return this.createErrorResult(
        error as Error,
        'Check the adjustment set and data availability'
      );
    }
  }

  private buildEstimationPrompt(
    treatment: string,
    outcome: string,
    adjustmentSet: string[],
    dataset: any,
    _context: SharedContext
  ): string {
    return `Generate Python code to estimate the causal effect:

**Treatment**: ${treatment}
**Outcome**: ${outcome}
**Adjustment Set**: ${adjustmentSet.join(', ')}
${dataset ? `**Dataset**: ${dataset.rows} rows, ${dataset.columns?.length || 0} columns` : ''}

Requirements:
1. Use standard Python libraries (pandas, statsmodels, sklearn, numpy, scipy)
2. Include proper error handling
3. Calculate point estimate and 95% confidence interval
4. Include diagnostic checks
5. Add clear comments explaining each step

Choose the most appropriate method:
- **Regression Adjustment**: If linear relationships and continuous outcome
- **IPW**: If binary treatment and good overlap
- **Other**: Justify your choice

Provide output in JSON format:

{
  "method": "regression|ipw|matching|other",
  "pythonCode": "# Complete Python code here\\nimport pandas as pd\\nimport numpy as np\\n...",
  "explanation": "Why this method is appropriate for this problem",
  "interpretation": "How to interpret the estimated effect",
  "diagnostics": ["Diagnostic check 1", "Diagnostic check 2"],
  "limitations": ["Limitation 1", "Limitation 2"],
  "codeComments": {
    "setup": "Explanation of setup code",
    "estimation": "Explanation of estimation approach",
    "inference": "Explanation of confidence interval calculation"
  }
}

Prioritize clarity and correctness. Assume 'df' is a pandas DataFrame with the data.`;
  }

  private parseEstimationResponse(response: string): EstimationResult {
    try {
      // Extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        return {
          method: parsed.method || 'regression',
          pythonCode: parsed.pythonCode || '# No code generated',
          explanation: parsed.explanation || 'Estimation code generated',
          interpretation: parsed.interpretation || 'Run the code to see results',
          diagnostics: Array.isArray(parsed.diagnostics) ? parsed.diagnostics : [],
          limitations: Array.isArray(parsed.limitations) ? parsed.limitations : [],
          codeComments: parsed.codeComments || {
            setup: 'Data preparation',
            estimation: 'Effect estimation',
            inference: 'Uncertainty quantification',
          },
        };
      }

      // Fallback: extract code block
      return this.extractCodeFallback(response);
    } catch (error) {
      console.error('Error parsing estimation response:', error);
      return this.createFallbackResult();
    }
  }

  private extractCodeFallback(response: string): EstimationResult {
    const codeMatch = response.match(/```python\n([\s\S]*?)```/);
    const pythonCode = codeMatch ? codeMatch[1] : '# No code found in response';

    return {
      method: 'regression',
      pythonCode,
      explanation: 'Fallback code extraction used',
      interpretation: 'Review code and execute manually',
      diagnostics: ['Check model fit', 'Verify assumptions'],
      limitations: ['Fallback parsing - verify code correctness'],
      codeComments: {
        setup: 'See inline comments',
        estimation: 'See inline comments',
        inference: 'See inline comments',
      },
    };
  }

  private createFallbackResult(): EstimationResult {
    return {
      method: 'regression',
      pythonCode: '# Estimation code generation failed\nprint("Please generate code manually")',
      explanation: 'Failed to generate estimation code',
      interpretation: 'Manual code generation required',
      diagnostics: [],
      limitations: ['Code generation failed'],
      codeComments: {
        setup: 'Not available',
        estimation: 'Not available',
        inference: 'Not available',
      },
    };
  }
}
