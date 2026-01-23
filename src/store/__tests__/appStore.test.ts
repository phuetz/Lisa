/**
 * Tests for appStore
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../appStore';

describe('appStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAppStore.setState({
      percepts: [],
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
});
