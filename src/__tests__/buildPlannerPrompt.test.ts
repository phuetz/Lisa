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
    const prompt = buildPlannerPrompt(goal, undefined, undefined, { language: 'fr' });

    // Verify it contains the goal
    expect(prompt).toContain(`**Requête utilisateur:** "${goal}"`);
    
    // Verify it includes agent descriptions
    expect(prompt).toContain('TestAgent1: A test agent for unit tests');
    expect(prompt).toContain('TestAgent2: Another test agent for unit tests');
    
    // Verify it contains instructions
    expect(prompt).toContain('Vous êtes un maître planificateur.');
    expect(prompt).toContain('Votre réponse DOIT être un tableau JSON valide d\'objets "étape".');
    expect(prompt).toContain('Chaque étape du plan doit avoir:\n- "id": Un entier unique.');
    expect(prompt).toContain('- "dependencies": Un tableau d\'IDs d\'étapes qui doivent être complétées avant que cette étape puisse commencer. Un tableau vide [] signifie qu\'elle peut s\'exécuter immédiatement.');
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

    const prompt = buildPlannerPrompt(goal, currentPlan, errorMsg, { language: 'fr' });

    // Verify it contains revision instructions
    expect(prompt).toContain('Le plan précédent a échoué.');
    expect(prompt).toContain(`**Objectif initial:** "${goal}"`);
    expect(prompt).toContain(`**Message d'erreur:** "${errorMsg}"`);
    expect(prompt).toContain("Analysez l'erreur et créez un plan révisé.");
    
    // Verify it contains the failed plan
    expect(prompt).toContain('WeatherAgent');
    expect(prompt).toContain('getWeather');
    
    // Verify it still includes required elements
    expect(prompt).toContain('You have access to these tools');
    expect(prompt).toContain('Votre réponse DOIT être un tableau JSON valide d\'objets "étape".');
  });
});
