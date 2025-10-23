/**
 * DAG Builder Agent
 * Constructs and validates causal directed acyclic graphs
 */

import { BaseCausalAgent } from './base-agent';
import { WorkflowStage, SharedContext, DAG, DAGNode, DAGEdge } from '@types/workflow.types';
import { Task, AgentResult } from '@types/agent.types';
import { dagSystemPrompt } from '@knowledge/prompts/dag/system.prompt';

export interface DAGResult {
  dag: DAG;
  validation: DAGValidation;
  explanation: string;
  suggestedConfounders: string[];
  visualRepresentation: string;
}

export interface DAGValidation {
  hasNoCycles: boolean;
  hasTemporalOrdering: boolean;
  hasTreatmentOutcomePath: boolean;
  issues: string[];
}

export class DAGAgent extends BaseCausalAgent {
  constructor() {
    super(
      WorkflowStage.DAG,
      'DAG Builder Agent',
      ['propose_dag', 'validate_structure', 'identify_confounders', 'check_assumptions'],
      dagSystemPrompt
    );
  }

  canHandle(task: Task): boolean {
    return task.stage === WorkflowStage.DAG;
  }

  async execute(task: Task, context: SharedContext): Promise<AgentResult> {
    try {
      const { treatment, outcome, confounders } = context;

      if (!treatment || !outcome) {
        return this.createErrorResult(
          new Error('Treatment and outcome must be defined before DAG construction'),
          'Complete the Problem Formulation stage first'
        );
      }

      // Build DAG construction prompt
      const dagPrompt = this.buildDAGPrompt(treatment, outcome, confounders || [], context);
      const response = await this.generate(dagPrompt, context);

      // Parse DAG response
      const result = this.parseDAGResponse(response, treatment, outcome);

      // Update shared context
      context.dag = result.dag;
      context.confounders = result.suggestedConfounders;

      // Check for critical issues
      if (!result.validation.hasNoCycles) {
        return this.createIterationResult(
          result,
          'DAG contains cycles - not a valid causal graph',
          'Review and fix the causal relationships to ensure acyclicity'
        );
      }

      if (result.validation.issues.length > 0) {
        return this.createIterationResult(
          result,
          `DAG has ${result.validation.issues.length} structural issues`,
          'Review and address the flagged issues before proceeding'
        );
      }

      return this.createSuccessResult(result, [
        'Review the proposed DAG and refine if needed',
        'Consider suggested confounders',
        'Proceed to Identification stage',
      ]);
    } catch (error) {
      return this.createErrorResult(
        error as Error,
        'Check the research question and try again'
      );
    }
  }

  private buildDAGPrompt(
    treatment: string,
    outcome: string,
    knownConfounders: string[],
    context: SharedContext
  ): string {
    return `Construct a causal DAG for this research question:

**Treatment**: ${treatment}
**Outcome**: ${outcome}
**Known Confounders**: ${knownConfounders.length > 0 ? knownConfounders.join(', ') : 'None specified yet'}

Based on causal inference principles, propose a DAG that represents the data-generating process.

Include:
1. Treatment and outcome nodes
2. Plausible confounders (variables affecting both treatment and outcome)
3. Any mediators (variables in the causal pathway)
4. Mark any unmeasured/unobserved variables

Provide the DAG in JSON format:

{
  "nodes": [
    {
      "id": "treatment",
      "label": "${treatment}",
      "type": "treatment",
      "observed": true
    },
    {
      "id": "outcome",
      "label": "${outcome}",
      "type": "outcome",
      "observed": true
    }
    // Add confounder, mediator, and other nodes
  ],
  "edges": [
    {
      "from": "node_id",
      "to": "node_id",
      "type": "causal"
    }
    // Add all directed edges
  ],
  "assumptions": ["List key assumptions"],
  "validation": {
    "hasNoCycles": true,
    "hasTemporalOrdering": true,
    "hasTreatmentOutcomePath": true,
    "issues": []
  },
  "explanation": "Explain the DAG structure and key relationships",
  "suggestedConfounders": ["List of variables to include as confounders"]
}

Be thorough but realistic. Include important confounders even if unsure.`;
  }

