import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useAppStore } from '../store/appStore';

// Reset store before each test
beforeEach(() => {
  useAppStore.setState({ todos: [] });
});

describe('todo list store', () => {
  it('adds a todo item', () => {
    act(() => {
      useAppStore.getState().setState((s) => ({ todos: [...s.todos, { id: '1', text: 'café' }] }));
    });
    expect(useAppStore.getState().todos.length).toBe(1);
    expect(useAppStore.getState().todos[0].text).toBe('café');
  });

  it('removes a todo item', () => {
    act(() => {
      useAppStore.getState().setState({ todos: [{ id: '1', text: 'lait' }] });
      useAppStore.getState().setState((s) => ({ todos: s.todos.filter((t) => t.id !== '1') }));
    });
    expect(useAppStore.getState().todos.length).toBe(0);
  });
});
