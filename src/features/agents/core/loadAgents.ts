import { agentRegistry } from './registry';
import { SmallTalkAgent } from '../implementations/SmallTalkAgent';
import { GeminiCodeAgent } from '../implementations/GeminiCodeAgent';
import { WindsurfAgent } from '../implementations/WindsurfAgent';
import { WebSearchTool } from '../../../tools/WebSearchTool';
import { WebContentReaderTool } from '../../../tools/WebContentReaderTool';
import { CodeInterpreterTool } from '../../../tools/CodeInterpreterTool';
import { WebSearchAgent } from '../implementations/WebSearchAgent';
import { WebContentReaderAgent } from '../implementations/WebContentReaderAgent';
import { ResearchAgent } from '../implementations/ResearchAgent';
import { CodeInterpreterAgent } from '../implementations/CodeInterpreterAgent';

/**
 * Initializes and registers all the agents in the system.
 * This function should be called once at application startup.
 */
export function loadAgents(): void {
  const apiKey = process.env.VITE_LLM_API_KEY || 'test-key';

  // Register agents
  agentRegistry.register(new SmallTalkAgent({ apiKey }));
  agentRegistry.register(new GeminiCodeAgent());
  agentRegistry.register(new WindsurfAgent());

  // Initialize Tools
  const webSearchTool = new WebSearchTool();
  const webContentReaderTool = new WebContentReaderTool();
  const codeInterpreterTool = new CodeInterpreterTool();

  // Register Tool-based Agents with DI
  agentRegistry.register(new WebSearchAgent(webSearchTool));
  agentRegistry.register(new WebContentReaderAgent(webContentReaderTool));
  agentRegistry.register(new ResearchAgent(webSearchTool, webContentReaderTool));
  agentRegistry.register(new CodeInterpreterAgent(codeInterpreterTool));

  console.log('All agents have been loaded and registered.');
}
