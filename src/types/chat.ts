/**
 * Chat Types
 * Types pour le système de chat
 * Extended with PromptCommander features (cost tracking, multipart, comparison, folders)
 */

import type { MessagePart, MessageStatus, ProviderKey } from './promptcommander';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  image?: string; // Base64 ou URL de l'image
  metadata?: Record<string, unknown>;
  // ─── Extended fields (PromptCommander integration) ────────
  parts?: MessagePart[];      // Rich multipart content
  provider?: ProviderKey;     // Which provider generated this
  modelId?: string;           // Which model generated this
  status?: MessageStatus;     // Message lifecycle status
  inputTokens?: number;       // Token usage tracking
  outputTokens?: number;
  cost?: number;              // Cost in USD
  durationMs?: number;        // Generation time
  errorMessage?: string;      // Error details if status='error'
  compareGroupId?: string;    // Groups messages in comparison mode
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
  // ─── Extended fields (PromptCommander integration) ────────
  folderId?: string | null;       // Folder organization
  roleId?: string;                // Active role/persona
  defaultModelId?: string;        // Model override per conversation
  webSearchEnabled?: boolean;     // Web search toggle per conversation
  knowledgeBaseId?: string;       // Linked knowledge base
  totalInputTokens?: number;      // Aggregated cost tracking
  totalOutputTokens?: number;
  totalCost?: number;
  parentConversationId?: string;  // Fork tracking
  forkedFromMessageId?: string;
}

export interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isTyping: boolean;
  error: string | null;
}
