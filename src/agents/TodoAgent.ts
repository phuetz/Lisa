/**
 * Agent responsible for managing the to-do list.
 * This agent interacts directly with the Zustand store to manage state.
 * Implements the BaseAgent interface for integration with PlannerAgent.
 */
import { agentRegistry } from './registry';
import {
  AgentDomains
} from './types';
import type {
  AgentCapability,
  AgentExecuteProps,
  AgentExecuteResult,
  AgentParameter,
  BaseAgent
} from './types';
import { useVisionAudioStore } from '../store/visionAudioStore';

/**
 * Supported todo intents
 */
export type TodoIntent =
  | 'add_item'
  | 'remove_item'
  | 'list_items'
  | 'update_item'
  | 'mark_complete'
  | 'mark_incomplete'
  | 'clear_completed';

/**
 * Base Todo interface from the store
 */
import type { Todo as StoreTodo } from '../store/visionAudioStore';

/**
 * Extended Todo item interface with additional fields
 */
export interface TodoItem extends StoreTodo {
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class TodoAgent implements BaseAgent {
  name = 'TodoAgent';
  description = 'Manages a to-do list, including adding, removing, updating, and listing items.';
  version = '1.1.0';
  domain = AgentDomains.PRODUCTIVITY;
  capabilities = [
    'add_todo_item',
    'remove_todo_item',
    'list_todo_items',
    'update_todo_item',
    'mark_todo_complete',
    'mark_todo_incomplete',
    'clear_completed_todos'
  ];

  /**
   * Main execution method for the TodoAgent
   */
  async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    const startTime = Date.now();
    const intent = props.intent as TodoIntent || props.command as TodoIntent;
    const parameters = props.parameters || {};

    try {
      // Validate input
      const validation = await this.validateInput(props);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors?.join(', '),
          output: null,
          metadata: {
            executionTime: Date.now() - startTime
          }
        };
      }
      
      // Process intent
      let result;
      switch (intent) {
        case 'add_item':
          result = this.addItem(parameters.text as string, parameters.priority, parameters.dueDate);
          break;
          
        case 'remove_item':
          result = this.removeItem(parameters.id as string);
          break;
          
        case 'list_items':
          result = this.listItems(parameters.filter as string);
          break;
          
        case 'update_item':
          result = this.updateItem(parameters.id as string, parameters.text, parameters.priority, parameters.dueDate);
          break;
          
        case 'mark_complete':
          result = this.markItemStatus(parameters.id as string, true);
          break;
          
        case 'mark_incomplete':
          result = this.markItemStatus(parameters.id as string, false);
          break;
          
        case 'clear_completed':
          result = this.clearCompleted();
          break;
          
        default:
          return {
            success: false,
            output: `Intent non supporté: ${intent}`,
            error: new Error('UNSUPPORTED_INTENT'),
            metadata: {
              executionTime: Date.now() - startTime
            }
          };
      }

