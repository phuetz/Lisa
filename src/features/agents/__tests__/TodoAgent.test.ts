/**
 * Tests for TodoAgent
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TodoAgent, type TodoIntent } from '../implementations/TodoAgent';
import { AgentDomains } from '../core/types';

// Mock the useAppStore
const mockTodos: Array<{ id: string; text: string }> = [];

vi.mock('../../../store/appStore', () => ({
  useAppStore: {
    getState: vi.fn(() => ({
      todos: mockTodos
    })),
    setState: vi.fn((newState: any) => {
      if (newState.todos) {
        mockTodos.length = 0;
        mockTodos.push(...newState.todos);
      }
    })
  }
}));

describe('TodoAgent', () => {
  let agent: TodoAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTodos.length = 0;
    agent = new TodoAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockTodos.length = 0;
  });

  describe('BaseAgent properties', () => {
    it('should have correct name', () => {
      expect(agent.name).toBe('TodoAgent');
    });

    it('should have correct description', () => {
      expect(agent.description).toContain('to-do list');
    });

    it('should have correct version', () => {
      expect(agent.version).toBe('1.1.0');
    });

    it('should have correct domain', () => {
      expect(agent.domain).toBe(AgentDomains.PRODUCTIVITY);
    });

    it('should have correct capabilities', () => {
      expect(agent.capabilities).toContain('add_todo_item');
      expect(agent.capabilities).toContain('remove_todo_item');
      expect(agent.capabilities).toContain('list_todo_items');
      expect(agent.capabilities).toContain('update_todo_item');
      expect(agent.capabilities).toContain('mark_todo_complete');
      expect(agent.capabilities).toContain('mark_todo_incomplete');
      expect(agent.capabilities).toContain('clear_completed_todos');
    });

    it('should have defined inputs and outputs', () => {
      expect(agent.inputs).toBeDefined();
      expect(agent.outputs).toBeDefined();
      expect(agent.inputs).toHaveLength(1);
      expect(agent.outputs).toHaveLength(2);
    });
  });

  describe('canHandle', () => {
    it('should return high confidence for todo-related queries with regex match', async () => {
      const confidence1 = await agent.canHandle('add a new todo item');
      expect(confidence1).toBe(0.85);

      const confidence2 = await agent.canHandle('show my tasks');
      expect(confidence2).toBe(0.85);

      const confidence3 = await agent.canHandle('mark task as complete');
      expect(confidence3).toBe(0.85);
    });

    it('should return medium confidence for keyword matches', async () => {
      const confidence1 = await agent.canHandle('todo');
      expect(confidence1).toBe(0.6);

      const confidence2 = await agent.canHandle('I need to add something to my list');
      expect(confidence2).toBe(0.6);

      const confidence3 = await agent.canHandle('show me the pending items');
      expect(confidence3).toBe(0.6);
    });

    it('should return zero for unrelated queries', async () => {
      const confidence = await agent.canHandle('what is the weather today?');
      expect(confidence).toBe(0);
    });

    it('should handle French queries', async () => {
      const confidence1 = await agent.canHandle('ajouter une nouvelle tache');
      expect(confidence1).toBeGreaterThan(0);

      const confidence2 = await agent.canHandle('afficher mes taches');
      expect(confidence2).toBeGreaterThan(0);
    });
  });

  describe('execute - add_item intent', () => {
    it('should add a todo item successfully', async () => {
      const result = await agent.execute({
        intent: 'add_item' as TodoIntent,
        parameters: {
          text: 'Buy groceries'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output.added).toBe(true);
      expect(result.output.item.text).toContain('Buy groceries');
      expect(result.metadata?.executionTime).toBeDefined();
    });

    it('should add a todo item with priority', async () => {
      const result = await agent.execute({
        intent: 'add_item' as TodoIntent,
        parameters: {
          text: 'Important meeting',
          priority: 'high'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.item.priority).toBe('high');
    });

    it('should add a todo item with due date', async () => {
      const dueDate = '2025-12-31T23:59:59.000Z';
      const result = await agent.execute({
        intent: 'add_item' as TodoIntent,
        parameters: {
          text: 'Year end task',
          dueDate
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.item.dueDate).toBe(dueDate);
    });

    it('should fail when text is missing', async () => {
      const result = await agent.execute({
        intent: 'add_item' as TodoIntent,
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should support command as fallback for intent', async () => {
      const result = await agent.execute({
        command: 'add_item' as TodoIntent,
        parameters: {
          text: 'Test command fallback'
        }
      });

      expect(result.success).toBe(true);
      expect(result.output.added).toBe(true);
    });
  });

  describe('execute - list_items intent', () => {
    beforeEach(async () => {
      // Add some test todos
      await agent.execute({
        intent: 'add_item' as TodoIntent,
        parameters: { text: 'Task 1' }
      });
      await agent.execute({
        intent: 'add_item' as TodoIntent,
        parameters: { text: 'Task 2' }
      });
    });

    it('should list all items by default', async () => {
      const result = await agent.execute({
        intent: 'list_items' as TodoIntent,
        parameters: {}
      });

      expect(result.success).toBe(true);
      expect(result.output.filter).toBe('all');
      expect(result.output.items.length).toBe(2);
    });

    it('should list items with active filter', async () => {
      const result = await agent.execute({
        intent: 'list_items' as TodoIntent,
        parameters: { filter: 'active' }
      });

      expect(result.success).toBe(true);
      expect(result.output.filter).toBe('active');
    });

    it('should list items with completed filter', async () => {
      const result = await agent.execute({
        intent: 'list_items' as TodoIntent,
        parameters: { filter: 'completed' }
      });

      expect(result.success).toBe(true);
      expect(result.output.filter).toBe('completed');
    });
  });

  describe('execute - remove_item intent', () => {
    it('should remove an existing item', async () => {
      // First add an item
      const addResult = await agent.execute({
        intent: 'add_item' as TodoIntent,
        parameters: { text: 'Item to remove' }
      });

      const itemId = addResult.output.item.id;

      // Then remove it
      const removeResult = await agent.execute({
        intent: 'remove_item' as TodoIntent,
        parameters: { id: itemId }
      });

      expect(removeResult.success).toBe(true);
      expect(removeResult.output.removed).toBe(true);
    });

    it('should fail when id is missing', async () => {
      const result = await agent.execute({
        intent: 'remove_item' as TodoIntent,
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail when item does not exist', async () => {
      const result = await agent.execute({
        intent: 'remove_item' as TodoIntent,
        parameters: { id: 'non-existent-id' }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - update_item intent', () => {
    it('should update an existing item text', async () => {
      // First add an item
      const addResult = await agent.execute({
        intent: 'add_item' as TodoIntent,
        parameters: { text: 'Original text' }
      });

      const itemId = addResult.output.item.id;

      // Then update it
      const updateResult = await agent.execute({
        intent: 'update_item' as TodoIntent,
        parameters: { id: itemId, text: 'Updated text' }
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.output.updated).toBe(true);
      expect(updateResult.output.item.text).toContain('Updated text');
    });

    it('should update item priority', async () => {
      const addResult = await agent.execute({
        intent: 'add_item' as TodoIntent,
        parameters: { text: 'Task', priority: 'low' }
      });

      const itemId = addResult.output.item.id;

      const updateResult = await agent.execute({
        intent: 'update_item' as TodoIntent,
        parameters: { id: itemId, priority: 'high' }
      });

      expect(updateResult.success).toBe(true);
      expect(updateResult.output.item.priority).toBe('high');
    });

    it('should fail when id is missing', async () => {
      const result = await agent.execute({
        intent: 'update_item' as TodoIntent,
        parameters: { text: 'New text' }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - mark_complete intent', () => {
    it('should mark an item as complete', async () => {
      const addResult = await agent.execute({
        intent: 'add_item' as TodoIntent,
        parameters: { text: 'Task to complete' }
      });

      const itemId = addResult.output.item.id;

      const markResult = await agent.execute({
        intent: 'mark_complete' as TodoIntent,
        parameters: { id: itemId }
      });

      expect(markResult.success).toBe(true);
      expect(markResult.output.completed).toBe(true);
      expect(markResult.output.item.completed).toBe(true);
    });

    it('should fail when id is missing', async () => {
      const result = await agent.execute({
        intent: 'mark_complete' as TodoIntent,
        parameters: {}
      });

      expect(result.success).toBe(false);
    });
  });

  describe('execute - mark_incomplete intent', () => {
    it('should mark an item as incomplete', async () => {
      // Add and complete an item
      const addResult = await agent.execute({
        intent: 'add_item' as TodoIntent,
        parameters: { text: 'Task' }
      });

      const itemId = addResult.output.item.id;

      await agent.execute({
        intent: 'mark_complete' as TodoIntent,
        parameters: { id: itemId }
      });

      // Mark as incomplete
      const markResult = await agent.execute({
        intent: 'mark_incomplete' as TodoIntent,
        parameters: { id: itemId }
      });

      expect(markResult.success).toBe(true);
      expect(markResult.output.completed).toBe(false);
      expect(markResult.output.item.completed).toBe(false);
    });
  });

  describe('execute - clear_completed intent', () => {
    it('should clear all completed items', async () => {
      // Add items
      const add1 = await agent.execute({
        intent: 'add_item' as TodoIntent,
        parameters: { text: 'Task 1' }
      });

      const add2 = await agent.execute({
        intent: 'add_item' as TodoIntent,
        parameters: { text: 'Task 2' }
      });

      // Complete one
      await agent.execute({
        intent: 'mark_complete' as TodoIntent,
        parameters: { id: add1.output.item.id }
      });

      // Clear completed
      const clearResult = await agent.execute({
        intent: 'clear_completed' as TodoIntent,
        parameters: {}
      });

      expect(clearResult.success).toBe(true);
      expect(clearResult.output.cleared).toBe(true);
    });
  });

  describe('execute - unsupported intent', () => {
    it('should return error for unsupported intent', async () => {
      const result = await agent.execute({
        intent: 'unsupported_intent' as any,
        parameters: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateInput', () => {
    it('should validate add_item parameters', async () => {
      const valid = await agent.validateInput({
        intent: 'add_item' as TodoIntent,
        parameters: { text: 'Valid text' }
      });

      expect(valid.valid).toBe(true);

      const invalid = await agent.validateInput({
        intent: 'add_item' as TodoIntent,
        parameters: {}
      });

      expect(invalid.valid).toBe(false);
      expect(invalid.errors).toContain('Todo item text is required');
    });

    it('should validate priority values', async () => {
      const invalid = await agent.validateInput({
        intent: 'add_item' as TodoIntent,
        parameters: { text: 'Task', priority: 'invalid' }
      });

      expect(invalid.valid).toBe(false);
      expect(invalid.errors).toContain('Priority must be low, medium, or high');
    });

    it('should validate remove_item parameters', async () => {
      const invalid = await agent.validateInput({
        intent: 'remove_item' as TodoIntent,
        parameters: {}
      });

      expect(invalid.valid).toBe(false);
      expect(invalid.errors).toContain('Todo item ID is required');
    });

    it('should validate list_items filter values', async () => {
      const invalid = await agent.validateInput({
        intent: 'list_items' as TodoIntent,
        parameters: { filter: 'invalid' }
      });

      expect(invalid.valid).toBe(false);
      expect(invalid.errors).toContain('Filter must be all, active, or completed');
    });
  });

  describe('getRequiredParameters', () => {
    it('should return correct parameters for add_item', async () => {
      const params = await agent.getRequiredParameters('add_item');

      expect(params.length).toBeGreaterThan(0);
      expect(params.some(p => p.name === 'text')).toBe(true);
    });

    it('should return correct parameters for remove_item', async () => {
      const params = await agent.getRequiredParameters('remove_item');

      expect(params.some(p => p.name === 'id')).toBe(true);
    });

    it('should return correct parameters for list_items', async () => {
      const params = await agent.getRequiredParameters('list_items');

      expect(params.some(p => p.name === 'filter')).toBe(true);
    });

    it('should return empty array for unknown task', async () => {
      const params = await agent.getRequiredParameters('unknown_task');
      expect(params).toHaveLength(0);
    });
  });

  describe('getCapabilities', () => {
    it('should return all capabilities with descriptions', async () => {
      const capabilities = await agent.getCapabilities();

      expect(capabilities).toHaveLength(7);
      expect(capabilities.map(c => c.name)).toContain('Add Todo Item');
      expect(capabilities.map(c => c.name)).toContain('Remove Todo Item');
      expect(capabilities.map(c => c.name)).toContain('List Todo Items');
      expect(capabilities.map(c => c.name)).toContain('Update Todo Item');
      expect(capabilities.map(c => c.name)).toContain('Mark Todo Complete');
      expect(capabilities.map(c => c.name)).toContain('Mark Todo Incomplete');
      expect(capabilities.map(c => c.name)).toContain('Clear Completed Todos');

      capabilities.forEach(cap => {
        expect(cap.description).toBeDefined();
        expect(cap.requiredParameters).toBeDefined();
      });
    });
  });

  describe('metadata', () => {
    it('should include execution time in metadata', async () => {
      const result = await agent.execute({
        intent: 'list_items' as TodoIntent,
        parameters: {}
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should include source in metadata on success', async () => {
      const result = await agent.execute({
        intent: 'list_items' as TodoIntent,
        parameters: {}
      });

      expect(result.metadata?.source).toContain('todo-');
    });
  });
});
