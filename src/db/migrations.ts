/**
 * Data Migration: localStorage → Dexie
 * One-shot migration of Lisa's existing chat data from zustand/persist to Dexie.
 * Keeps localStorage backup for 30 days before cleanup.
 */

import { db, type DBConversation, type DBMessage } from './database';

const MIGRATION_FLAG = 'lisa_migration_v1_done';
const MIGRATION_BACKUP_KEY = 'lisa_migration_backup';
const CHAT_STORE_KEY = 'chat-history-storage'; // zustand persist key from chatHistoryStore
const BACKUP_EXPIRY_DAYS = 30;

interface LegacyMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string | Date;
  image?: string;
  metadata?: Record<string, unknown>;
}

interface LegacyConversation {
  id: string;
  title: string;
  messages: LegacyMessage[];
  createdAt: string | Date;
  updatedAt: string | Date;
  archived?: boolean;
  pinned?: boolean;
  tags?: string[];
}

interface LegacyStoreState {
  conversations: LegacyConversation[];
  currentConversationId: string | null;
}

/**
 * Check if migration is needed and run it
 */
export async function runMigrationIfNeeded(): Promise<boolean> {
  // Already migrated
  if (localStorage.getItem(MIGRATION_FLAG)) {
    cleanupBackupIfExpired();
    return false;
  }

  // Check for data to migrate
  const raw = localStorage.getItem(CHAT_STORE_KEY);
  if (!raw) {
    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
    return false;
  }

  try {
    const parsed = JSON.parse(raw);
    const state: LegacyStoreState = parsed?.state || parsed;

    if (!state?.conversations?.length) {
      localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
      return false;
    }

    console.log(`[Migration] Migrating ${state.conversations.length} conversations to Dexie...`);

    // Backup original data
    localStorage.setItem(MIGRATION_BACKUP_KEY, JSON.stringify({
      data: raw,
      createdAt: Date.now(),
    }));

    // Migrate in a transaction
    await db.transaction('rw', [db.conversations, db.messages], async () => {
      for (const conv of state.conversations) {
        const now = Date.now();
        const createdAt = toTimestamp(conv.createdAt);
        const updatedAt = toTimestamp(conv.updatedAt);

        const dbConv: DBConversation = {
          id: conv.id,
          title: conv.title || 'Sans titre',
          folderId: null,
          status: conv.archived ? 'archived' : 'active',
          isPinned: conv.pinned || false,
          isArchived: conv.archived || false,
          tags: conv.tags || [],
          webSearchEnabled: false,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCost: 0,
          messageCount: conv.messages?.length || 0,
          createdAt: createdAt || now,
          updatedAt: updatedAt || now,
          lastOpenedAt: updatedAt || now,
        };

        await db.conversations.put(dbConv);

        // Migrate messages
        if (conv.messages?.length) {
          const dbMessages: DBMessage[] = conv.messages.map(msg => ({
            id: msg.id,
            conversationId: conv.id,
            role: msg.role,
            content: msg.content || '',
            status: 'complete' as const,
            image: msg.image,
            metadata: msg.metadata,
            createdAt: toTimestamp(msg.timestamp) || now,
            updatedAt: toTimestamp(msg.timestamp) || now,
          }));

          await db.messages.bulkPut(dbMessages);
        }
      }
    });

    // Mark migration complete
    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
    console.log(`[Migration] Successfully migrated ${state.conversations.length} conversations`);

    return true;
  } catch (error) {
    console.error('[Migration] Failed to migrate data:', error);
    // Don't set flag — allow retry
    return false;
  }
}

function toTimestamp(value: string | Date | number | undefined): number {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

function cleanupBackupIfExpired(): void {
  try {
    const backupRaw = localStorage.getItem(MIGRATION_BACKUP_KEY);
    if (!backupRaw) return;

    const backup = JSON.parse(backupRaw);
    const age = Date.now() - (backup.createdAt || 0);
    const expiryMs = BACKUP_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    if (age > expiryMs) {
      localStorage.removeItem(MIGRATION_BACKUP_KEY);
      console.log('[Migration] Cleaned up expired backup');
    }
  } catch {
    // Ignore
  }
}
