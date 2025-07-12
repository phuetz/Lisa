/**
 * @file Defines the contract for a plugin's manifest.
 * This JSON-like structure describes the components a plugin provides,
 * such as agents, workflow nodes, and UI panels.
 */

/**
 * Defines a resource provided by the plugin, specifying its type and entry point.
 */
export interface PluginResource {
  /**
   * The unique identifier for the resource within the plugin.
   */
  id: string;

  /**
   * The type of the resource.
   */
  type: 'agent' | 'workflow-node' | 'panel';

  /**
   * The path to the JavaScript entry file for this resource.
   * This path is relative to the plugin's root directory.
   * e.g., './dist/MyAgent.js'
   */
  entry: string;
}

/**
 * The main manifest structure for a Lisa plugin.
 * This file (plugin.json) must be at the root of any plugin package.
 */
export interface PluginManifest {
  /**
   * A unique identifier for the plugin, typically in reverse domain name notation.
   * e.g., 'com.my-company.my-plugin'
   */
  id: string;

  /**
   * The human-readable name of the plugin.
   */
  name: string;

  /**
   * The version of the plugin, following semantic versioning.
   */
  version: string;

  /**
   * A brief description of what the plugin does.
   */
  description: string;

  /**
   * The author or organization behind the plugin.
   */
  author: string;

  /**
   * An array of resources that this plugin provides.
   */
  resources: PluginResource[];
}
