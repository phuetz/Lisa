/**
 * Chat Types
 * Types pour le système de chat
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  image?: string; // Base64 ou URL de l'image
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  archived?: boolean;
  pinned?: boolean;
  tags?: string[];
}

export interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isTyping: boolean;
  error: string | null;
}
