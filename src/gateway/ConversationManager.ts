/**
 * Lisa Conversation Manager
 * Manage, organize, and search conversations
 */

import { BrowserEventEmitter } from './BrowserEventEmitter';

export interface Conversation {
  id: string;
  title: string;
  model: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata: ConversationMetadata;
  tags: string[];
  isFavorite: boolean;
  isArchived: boolean;
  folderId?: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
  metadata?: Record<string, unknown>;
}

export interface ConversationMetadata {
  totalMessages: number;
  totalTokens: number;
  duration: number; // seconds
  lastModel: string;
  agents?: string[];
  skills?: string[];
}

export interface ConversationFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
  conversationCount: number;
  createdAt: Date;
}

export interface ConversationFilter {
  search?: string;
  tags?: string[];
  folderId?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  model?: string;
}

export class ConversationManager extends BrowserEventEmitter {
  private conversations: Map<string, Conversation> = new Map();
  private folders: Map<string, ConversationFolder> = new Map();
  private currentConversationId: string | null = null;

  constructor() {
    super();
    this.loadFromStorage();
    this.loadDefaultFolders();
  }

  private generateId(): string {
    return `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private loadDefaultFolders(): void {
    if (this.folders.size === 0) {
      const defaultFolders: ConversationFolder[] = [
        { id: 'work', name: 'Travail', color: '#3b82f6', icon: '💼', conversationCount: 0, createdAt: new Date() },
        { id: 'personal', name: 'Personnel', color: '#10b981', icon: '🏠', conversationCount: 0, createdAt: new Date() },
        { id: 'learning', name: 'Apprentissage', color: '#f59e0b', icon: '📚', conversationCount: 0, createdAt: new Date() },
        { id: 'projects', name: 'Projets', color: '#8b5cf6', icon: '🚀', conversationCount: 0, createdAt: new Date() }
      ];

      for (const folder of defaultFolders) {
        this.folders.set(folder.id, folder);
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem('lisa-conversations');
      if (stored) {
        const data = JSON.parse(stored);
        
        if (data.conversations) {
          for (const conv of data.conversations) {
            this.conversations.set(conv.id, {
              ...conv,
              createdAt: new Date(conv.createdAt),
              updatedAt: new Date(conv.updatedAt),
              messages: conv.messages.map((m: ConversationMessage) => ({
                ...m,
                timestamp: new Date(m.timestamp)
              }))
            });
          }
        }

        if (data.folders) {
          for (const folder of data.folders) {
            this.folders.set(folder.id, {
              ...folder,
              createdAt: new Date(folder.createdAt)
            });
          }
        }

        if (data.currentConversationId) {
          this.currentConversationId = data.currentConversationId;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = {
        conversations: Array.from(this.conversations.values()),
        folders: Array.from(this.folders.values()),
        currentConversationId: this.currentConversationId
      };
      localStorage.setItem('lisa-conversations', JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  // Conversation CRUD
  create(options: {
    title?: string;
    model?: string;
    folderId?: string;
    tags?: string[];
  } = {}): Conversation {
    const id = this.generateId();
    const now = new Date();

    const conversation: Conversation = {
      id,
      title: options.title || `Conversation ${now.toLocaleDateString('fr-FR')}`,
      model: options.model || 'gpt-4o',
      messages: [],
      createdAt: now,
      updatedAt: now,
      metadata: {
        totalMessages: 0,
        totalTokens: 0,
        duration: 0,
        lastModel: options.model || 'gpt-4o'
      },
      tags: options.tags || [],
      isFavorite: false,
      isArchived: false,
      folderId: options.folderId
    };

    this.conversations.set(id, conversation);
    this.currentConversationId = id;
    this.updateFolderCounts();
    this.emit('conversation:created', conversation);
    this.saveToStorage();

    return conversation;
  }

  get(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  getCurrent(): Conversation | undefined {
    if (this.currentConversationId) {
      return this.conversations.get(this.currentConversationId);
    }
    return undefined;
  }

  setCurrent(id: string): boolean {
    if (this.conversations.has(id)) {
      this.currentConversationId = id;
      this.emit('conversation:switched', this.get(id));
      this.saveToStorage();
      return true;
    }
    return false;
  }

  update(id: string, updates: Partial<Pick<Conversation, 'title' | 'tags' | 'folderId' | 'isFavorite' | 'isArchived'>>): boolean {
    const conversation = this.conversations.get(id);
    if (!conversation) return false;

    Object.assign(conversation, updates, { updatedAt: new Date() });
    this.updateFolderCounts();
    this.emit('conversation:updated', conversation);
    this.saveToStorage();
    return true;
  }

  delete(id: string): boolean {
    const conversation = this.conversations.get(id);
    if (!conversation) return false;

    this.conversations.delete(id);
    
    if (this.currentConversationId === id) {
      const remaining = Array.from(this.conversations.values());
      this.currentConversationId = remaining.length > 0 ? remaining[0].id : null;
    }

    this.updateFolderCounts();
    this.emit('conversation:deleted', { id });
    this.saveToStorage();
    return true;
  }

  // Message management
  addMessage(conversationId: string, message: Omit<ConversationMessage, 'id' | 'timestamp'>): ConversationMessage | null {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    const newMessage: ConversationMessage = {
      ...message,
      id: `msg_${Date.now().toString(36)}`,
      timestamp: new Date()
    };

    conversation.messages.push(newMessage);
    conversation.updatedAt = new Date();
    conversation.metadata.totalMessages++;
    if (message.tokens) {
      conversation.metadata.totalTokens += message.tokens;
    }

    this.emit('message:added', { conversationId, message: newMessage });
    this.saveToStorage();
    return newMessage;
  }

  // Search and filter
  list(filter?: ConversationFilter): Conversation[] {
    let conversations = Array.from(this.conversations.values());

    if (filter) {
      if (filter.search) {
        const search = filter.search.toLowerCase();
        conversations = conversations.filter(c => 
          c.title.toLowerCase().includes(search) ||
          c.messages.some(m => m.content.toLowerCase().includes(search))
        );
      }
      if (filter.tags && filter.tags.length > 0) {
        conversations = conversations.filter(c => 
          filter.tags!.some(tag => c.tags.includes(tag))
        );
      }
      if (filter.folderId) {
        conversations = conversations.filter(c => c.folderId === filter.folderId);
      }
      if (filter.isFavorite !== undefined) {
        conversations = conversations.filter(c => c.isFavorite === filter.isFavorite);
      }
      if (filter.isArchived !== undefined) {
        conversations = conversations.filter(c => c.isArchived === filter.isArchived);
      }
      if (filter.dateFrom) {
        conversations = conversations.filter(c => c.createdAt >= filter.dateFrom!);
      }
      if (filter.dateTo) {
        conversations = conversations.filter(c => c.createdAt <= filter.dateTo!);
      }
      if (filter.model) {
        conversations = conversations.filter(c => c.model === filter.model);
      }
    }

    return conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Folders
  createFolder(name: string, color: string = '#3b82f6', icon: string = '📁'): ConversationFolder {
    const id = `folder_${Date.now().toString(36)}`;
    const folder: ConversationFolder = {
      id,
      name,
      color,
      icon,
      conversationCount: 0,
      createdAt: new Date()
    };

    this.folders.set(id, folder);
    this.emit('folder:created', folder);
    this.saveToStorage();
    return folder;
  }

  listFolders(): ConversationFolder[] {
    return Array.from(this.folders.values());
  }

  deleteFolder(id: string): boolean {
    if (!this.folders.has(id)) return false;

    // Move conversations out of folder
    for (const conv of this.conversations.values()) {
      if (conv.folderId === id) {
        conv.folderId = undefined;
      }
    }

    this.folders.delete(id);
    this.emit('folder:deleted', { id });
    this.saveToStorage();
    return true;
  }

  private updateFolderCounts(): void {
    for (const folder of this.folders.values()) {
      folder.conversationCount = Array.from(this.conversations.values())
        .filter(c => c.folderId === folder.id).length;
    }
  }

  // Tags
  getAllTags(): string[] {
    const tags = new Set<string>();
    for (const conv of this.conversations.values()) {
      for (const tag of conv.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }

  // Stats
  getStats(): {
    totalConversations: number;
    totalMessages: number;
    totalTokens: number;
    favorites: number;
    archived: number;
    folders: number;
  } {
    const conversations = Array.from(this.conversations.values());
    return {
      totalConversations: conversations.length,
      totalMessages: conversations.reduce((sum, c) => sum + c.metadata.totalMessages, 0),
      totalTokens: conversations.reduce((sum, c) => sum + c.metadata.totalTokens, 0),
      favorites: conversations.filter(c => c.isFavorite).length,
      archived: conversations.filter(c => c.isArchived).length,
      folders: this.folders.size
    };
  }

  // Bulk operations
  archiveAll(conversationIds: string[]): number {
    let count = 0;
    for (const id of conversationIds) {
      if (this.update(id, { isArchived: true })) count++;
    }
    return count;
  }

  deleteAll(conversationIds: string[]): number {
    let count = 0;
    for (const id of conversationIds) {
      if (this.delete(id)) count++;
    }
    return count;
  }

  // Export
  export(conversationId: string): string | null {
    const conversation = this.get(conversationId);
    if (!conversation) return null;

    return JSON.stringify(conversation, null, 2);
  }

  exportAll(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      conversations: Array.from(this.conversations.values()),
      folders: Array.from(this.folders.values())
    }, null, 2);
  }
}

// Singleton
let conversationManagerInstance: ConversationManager | null = null;

export function getConversationManager(): ConversationManager {
  if (!conversationManagerInstance) {
    conversationManagerInstance = new ConversationManager();
  }
  return conversationManagerInstance;
}

export function resetConversationManager(): void {
  if (conversationManagerInstance) {
    conversationManagerInstance.removeAllListeners();
    conversationManagerInstance = null;
  }
}

