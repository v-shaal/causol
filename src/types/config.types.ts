/**
 * Configuration types
 */

import { MCPServerConfig } from './mcp.types';

export interface ExtensionConfig {
  llm: LLMConfig;
  workflow: WorkflowConfig;
  jupyter: JupyterConfig;
  mcp: MCPConfig;
  sdk: SDKConfig;
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface WorkflowConfig {
  autoAdvance: boolean;
  strictValidation: boolean;
  maxIterations: number;
}

export interface JupyterConfig {
  autoConnect: boolean;
  executionTimeout: number;
}

export interface MCPConfig {
  servers: MCPServerConfig[];
  enabled: boolean;
}

export interface SDKConfig {
  name?: string;
  importPath?: string;
  initCode?: string;
  methods?: string[];
}
