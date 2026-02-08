/**
 * Tests for appStore
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../appStore';

describe('appStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAppStore.setState({

      fallDetected: false,
      fallEventTimestamp: null,
      featureFlags: {
        advancedVision: false,
        advancedHearing: false,
        fallDetector: false,
      },
    });
  });

  it('should have initial state', () => {
    const state = useAppStore.getState();

    expect(state).toBeDefined();
    expect(typeof state.setState).toBe('function');
  });

  it('should update state with setState', () => {
    const { setState } = useAppStore.getState();

    setState({ fallDetected: true });

    const newState = useAppStore.getState();
    expect(newState.fallDetected).toBe(true);
  });

  it('should handle feature flags', () => {
    const { setState } = useAppStore.getState();

    setState({
      featureFlags: {
        advancedVision: true,
        advancedHearing: false,
        fallDetector: true,
      },
    });

    const state = useAppStore.getState();
    expect(state.featureFlags.advancedVision).toBe(true);
    expect(state.featureFlags.fallDetector).toBe(true);
  });

  it('should handle fall detection state', () => {
    const { setState } = useAppStore.getState();

    setState({
      fallDetected: true,
      fallEventTimestamp: Date.now(),
    });

    const state = useAppStore.getState();
    expect(state.fallDetected).toBe(true);
    expect(state.fallEventTimestamp).toBeDefined();
  });

  it('should reset fall detection state', () => {
    const { setState } = useAppStore.getState();

    // Set fall detected
    setState({
      fallDetected: true,
      fallEventTimestamp: Date.now(),
    });

    // Reset
    setState({
      fallDetected: false,
      fallEventTimestamp: null,
    });

    const state = useAppStore.getState();
    expect(state.fallDetected).toBe(false);
    expect(state.fallEventTimestamp).toBeNull();
  });

  it('should set lastSpokenText via setLastSpokenText', () => {
    const { setLastSpokenText } = useAppStore.getState();

    setLastSpokenText('Bonjour Lisa');

    const state = useAppStore.getState();
    expect(state.conversationContext?.lastSpokenText).toBe('Bonjour Lisa');
  });

  it('should preserve existing conversationContext fields', () => {
    const { setState, setLastSpokenText } = useAppStore.getState();

    // Pre-populate context
    setState({
      conversationContext: {
        lastUtterance: 'test',
        subject: 'greeting',
        timestamp: 1000,
      },
    });

    const beforeUpdate = Date.now();
    setLastSpokenText('Hello');

    const ctx = useAppStore.getState().conversationContext;
    expect(ctx?.lastSpokenText).toBe('Hello');
    expect(ctx?.lastUtterance).toBe('test');
    expect(ctx?.subject).toBe('greeting');
    // timestamp is always refreshed to Date.now()
    expect(ctx?.timestamp).toBeGreaterThanOrEqual(beforeUpdate);
    expect(ctx?.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should manage todos', () => {
    const { addTodo, removeTodo, toggleTodo } = useAppStore.getState();

    addTodo({ id: '1', text: 'Buy milk' });
    addTodo({ id: '2', text: 'Walk dog' });

    expect(useAppStore.getState().todos).toHaveLength(2);

    toggleTodo('1');
    expect(useAppStore.getState().todos.find((t) => t.id === '1')?.completed).toBe(true);

    removeTodo('1');
    expect(useAppStore.getState().todos).toHaveLength(1);
    expect(useAppStore.getState().todos[0].id).toBe('2');
  });

  it('should manage audio enabled state', () => {
    const { setAudioEnabled } = useAppStore.getState();

    expect(useAppStore.getState().audioEnabled).toBe(true);

    setAudioEnabled(false);
    expect(useAppStore.getState().audioEnabled).toBe(false);

    setAudioEnabled(true);
    expect(useAppStore.getState().audioEnabled).toBe(true);
  });

  it('should accept function-based setState', () => {
    const { setState } = useAppStore.getState();

    setState({ lastPlanExplanation: 'initial' });
    setState((state) => ({
      lastPlanExplanation: state.lastPlanExplanation + ' updated',
    }));

    expect(useAppStore.getState().lastPlanExplanation).toBe('initial updated');
  });
});
