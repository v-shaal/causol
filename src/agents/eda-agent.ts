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

    const datasetInfo = dataset
      ? `
**Dataset Available**:
- Variable name: \`df\` (already loaded in Python environment)
- Shape: ${dataset.rows} rows × ${dataset.columns?.length || 0} columns
- Columns: ${dataset.columns?.join(', ') || 'See context'}
- Treatment variable: \`df['${treatment}']\`
- Outcome variable: \`df['${outcome}']\`
${confounders.length > 0 ? `- Confounders: ${confounders.map((v) => `\`df['${v}']\``).join(', ')}` : ''}`
      : '**Dataset**: Not yet loaded';

    return `Perform causal-aware EDA for the following analysis:

**Treatment**: ${treatment}
**Outcome**: ${outcome}
**Confounders**: ${confounders.length > 0 ? confounders.join(', ') : 'To be determined'}
${datasetInfo}

⚠️ CRITICAL: The DataFrame 'df' is ALREADY LOADED in the Python kernel. DO NOT use pd.read_csv() or load data. The data is ready to use.

Generate Python code to check the following causal assumptions:

1. **Positivity/Overlap**: Check if all covariate patterns have both treated and control units
2. **Balance**: Calculate standardized mean differences for confounders
3. **Missing Data**: Check for patterns in missing data related to treatment/outcome
4. **Distributions**: Compare treatment and outcome distributions

Requirements:
- Use the existing DataFrame 'df' directly (already in memory)
- Import necessary libraries (numpy, pandas, matplotlib, seaborn if needed)
- Include visualizations using matplotlib/seaborn
- Be specific about which variables to check
- Calculate actual statistics (e.g., SMD, overlap coefficients)

Provide your analysis in JSON format:

{
  "checks": [
    {
      "name": "Check name",
      "type": "positivity|balance|missing_data|overlap|distribution",
      "status": "pass|warning|fail",
      "details": "Description of findings with actual numbers"
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
  "pythonCode": "# EDA code using existing 'df' DataFrame\\nimport numpy as np\\nimport pandas as pd\\nimport matplotlib.pyplot as plt\\nimport seaborn as sns\\n\\n# The DataFrame 'df' is already loaded - use it directly\\n...",
  "summary": "Brief summary of EDA findings",
  "recommendations": ["List of recommendations"]
}

Example code pattern:
\`\`\`python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Use existing df DataFrame - DO NOT load data
print(f"Dataset shape: {df.shape}")
print(f"\\nTreatment distribution:")
print(df['${treatment}'].value_counts())

# Check positivity
treated = df[df['${treatment}'] == 1]
control = df[df['${treatment}'] == 0]
print(f"\\nPositivity check:")
print(f"  Treated: {len(treated)} ({len(treated)/len(df)*100:.1f}%)")
print(f"  Control: {len(control)} ({len(control)/len(df)*100:.1f}%)")

# Balance checks for confounders
${confounders.length > 0 ? `for var in ['${confounders.join("', '")}']:
    smd = (treated[var].mean() - control[var].mean()) / np.sqrt((treated[var].std()**2 + control[var].std()**2) / 2)
    print(f"  {var} SMD: {smd:.3f}")` : '# Add confounder balance checks when identified'}
\`\`\`

Focus on causal validity. Be conservative - flag potential issues even if uncertain.
Remember: 'df' is already loaded and ready to use!`;
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