  private parseDAGResponse(
    response: string,
    treatment: string,
    outcome: string
  ): DAGResult {
    try {
      // Extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Construct DAG
        const dag: DAG = {
          nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
          edges: Array.isArray(parsed.edges) ? parsed.edges : [],
          assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
          metadata: {
            source: 'agent',
            confidence: 0.8,
            lastModified: new Date(),
          },
        };

        // Validate structure
        const validation = this.validateDAG(dag, treatment, outcome);

        // Create visual representation
        const visualRepresentation = this.createTextVisualization(dag);

        return {
          dag,
          validation: parsed.validation || validation,
          explanation: parsed.explanation || 'DAG constructed successfully',
          suggestedConfounders: Array.isArray(parsed.suggestedConfounders)
            ? parsed.suggestedConfounders
            : [],
          visualRepresentation,
        };
      }

      // Fallback: create minimal DAG
      return this.createMinimalDAG(treatment, outcome);
    } catch (error) {
      console.error('Error parsing DAG response:', error);
      return this.createMinimalDAG(treatment, outcome);
    }
  }

  private validateDAG(dag: DAG, treatment: string, outcome: string): DAGValidation {
    const issues: string[] = [];

    // Check for cycles using DFS
    const hasNoCycles = !this.hasCycles(dag);
    if (!hasNoCycles) {
      issues.push('DAG contains cycles - not a valid causal graph');
    }

    // Check for treatment node
    const hasTreatment = dag.nodes.some((n) => n.id === 'treatment' || n.label === treatment);
    if (!hasTreatment) {
      issues.push('Treatment node not found in DAG');
    }

    // Check for outcome node
    const hasOutcome = dag.nodes.some((n) => n.id === 'outcome' || n.label === outcome);
    if (!hasOutcome) {
      issues.push('Outcome node not found in DAG');
    }

    // Check for path from treatment to outcome
    const hasTreatmentOutcomePath = this.hasPath(dag, 'treatment', 'outcome');

    return {
      hasNoCycles,
      hasTemporalOrdering: true, // Simplified for MVP
      hasTreatmentOutcomePath,
      issues,
    };
  }

  private hasCycles(dag: DAG): boolean {
    const graph = new Map<string, string[]>();

    // Build adjacency list
    for (const edge of dag.edges) {
      if (!graph.has(edge.from)) {
        graph.set(edge.from, []);
      }
      graph.get(edge.from)!.push(edge.to);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true; // Cycle found
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of dag.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }

  private hasPath(dag: DAG, from: string, to: string): boolean {
    const graph = new Map<string, string[]>();

    for (const edge of dag.edges) {
      if (!graph.has(edge.from)) {
        graph.set(edge.from, []);
      }
      graph.get(edge.from)!.push(edge.to);
    }

    const visited = new Set<string>();
    const queue = [from];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === to) return true;

      visited.add(current);
      const neighbors = graph.get(current) || [];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return false;
  }

  private createTextVisualization(dag: DAG): string {
    let viz = 'Causal DAG:\n\n';

    // Simple text representation
    for (const edge of dag.edges) {
      const fromNode = dag.nodes.find((n) => n.id === edge.from);
      const toNode = dag.nodes.find((n) => n.id === edge.to);

      if (fromNode && toNode) {
        viz += `  ${fromNode.label} → ${toNode.label}\n`;
      }
    }

    return viz;
  }

  private createMinimalDAG(treatment: string, outcome: string): DAGResult {
    const dag: DAG = {
      nodes: [
        { id: 'treatment', label: treatment, type: 'treatment', observed: true },
        { id: 'outcome', label: outcome, type: 'outcome', observed: true },
      ],
      edges: [{ from: 'treatment', to: 'outcome', type: 'causal' }],
      assumptions: ['Simple direct effect model'],
      metadata: {
        source: 'agent',
        confidence: 0.5,
        lastModified: new Date(),
      },
    };

    return {
      dag,
      validation: {
        hasNoCycles: true,
        hasTemporalOrdering: true,
        hasTreatmentOutcomePath: true,
        issues: ['Minimal DAG - may be missing important confounders'],
      },
      explanation: 'Fallback minimal DAG with direct treatment → outcome effect',
      suggestedConfounders: [],
      visualRepresentation: `  ${treatment} → ${outcome}\n`,
    };
  }
}
