import { z } from 'zod';

/**
 * The standard interface for all Tools in Lisa.
 * Tools are atomic units of functionality that can be executed by Agents.
 * They must provide a Zod schema for their input parameters to enable
 * dynamic discovery and usage by LLMs.
 */
export interface Tool<P = any, R = any> {
    /**
     * Unique name of the tool (e.g., 'WebSearch', 'Weather').
     * Used by LLMs to identify which tool to call.
     */
    name: string;

    /**
     * Clear description of what the tool does and when to use it.
     */
    description: string;

    /**
     * Zod schema defining the input parameters.
     * This is crucial for validating LLM outputs.
     */
    schema: z.ZodType<P>;

    /**
     * Execute the tool with the given parameters.
     */
    execute(params: P): Promise<{
        success: boolean;
        output?: R;
        error?: string;
    }>;
}
