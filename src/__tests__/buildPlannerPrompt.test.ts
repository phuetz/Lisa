import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildPlannerPrompt } from '../utils/buildPlannerPrompt';
import { agentRegistry } from '../agents/registry';
import type { WorkflowStep } from '../types/Planner';

// Mock the agentRegistry
vi.mock('../agents/registry', () => ({
  agentRegistry: {
    getAllAgents: vi.fn()
  }
}));

describe('buildPlannerPrompt', () => {
  beforeEach(() => {
    // Setup mock agents for testing
    (agentRegistry.getAllAgents as any).mockReturnValue([
      { name: 'TestAgent1', description: 'A test agent for unit tests' },
      { name: 'TestAgent2', description: 'Another test agent for unit tests' }
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate a new plan prompt when no current plan is provided', () => {
    const goal = 'Create a weather report';
    const prompt = buildPlannerPrompt(goal);

    // Verify it contains the goal
    expect(prompt).toContain(`User Request: "${goal}"`);
    
    // Verify it includes agent descriptions
    expect(prompt).toContain('TestAgent1: A test agent for unit tests');
    expect(prompt).toContain('TestAgent2: Another test agent for unit tests');
    
    // Verify it contains instructions
    expect(prompt).toContain('You are a master planner');
    expect(prompt).toContain('Your response MUST be a valid JSON array');
    expect(prompt).toContain('"id"');
    expect(prompt).toContain('"dependencies"');
  });

  it('should generate a revision prompt when a failed plan is provided', () => {
    const goal = 'Create a weather report';
    const errorMsg = 'Weather API is down';
    
    const currentPlan: WorkflowStep[] = [
      {
        id: 1,
        description: 'Get weather data',
        agent: 'WeatherAgent',
        command: 'getWeather',
        args: { location: 'Paris' },
        dependencies: [],
        status: 'failed'
      }
    ];

    const prompt = buildPlannerPrompt(goal, currentPlan, errorMsg);

    // Verify it contains revision instructions
    expect(prompt).toContain('The previous plan failed');
    expect(prompt).toContain(`Original Goal: "${goal}"`);
    expect(prompt).toContain(`Error Message: "${errorMsg}"`);
    expect(prompt).toContain('Analyze the error');
    
    // Verify it contains the failed plan
    expect(prompt).toContain('WeatherAgent');
    expect(prompt).toContain('getWeather');
    
    // Verify it still includes required elements
    expect(prompt).toContain('You have access to these tools');
    expect(prompt).toContain('Your response MUST be a valid JSON array');
  });
});
