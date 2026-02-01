import type { BaseAgent, AgentExecuteProps, AgentExecuteResult, AgentCapability } from '../core/types';
import { AgentDomains } from '../core/types';
import { agentRegistry } from '../core/registry';
import { useMetaHumanStore } from '../../../store/metaHumanStore';

export class MetaHumanAgent implements BaseAgent {
  name = 'MetaHumanAgent';
  description = 'Controls the visual representation of Lisa (MetaHuman), including expressions and poses.';
  version = '1.0.0';
  domain = AgentDomains.INTEGRATION;
  capabilities = ['set_expression', 'set_pose', 'animate_speech'];

  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const { intent, parameters } = props;

    try {
      switch (intent) {
        case 'set_expression':
          useMetaHumanStore.getState().setExpression(parameters?.expression, parameters?.intensity);
          return { success: true, output: `Expression set to ${parameters?.expression}` };
        case 'set_pose':
          useMetaHumanStore.getState().setPose(parameters?.pose);
          return { success: true, output: `Pose set to ${parameters?.pose}` };
        case 'animate_speech':
          useMetaHumanStore.getState().setSpeech(parameters?.text, true);
          // In a real scenario, you'd also handle the end of speech animation
          // For now, we'll just set isSpeaking to false after a delay
          setTimeout(() => useMetaHumanStore.getState().setSpeech(parameters?.text, false), parameters?.duration * 1000 || 2000);
          return { success: true, output: `Speech animation triggered for text` };
        default:
          return { success: false, error: `Unknown intent: ${intent}`, output: null };
      }
    } catch (error: any) {
      console.error(`${this.name} execution error:`, error);
      return { success: false, error: error.message || 'An unknown error occurred', output: null };
    }
  }

  async canHandle(query: string): Promise<number> {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('expression') || lowerQuery.includes('pose') || lowerQuery.includes('animate') || lowerQuery.includes('visage') || lowerQuery.includes('corps')) {
      return 0.7;
    }
    return 0;
  }

  async getCapabilities(): Promise<AgentCapability[]> {
    return [
      { name: 'set_expression', description: 'Sets a facial expression on the MetaHuman.', requiredParameters: [{ name: 'expression', type: 'string', required: true }, { name: 'intensity', type: 'number', required: false }] },
      { name: 'set_pose', description: 'Sets a body pose on the MetaHuman.', requiredParameters: [{ name: 'pose', type: 'string', required: true }] },
      { name: 'animate_speech', description: "Animates the MetaHuman's face and body based on speech.", requiredParameters: [{ name: 'text', type: 'string', required: true }, { name: 'duration', type: 'number', required: false }] },
    ];
  }
}

agentRegistry.register(new MetaHumanAgent());
