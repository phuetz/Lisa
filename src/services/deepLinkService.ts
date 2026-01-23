/**
 * Deep Link Service - Handle App Links for Lisa Android
 * Manages deep linking for sharing conversations and quick actions
 */

import { App } from '@capacitor/app';
import type { URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// ============================================================================
// Deep Link Types
// ============================================================================

export type DeepLinkAction = 
  | 'chat'           // Open chat
  | 'conversation'   // Open specific conversation
  | 'newChat'        // Start new chat
  | 'settings'       // Open settings
  | 'voice'          // Start voice mode
  | 'camera'         // Open camera
  | 'share'          // Handle shared content
  | 'agent';         // Activate specific agent

export interface DeepLinkData {
  action: DeepLinkAction;
  params: Record<string, string>;
  raw: string;
}

export type DeepLinkHandler = (data: DeepLinkData) => void | Promise<void>;

// ============================================================================
// URL Schemes
// ============================================================================

const APP_SCHEME = 'lisa';
const APP_HOST = 'app.lisa.ai';

// Example URLs:
// lisa://chat
// lisa://conversation/abc123
// lisa://newChat?prompt=Hello
// lisa://settings
// lisa://voice
// lisa://camera
// lisa://agent/weather
// https://app.lisa.ai/share/xyz123

// ============================================================================
// Deep Link Service Class
// ============================================================================

class DeepLinkService {
  private isNative: boolean;
  private handlers: Map<DeepLinkAction, DeepLinkHandler[]> = new Map();
  private initialized: boolean = false;
  private pendingLink: DeepLinkData | null = null;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  /**
   * Initialize deep link listener
   * Call this once in your app initialization
   */
  async initialize(): Promise<void> {
    if (!this.isNative || this.initialized) return;

    try {
      // Listen for app URL open events
      App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
        this.handleDeepLink(event.url);
      });

      // Check if app was opened via deep link
      const launchUrl = await App.getLaunchUrl();
      if (launchUrl?.url) {
        this.handleDeepLink(launchUrl.url);
      }

      this.initialized = true;
      console.log('Deep link service initialized');
    } catch (error) {
      console.error('Failed to initialize deep link service:', error);
    }
  }

  /**
   * Register a handler for a specific action
   */
  on(action: DeepLinkAction, handler: DeepLinkHandler): () => void {
    const handlers = this.handlers.get(action) || [];
    handlers.push(handler);
    this.handlers.set(action, handlers);

    // If there's a pending link for this action, handle it now
    if (this.pendingLink?.action === action) {
      this.dispatchToHandlers(this.pendingLink);
      this.pendingLink = null;
    }

    // Return unsubscribe function
    return () => {
      const current = this.handlers.get(action) || [];
      this.handlers.set(action, current.filter(h => h !== handler));
    };
  }

  /**
   * Parse and handle a deep link URL
   */
  private handleDeepLink(url: string): void {
    const data = this.parseUrl(url);
    if (!data) return;

    console.log('Deep link received:', data);

    // If no handlers registered yet, store as pending
    if (!this.handlers.has(data.action) || this.handlers.get(data.action)?.length === 0) {
      this.pendingLink = data;
      return;
    }

    this.dispatchToHandlers(data);
  }

  /**
   * Dispatch to registered handlers
   */
  private dispatchToHandlers(data: DeepLinkData): void {
    const handlers = this.handlers.get(data.action) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Deep link handler error:', error);
      }
    });
  }

  /**
   * Parse URL into DeepLinkData
   */
  private parseUrl(url: string): DeepLinkData | null {
    try {
      const parsed = new URL(url);
      
      // Handle custom scheme (lisa://)
      if (parsed.protocol === `${APP_SCHEME}:`) {
        return this.parseCustomSchemeUrl(parsed);
      }
      
      // Handle universal links (https://app.lisa.ai/)
      if (parsed.host === APP_HOST) {
        return this.parseUniversalLink(parsed);
      }

      return null;
    } catch {
      console.warn('Failed to parse deep link URL:', url);
      return null;
    }
  }

  /**
   * Parse custom scheme URL (lisa://action/params)
   */
  private parseCustomSchemeUrl(url: URL): DeepLinkData | null {
    const pathParts = url.pathname.replace(/^\/+/, '').split('/');
    const action = (url.host || pathParts[0]) as DeepLinkAction;
    const params: Record<string, string> = {};

    // Get path params
    if (pathParts.length > 1) {
      params.id = pathParts.slice(1).join('/');
    }

    // Get query params
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return { action, params, raw: url.toString() };
  }

  /**
   * Parse universal link (https://app.lisa.ai/path)
   */
  private parseUniversalLink(url: URL): DeepLinkData | null {
    const pathParts = url.pathname.replace(/^\/+/, '').split('/');
    const action = pathParts[0] as DeepLinkAction;
    const params: Record<string, string> = {};

    // Get path params
    if (pathParts.length > 1) {
      params.id = pathParts.slice(1).join('/');
    }

    // Get query params
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return { action, params, raw: url.toString() };
  }

  // ============================================================================
  // URL Generation (for sharing)
  // ============================================================================

  /**
   * Generate a shareable deep link
   */
  generateLink(action: DeepLinkAction, params?: Record<string, string>): string {
    let url = `${APP_SCHEME}://${action}`;
    
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  /**
   * Generate a universal link (works on web too)
   */
  generateUniversalLink(action: DeepLinkAction, params?: Record<string, string>): string {
    let url = `https://${APP_HOST}/${action}`;
    
    if (params) {
      const id = params.id;
      if (id) {
        url += `/${id}`;
        delete params.id;
      }
      
      const queryString = new URLSearchParams(params).toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  /**
   * Generate conversation share link
   */
  generateConversationLink(conversationId: string): string {
    return this.generateUniversalLink('conversation', { id: conversationId });
  }

  /**
   * Generate new chat link with optional prompt
   */
  generateNewChatLink(prompt?: string): string {
    return this.generateLink('newChat', prompt ? { prompt } : undefined);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const deepLinkService = new DeepLinkService();

// ============================================================================
// React Hook
// ============================================================================

import { useEffect } from 'react';

export const useDeepLinks = (handlers: Partial<Record<DeepLinkAction, DeepLinkHandler>>) => {
  useEffect(() => {
    // Initialize service
    deepLinkService.initialize();

    // Register handlers
    const unsubscribes: Array<() => void> = [];
    
    Object.entries(handlers).forEach(([action, handler]) => {
      if (handler) {
        const unsub = deepLinkService.on(action as DeepLinkAction, handler);
        unsubscribes.push(unsub);
      }
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [handlers]);

  return {
    generateLink: deepLinkService.generateLink.bind(deepLinkService),
    generateUniversalLink: deepLinkService.generateUniversalLink.bind(deepLinkService),
    generateConversationLink: deepLinkService.generateConversationLink.bind(deepLinkService),
    generateNewChatLink: deepLinkService.generateNewChatLink.bind(deepLinkService),
  };
};

export default deepLinkService;
