/**
 * Lisa Database (Dexie/IndexedDB)
 * Persistent storage for conversations, messages, usage records, roles,
 * snippets, folders, knowledge bases, and audit log.
 *
 * Inspired by PromptCommander's schema, adapted for Lisa's architecture.
 */

import Dexie, { type Table } from 'dexie';
import type {
  UsageRecord,
  RoleProfile,
  Snippet,
  ProviderCredential,
  ModelCatalogEntry,
  Folder,
  AuditLogEntry,
  KnowledgeBase,
  KnowledgeChunk,
  MessagePart,
  MessageStatus,
  ProviderKey,
} from '../types/promptcommander';

// ─── DB-specific types (extend Lisa's existing chat types) ────────

/** Conversation as stored in Dexie (timestamps as numbers for indexing) */
export interface DBConversation {
  id: string;
  title: string;
  folderId?: string | null;
  roleId?: string;
  status: 'active' | 'archived';
  isPinned: boolean;
  isArchived: boolean;
  tags: string[];
  defaultModelId?: string;
  webSearchEnabled: boolean;
  knowledgeBaseId?: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  messageCount: number;
  parentConversationId?: string;
  forkedFromMessageId?: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
}

/** Message as stored in Dexie */
export interface DBMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string; // Plain text content (backward compatible)
  parts?: MessagePart[]; // Rich multipart content (optional)
  provider?: ProviderKey;
  modelId?: string;
  status: MessageStatus;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  durationMs?: number;
  errorMessage?: string;
  compareGroupId?: string;
  image?: string; // Legacy: base64 image (from Lisa's original Message type)
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

// ─── Database Class ───────────────────────────────────────────────

export class LisaDB extends Dexie {
  conversations!: Table<DBConversation>;
  messages!: Table<DBMessage>;
  usageRecords!: Table<UsageRecord>;
  roles!: Table<RoleProfile>;
  snippets!: Table<Snippet>;
  credentials!: Table<ProviderCredential>;
  models!: Table<ModelCatalogEntry>;
  folders!: Table<Folder>;
  auditLog!: Table<AuditLogEntry>;
  knowledgeBases!: Table<KnowledgeBase, string>;
  knowledgeChunks!: Table<KnowledgeChunk, string>;

  constructor() {
    super('LisaDB');

    // Single version with full schema — no migration needed (fresh DB for Lisa)
    this.version(1).stores({
      conversations: 'id, status, isPinned, isArchived, folderId, updatedAt, lastOpenedAt, *tags',
      messages: 'id, conversationId, createdAt, [conversationId+createdAt]',
      usageRecords: 'id, messageId, conversationId, provider, modelId, createdAt',
      roles: 'id',
      snippets: 'id, category, shortcut',
      credentials: 'id, provider',
      models: 'id, provider, sortOrder',
      folders: 'id, parentId',
      auditLog: 'id, type, createdAt',
      knowledgeBases: 'id, name, createdAt',
      knowledgeChunks: 'id, knowledgeBaseId, documentName, createdAt',
    });
  }
}

export const db = new LisaDB();

// ─── Default Data ─────────────────────────────────────────────────

const DEFAULT_ROLES: RoleProfile[] = [
  {
    id: 'role-assistant',
    name: 'Assistant',
    icon: '🤖',
    description: 'Assistant IA généraliste',
    systemPrompt: 'Tu es Lisa, une assistante IA intelligente et serviable. Tu réponds en français de manière claire et concise.',
    temperature: 0.7,
    tags: ['défaut'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'role-developer',
    name: 'Développeur',
    icon: '👨‍💻',
    description: 'Expert en programmation et développement logiciel',
    systemPrompt: 'Tu es un développeur senior expert. Tu écris du code propre, bien documenté et performant. Tu expliques tes choix techniques. Tu réponds en français.',
    temperature: 0.3,
    tags: ['technique'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'role-writer',
    name: 'Rédacteur',
    icon: '✍️',
    description: 'Rédacteur professionnel et créatif',
    systemPrompt: 'Tu es un rédacteur professionnel. Tu produis des textes clairs, engageants et bien structurés. Tu maîtrises différents styles d\'écriture. Tu réponds en français.',
    temperature: 0.8,
    tags: ['créatif'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

// ─── Initialization ───────────────────────────────────────────────

let _initialized = false;

export async function initializeDatabase(): Promise<void> {
  if (_initialized) return;
  _initialized = true;

  try {
    // Seed default roles if empty
    const roleCount = await db.roles.count();
    if (roleCount === 0) {
      await db.roles.bulkPut(DEFAULT_ROLES);
    }

    console.log('[LisaDB] Database initialized');
  } catch (error) {
    console.error('[LisaDB] Failed to initialize database:', error);
    _initialized = false;
  }
}
