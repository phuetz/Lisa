import { agentRegistry } from './registry';
import { SmallTalkAgent } from './SmallTalkAgent';
import { GeminiCodeAgent } from '../workflow/agents/GeminiCodeAgent';
import { WindsurfAgent } from '../workflow/agents/WindsurfAgent';

/**
 * Initializes and registers all the agents in the system.
 * This function should be called once at application startup.
 */
export function loadAgents(): void {
  const apiKey = process.env.VITE_LLM_API_KEY || 'test-key';

  // Register agents
  agentRegistry.register(new SmallTalkAgent({ apiKey }));
  agentRegistry.register(new GeminiCodeAgent({ apiKey }));
  agentRegistry.register(new WindsurfAgent());

  console.log('All agents have been loaded and registered.');
}
