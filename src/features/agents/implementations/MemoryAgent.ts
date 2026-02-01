/**
 * MemoryAgent.ts
 * 
 * Agent responsible for episodic and long-term memory management.
 * Handles memory storage, retrieval, and contextual recall to enhance
 * the assistant's ability to remember previous interactions and user preferences.
 */

import { AgentDomains, type AgentExecuteProps, type AgentExecuteResult, type BaseAgent } from '../core/types';
import { useAppStore } from '../../../store/appStore';

// Types for memory management
export interface Memory {
  id: string;
  type: 'fact' | 'preference' | 'interaction' | 'context';
  content: string;
  timestamp: number;
  tags: string[];
  source: string;
  confidence: number;
  lastAccessed?: number;
  accessCount?: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryQuery {
  text?: string;
  type?: Memory['type'];
  tags?: string[];
  timeRange?: {
    start?: number;
    end?: number;
  };
  limit?: number;
  includeMetadata?: boolean;
  sortBy?: 'relevance' | 'timestamp' | 'accessCount';
}

/**
 * Memory Manager for storing and retrieving memories
 */
export class MemoryAgent implements BaseAgent {
  // Identity properties
  public name = 'MemoryAgent';
  public description = 'Manages episodic and long-term memory, enabling recall of past interactions and user preferences';
  public version = '1.0.0';
  public domain = AgentDomains.KNOWLEDGE;
  public capabilities = [
    'memory_storage',
    'memory_retrieval',
    'preference_tracking',
    'context_recall',
    'memory_summarization'
  ];

  // Internal memory store
  private memories: Memory[] = [];
  private initialized = false;

  constructor() {
    this.loadMemories();
  }

  /**
   * Load memories from persistent storage
   */
  private loadMemories(): void {
    try {
      const storedMemories = localStorage.getItem('lisa_memories');
      if (storedMemories) {
        this.memories = JSON.parse(storedMemories);
      }
      this.initialized = true;
      console.log(`[MemoryAgent] Loaded ${this.memories.length} memories from storage`);
    } catch (error) {
      console.error('[MemoryAgent] Error loading memories:', error);
      this.memories = [];
      this.initialized = true;
    }
  }

  /**
   * Save memories to persistent storage
   */
  private saveMemories(): void {
    try {
      localStorage.setItem('lisa_memories', JSON.stringify(this.memories));
    } catch (error) {
      console.error('[MemoryAgent] Error saving memories:', error);
    }
  }

