import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeActMode, getCodeActMode } from '../CodeActMode';

describe('CodeActMode', () => {
  beforeEach(() => {
    CodeActMode.resetInstance();
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Singleton
  // --------------------------------------------------------------------------

  describe('singleton', () => {
    it('should return the same instance from getInstance()', () => {
      const a = CodeActMode.getInstance();
      const b = CodeActMode.getInstance();
      expect(a).toBe(b);
    });

    it('should return a fresh instance after resetInstance()', () => {
      const a = CodeActMode.getInstance();
      CodeActMode.resetInstance();
      const b = CodeActMode.getInstance();
      expect(a).not.toBe(b);
    });

    it('getCodeActMode() should return the singleton', () => {
      const instance = CodeActMode.getInstance();
      expect(getCodeActMode()).toBe(instance);
    });
  });

  // --------------------------------------------------------------------------
  // Enable / Disable / Toggle
  // --------------------------------------------------------------------------

  describe('enable / disable / toggle', () => {
    it('should be disabled by default', () => {
      const mode = CodeActMode.getInstance();
      expect(mode.isEnabled()).toBe(false);
    });

    it('should enable the mode', () => {
      const mode = CodeActMode.getInstance();
      mode.enable();
      expect(mode.isEnabled()).toBe(true);
    });

    it('should disable the mode', () => {
      const mode = CodeActMode.getInstance();
      mode.enable();
      mode.disable();
      expect(mode.isEnabled()).toBe(false);
    });

    it('should toggle off when enabled', () => {
      const mode = CodeActMode.getInstance();
      mode.enable();
      const result = mode.toggle();
      expect(result).toBe(false);
      expect(mode.isEnabled()).toBe(false);
    });

    it('should toggle on when disabled', () => {
      const mode = CodeActMode.getInstance();
      const result = mode.toggle();
      expect(result).toBe(true);
      expect(mode.isEnabled()).toBe(true);
    });

    it('should reset stats when enabling', () => {
      const mode = CodeActMode.getInstance();
      mode.enable();
      mode.recordExecution(100);
      mode.recordExecution(200);
      expect(mode.getState().executedScripts).toBe(2);

      // Re-enable should reset
      mode.enable();
      expect(mode.getState().executedScripts).toBe(0);
      expect(mode.getState().totalDuration).toBe(0);
    });

    it('should merge config when enabling with options', () => {
      const mode = CodeActMode.getInstance();
      mode.enable({ language: 'typescript', scriptTimeout: 60000 });
      const config = mode.getConfig();
      expect(config.language).toBe('typescript');
      expect(config.scriptTimeout).toBe(60000);
      // Defaults preserved for unspecified fields
      expect(config.allowPackageInstall).toBe(true);
      expect(config.persistScripts).toBe(true);
    });

    it('should log to console.info on enable and disable', () => {
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const mode = CodeActMode.getInstance();

      mode.enable();
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('Enabled')
      );

      mode.disable();
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('Disabled')
      );
    });
  });

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  describe('configuration', () => {
    it('should have sensible defaults', () => {
      const mode = CodeActMode.getInstance();
      const config = mode.getConfig();
      expect(config.language).toBe('python');
      expect(config.allowPackageInstall).toBe(true);
      expect(config.scriptTimeout).toBe(120000);
      expect(config.persistScripts).toBe(true);
    });

    it('should return a copy from getConfig (not a reference)', () => {
      const mode = CodeActMode.getInstance();
      const config1 = mode.getConfig();
      config1.language = 'shell';
      const config2 = mode.getConfig();
      expect(config2.language).toBe('python'); // unchanged
    });

    it('should update config via setConfig', () => {
      const mode = CodeActMode.getInstance();
      mode.setConfig({ language: 'javascript', scriptTimeout: 30000 });
      const config = mode.getConfig();
      expect(config.language).toBe('javascript');
      expect(config.scriptTimeout).toBe(30000);
      // Unspecified fields preserved
      expect(config.allowPackageInstall).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // System Prompt
  // --------------------------------------------------------------------------

  describe('getSystemPrompt', () => {
    it('should return empty string when disabled', () => {
      const mode = CodeActMode.getInstance();
      expect(mode.getSystemPrompt()).toBe('');
    });

    it('should return the CodeAct prompt when enabled', () => {
      const mode = CodeActMode.getInstance();
      mode.enable();
      const prompt = mode.getSystemPrompt();
      expect(prompt).toContain('CodeAct mode');
      expect(prompt).toContain('run_code');
      expect(prompt).toContain('self-contained');
    });

    it('should interpolate the configured language', () => {
      const mode = CodeActMode.getInstance();
      mode.enable({ language: 'typescript' });
      const prompt = mode.getSystemPrompt();
      expect(prompt).toContain('Preferred Language: typescript');
    });

    it('should default to python language in prompt', () => {
      const mode = CodeActMode.getInstance();
      mode.enable();
      const prompt = mode.getSystemPrompt();
      expect(prompt).toContain('Preferred Language: python');
    });
  });

  // --------------------------------------------------------------------------
  // Tool Filtering
  // --------------------------------------------------------------------------

  describe('filterTools', () => {
    // Helper to create mock tool definitions
    const makeTool = (name: string) => ({
      type: 'function' as const,
      function: { name, description: `Tool ${name}`, parameters: {} },
    });

    const allTools = [
      makeTool('run_code'),
      makeTool('read_file'),
      makeTool('search'),
      makeTool('list_files'),
      makeTool('write_file'),
      makeTool('bash'),
      makeTool('create_pull_request'),
      makeTool('deploy'),
      makeTool('send_email'),
    ];

    it('should return all tools when disabled', () => {
      const mode = CodeActMode.getInstance();
      const result = mode.filterTools(allTools);
      expect(result).toHaveLength(allTools.length);
    });

    it('should filter to only allowed tools when enabled', () => {
      const mode = CodeActMode.getInstance();
      mode.enable();
      const result = mode.filterTools(allTools);
      const names = result.map(t => t.function.name);
      expect(names).toEqual([
        'run_code',
        'read_file',
        'search',
        'list_files',
        'write_file',
        'bash',
      ]);
    });

    it('should exclude non-allowed tools when enabled', () => {
      const mode = CodeActMode.getInstance();
      mode.enable();
      const result = mode.filterTools(allTools);
      const names = result.map(t => t.function.name);
      expect(names).not.toContain('create_pull_request');
      expect(names).not.toContain('deploy');
      expect(names).not.toContain('send_email');
    });

    it('should handle empty tool list', () => {
      const mode = CodeActMode.getInstance();
      mode.enable();
      expect(mode.filterTools([])).toEqual([]);
    });

    it('should handle tools with no allowed matches', () => {
      const mode = CodeActMode.getInstance();
      mode.enable();
      const tools = [makeTool('deploy'), makeTool('send_email')];
      expect(mode.filterTools(tools)).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Execution Recording & Stats
  // --------------------------------------------------------------------------

  describe('recordExecution / getState', () => {
    it('should track executed script count', () => {
      const mode = CodeActMode.getInstance();
      mode.enable();
      mode.recordExecution(50);
      mode.recordExecution(150);
      mode.recordExecution(300);
      expect(mode.getState().executedScripts).toBe(3);
    });

    it('should accumulate total duration', () => {
      const mode = CodeActMode.getInstance();
      mode.enable();
      mode.recordExecution(100);
      mode.recordExecution(250);
      expect(mode.getState().totalDuration).toBe(350);
    });

    it('should return full state snapshot', () => {
      const mode = CodeActMode.getInstance();
      mode.enable({ language: 'javascript' });
      mode.recordExecution(42);

      const state = mode.getState();
      expect(state).toEqual({
        enabled: true,
        config: {
          language: 'javascript',
          allowPackageInstall: true,
          scriptTimeout: 120000,
          persistScripts: true,
        },
        executedScripts: 1,
        totalDuration: 42,
      });
    });

    it('should return a copy of config in state (not a reference)', () => {
      const mode = CodeActMode.getInstance();
      const state = mode.getState();
      state.config.language = 'shell';
      expect(mode.getConfig().language).toBe('python'); // unchanged
    });
  });

  // --------------------------------------------------------------------------
  // getAllowedTools
  // --------------------------------------------------------------------------

  describe('getAllowedTools', () => {
    it('should return the list of allowed tool names', () => {
      const mode = CodeActMode.getInstance();
      const tools = mode.getAllowedTools();
      expect(tools).toContain('run_code');
      expect(tools).toContain('read_file');
      expect(tools).toContain('search');
      expect(tools).toContain('list_files');
      expect(tools).toContain('write_file');
      expect(tools).toContain('bash');
      expect(tools).toHaveLength(6);
    });

    it('should return a new array each time (not a reference)', () => {
      const mode = CodeActMode.getInstance();
      const a = mode.getAllowedTools();
      const b = mode.getAllowedTools();
      expect(a).toEqual(b);
      expect(a).not.toBe(b);
    });
  });
});
