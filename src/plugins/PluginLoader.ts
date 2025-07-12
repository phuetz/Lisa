/**
 * @file Manages the dynamic loading, registration, and lifecycle of plugins.
 * Plugins are loaded into isolated Web Workers for security and performance.
 */

import { PluginManifest, PluginResource } from './PluginManifest';

// A simplified representation of registries where plugins can add their components.
// In a real app, these would be more robust singleton or context-provided services.
interface IAgentRegistry {
  register: (id: string, constructor: any) => void;
  unregister: (id: string) => void;
}

interface INodeRegistry {
  register: (id: string, component: any) => void;
  unregister: (id: string) => void;
}

/**
 * Represents a fully loaded and running plugin instance.
 */
export interface LoadedPlugin {
  manifest: PluginManifest;
  worker: Worker;
  // In a real implementation, this would be a Comlink-wrapped API
  api: any; 
  cleanup: () => void;
}

export class PluginLoader {
  private loadedPlugins = new Map<string, LoadedPlugin>();

  constructor(
    // Dependencies are injected for testability
    private agentRegistry: IAgentRegistry,
    private nodeRegistry: INodeRegistry
  ) {}

  /**
   * Loads a plugin from a URL pointing to its manifest file.
   * @param manifestUrl - The URL to the plugin's manifest.json.
   */
  async loadPluginFromUrl(manifestUrl: string): Promise<void> {
    try {
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
      }
      const manifest: PluginManifest = await response.json();

      if (this.loadedPlugins.has(manifest.id)) {
        console.warn(`Plugin '${manifest.name}' is already loaded.`);
        return;
      }

      // The base URL for resolving relative resource paths
      const baseUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf('/') + 1);

      // For now, we'll just register the resources directly.
      // A full implementation would create a Web Worker and load the script.
      console.log(`Loading plugin: ${manifest.name} v${manifest.version}`);
      this.registerPluginResources(manifest, baseUrl);

      // In a full sandbox implementation:
      // const worker = new Worker(new URL(entryPoint, baseUrl));
      // const api = Comlink.wrap(worker);
      // await api.initialize(); // Let the plugin set itself up

      // Store the loaded plugin
      this.loadedPlugins.set(manifest.id, {
        manifest,
        worker: null, // Placeholder
        api: null, // Placeholder
        cleanup: () => this.unregisterPlugin(manifest.id),
      });

      console.log(`Successfully loaded plugin: ${manifest.name}`);
    } catch (error) {
      console.error('Failed to load plugin:', error);
      throw error;
    }
  }

  /**
   * Registers the resources from a plugin's manifest into the application.
   * @param manifest - The plugin's manifest.
   * @param baseUrl - The base URL for resolving resource paths.
   */
  private registerPluginResources(manifest: PluginManifest, baseUrl: string): void {
    for (const resource of manifest.resources) {
      const resourceUrl = new URL(resource.entry, baseUrl).href;
      console.log(`  - Registering resource '${resource.id}' from ${resourceUrl}`);

      // This is a simplified registration. A real implementation would dynamically
      // import the module from the URL and pass the exported class/component.
      const placeholderComponent = { id: resource.id, url: resourceUrl };

      switch (resource.type) {
        case 'agent':
          this.agentRegistry.register(resource.id, placeholderComponent);
          break;
        case 'workflow-node':
          this.nodeRegistry.register(resource.id, placeholderComponent);
          break;
        case 'panel':
          // Handle panel registration
          console.log(`Panel resource '${resource.id}' registration is not yet implemented.`);
          break;
        default:
          console.warn(`Unknown resource type: ${(resource as any).type}`);
      }
    }
  }

  /**
   * Unloads a plugin and removes its components from the application.
   * @param pluginId - The ID of the plugin to unregister.
   */
  unregisterPlugin(pluginId: string): void {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin with ID '${pluginId}' not found.`);
      return;
    }

    console.log(`Unloading plugin: ${plugin.manifest.name}`);

    // Unregister all resources provided by this plugin
    for (const resource of plugin.manifest.resources) {
      switch (resource.type) {
        case 'agent':
          this.agentRegistry.unregister(resource.id);
          break;
        case 'workflow-node':
          this.nodeRegistry.unregister(resource.id);
          break;
        // Add other resource types as needed
      }
    }

    // Terminate the worker if it exists
    plugin.worker?.terminate();

    this.loadedPlugins.delete(pluginId);
    console.log(`Successfully unloaded plugin: ${plugin.manifest.name}`);
  }
}
