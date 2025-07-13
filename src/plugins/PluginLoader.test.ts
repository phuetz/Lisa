/// <reference types="vitest" />

/**
 * @file Unit tests for the PluginLoader.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PluginLoader } from './PluginLoader';
import type { PluginManifest } from './PluginManifest';

// Mock registries
const mockAgentRegistry = {
  register: vi.fn(),
  unregister: vi.fn(),
};

const mockNodeRegistry = {
  register: vi.fn(),
  unregister: vi.fn(),
};

describe('PluginLoader', () => {
  let pluginLoader: PluginLoader;

  const mockManifest: PluginManifest = {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Test Author',
    resources: [
      { id: 'TestAgent', type: 'agent', entry: './TestAgent.js' },
      { id: 'TestNode', type: 'workflow-node', entry: './TestNode.js' },
    ],
  };

  beforeEach(() => {
    // Mock the global fetch function
    vi.stubGlobal('fetch', vi.fn());
    // Instantiate PluginLoader with mock dependencies
    pluginLoader = new PluginLoader(mockAgentRegistry, mockNodeRegistry);
  });

  afterEach(() => {
    // Clear all mocks after each test
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should load a plugin from a manifest URL and register its resources', async () => {
    (fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });

    await pluginLoader.loadPluginFromUrl('http://localhost/plugins/test-plugin/manifest.json');

    expect(fetch).toHaveBeenCalledWith('http://localhost/plugins/test-plugin/manifest.json');
    
    // Check if resources were registered with the correct IDs and placeholder objects
    expect(mockAgentRegistry.register).toHaveBeenCalledWith('TestAgent', {
      id: 'TestAgent',
      url: 'http://localhost/plugins/test-plugin/TestAgent.js',
    });
    expect(mockNodeRegistry.register).toHaveBeenCalledWith('TestNode', {
      id: 'TestNode',
      url: 'http://localhost/plugins/test-plugin/TestNode.js',
    });
  });

  it('should handle fetch errors gracefully', async () => {
    (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error'));

    await expect(pluginLoader.loadPluginFromUrl('http://invalid-url/manifest.json')).rejects.toThrow('Network Error');
  });
  
  it('should warn if a plugin is already loaded', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // First load
    (fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });
    await pluginLoader.loadPluginFromUrl('http://localhost/plugins/test-plugin/manifest.json');

    // Attempt to load again
    await pluginLoader.loadPluginFromUrl('http://localhost/plugins/test-plugin/manifest.json');

    expect(consoleWarnSpy).toHaveBeenCalledWith("Plugin 'Test Plugin' is already loaded.");
    // Fetch should only be called once because the second call is blocked
    expect(fetch).toHaveBeenCalledTimes(1);

    consoleWarnSpy.mockRestore();
  });
});