  /**
   * Store a new memory
   */
  public storeMemory(memory: Omit<Memory, 'id' | 'timestamp'>): Memory {
    const newMemory: Memory = {
      ...memory,
      id: `mem_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      accessCount: 0
    };

    this.memories.push(newMemory);
    this.saveMemories();

    // Update conversation context with relevant recent memories
    this.updateConversationContext();

    return newMemory;
  }

  /**
   * Retrieve memories based on a query
   */
  public retrieveMemories(query: MemoryQuery): Memory[] {
    if (!this.initialized) {
      this.loadMemories();
    }

    let results = [...this.memories];

    // Filter by type
    if (query.type) {
      results = results.filter(mem => mem.type === query.type);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter(mem => 
        query.tags!.some(tag => mem.tags.includes(tag))
      );
    }

    // Filter by time range
    if (query.timeRange) {
      if (query.timeRange.start) {
        results = results.filter(mem => mem.timestamp >= query.timeRange!.start!);
      }
      if (query.timeRange.end) {
        results = results.filter(mem => mem.timestamp <= query.timeRange!.end!);
      }
    }

    // Filter by text search (basic keyword matching)
    if (query.text) {
      const searchTerms = query.text.toLowerCase().split(' ');
      results = results.filter(mem => {
        const content = mem.content.toLowerCase();
        return searchTerms.some(term => content.includes(term));
      });
    }

    // Sort results
    switch (query.sortBy) {
      case 'timestamp':
        results.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'accessCount':
        results.sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0));
        break;
      case 'relevance':
      default:
        // For now, relevance is based on a combination of recency and access count
        results.sort((a, b) => {
          const recencyScore = (b.timestamp - a.timestamp) / 86400000; // Normalized by days
          const accessScore = ((b.accessCount || 0) - (a.accessCount || 0)) * 0.1;
          return (recencyScore + accessScore);
        });
    }

    // Apply limit
    if (query.limit && query.limit > 0) {
      results = results.slice(0, query.limit);
    }

    // Update access metrics for retrieved memories
    let updated = false;
    results.forEach(mem => {
      const memoryIndex = this.memories.findIndex(m => m.id === mem.id);
      if (memoryIndex >= 0) {
        this.memories[memoryIndex] = {
          ...this.memories[memoryIndex],
          lastAccessed: Date.now(),
          accessCount: (this.memories[memoryIndex].accessCount || 0) + 1
        };
        updated = true;
      }
    });

    if (updated) {
      this.saveMemories();
    }

    // If includeMetadata is false, filter out metadata
    if (query.includeMetadata === false) {
      results = results.map(mem => {
        const { metadata, ...rest } = mem;
        return rest;
      });
    }

    return results;
  }

  /**
   * Update a memory by ID
   */
  public updateMemory(id: string, updates: Partial<Memory>): Memory | null {
    const index = this.memories.findIndex(mem => mem.id === id);
    if (index === -1) {
      return null;
    }

    // Don't allow updating immutable fields
    const { id: _, timestamp: __, ...validUpdates } = updates;

    this.memories[index] = {
      ...this.memories[index],
      ...validUpdates,
    };

    this.saveMemories();
    return this.memories[index];
  }

  /**
   * Delete a memory by ID
   */
  public deleteMemory(id: string): boolean {
    const initialLength = this.memories.length;
    this.memories = this.memories.filter(mem => mem.id !== id);
    
    const deleted = this.memories.length < initialLength;
    if (deleted) {
      this.saveMemories();
    }
    
    return deleted;
  }

  /**
   * Get a summary of memories related to a specific context
   */
  public summarizeMemories(context: string, limit = 5): string {
    const normalizedContext = context.trim().toLowerCase();
    const contextTerms = normalizedContext
      .split(/\s+/)
      .filter(Boolean)
      .map(term => (term.endsWith('s') ? term.slice(0, -1) : term));

    let relevantMemories = this.retrieveMemories({
      tags: contextTerms.length > 0 ? contextTerms : undefined,
      limit,
      sortBy: 'relevance'
    });

    if (relevantMemories.length === 0) {
      relevantMemories = this.retrieveMemories({
        text: normalizedContext,
        limit,
        sortBy: 'relevance'
      });
    }

    if (relevantMemories.length === 0) {
      return "No relevant memories found.";
    }

    // Create a simple summary
    return relevantMemories
      .map(mem => `- ${mem.content} (${new Date(mem.timestamp).toLocaleDateString()})`)
      .join('\n');
  }

  /**
   * Update the conversation context with relevant memories
   */
  private updateConversationContext(): void {
    // Get recent or frequently accessed memories
    const recentMemories = [...this.memories]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);

    const { setState } = useAppStore.getState();
    setState((state) => {
      const previousContext = state.conversationContext ?? { timestamp: Date.now() };
      const ensuredTimestamp = previousContext.timestamp ?? Date.now();

      return {
        conversationContext: {
          ...previousContext,
          timestamp: ensuredTimestamp,
          relevantMemories: recentMemories
        }
      };
    });
  }

  /**
   * Validates the input properties before execution
   */
  public async validateInput(props: AgentExecuteProps): Promise<{valid: boolean, errors?: string[]}> {
    const action = props.action || props.intent;
    const allowedActions = ['store', 'retrieve', 'update', 'delete', 'summarize'] as const;

    if (!action) {
      return { valid: false, errors: ['No action or intent specified'] };
    }

    if (!allowedActions.includes(action as typeof allowedActions[number])) {
      return { valid: false, errors: ['Action must be one of:'] };
    }

    const errors: string[] = [];

    if (action === 'store' && !props.content) {
      errors.push('Missing required parameter:');
      errors.push('Missing required parameter: content');
    }

    if (action === 'retrieve' && !props.query) {
      errors.push('Missing required parameter:');
      errors.push('Missing required parameter: query');
    }

    if (action === 'update') {
      if (!props.id) {
        errors.push('Missing required parameter:');
        errors.push('Missing required parameter: id');
      }
      if (!props.updates) {
        errors.push('Missing required parameter:');
        errors.push('Missing required parameter: updates');
      }
    }

    if (action === 'delete' && !props.id) {
      errors.push('Missing required parameter:');
      errors.push('Missing required parameter: id');
    }

    if (action === 'summarize' && !props.context) {
      errors.push('Missing required parameter:');
      errors.push('Missing required parameter: context');
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }

  /**
   * Execute the memory agent functionality
   */
  public async execute(props: AgentExecuteProps): Promise<AgentExecuteResult> {
    try {
      const startTime = Date.now();
      const action = props.action || props.intent;

      if (!action) {
        return {
          success: false,
          output: "No action specified",
          error: "Missing required 'action' parameter"
        };
      }

      let result: unknown;
      
      switch (action) {
        case 'store':
          if (!props.content) {
            return {
              success: false,
              output: "Cannot store memory without content",
              error: "Missing required 'content' parameter"
            };
          }
          
          result = this.storeMemory({
            type: props.type as Memory['type'] || 'fact',
            content: props.content,
            tags: props.tags || [],
            source: props.source || 'user_interaction',
            confidence: props.confidence || 0.9
          });
          
          break;
          
        case 'retrieve':
          result = this.retrieveMemories(props.query || {});
          break;
          
        case 'update':
          if (!props.id || !props.updates) {
            return {
              success: false,
              output: "Cannot update memory without ID and updates",
              error: "Missing required 'id' or 'updates' parameters"
            };
          }
          
          result = this.updateMemory(props.id, props.updates);
          
          if (result === null) {
            return {
              success: false,
              output: `Memory with ID ${props.id} not found`,
              error: "Memory not found"
            };
          }
          
          break;
          
        case 'delete':
          if (!props.id) {
            return {
              success: false,
              output: "Cannot delete memory without ID",
              error: "Missing required 'id' parameter"
            };
          }
          
          result = this.deleteMemory(props.id);
          break;
          
        case 'summarize': {
          const contextValue = typeof props.context === 'string'
            ? props.context
            : typeof props.context?.topic === 'string'
              ? props.context.topic
              : typeof props.context?.text === 'string'
                ? props.context.text
                : '';

          if (!contextValue.trim()) {
            return {
              success: false,
              output: "Cannot summarize memories without context",
              error: "Missing required 'context' parameter"
            };
          }
          
          result = this.summarizeMemories(contextValue, props.limit);
          break;
        }
          
        default:
          return {
            success: false,
            output: `Unknown action: ${action}`,
            error: `Action '${action}' is not supported`
          };
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: result,
        metadata: {
          executionTime,
          source: 'MemoryAgent',
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('[MemoryAgent] Error during execution:', error);
      
      return {
        success: false,
        output: "Error processing memory operation",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check if this agent can handle the given query
   */
  public async canHandle(query: string): Promise<number> {
    const lowerQuery = query.toLowerCase();
    
    // Check for memory-related keywords
    const memoryKeywords = [
      'remember', 'forget', 'recall', 'memory', 'remembered', 'remind', 'reminded',
      'preference', 'favorite', 'preferred',
      'last time', 'previous', 'before', 'history', 'past'
    ];

    const preferencePatterns = [
      /\bi like\b/,
      /\bi dislike\b/,
      /\bi love\b/,
      /\bmy favorite\b/,
      /\bmy favourites?\b/,
      /\bwhat do i like\b/,
      /\bremember that i\b/
    ];
    
    const memoryPhrases = [
      'do you remember', 'can you remember', 'did i tell you', 
      'what did i say about', 'what do i like', 'what do i prefer',
      'what did we discuss', 'the last time we talked about'
    ];
    
    // Check for direct memory commands
    if (lowerQuery.startsWith('remember that') || 
        lowerQuery.startsWith('forget that') || 
        lowerQuery.startsWith('remind me')) {
      return 0.9;
    }
    
    // Check for memory phrases
    for (const phrase of memoryPhrases) {
      if (lowerQuery.includes(phrase)) {
        return 0.85;
      }
    }

    // Check for explicit preference phrases
    for (const pattern of preferencePatterns) {
      if (pattern.test(lowerQuery)) {
        return 0.75;
      }
    }

    // Check for memory keywords
    for (const keyword of memoryKeywords) {
      if (lowerQuery.includes(keyword)) {
        return 0.7;
      }
    }
    
    // Default low confidence
    return 0.2;
  }
}
