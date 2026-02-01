/**
 * Todo Tools - Native LLM Tools for Task Management
 *
 * Provides tools that can be called by the LLM to:
 * - Add, remove, update tasks
 * - List tasks with filters
 * - Mark tasks as complete/incomplete
 *
 * These tools are registered with ToolCallingService and executed
 * automatically when the LLM decides to use them.
 */

import { toolCallingService, type ToolDefinition } from './ToolCallingService';
import { useAppStore } from '../store/appStore';

// ============================================================================
// Add Todo Tool
// ============================================================================

const addTodoTool: ToolDefinition = {
  name: 'add_todo',
  description: 'Add a new task/todo item to the list. Use this when the user wants to create a reminder, task, or something to do.',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text/description of the task to add'
      },
      priority: {
        type: 'string',
        description: 'Priority level: low, medium, or high',
        enum: ['low', 'medium', 'high']
      }
    },
    required: ['text']
  },
  handler: async (args) => {
    const text = args.text as string;
    const priority = (args.priority as string) || 'medium';

    const id = `todo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newTodo = {
      id,
      text,
      completed: false,
      priority: priority as 'low' | 'medium' | 'high',
      createdAt: new Date().toISOString()
    };

    // Add to store
    useAppStore.getState().addTodo(newTodo);

    return {
      success: true,
      message: `Tâche ajoutée: "${text}"`,
      todo: newTodo
    };
  }
};

// ============================================================================
// List Todos Tool
// ============================================================================

const listTodosTool: ToolDefinition = {
  name: 'list_todos',
  description: 'List all tasks/todos. Use this when the user asks to see their tasks, todos, or what they need to do.',
  parameters: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        description: 'Filter: all, active (not completed), or completed',
        enum: ['all', 'active', 'completed']
      }
    }
  },
  handler: async (args) => {
    const filter = (args.filter as string) || 'all';
    const todos = useAppStore.getState().todos || [];

    let filtered = todos;
    if (filter === 'active') {
      filtered = todos.filter(t => !t.completed);
    } else if (filter === 'completed') {
      filtered = todos.filter(t => t.completed);
    }

    return {
      filter,
      count: filtered.length,
      todos: filtered.map(t => ({
        id: t.id,
        text: t.text,
        completed: t.completed,
        priority: t.priority || 'medium',
        createdAt: t.createdAt
      }))
    };
  }
};

// ============================================================================
// Complete Todo Tool
// ============================================================================

const completeTodoTool: ToolDefinition = {
  name: 'complete_todo',
  description: 'Mark a task as completed. Use this when the user says they finished a task or wants to check it off.',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The ID of the todo to complete'
      },
      text: {
        type: 'string',
        description: 'Alternative: the text of the todo to complete (will find closest match)'
      }
    }
  },
  handler: async (args) => {
    const todos = useAppStore.getState().todos || [];
    let todoId = args.id as string;

    // If no ID provided, try to find by text
    if (!todoId && args.text) {
      const searchText = (args.text as string).toLowerCase();
      const found = todos.find(t =>
        t.text.toLowerCase().includes(searchText) && !t.completed
      );
      if (found) {
        todoId = found.id;
      }
    }

    if (!todoId) {
      return {
        success: false,
        error: 'Tâche non trouvée. Utilisez list_todos pour voir les tâches disponibles.'
      };
    }

    const todo = todos.find(t => t.id === todoId);
    if (!todo) {
      return {
        success: false,
        error: `Tâche avec ID "${todoId}" non trouvée.`
      };
    }

    useAppStore.getState().toggleTodo(todoId);

    return {
      success: true,
      message: `Tâche marquée comme terminée: "${todo.text}"`,
      todo: { ...todo, completed: true }
    };
  }
};

// ============================================================================
// Remove Todo Tool
// ============================================================================

const removeTodoTool: ToolDefinition = {
  name: 'remove_todo',
  description: 'Remove/delete a task from the list. Use this when the user wants to delete a task.',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The ID of the todo to remove'
      },
      text: {
        type: 'string',
        description: 'Alternative: the text of the todo to remove (will find closest match)'
      }
    }
  },
  handler: async (args) => {
    const todos = useAppStore.getState().todos || [];
    let todoId = args.id as string;

    // If no ID provided, try to find by text
    if (!todoId && args.text) {
      const searchText = (args.text as string).toLowerCase();
      const found = todos.find(t => t.text.toLowerCase().includes(searchText));
      if (found) {
        todoId = found.id;
      }
    }

    if (!todoId) {
      return {
        success: false,
        error: 'Tâche non trouvée. Utilisez list_todos pour voir les tâches disponibles.'
      };
    }

    const todo = todos.find(t => t.id === todoId);
    if (!todo) {
      return {
        success: false,
        error: `Tâche avec ID "${todoId}" non trouvée.`
      };
    }

    useAppStore.getState().removeTodo(todoId);

    return {
      success: true,
      message: `Tâche supprimée: "${todo.text}"`
    };
  }
};

// ============================================================================
// Clear Completed Tool
// ============================================================================

const clearCompletedTool: ToolDefinition = {
  name: 'clear_completed_todos',
  description: 'Remove all completed tasks from the list. Use this to clean up finished tasks.',
  parameters: {
    type: 'object',
    properties: {}
  },
  handler: async () => {
    const todos = useAppStore.getState().todos || [];
    const completed = todos.filter(t => t.completed);

    if (completed.length === 0) {
      return {
        success: true,
        message: 'Aucune tâche terminée à supprimer.',
        removed: 0
      };
    }

    // Remove each completed todo
    completed.forEach(t => {
      useAppStore.getState().removeTodo(t.id);
    });

    return {
      success: true,
      message: `${completed.length} tâche(s) terminée(s) supprimée(s).`,
      removed: completed.length
    };
  }
};

// ============================================================================
// Registration
// ============================================================================

/**
 * Register all todo tools with the ToolCallingService
 */
export function registerTodoTools(): void {
  toolCallingService.registerTool(addTodoTool);
  toolCallingService.registerTool(listTodosTool);
  toolCallingService.registerTool(completeTodoTool);
  toolCallingService.registerTool(removeTodoTool);
  toolCallingService.registerTool(clearCompletedTool);

  console.log('[TodoTools] Registered: add_todo, list_todos, complete_todo, remove_todo, clear_completed_todos');
}

/**
 * Get all todo tool definitions
 */
export function getTodoTools(): ToolDefinition[] {
  return [addTodoTool, listTodosTool, completeTodoTool, removeTodoTool, clearCompletedTool];
}

export { addTodoTool, listTodosTool, completeTodoTool, removeTodoTool, clearCompletedTool };
