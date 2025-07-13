/**
 * Defines the common interfaces and types for all agents in the system.
 */

/**
 * Agent domains for categorization
 */
export const AgentDomains = {
  KNOWLEDGE: "knowledge",
  PRODUCTIVITY: "productivity",
  ANALYSIS: "analysis",
  INTEGRATION: "integration",
  PLANNING: "planning"
} as const;

/**
 * Type for agent domains
 */
export type AgentDomain = typeof AgentDomains[keyof typeof AgentDomains];

/**
 * Parameter definition for agent execution
 */
export interface AgentParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  required: boolean;
  description?: string;
  defaultValue?: any;
}

/**
 * Capability metadata for agent discoverability
 */
export interface AgentCapability {
  name: string;
  description: string;
  requiredParameters: AgentParameter[];
}

/**
 * The input properties for an agent's execute method.
 * It's a flexible key-value store to accommodate different agent needs.
 */
export interface AgentExecuteProps {
  // Common properties
  intent?: string;                // The specific action to perform
  context?: Record<string, any>;  // Contextual information for the execution
  language?: string;              // The language to use for operations (e.g., 'en', 'fr', 'es')
  parameters?: Record<string, any>; // Parameters for the execution
  // Add any other common properties
  
  // Generic catch-all for other properties
  [key: string]: any;
}

/**
 * The standardized result format for any agent execution.
 */
export interface AgentExecuteResult {
  success: boolean;          // Whether the execution was successful
  output: any;               // The result of the execution
  error?: Error | string;    // Error details if execution failed
  metadata?: {               // Additional metadata about the execution
    executionTime?: number;  // Time taken to execute in ms
    confidence?: number;     // Confidence score (0-1) for the result
    source?: string;         // Source of the information
    timestamp?: number;      // Timestamp of when the result was generated
  };
}

import { z } from 'zod';

export interface NodeInputOutput {
  id: string;
  type: string;
  label: string;
  description?: string;
  required?: boolean;
}

/**
 * The base interface that every agent must implement.
 */
export interface BaseAgent {
  // Identity properties
  name: string;                     // A unique name for the agent
  description: string;              // A brief description of what the agent does
  version: string;                  // Version of the agent implementation
  domain: AgentDomain;              // The domain this agent belongs to
  capabilities: string[];           // List of specific capabilities this agent provides
  requiresAuthentication?: boolean; // Whether this agent requires authentication

  // Input/Output definitions for workflow editor
  inputs?: NodeInputOutput[];
  outputs?: NodeInputOutput[];
  configSchema?: z.ZodObject<any>; // Zod schema for agent-specific configuration

  // Core methods
  execute(props: AgentExecuteProps): Promise<AgentExecuteResult>;  // Main execution method
  
  // Optional methods
  canHandle?(query: string, context?: any): Promise<number>;  // Returns confidence score (0-1)
  getRequiredParameters?(task: string): Promise<AgentParameter[]>; // Returns required parameters
  getCapabilities?(): Promise<AgentCapability[]>;  // Returns detailed capability information
  validateInput?(props: AgentExecuteProps): Promise<{valid: boolean, errors?: string[]}>; // Validates input
}

/**
 * Interface for plan steps in complex workflows
 */
export interface PlanStep {
  id: string;                 // Unique identifier for the step
  agent: string;              // Agent responsible for executing this step
  task: string;               // Description of the task
  dependencies: string[];     // IDs of steps that must complete before this one
  parameters?: Record<string, any>; // Parameters for the execution
  status: "pending" | "waiting" | "in_progress" | "completed" | "failed"; // Current status
  result?: AgentExecuteResult; // Result when completed
  retryCount?: number;        // Number of retry attempts
  startTime?: number;         // Timestamp when execution started
  endTime?: number;           // Timestamp when execution completed
}

/**
 * Interface for complex multi-step plans
 */
export interface Plan {
  id: string;                 // Unique identifier for the plan
  goal: string;               // High-level description of the goal
  steps: PlanStep[];          // Steps to achieve the goal
  createdAt: number;          // Creation timestamp
  updatedAt: number;          // Last update timestamp
  status: "pending" | "in_progress" | "completed" | "failed"; // Overall plan status
  context?: Record<string, any>; // Shared context across steps
}

/**
 * Interface for saved plan templates
 */
export interface PlanTemplate {
  id: string;                 // Unique identifier for the template
  name: string;               // User-friendly name
  description: string;        // Description of what this template does
  plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'status'>; // Plan structure without execution-specific fields
  tags: string[];             // Searchable tags
  createdAt: number;          // Creation timestamp
}

/**
 * Interface for plan checkpoints to resume execution
 */
export interface PlanCheckpoint {
  id: string;                 // Unique identifier for the checkpoint
  planId: string;             // Reference to the original plan
  description: string;        // Description of the checkpoint state
  state: Plan;                // Complete plan state at checkpoint time
  timestamp: number;          // When the checkpoint was created
}
