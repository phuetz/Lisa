/**
 * Agent Mocks - Shared mock utilities for agent testing
 *
 * Provides mock implementations of agents and related utilities
 * for consistent testing across the agent suite
 */

import type { BaseAgent, AgentExecuteProps, AgentExecuteResult } from '../features/agents/core/types';

/**
 * Mock agent for testing
 */
export class MockAgent implements BaseAgent {
  name = 'MockAgent';
  description = 'A mock agent for testing';
  version = '1.0.0';
  domain = 'test';
  capabilities = ['mock_capability'];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();

    try {
      if (props.parameters?.shouldFail) {
        return {
          success: false,
          output: null,
          error: 'Mock error',
          metadata: {
            executionTime: Date.now() - startTime,
            timestamp: Date.now()
          }
        };
      }

      return {
        success: true,
        output: {
          message: 'Mock execution successful',
          input: props.parameters
        },
        metadata: {
          executionTime: Date.now() - startTime,
          source: 'MockAgent',
          timestamp: Date.now()
        }
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: Date.now()
        }
      };
    }
  }

  async canHandle(query: string): Promise<number> {
    return query.toLowerCase().includes('mock') ? 0.8 : 0;
  }

  async validateInput(props: AgentExecuteProps): Promise<{ valid: boolean; errors?: string[] }> {
    return { valid: true };
  }

  async getRequiredParameters(task: string) {
    return [];
  }

  async getCapabilities() {
    return [
      {
        name: 'mock_capability',
        description: 'A mock capability',
        requiredParameters: []
      }
    ];
  }
}

/**
 * Mock execution context
 */
export const createMockExecutionContext = (overrides: Partial<AgentExecuteProps> = {}) => ({
  intent: 'mock_intent',
  parameters: {},
  ...overrides
} as AgentExecuteProps);

/**
 * Mock result builder
 */
export const createMockResult = (overrides: Partial<AgentExecuteResult> = {}): AgentExecuteResult => ({
  success: true,
  output: { message: 'Mock result' },
  metadata: {
    timestamp: Date.now(),
    executionTime: 0
  },
  ...overrides
});

/**
 * Assertion helpers for agent testing
 */
export const agentTestUtils = {
  /**
   * Verify base agent properties
   */
  verifyBaseProperties(agent: BaseAgent, expected: {
    name: string;
    description: string;
    version: string;
    domain: string;
  }) {
    return {
      name: agent.name === expected.name,
      description: agent.description.toLowerCase().includes(expected.description.toLowerCase()),
      version: agent.version === expected.version,
      domain: agent.domain === expected.domain
    };
  },

  /**
   * Verify execution result structure
   */
  verifyResultStructure(result: AgentExecuteResult) {
    return {
      hasSuccess: typeof result.success === 'boolean',
      hasOutput: result.output !== undefined,
      hasMetadata: result.metadata !== undefined,
      hasTimestamp: result.metadata?.timestamp !== undefined,
      hasExecutionTime: result.metadata?.executionTime !== undefined
    };
  },

  /**
   * Verify error result
   */
  verifyErrorResult(result: AgentExecuteResult) {
    return result.success === false && result.error !== undefined;
  },

  /**
   * Verify success result
   */
  verifySuccessResult(result: AgentExecuteResult) {
    return result.success === true && result.output !== undefined;
  },

  /**
   * Wait for async operation
   */
  async waitFor(condition: () => boolean, timeout = 5000, interval = 100): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (condition()) return true;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
  }
};

/**
 * Mock API responses for common operations
 */
export const mockApiResponses = {
  /**
   * Mock Google Generative AI response
   */
  geminiResponse: (text: string) => ({
    response: {
      text: () => text
    }
  }),

  /**
   * Mock fetch response
   */
  fetchResponse: (data: any, ok = true) => ({
    ok,
    json: () => Promise.resolve(data),
    status: ok ? 200 : 400,
    statusText: ok ? 'OK' : 'Bad Request'
  }),

  /**
   * Mock calendar events
   */
  calendarEvents: [
    {
      id: 'event-1',
      summary: 'Morning Standup',
      start: { dateTime: '2025-03-01T09:00:00Z' },
      end: { dateTime: '2025-03-01T09:30:00Z' }
    },
    {
      id: 'event-2',
      summary: 'Team Meeting',
      start: { dateTime: '2025-03-01T14:00:00Z' },
      end: { dateTime: '2025-03-01T15:00:00Z' }
    }
  ],

  /**
   * Mock todo items
   */
  todoItems: [
    { id: '1', text: 'Buy groceries', completed: false, priority: 'medium' },
    { id: '2', text: 'Finish report', completed: false, priority: 'high' },
    { id: '3', text: 'Call dentist', completed: true, priority: 'low' }
  ],

  /**
   * Mock weather data
   */
  weatherData: {
    current_weather: {
      temperature: 20,
      weathercode: 0,
      windspeed: 10,
      winddirection: 180
    },
    hourly: {
      relativehumidity_2m: [65, 68, 70]
    }
  },

  /**
   * Mock emails
   */
  emails: [
    {
      id: 'email-1',
      from: 'boss@company.com',
      subject: 'Project Update',
      body: 'Please submit the project report by end of day'
    },
    {
      id: 'email-2',
      from: 'newsletter@company.com',
      subject: 'Weekly Newsletter',
      body: 'This week in company news...'
    }
  ]
};

/**
 * Create a mock agent spy for testing agent interactions
 */
export const createAgentSpy = (agent: BaseAgent) => {
  const calls: AgentExecuteProps[] = [];
  const results: AgentExecuteResult[] = [];

  const originalExecute = agent.execute.bind(agent);

  agent.execute = async (props: AgentExecuteProps): Promise<AgentExecuteResult> => {
    calls.push(props);
    const result = await originalExecute(props);
    results.push(result);
    return result;
  };

  return {
    agent,
    calls,
    results,
    getCallCount: () => calls.length,
    getLastCall: () => calls[calls.length - 1],
    getLastResult: () => results[results.length - 1],
    reset: () => {
      calls.length = 0;
      results.length = 0;
    }
  };
};

/**
 * Batch test execution helper
 */
export const runAgentBatchTests = async (
  agent: BaseAgent,
  testCases: Array<{ input: AgentExecuteProps; expected: Partial<AgentExecuteResult> }>
) => {
  const results = [];

  for (const testCase of testCases) {
    try {
      const result = await agent.execute(testCase.input);
      results.push({
        input: testCase.input,
        result,
        passed: testCase.expected.success ? result.success : !result.success
      });
    } catch (error) {
      results.push({
        input: testCase.input,
        error,
        passed: false
      });
    }
  }

  return {
    total: testCases.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    results
  };
};

/**
 * Create consistent test data
 */
export const testDataFactory = {
  createEvent: (overrides = {}) => ({
    id: `event-${Date.now()}`,
    title: 'Test Event',
    start: new Date().toISOString(),
    end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ...overrides
  }),

  createTodo: (overrides = {}) => ({
    id: `todo-${Date.now()}`,
    text: 'Test todo',
    completed: false,
    priority: 'medium',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides
  }),

  createEmail: (overrides = {}) => ({
    id: `email-${Date.now()}`,
    from: 'test@example.com',
    to: 'recipient@example.com',
    subject: 'Test Email',
    body: 'This is a test email',
    ...overrides
  }),

  createCalendarEvent: (overrides = {}) => ({
    summary: 'Test Meeting',
    start: { dateTime: new Date().toISOString() },
    end: { dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
    description: 'Test meeting description',
    ...overrides
  })
};
