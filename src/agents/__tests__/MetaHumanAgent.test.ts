import { MetaHumanAgent } from '../MetaHumanAgent';
import { useMetaHumanStore } from '../../store/metaHumanStore';

describe('MetaHumanAgent', () => {
  let agent: MetaHumanAgent;

  beforeEach(() => {
    agent = new MetaHumanAgent();
    // Reset the store before each test
    useMetaHumanStore.setState({
      expression: 'neutral',
      expressionIntensity: 0,
      pose: 'default',
      speechText: '',
      isSpeaking: false,
    });
  });

  it('should set expression correctly', async () => {
    const result = await agent.execute({
      intent: 'set_expression',
      parameters: { expression: 'happy', intensity: 0.8 }
    });

    expect(result.success).toBe(true);
    expect(useMetaHumanStore.getState().expression).toBe('happy');
    expect(useMetaHumanStore.getState().expressionIntensity).toBe(0.8);
  });

  it('should set pose correctly', async () => {
    const result = await agent.execute({
      intent: 'set_pose',
      parameters: { pose: 'sitting' }
    });

    expect(result.success).toBe(true);
    expect(useMetaHumanStore.getState().pose).toBe('sitting');
  });

  it('should animate speech correctly', async () => {
    const speechText = 'Hello, world!';
    const result = await agent.execute({
      intent: 'animate_speech',
      parameters: { text: speechText, duration: 0.1 }
    });

    expect(result.success).toBe(true);
    expect(useMetaHumanStore.getState().speechText).toBe(speechText);
    expect(useMetaHumanStore.getState().isSpeaking).toBe(true);

    // Wait for the estimated duration to check if isSpeaking becomes false
    await new Promise(resolve => setTimeout(resolve, 150)); // A bit longer than duration
    expect(useMetaHumanStore.getState().isSpeaking).toBe(false);
  });

  it('should return error for unknown intent', async () => {
    const result = await agent.execute({
      intent: 'unknown_intent',
      parameters: {}
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown intent');
  });
});
