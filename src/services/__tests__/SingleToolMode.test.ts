import { describe, it, expect, beforeEach } from 'vitest';
import { SingleToolMode, type SingleToolModeConfig, type SingleToolModeState } from '../SingleToolMode';

// ============================================================================
// Test Helpers
// ============================================================================

/** Create mock tools in OpenAI format (function.name) */
function makeOpenAITools(...names: string[]) {
  return names.map(name => ({
    type: 'function' as const,
    function: {
      name,
      description: `Description for ${name}`,
      parameters: { type: 'object', properties: {} },
    },
  }));
}

/** Create mock tools in flat format (name directly on object) */
function makeFlatTools(...names: string[]) {
  return names.map(name => ({
    name,
    description: `Description for ${name}`,
    parameters: { type: 'object' as const, properties: {} },
  }));
}

// ============================================================================
// Tests
// ============================================================================

describe('SingleToolMode', () => {
  let stm: SingleToolMode;

  beforeEach(() => {
    SingleToolMode.resetInstance();
    stm = SingleToolMode.getInstance();
  });

  // --------------------------------------------------------------------------
  // Singleton
  // --------------------------------------------------------------------------

  describe('singleton', () => {
    it('should return the same instance', () => {
      const a = SingleToolMode.getInstance();
      const b = SingleToolMode.getInstance();
      expect(a).toBe(b);
    });

    it('should return a fresh instance after reset', () => {
      const a = SingleToolMode.getInstance();
      a.enable('web_search');

      SingleToolMode.resetInstance();
      const b = SingleToolMode.getInstance();

      expect(b.isEnabled()).toBe(false);
      expect(b.getCurrentTool()).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Enable / Disable / Toggle
  // --------------------------------------------------------------------------

  describe('enable / disable / toggle', () => {
    it('should start disabled', () => {
      expect(stm.isEnabled()).toBe(false);
      expect(stm.getCurrentTool()).toBeNull();
    });

    it('should enable without a forced tool', () => {
      stm.enable();
      expect(stm.isEnabled()).toBe(true);
      expect(stm.config.forcedTool).toBeUndefined();
      expect(stm.getCurrentTool()).toBeNull();
    });

    it('should enable with a forced tool', () => {
      stm.enable('calculator');
      expect(stm.isEnabled()).toBe(true);
      expect(stm.config.forcedTool).toBe('calculator');
      expect(stm.getCurrentTool()).toBe('calculator');
    });

    it('should disable and clear state', () => {
      stm.enable('web_search');
      stm.disable();

      expect(stm.isEnabled()).toBe(false);
      expect(stm.config.forcedTool).toBeUndefined();
      expect(stm.getCurrentTool()).toBeNull();
    });

    it('should toggle on and off', () => {
      expect(stm.isEnabled()).toBe(false);

      stm.toggle();
      expect(stm.isEnabled()).toBe(true);

      stm.toggle();
      expect(stm.isEnabled()).toBe(false);
    });

    it('should clear state when toggling off', () => {
      stm.enable('calculator');
      stm.toggle(); // off
      expect(stm.getCurrentTool()).toBeNull();
      expect(stm.config.forcedTool).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // selectToolForQuery
  // --------------------------------------------------------------------------

  describe('selectToolForQuery', () => {
    const availableTools = [
      { name: 'web_search', description: 'Search the web' },
      { name: 'calculator', description: 'Do math' },
      { name: 'get_current_time', description: 'Get current time' },
      { name: 'read_file', description: 'Read a file' },
      { name: 'weather', description: 'Get weather forecast' },
      { name: 'translate', description: 'Translate text between languages' },
      { name: 'code_interpreter', description: 'Run code snippets' },
      { name: 'fetch_url', description: 'Fetch content from a URL' },
      { name: 'todo_manage', description: 'Manage todo items' },
      { name: 'summarize', description: 'Summarize text' },
    ];

    it('should match "search" to web_search', () => {
      const result = stm.selectToolForQuery('search for cats on the internet', availableTools);
      expect(result).toBe('web_search');
      expect(stm.getCurrentTool()).toBe('web_search');
    });

    it('should match "calculate" to calculator', () => {
      const result = stm.selectToolForQuery('calculate 2 + 2', availableTools);
      expect(result).toBe('calculator');
    });

    it('should match "time" to get_current_time', () => {
      const result = stm.selectToolForQuery('what time is it?', availableTools);
      expect(result).toBe('get_current_time');
    });

    it('should match "weather" to weather', () => {
      const result = stm.selectToolForQuery('what is the weather in Paris?', availableTools);
      expect(result).toBe('weather');
    });

    it('should match "file" to read_file', () => {
      const result = stm.selectToolForQuery('read the file config.json', availableTools);
      expect(result).toBe('read_file');
    });

    it('should match "translate" to translate', () => {
      const result = stm.selectToolForQuery('translate this to French', availableTools);
      expect(result).toBe('translate');
    });

    it('should match "url" to fetch_url', () => {
      const result = stm.selectToolForQuery('fetch the url https://example.com', availableTools);
      expect(result).toBe('fetch_url');
    });

    it('should match "run" to code_interpreter', () => {
      const result = stm.selectToolForQuery('run this python script', availableTools);
      expect(result).toBe('code_interpreter');
    });

    it('should match "todo" to todo_manage', () => {
      const result = stm.selectToolForQuery('add a todo item', availableTools);
      expect(result).toBe('todo_manage');
    });

    it('should match "summarize" to summarize', () => {
      const result = stm.selectToolForQuery('summarize this article', availableTools);
      expect(result).toBe('summarize');
    });

    it('should return null when no keyword matches', () => {
      const result = stm.selectToolForQuery('hello how are you', availableTools);
      expect(result).toBeNull();
    });

    it('should not match tools that are not available', () => {
      const limited = [{ name: 'calculator', description: 'Do math' }];
      const result = stm.selectToolForQuery('search for cats', limited);
      // web_search is not in the available list
      expect(result).not.toBe('web_search');
    });

    it('should prefer forced tool when set', () => {
      stm.enable('calculator');
      const result = stm.selectToolForQuery('search for cats', availableTools);
      expect(result).toBe('calculator');
    });

    it('should return current tool when autoSelect is false', () => {
      stm.setCurrentTool('calculator');
      stm.config.autoSelect = false;
      const result = stm.selectToolForQuery('search for cats', availableTools);
      expect(result).toBe('calculator');
    });

    it('should fall back to description matching', () => {
      const customTools = [
        { name: 'my_custom_tool', description: 'Analyze sentiment of text' },
      ];
      const result = stm.selectToolForQuery('analyze this text please', customTools);
      expect(result).toBe('my_custom_tool');
    });
  });

  // --------------------------------------------------------------------------
  // filterTools (OpenAI format)
  // --------------------------------------------------------------------------

  describe('filterTools (OpenAI format)', () => {
    const tools = makeOpenAITools('web_search', 'calculator', 'get_current_time');

    it('should return all tools when disabled', () => {
      const result = stm.filterTools(tools);
      expect(result).toHaveLength(3);
    });

    it('should return all tools when enabled but no tool selected', () => {
      stm.enable();
      const result = stm.filterTools(tools);
      expect(result).toHaveLength(3);
    });

    it('should filter to forced tool', () => {
      stm.enable('calculator');
      const result = stm.filterTools(tools);
      expect(result).toHaveLength(1);
      expect(result[0].function.name).toBe('calculator');
    });

    it('should filter to current tool', () => {
      stm.enable();
      stm.setCurrentTool('web_search');
      const result = stm.filterTools(tools);
      expect(result).toHaveLength(1);
      expect(result[0].function.name).toBe('web_search');
    });

    it('should return all tools if selected tool is not in the list', () => {
      stm.enable('nonexistent_tool');
      const result = stm.filterTools(tools);
      expect(result).toHaveLength(3);
    });

    it('should prioritize forced tool over current tool', () => {
      stm.enable('calculator');
      stm.setCurrentTool('web_search');
      const result = stm.filterTools(tools);
      expect(result).toHaveLength(1);
      expect(result[0].function.name).toBe('calculator');
    });
  });

  // --------------------------------------------------------------------------
  // filterToolsFlat (Gemini / ToolDefinition format)
  // --------------------------------------------------------------------------

  describe('filterToolsFlat', () => {
    const tools = makeFlatTools('web_search', 'calculator', 'get_current_time');

    it('should return all tools when disabled', () => {
      const result = stm.filterToolsFlat(tools);
      expect(result).toHaveLength(3);
    });

    it('should filter to forced tool', () => {
      stm.enable('calculator');
      const result = stm.filterToolsFlat(tools);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('calculator');
    });

    it('should return all tools if selected tool is not in the list', () => {
      stm.enable('nonexistent');
      const result = stm.filterToolsFlat(tools);
      expect(result).toHaveLength(3);
    });
  });

  // --------------------------------------------------------------------------
  // setCurrentTool / getCurrentTool
  // --------------------------------------------------------------------------

  describe('manual tool selection', () => {
    it('should set and get current tool', () => {
      stm.setCurrentTool('web_search');
      expect(stm.getCurrentTool()).toBe('web_search');
    });

    it('should clear current tool with null', () => {
      stm.setCurrentTool('web_search');
      stm.setCurrentTool(null);
      expect(stm.getCurrentTool()).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // getState
  // --------------------------------------------------------------------------

  describe('getState', () => {
    it('should return initial state', () => {
      const state = stm.getState();
      expect(state).toEqual<SingleToolModeState>({
        enabled: false,
        currentTool: null,
        config: {
          enabled: false,
          autoSelect: true,
        },
      });
    });

    it('should reflect enabled state with forced tool', () => {
      stm.enable('calculator');
      const state = stm.getState();
      expect(state).toEqual<SingleToolModeState>({
        enabled: true,
        currentTool: 'calculator',
        config: {
          enabled: true,
          forcedTool: 'calculator',
          autoSelect: true,
        },
      });
    });

    it('should return a copy (not a reference)', () => {
      const state = stm.getState();
      state.config.enabled = true;
      expect(stm.isEnabled()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle empty tool lists in filterTools', () => {
      stm.enable('web_search');
      const result = stm.filterTools([]);
      expect(result).toEqual([]);
    });

    it('should handle empty tool lists in filterToolsFlat', () => {
      stm.enable('web_search');
      const result = stm.filterToolsFlat([]);
      expect(result).toEqual([]);
    });

    it('should handle empty query in selectToolForQuery', () => {
      const tools = [{ name: 'web_search', description: 'Search the web' }];
      const result = stm.selectToolForQuery('', tools);
      expect(result).toBeNull();
    });

    it('should handle empty available tools in selectToolForQuery', () => {
      const result = stm.selectToolForQuery('search for cats', []);
      expect(result).toBeNull();
    });

    it('should be case-insensitive in keyword matching', () => {
      const tools = [{ name: 'web_search', description: 'Search the web' }];
      const result = stm.selectToolForQuery('SEARCH FOR CATS', tools);
      expect(result).toBe('web_search');
    });

    it('should allow re-enabling with a different tool', () => {
      stm.enable('calculator');
      expect(stm.getCurrentTool()).toBe('calculator');

      stm.enable('web_search');
      expect(stm.getCurrentTool()).toBe('web_search');
      expect(stm.config.forcedTool).toBe('web_search');
    });
  });
});
