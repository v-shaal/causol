/**
 * Model Context Protocol (MCP) types
 */

export interface MCPClient {
  connect(config: MCPServerConfig): Promise<void>;
  disconnect(): Promise<void>;
  query(query: string, context?: unknown): Promise<MCPResponse>;
  execute(command: string, params: unknown): Promise<unknown>;
  getCapabilities(): MCPCapability[];
  healthCheck(): Promise<boolean>;
}

export interface MCPServerConfig {
  name: string;
  url: string;
  protocol: 'http' | 'websocket';
  capabilities: MCPCapability[];
  auth?: {
    type: 'api_key' | 'oauth' | 'none';
    credentials?: unknown;
  };
  enabled: boolean;
}

export interface MCPCapability {
  type: 'knowledge_base' | 'computation' | 'data_source' | 'validation';
  description: string;
  endpoints: string[];
}

export interface MCPResponse {
  source: string; // MCP server name
  data: unknown;
  confidence?: number;
  references?: string[];
}
