/**
 * TodoPanel Component Tests
 * Tests for todo display and removal functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock stores
const mockTodos = [
  { id: 'todo-1', text: 'Buy groceries' },
  { id: 'todo-2', text: 'Call doctor' },
];

vi.mock('../../store/visionAudioStore', () => ({
  useVisionAudioStore: vi.fn((selector) => selector({ todos: mockTodos })),
}));

// Mock agent registry
const mockExecute = vi.fn().mockResolvedValue({ success: true });
vi.mock('../../agents/registry', () => ({
  agentRegistry: {
    getAgent: vi.fn(() => ({
      execute: mockExecute,
    })),
  },
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        todo_panel: 'Todo Panel',
        to_do: 'To Do',
        delete: 'Delete',
      };
      return translations[key] || key;
    },
  }),
}));

import TodoPanel from '../TodoPanel';
import { useVisionAudioStore } from '../../store/visionAudioStore';

describe('TodoPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock to return todos
    vi.mocked(useVisionAudioStore).mockImplementation((selector) =>
      selector({ todos: mockTodos })
    );
  });

  describe('Rendering', () => {
    it('should render todos when present', () => {
      render(<TodoPanel />);

      expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      expect(screen.getByText('Call doctor')).toBeInTheDocument();
    });

    it('should render "To Do" heading', () => {
      render(<TodoPanel />);

      expect(screen.getByText('To Do')).toBeInTheDocument();
    });

    it('should render delete button for each todo', () => {
      render(<TodoPanel />);

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      expect(deleteButtons).toHaveLength(2);
    });

    it('should have correct ARIA attributes', () => {
      render(<TodoPanel />);

      const region = screen.getByRole('region', { name: 'Todo Panel' });
      expect(region).toBeInTheDocument();
      expect(region).toHaveAttribute('aria-live', 'polite');
    });

    it('should render as a list', () => {
      render(<TodoPanel />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });
  });

  describe('Empty State', () => {
    it('should return null when no todos', () => {
      vi.mocked(useVisionAudioStore).mockImplementation((selector) =>
        selector({ todos: [] })
      );

      const { container } = render(<TodoPanel />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Todo Actions', () => {
    it('should call TodoAgent.execute when delete button is clicked', () => {
      render(<TodoPanel />);

      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButtons[0]);

      expect(mockExecute).toHaveBeenCalledWith({
        command: 'remove_item',
        id: 'todo-1',
      });
    });
  });
});
