import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryAgent, type Memory, type MemoryQuery } from '../MemoryAgent';

describe('MemoryAgent', () => {
  let memoryAgent: MemoryAgent;
  let mockLocalStorage: Record<string, string> = {};

  // Mock localStorage
  beforeEach(() => {
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key) => mockLocalStorage[key] || null),
        setItem: vi.fn((key, value) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {};
        })
      },
      writable: true
    });

    // Create a fresh agent instance before each test
    memoryAgent = new MemoryAgent();
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockLocalStorage = {};
  });

  it('should initialize with correct properties', () => {
    expect(memoryAgent.name).toBe('MemoryAgent');
    expect(memoryAgent.description).toContain('episodic and long-term memory');
    expect(memoryAgent.version).toBe('1.0.0');
    expect(memoryAgent.capabilities).toContain('memory_storage');
    expect(memoryAgent.capabilities).toContain('memory_retrieval');
    expect(memoryAgent.capabilities).toContain('preference_tracking');
    expect(memoryAgent.capabilities).toContain('context_recall');
    expect(memoryAgent.capabilities).toContain('memory_summarization');
  });

  describe('Memory Storage and Retrieval', () => {
    it('should store memories correctly', async () => {
      // Store a memory
      const memory = memoryAgent.storeMemory({
        type: 'fact',
        content: 'The sky is blue',
        tags: ['nature', 'facts'],
        source: 'user',
        confidence: 0.9
      });

      // Verify the memory was stored with the correct properties
      expect(memory.id).toBeDefined();
      expect(memory.content).toBe('The sky is blue');
      expect(memory.type).toBe('fact');
      expect(memory.tags).toContain('nature');
      expect(memory.tags).toContain('facts');
      expect(memory.source).toBe('user');
      expect(memory.timestamp).toBeDefined();
      expect(memory.accessCount).toBe(0);

      // Verify localStorage was called
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should retrieve memories based on type', async () => {
      // Store multiple memories of different types
      memoryAgent.storeMemory({
        type: 'fact',
        content: 'The sky is blue',
        tags: ['nature'],
        source: 'user',
        confidence: 0.9
      });

      memoryAgent.storeMemory({
        type: 'preference',
        content: 'I like chocolate',
        tags: ['food'],
        source: 'user',
        confidence: 0.9
      });

      memoryAgent.storeMemory({
        type: 'fact',
        content: 'Water boils at 100°C',
        tags: ['science'],
        source: 'user',
        confidence: 0.9
      });

      // Retrieve only facts
      const query: MemoryQuery = { type: 'fact' };
      const results = memoryAgent.retrieveMemories(query);

      expect(results.length).toBe(2);
      expect(results[0].content).toBe('The sky is blue');
      expect(results[1].content).toBe('Water boils at 100°C');
    });

    it('should retrieve memories based on text search', async () => {
      // Store multiple memories with different content
      memoryAgent.storeMemory({
        type: 'fact',
        content: 'The sky is blue',
        tags: ['nature'],
        source: 'user',
        confidence: 0.9
      });

      memoryAgent.storeMemory({
        type: 'fact',
        content: 'Water is blue in large quantities',
        tags: ['science'],
        source: 'user',
        confidence: 0.9
      });

      memoryAgent.storeMemory({
        type: 'fact',
        content: 'Fire is hot',
        tags: ['science'],
        source: 'user',
        confidence: 0.9
      });

      // Search for memories containing "blue"
      const query: MemoryQuery = { text: 'blue' };
      const results = memoryAgent.retrieveMemories(query);

      expect(results.length).toBe(2);
      expect(results.some(m => m.content === 'The sky is blue')).toBe(true);
      expect(results.some(m => m.content === 'Water is blue in large quantities')).toBe(true);
    });

    it('should update memories correctly', async () => {
      // Store a memory
      const memory = memoryAgent.storeMemory({
        type: 'fact',
        content: 'The sky is blue',
        tags: ['nature'],
        source: 'user',
        confidence: 0.9
      });

      // Update the memory
      const updatedMemory = memoryAgent.updateMemory(memory.id, {
        content: 'The sky is sometimes gray',
        tags: ['nature', 'weather']
      });

      expect(updatedMemory).not.toBeNull();
      expect(updatedMemory?.content).toBe('The sky is sometimes gray');
      expect(updatedMemory?.tags).toContain('weather');

      // Verify localStorage was called again
      expect(localStorage.setItem).toHaveBeenCalledTimes(2);
    });

    it('should delete memories correctly', async () => {
      // Store a memory
      const memory = memoryAgent.storeMemory({
        type: 'fact',
        content: 'The sky is blue',
        tags: ['nature'],
        source: 'user',
        confidence: 0.9
      });

      // Delete the memory
      const result = memoryAgent.deleteMemory(memory.id);
      expect(result).toBe(true);

      // Verify the memory was deleted
      const query: MemoryQuery = { text: 'sky' };
      const results = memoryAgent.retrieveMemories(query);
      expect(results.length).toBe(0);

      // Verify localStorage was called again
      expect(localStorage.setItem).toHaveBeenCalledTimes(2);
    });

    it('should summarize memories correctly', async () => {
      // Store multiple memories
      memoryAgent.storeMemory({
        type: 'fact',
        content: 'User likes apples',
        tags: ['preference', 'food'],
        source: 'conversation',
        confidence: 0.9
      });

      memoryAgent.storeMemory({
        type: 'fact',
        content: 'User dislikes bananas',
        tags: ['preference', 'food'],
        source: 'conversation',
        confidence: 0.9
      });

      // Get summary for food preferences
      const summary = memoryAgent.summarizeMemories('food preferences');
      
      expect(summary).toContain('apples');
      expect(summary).toContain('bananas');
    });
  });

  describe('Agent Execute Method', () => {
    it('should execute store action correctly', async () => {
      const result = await memoryAgent.execute({
        action: 'store',
        content: 'User likes jazz music',
        type: 'preference',
        tags: ['music'],
        source: 'conversation'
      });

      expect(result.success).toBe(true);
      expect((result.output as Memory).content).toBe('User likes jazz music');
      expect((result.output as Memory).type).toBe('preference');
    });

    it('should execute retrieve action correctly', async () => {
      // Store a memory first
      memoryAgent.storeMemory({
        type: 'fact',
        content: 'User is from Paris',
        tags: ['location'],
        source: 'user',
        confidence: 0.9
      });

      const result = await memoryAgent.execute({
        action: 'retrieve',
        query: { text: 'Paris' }
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.output)).toBe(true);
      expect((result.output as Memory[]).length).toBe(1);
      expect((result.output as Memory[])[0].content).toBe('User is from Paris');
    });

    it('should execute update action correctly', async () => {
      // Store a memory first
      const memory = memoryAgent.storeMemory({
        type: 'fact',
        content: 'User likes coffee',
        tags: ['preference', 'drink'],
        source: 'conversation',
        confidence: 0.9
      });

      const result = await memoryAgent.execute({
        action: 'update',
        id: memory.id,
        updates: {
          content: 'User likes tea more than coffee',
          accessCount: 1
        }
      });

      expect(result.success).toBe(true);
      expect((result.output as Memory).content).toBe('User likes tea more than coffee');
      expect((result.output as Memory).accessCount).toBe(1);
    });

    it('should execute delete action correctly', async () => {
      // Store a memory first
      const memory = memoryAgent.storeMemory({
        type: 'interaction',
        content: 'User asked about the weather',
        tags: ['weather', 'question'],
        source: 'conversation',
        confidence: 0.9
      });

      const result = await memoryAgent.execute({
        action: 'delete',
        id: memory.id
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe(true);

      // Verify the memory was deleted
      const retrieveResult = await memoryAgent.execute({
        action: 'retrieve',
        query: { text: 'weather' }
      });

      expect((retrieveResult.output as Memory[]).length).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      // Try to update a non-existent memory
      const result = await memoryAgent.execute({
        action: 'update',
        id: 'non-existent-id',
        updates: { content: 'This will fail' }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.output).toContain('not found');
    });

    it('should validate input properly', async () => {
      // Invalid action
      const validationResult1 = await memoryAgent.validateInput({
        action: 'invalid-action' as any
      });
      
      expect(validationResult1.valid).toBe(false);
      expect(validationResult1.errors).toContain("Action must be one of:");

      // Missing required parameters
      const validationResult2 = await memoryAgent.validateInput({
        action: 'store'
      });
      
      expect(validationResult2.valid).toBe(false);
      expect(validationResult2.errors).toContain("Missing required parameter:");
    });
  });

  describe('CanHandle Method', () => {
    it('should detect memory-related queries with high confidence', async () => {
      const confidence1 = await memoryAgent.canHandle('remember that I like chocolate');
      expect(confidence1).toBeGreaterThanOrEqual(0.9);

      const confidence2 = await memoryAgent.canHandle('remind me about my meeting tomorrow');
      expect(confidence2).toBeGreaterThanOrEqual(0.9);

      const confidence3 = await memoryAgent.canHandle('do you remember what I said about my vacation?');
      expect(confidence3).toBeGreaterThanOrEqual(0.8);
    });

    it('should detect memory-related keywords with medium confidence', async () => {
      const confidence = await memoryAgent.canHandle('I told you about my favorite movie before');
      expect(confidence).toBeGreaterThanOrEqual(0.7);
      expect(confidence).toBeLessThan(0.9);
    });

    it('should give low confidence for unrelated queries', async () => {
      const confidence = await memoryAgent.canHandle('what is the weather like today?');
      expect(confidence).toBeLessThanOrEqual(0.3);
    });
  });
});
