import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useVisionAudioStore } from '../store/visionAudioStore';

// Reset store before each test
beforeEach(() => {
  useVisionAudioStore.setState({ todos: [] });
});

describe('todo list store', () => {
  it('adds a todo item', () => {
    act(() => {
      useVisionAudioStore.getState().setState((s) => ({ todos: [...s.todos, { id: '1', text: 'café' }] }));
    });
    expect(useVisionAudioStore.getState().todos.length).toBe(1);
    expect(useVisionAudioStore.getState().todos[0].text).toBe('café');
  });

  it('removes a todo item', () => {
    act(() => {
      useVisionAudioStore.getState().setState({ todos: [{ id: '1', text: 'lait' }] });
      useVisionAudioStore.getState().setState((s) => ({ todos: s.todos.filter((t) => t.id !== '1') }));
    });
    expect(useVisionAudioStore.getState().todos.length).toBe(0);
  });
});
