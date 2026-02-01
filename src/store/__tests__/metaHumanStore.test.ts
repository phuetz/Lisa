/**
 * Tests for metaHumanStore
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useMetaHumanStore } from '../metaHumanStore';

describe('metaHumanStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useMetaHumanStore.setState({
      blendShapeWeights: {},
      pose: 'default',
      currentAnimation: 'idle',
      speechText: '',
      isSpeaking: false,
    });
  });

  describe('initial state', () => {
    it('should have default values', () => {
      const state = useMetaHumanStore.getState();

      expect(state.blendShapeWeights).toEqual({});
      expect(state.pose).toBe('default');
      expect(state.currentAnimation).toBe('idle');
      expect(state.speechText).toBe('');
      expect(state.isSpeaking).toBe(false);
    });
  });

  describe('setExpression', () => {
    it('should set expression with default intensity', () => {
      const { setExpression } = useMetaHumanStore.getState();

      setExpression('happy');

      const state = useMetaHumanStore.getState();
      expect(state.blendShapeWeights['happy']).toBe(1);
    });

    it('should set expression with custom intensity', () => {
      const { setExpression } = useMetaHumanStore.getState();

      setExpression('sad', 0.5);

      const state = useMetaHumanStore.getState();
      expect(state.blendShapeWeights['sad']).toBe(0.5);
    });

    it('should reset other expressions when setting new one', () => {
      const { setExpression, setBlendShapeWeight } = useMetaHumanStore.getState();

      // Set initial expression
      setBlendShapeWeight('happy', 1);
      setBlendShapeWeight('surprised', 0.5);

      // Set new expression
      setExpression('angry');

      const state = useMetaHumanStore.getState();
      expect(state.blendShapeWeights['happy']).toBe(0);
      expect(state.blendShapeWeights['surprised']).toBe(0);
      expect(state.blendShapeWeights['angry']).toBe(1);
    });

    it('should handle neutral expression', () => {
      const { setExpression, setBlendShapeWeight } = useMetaHumanStore.getState();

      setBlendShapeWeight('happy', 1);
      setExpression('neutral');

      const state = useMetaHumanStore.getState();
      expect(state.blendShapeWeights['happy']).toBe(0);
      expect(state.blendShapeWeights['neutral']).toBeUndefined();
    });
  });

  describe('setPose', () => {
    it('should set pose and animation', () => {
      const { setPose } = useMetaHumanStore.getState();

      setPose('sitting');

      const state = useMetaHumanStore.getState();
      expect(state.pose).toBe('sitting');
      expect(state.currentAnimation).toBe('sitting');
    });
  });

  describe('setSpeech', () => {
    it('should set speech text and speaking state', () => {
      const { setSpeech } = useMetaHumanStore.getState();

      setSpeech('Hello world', true);

      const state = useMetaHumanStore.getState();
      expect(state.speechText).toBe('Hello world');
      expect(state.isSpeaking).toBe(true);
      expect(state.currentAnimation).toBe('speaking');
    });

    it('should revert to pose animation when not speaking', () => {
      const { setSpeech, setPose } = useMetaHumanStore.getState();

      setPose('sitting');
      setSpeech('Hello', true);
      setSpeech('', false);

      const state = useMetaHumanStore.getState();
      expect(state.isSpeaking).toBe(false);
      expect(state.currentAnimation).toBe('sitting');
    });

    it('should revert to idle when default pose and not speaking', () => {
      const { setSpeech } = useMetaHumanStore.getState();

      setSpeech('Hello', true);
      setSpeech('', false);

      const state = useMetaHumanStore.getState();
      expect(state.currentAnimation).toBe('idle');
    });
  });

  describe('setBlendShapeWeight', () => {
    it('should set individual blend shape weight', () => {
      const { setBlendShapeWeight } = useMetaHumanStore.getState();

      setBlendShapeWeight('browUp', 0.7);

      const state = useMetaHumanStore.getState();
      expect(state.blendShapeWeights['browUp']).toBe(0.7);
    });

    it('should update existing blend shape weight', () => {
      const { setBlendShapeWeight } = useMetaHumanStore.getState();

      setBlendShapeWeight('browUp', 0.5);
      setBlendShapeWeight('browUp', 0.9);

      const state = useMetaHumanStore.getState();
      expect(state.blendShapeWeights['browUp']).toBe(0.9);
    });

    it('should preserve other blend shape weights', () => {
      const { setBlendShapeWeight } = useMetaHumanStore.getState();

      setBlendShapeWeight('browUp', 0.5);
      setBlendShapeWeight('mouthOpen', 0.3);

      const state = useMetaHumanStore.getState();
      expect(state.blendShapeWeights['browUp']).toBe(0.5);
      expect(state.blendShapeWeights['mouthOpen']).toBe(0.3);
    });
  });
});
