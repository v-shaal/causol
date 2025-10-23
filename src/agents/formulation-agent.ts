/**
 * Problem Formulation Agent
 * Transforms vague research questions into well-defined causal queries
 */

import { BaseCausalAgent } from './base-agent';
import { WorkflowStage, SharedContext } from '@types/workflow.types';
import { Task, AgentResult } from '@types/agent.types';
import { formulationSystemPrompt } from '@knowledge/prompts/formulation/system.prompt';

export interface FormulationResult {
  treatment: string;
  outcome: string;
  population: string;
  issues: string[];
  suggestions: string[];
  feasibility: 'HIGH' | 'MEDIUM' | 'LOW';
  refinedQuestion: string;
}

export class FormulationAgent extends BaseCausalAgent {
  constructor() {
    super(
      WorkflowStage.FORMULATION,
      'Problem Formulation Agent',
      [
        'extract_causal_components',
        'identify_causal_issues',
        'refine_research_question',
        'assess_feasibility',
      ],
      formulationSystemPrompt
    );
  }

  canHandle(task: Task): boolean {
    return task.stage === WorkflowStage.FORMULATION;
  }

  async execute(task: Task, context: SharedContext): Promise<AgentResult> {
    try {
      const researchQuestion = task.input as string;

      // Generate formulation analysis using Mastra agent
      const analysisPrompt = this.buildAnalysisPrompt(researchQuestion);
      const response = await this.generate(analysisPrompt, context);

      // Parse the agent's response
      const result = this.parseFormulationResponse(response, researchQuestion);

      // Update shared context with extracted components
      context.treatment = result.treatment;
      context.outcome = result.outcome;

      // Determine if iteration needed (if many critical issues)
      const criticalIssues = result.issues.filter((i) =>
        i.toLowerCase().includes('critical')
      );

      if (criticalIssues.length > 0 && result.feasibility === 'LOW') {
        return this.createIterationResult(
          result,
          'Research question has critical issues that may prevent causal analysis',
          'Consider refining the question based on suggestions or choosing a different research question'
        );
      }

      return this.createSuccessResult(result, [
        'Proceed to Exploratory Data Analysis (EDA) stage',
        'Review extracted components and refine if needed',
      ]);
    } catch (error) {
      return this.createErrorResult(
        error as Error,
        'Check if the research question is clearly stated and try again'
      );
    }
  }

  private buildAnalysisPrompt(researchQuestion: string): string {
    return `Analyze this research question from a causal inference perspective:

"${researchQuestion}"

Provide a structured analysis in the following JSON format:

{
  "treatment": "The intervention or exposure (X)",
  "outcome": "The result or effect being measured (Y)",
  "population": "The target population (P)",
  "issues": ["List of potential causal inference concerns"],
  "suggestions": ["Specific recommendations to improve the question"],
  "feasibility": "HIGH|MEDIUM|LOW",
  "refinedQuestion": "A more precise version of the research question"
}

Focus on causal clarity and methodological rigor. Identify any vagueness, reverse causation risks, selection bias, or measurement challenges.`;
  }

  private parseFormulationResponse(
    response: string,
    originalQuestion: string
  ): FormulationResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          treatment: parsed.treatment || 'Not specified',
          outcome: parsed.outcome || 'Not specified',
          population: parsed.population || 'General population',
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
          feasibility: ['HIGH', 'MEDIUM', 'LOW'].includes(parsed.feasibility)
            ? parsed.feasibility
            : 'MEDIUM',
          refinedQuestion: parsed.refinedQuestion || originalQuestion,
        };
      }

      // Fallback: parse from structured text
      return this.parseStructuredText(response, originalQuestion);
    } catch (error) {
      console.error('Error parsing formulation response:', error);
      // Return basic fallback
      return {
        treatment: 'Unable to extract treatment',
        outcome: 'Unable to extract outcome',
        population: 'General population',
        issues: ['Failed to parse agent response'],
        suggestions: ['Please rephrase the research question more clearly'],
        feasibility: 'LOW',
        refinedQuestion: originalQuestion,
      };
    }
  }

  private parseStructuredText(
    response: string,
    originalQuestion: string
  ): FormulationResult {
    // Simple text parsing as fallback
    const lines = response.split('\n').map((l) => l.trim());

    return {
      treatment: this.extractField(lines, 'treatment') || 'Not specified',
      outcome: this.extractField(lines, 'outcome') || 'Not specified',
      population: this.extractField(lines, 'population') || 'General population',
      issues: this.extractList(lines, 'issues', 'issue'),
      suggestions: this.extractList(lines, 'suggestions', 'suggestion'),
      feasibility: 'MEDIUM',
      refinedQuestion: this.extractField(lines, 'refined') || originalQuestion,
    };
  }

  private extractField(lines: string[], keyword: string): string | null {
    const line = lines.find((l) => l.toLowerCase().includes(keyword.toLowerCase()));
    if (line) {
      const parts = line.split(':');
      return parts.length > 1 ? parts.slice(1).join(':').trim() : null;
    }
    return null;
  }

  private extractList(lines: string[], ...keywords: string[]): string[] {
    const items: string[] = [];
    let inList = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Check if we're entering a list section
      if (keywords.some((kw) => lowerLine.includes(kw))) {
        inList = true;
        continue;
      }

      // Check if we're leaving the list (empty line or new section)
      if (inList && (line === '' || line.match(/^[A-Z]/))) {
        if (line.match(/^[A-Z]/)) inList = false;
        continue;
      }

      // Extract list items
      if (inList && (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./))) {
        items.push(line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim());
      }
    }

    return items;
  }
}
