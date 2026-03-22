/**
 * Types étendus pour l'intégration PromptCommander
 * Ces types complètent les types existants de Lisa avec les fonctionnalités de PromptCommander
 */

// ─── Provider Types ───────────────────────────────────────────────
export type ProviderKey =
  | 'openai' | 'anthropic' | 'gemini' | 'perplexity' | 'mistral'
  | 'xai' | 'lmstudio' | 'ollama' | 'openai-compatible' | 'codebuddy';

export type Capability =
  | 'chat' | 'vision' | 'image-generation' | 'web-search'
  | 'tools' | 'json-mode' | 'streaming' | 'reasoning';

export type ContextStrategy = 'full' | 'sliding' | 'summary';

// ─── Message Types ────────────────────────────────────────────────
export type MessagePartType = 'text' | 'image' | 'file' | 'tool_use' | 'tool_result' | 'tool_call';
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error' | 'cancelled';

export interface MessagePart {
  type: MessagePartType;
  text?: string;
  mimeType?: string;
  data?: string; // base64 for images/files
  fileName?: string;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
}

// ─── Usage & Cost Tracking ────────────────────────────────────────
export interface UsageRecord {
  id: string;
  messageId: string;
  conversationId: string;
  provider: ProviderKey;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  createdAt: number;
}

// ─── Model Catalog ────────────────────────────────────────────────
export interface ModelCatalogEntry {
  id: string;
  provider: ProviderKey;
  label: string;
  apiModel: string;
  capabilities: Capability[];
  priceInputPer1M: number;
  priceOutputPer1M: number;
  contextWindow: number;
  maxOutputTokens: number;
  isFavorite: boolean;
  isEnabled: boolean;
  sortOrder: number;
}

// ─── Provider Credentials ─────────────────────────────────────────
export interface ProviderCredential {
  id: string;
  provider: ProviderKey;
  label: string;
  apiKey: string;
  baseUrl?: string;
  isEnabled: boolean;
  lastValidationStatus: 'unknown' | 'valid' | 'invalid' | 'error';
  lastValidationAt?: number;
  lastError?: string;
}

// ─── Roles / Personas ─────────────────────────────────────────────
export interface RoleProfile {
  id: string;
  name: string;
  icon: string;
  description: string;
  systemPrompt: string;
  temperature?: number;
  defaultModelId?: string;
  enabledTools?: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

// ─── Snippets ─────────────────────────────────────────────────────
export interface Snippet {
  id: string;
  title: string;
  content: string;
  shortcut: string;
  tags: string[];
  category: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Folders ──────────────────────────────────────────────────────
export interface Folder {
  id: string;
  name: string;
  color: string;
  icon: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

// ─── Knowledge Base ───────────────────────────────────────────────
export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeChunk {
  id: string;
  knowledgeBaseId: string;
  documentName: string;
  content: string;
  index: number;
  createdAt: number;
}

// ─── Audit Log ────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  context?: string;
  createdAt: number;
}

// ─── Workspace Settings ───────────────────────────────────────────
export interface WorkspaceSettings {
  theme: 'dark' | 'light' | 'system';
  locale: string;
  currency: string;
  defaultProviderId: ProviderKey;
  defaultModelId: string;
  defaultRoleId: string;
  temperature: number;
  maxTokens: number;
  streamResponses: boolean;
  contextStrategy: ContextStrategy;
  contextMaxMessages: number;
  fontSize: 'sm' | 'base' | 'lg';
  densityMode: 'comfortable' | 'compact';
  confirmBeforeDelete: boolean;
  enableTTS: boolean;
  enableSTT: boolean;
  ttsVoice: string;
  notificationSound: boolean;
  onboardingCompleted: boolean;
  autoArchiveDays: number;
}

// ─── Normalized Provider Interface ────────────────────────────────
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface NormalizedRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string | Array<{
      type: string;
      text?: string;
      image_url?: { url: string };
      source?: unknown;
    }>;
  }>;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
  webSearchEnabled?: boolean;
  tools?: ToolDefinition[];
}

export interface NormalizedResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  finishReason: string;
  toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }>;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (response: NormalizedResponse) => void;
  onToolCall?: (call: { id: string; name: string; args: Record<string, unknown> }) => void;
}
