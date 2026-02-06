/**
 * Gateway Core - Essential infrastructure modules
 *
 * This module exports the core components that form the foundation of the Gateway:
 * - GatewayServer: The main gateway server orchestrating all channels
 * - BrowserEventEmitter: Event emitter for browser-based communication
 * - types: Core type definitions
 *
 * Migration Guide:
 *   // Old import (still works)
 *   import { GatewayServer } from '@/gateway';
 *
 *   // New import (recommended for core components)
 *   import { GatewayServer } from '@/gateway/core';
 */

// Re-export core types
export * from '../types';

// Re-export GatewayServer
export { GatewayServer, getGateway, resetGateway } from '../GatewayServer';

// Re-export BrowserEventEmitter
export { BrowserEventEmitter } from '../BrowserEventEmitter';