      return {
        success: true,
        output: result,
        metadata: {
          executionTime: Date.now() - startTime,
          source: `todo-${intent}`
        }
      };
    } catch (error: any) {
      console.error(`TodoAgent error executing ${props.intent || props.command}:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        output: null,
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Determines if this agent can handle a specific query
   */
  async canHandle(query: string, _context?: any): Promise<number> {
    const lowerQuery = query.toLowerCase();
    
    const todoKeywords = [
      'todo', 'to do', 'to-do', 'task', 'tâche', 'lista', 'liste',
      'reminder', 'rappel', 'add', 'ajouter', 'remove', 'supprimer',
      'list', 'lister', 'show', 'montrer', 'afficher',
      'complete', 'complète', 'completed', 'terminé', 'done', 'fini',
      'item', 'élément', 'pending', 'en attente'
    ];
    
    const todoRegexes = [
      /add (a )?((new )?todo|task|item|reminder)/i,
      /ajouter (une? )?(nouvelle? )?(tâche|élément|rappel|todo)/i,
      /show( my)? (todo|task)s/i,
      /afficher|montrer (mes )?(tâches|todos)/i,
      /mark (task|todo|item) (as )?(complete|done)/i,
      /marquer (la |une )?(tâche|todo) (comme )?(terminée|complète)/i
    ];
    
    // Check for keyword matches
    for (const keyword of todoKeywords) {
      if (lowerQuery.includes(keyword)) {
        return 0.6; // 60% confidence
      }
    }
    
    // Check for regex patterns
    for (const regex of todoRegexes) {
      if (regex.test(lowerQuery)) {
        return 0.85; // 85% confidence
      }
    }
    
    return 0; // Cannot handle
  }
  
  /**
   * Returns required parameters for a specific task
   */
  async getRequiredParameters(task: string): Promise<AgentParameter[]> {
    switch (task) {
      case 'add_item':
        return [
          {
            name: 'text',
            type: 'string',
            required: true,
            description: 'Text content of the todo item'
          },
          {
            name: 'priority',
            type: 'string',
            required: false,
            description: 'Priority level: low, medium, or high',
            defaultValue: 'medium'
          },
          {
            name: 'dueDate',
            type: 'string',
            required: false,
            description: 'Due date for the todo item (ISO string)'
          }
        ];
      case 'remove_item':
      case 'mark_complete':
      case 'mark_incomplete':
        return [
          {
            name: 'id',
            type: 'string',
            required: true,
            description: 'ID of the todo item'
          }
        ];
      case 'update_item':
        return [
          {
            name: 'id',
            type: 'string',
            required: true,
            description: 'ID of the todo item to update'
          },
          {
            name: 'text',
            type: 'string',
            required: false,
            description: 'New text content for the todo item'
          },
          {
            name: 'priority',
            type: 'string',
            required: false,
            description: 'New priority level: low, medium, or high'
          },
          {
            name: 'dueDate',
            type: 'string',
            required: false,
            description: 'New due date for the todo item (ISO string)'
          }
        ];
      case 'list_items':
        return [
          {
            name: 'filter',
            type: 'string',
            required: false,
            description: 'Filter by: all, active, completed',
            defaultValue: 'all'
          }
        ];
      case 'clear_completed':
        return [];
      default:
        return [];
    }
  }
  
  /**
   * Returns detailed capability information
   */
  async getCapabilities(): Promise<AgentCapability[]> {
    return [
      {
        name: 'Add Todo Item',
        description: 'Adds a new item to the todo list',
        requiredParameters: await this.getRequiredParameters('add_item')
      },
      {
        name: 'Remove Todo Item',
        description: 'Removes an item from the todo list',
        requiredParameters: await this.getRequiredParameters('remove_item')
      },
      {
        name: 'List Todo Items',
        description: 'Lists all items in the todo list with optional filtering',
        requiredParameters: await this.getRequiredParameters('list_items')
      },
      {
        name: 'Update Todo Item',
        description: 'Updates an existing item in the todo list',
        requiredParameters: await this.getRequiredParameters('update_item')
      },
      {
        name: 'Mark Todo Complete',
        description: 'Marks a todo item as completed',
        requiredParameters: await this.getRequiredParameters('mark_complete')
      },
      {
        name: 'Mark Todo Incomplete',
        description: 'Marks a todo item as incomplete',
        requiredParameters: await this.getRequiredParameters('mark_incomplete')
      },
      {
        name: 'Clear Completed Todos',
        description: 'Removes all completed todos from the list',
        requiredParameters: await this.getRequiredParameters('clear_completed')
      }
    ];
  }

  /**
   * Validates input parameters
   */
  async validateInput(props: AgentExecuteProps): Promise<{ valid: boolean; errors?: string[] }> {
    const intent = props.intent as TodoIntent || props.command as TodoIntent;
    const parameters = props.parameters || {};
    const errors: string[] = [];
    
    switch (intent) {
      case 'add_item':
        if (!parameters.text) {
          errors.push('Todo item text is required');
        }
        if (parameters.priority && !['low', 'medium', 'high'].includes(parameters.priority as string)) {
          errors.push('Priority must be low, medium, or high');
        }
        if (parameters.dueDate) {
          try {
            new Date(parameters.dueDate as string);
          } catch (e) {
            errors.push('Due date must be a valid date');
          }
        }
        break;
      case 'remove_item':
      case 'mark_complete':
      case 'mark_incomplete':
      case 'update_item':
        if (!parameters.id) {
          errors.push('Todo item ID is required');
        }
        break;
      case 'list_items':
        if (parameters.filter && !['all', 'active', 'completed'].includes(parameters.filter as string)) {
          errors.push('Filter must be all, active, or completed');
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Adds a new item to the todo list
   */
  private addItem(text: string, priority?: string, dueDate?: string): any {
    if (!text) throw new Error('Todo text is required');
    
    const { getState, setState } = useVisionAudioStore;
    
    // Create basic Todo object compatible with the store
    const baseTodo = {
      id: Date.now().toString(),
      text
    };
    
    // Add metadata for UI/functionality via data attributes
    // Store extra properties in the text field using a special format that can be parsed later
    // Format: text #meta:completed=false,priority=medium,dueDate=2025-07-10
    const metaData = [];
    metaData.push(`completed=false`);
    if (priority) {
      metaData.push(`priority=${priority}`);
    }
    if (dueDate) {
      metaData.push(`dueDate=${dueDate}`);
    }
    metaData.push(`createdAt=${new Date().toISOString()}`);
    
    // Construct the full text with metadata
    const todoWithMeta = {
      ...baseTodo,
      text: `${text} #meta:${metaData.join(',')}`
    };
    
    setState({ todos: [...getState().todos, todoWithMeta] });
    
    // For the return value, parse the metadata back into proper fields
    const todoItem = this.convertToTodoItem(todoWithMeta);
    
    return {
      added: true,
      item: todoItem,
      totalItems: getState().todos.length
    };
  }

  /**
   * Helper method to convert a basic Todo to a TodoItem with metadata
   */
  private convertToTodoItem(todo: StoreTodo): TodoItem {
    // Start with the base Todo properties
    const todoItem: TodoItem = {
      id: todo.id,
      text: todo.text
    };
    
    // Check if there's metadata in the text
    const metaMatch = todo.text.match(/#meta:([^\s]+)/);
    if (metaMatch && metaMatch[1]) {
      // Extract the original text without the metadata
      todoItem.text = todo.text.replace(/#meta:[^\s]+/, '').trim();
      
      // Parse the metadata
      const metaParts = metaMatch[1].split(',');
      metaParts.forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
          switch(key) {
            case 'completed':
              todoItem.completed = value === 'true';
              break;
            case 'priority':
              todoItem.priority = value as 'low' | 'medium' | 'high';
              break;
            case 'dueDate':
              todoItem.dueDate = value;
              break;
            case 'createdAt':
              todoItem.createdAt = value;
              break;
            case 'updatedAt':
              todoItem.updatedAt = value;
              break;
          }
        }
      });
    }
    
    return todoItem;
  }
  
  /**
   * Helper method to convert a TodoItem back to a basic Todo with metadata in text
   */
  private convertToStoreTodo(todoItem: Partial<TodoItem>, originalTodo?: StoreTodo): StoreTodo {
    // Start with the original text without metadata if it exists
    let baseText = '';
    if (originalTodo) {
      baseText = originalTodo.text.replace(/#meta:[^\s]+/, '').trim();
    }
    
    // Use the new text if provided, otherwise use the cleaned base text
    const text = todoItem.text || baseText;
    
    // Build metadata
    const metaData = [];
    
    // Add all metadata properties
    if (todoItem.completed !== undefined) {
      metaData.push(`completed=${todoItem.completed}`);
    }
    if (todoItem.priority) {
      metaData.push(`priority=${todoItem.priority}`);
    }
    if (todoItem.dueDate) {
      metaData.push(`dueDate=${todoItem.dueDate}`);
    }
    if (todoItem.createdAt) {
      metaData.push(`createdAt=${todoItem.createdAt}`);
    }
    
    // Add updatedAt timestamp
    metaData.push(`updatedAt=${new Date().toISOString()}`);
    
    // Create the todo with metadata
    return {
      id: todoItem.id || (originalTodo ? originalTodo.id : Date.now().toString()),
      text: metaData.length > 0 ? `${text} #meta:${metaData.join(',')}` : text
    };
  }

  /**
   * Removes an item from the todo list
   */
  private removeItem(id: string): any {
    if (!id) throw new Error('Todo ID is required');
    
    const { getState, setState } = useVisionAudioStore;
    const currentTodos = getState().todos;
    const todoToRemove = currentTodos.find(t => t.id === id);
    
    if (!todoToRemove) {
      throw new Error('Todo item not found');
    }
    
    const todoItem = this.convertToTodoItem(todoToRemove);
    setState({ todos: currentTodos.filter(t => t.id !== id) });
    
    return {
      removed: true,
      item: todoItem,
      remainingItems: getState().todos.length
    };
  }
  
  /**
   * Updates an existing todo item
   */
  private updateItem(id: string, text?: string, priority?: string, dueDate?: string): any {
    if (!id) throw new Error('Todo ID is required');
    
    const { getState, setState } = useVisionAudioStore;
    const currentTodos = getState().todos;
    const todoIndex = currentTodos.findIndex(t => t.id === id);
    
    if (todoIndex === -1) {
      throw new Error('Todo item not found');
    }
    
    // Get the current todo and convert to TodoItem
    const currentTodo = currentTodos[todoIndex];
    const currentTodoItem = this.convertToTodoItem(currentTodo);
    
    // Create updated TodoItem
    const updatedTodoItem: Partial<TodoItem> = {
      ...currentTodoItem,
      id,
      text: text || currentTodoItem.text,
      priority: (priority as 'low' | 'medium' | 'high') || currentTodoItem.priority,
      dueDate: dueDate !== undefined ? dueDate : currentTodoItem.dueDate
    };
    
    // Convert back to store format
    const updatedTodo = this.convertToStoreTodo(updatedTodoItem, currentTodo);
    
    // Update state
    const newTodos = [...currentTodos];
    newTodos[todoIndex] = updatedTodo;
    setState({ todos: newTodos });
    
    return {
      updated: true,
      item: this.convertToTodoItem(updatedTodo)
    };
  }
  
  /**
   * Marks an item as complete or incomplete
   */
  private markItemStatus(id: string, completed: boolean): any {
    if (!id) throw new Error('Todo ID is required');
    
    const { getState, setState } = useVisionAudioStore;
    const currentTodos = getState().todos;
    const todoIndex = currentTodos.findIndex(t => t.id === id);
    
    if (todoIndex === -1) {
      throw new Error('Todo item not found');
    }
    
    // Get the current todo and convert to TodoItem
    const currentTodo = currentTodos[todoIndex];
    const currentTodoItem = this.convertToTodoItem(currentTodo);
    
    // Update the completed status
    const updatedTodoItem: Partial<TodoItem> = {
      ...currentTodoItem,
      id,
      completed
    };
    
    // Convert back to store format
    const updatedTodo = this.convertToStoreTodo(updatedTodoItem, currentTodo);
    
    // Update state
    const newTodos = [...currentTodos];
    newTodos[todoIndex] = updatedTodo;
    setState({ todos: newTodos });
    
    return {
      updated: true,
      item: this.convertToTodoItem(updatedTodo),
      completed
    };
  }
  
  /**
   * Clears all completed todos
   */
  private clearCompleted(): any {
    const { getState, setState } = useVisionAudioStore;
    const currentTodos = getState().todos;
    
    // Convert all todos to TodoItems to check completion status
    const todoItems = currentTodos.map(todo => this.convertToTodoItem(todo));
    const completedTodos = todoItems.filter(t => t.completed);
    const activeTodos = currentTodos.filter(t => {
      const todoItem = this.convertToTodoItem(t);
      return !todoItem.completed;
    });
    
    setState({ todos: activeTodos });
    
    return {
      cleared: true,
      removedCount: completedTodos.length,
      remainingCount: activeTodos.length
    };
  }

  /**
   * Returns the todo list, optionally filtered
   */
  private listItems(filter: string = 'all'): any {
    const todos = useVisionAudioStore.getState().todos;
    const todoItems = todos.map(todo => this.convertToTodoItem(todo));
    
    let filteredTodos;
    switch(filter) {
      case 'active':
        filteredTodos = todoItems.filter(t => !t.completed);
        break;
      case 'completed':
        filteredTodos = todoItems.filter(t => t.completed);
        break;
      case 'all':
      default:
        filteredTodos = todoItems;
        break;
    }
    
    return {
      filter,
      items: filteredTodos,
      count: filteredTodos.length,
      totalCount: todos.length
    };
  }
}

// Register a valid instance of the agent with the registry.
const todoAgent = new TodoAgent();

// Add valid property required by BaseAgent interface
Object.defineProperty(todoAgent, 'valid', {
  value: true,
  writable: false,
  enumerable: true
});

agentRegistry.register(todoAgent);
