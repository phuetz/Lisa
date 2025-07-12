import { describe, it, expect, vi } from 'vitest';
import { handleAgentError } from '../utils/handleAgentError';
import { logEvent } from '../utils/logger';
import type { WorkflowStep } from '../types/Planner';

// Mock dependencies
vi.mock('../utils/logger', () => ({
  logEvent: vi.fn().mockReturnValue({})
}));

describe('handleAgentError', () => {
  it('should generate a proper error report', () => {
    const mockStep: WorkflowStep = {
      id: 1,
      description: 'Test step',
      agent: 'TestAgent',
      command: 'testCommand',
      args: { param: 'value' },
      dependencies: [],
      status: 'failed'
    };
    
    const mockError = new Error('Test error message');
    const errorReport = handleAgentError(mockStep, mockError);
    
    // Verify error report structure
    expect(errorReport).toEqual({
      failedStep: mockStep,
      message: 'Test error message',
      error: mockError,
      isRecoverable: expect.any(Boolean),
      recoveryHint: expect.any(String)
    });
    
    // Verify logging
    expect(logEvent).toHaveBeenCalledWith(
      'step_failed',
      expect.objectContaining({ 
        step: mockStep, 
        error: 'Test error message' 
      }),
      expect.stringContaining('Step 1 (TestAgent.testCommand) failed')
    );
  });
  
  it('should identify non-recoverable errors', () => {
    const step: WorkflowStep = {
      id: 1,
      description: 'Test step',
      agent: 'TestAgent',
      command: 'testCommand',
      args: { param: 'value' },
      dependencies: [],
      status: 'failed'
    };
    
    // Test API key error
    const apiKeyError = new Error('Missing API key or authorization failed');
    const apiKeyReport = handleAgentError(step, apiKeyError);
    expect(apiKeyReport.isRecoverable).toBe(false);
    
    // Test rate limit
    const rateLimitError = new Error('Rate limit exceeded');
    const rateLimitReport = handleAgentError(step, rateLimitError);
    expect(rateLimitReport.isRecoverable).toBe(false);
  });
  
  it('should identify recoverable errors', () => {
    const step: WorkflowStep = {
      id: 1,
      description: 'Test step',
      agent: 'TestAgent',
      command: 'testCommand',
      args: { param: 'value' },
      dependencies: [],
      status: 'failed'
    };
    
    // Test agent not found
    const agentError = new Error('Agent not found: WeatherAgent');
    const agentReport = handleAgentError(step, agentError);
    expect(agentReport.isRecoverable).toBe(true);
    
    // Test invalid argument
    const argError = new Error('Invalid argument: location is required');
    const argReport = handleAgentError(step, argError);
    expect(argReport.isRecoverable).toBe(true);
    
    // Test generic error
    const genericError = new Error('Something unexpected happened');
    const genericReport = handleAgentError(step, genericError);
    expect(genericReport.isRecoverable).toBe(true);
  });
  
  it('should provide useful recovery hints', () => {
    const step: WorkflowStep = {
      id: 1,
      description: 'Test step',
      agent: 'TestAgent',
      command: 'testCommand',
      args: { param: 'value' },
      dependencies: [],
      status: 'failed'
    };
    
    // Test agent not found hint
    const agentError = new Error('Agent not found: WeatherAgent');
    const agentReport = handleAgentError(step, agentError);
    expect(agentReport.recoveryHint).toContain('Check the agent name');
    
    // Test missing argument hint
    const argError = new Error('Missing required parameter: location');
    const argReport = handleAgentError(step, argError);
    expect(argReport.recoveryHint).toContain('Ensure all required parameters');
    
    // Test rate limit hint
    const rateError = new Error('Rate limit exceeded');
    const rateReport = handleAgentError(step, rateError);
    expect(rateReport.recoveryHint).toContain('rate limited');
  });
});
