/**
 * Conversation Actions Hook (C13)
 * Fork, edit-and-resend, regenerate operations on conversations.
 * Works with both in-memory (chatHistoryStore) and Dexie storage.
 */

import { useCallback } from 'react';
import { useChatHistoryStore } from '../store/chatHistoryStore';
import { db } from '../db/database';
import type { DBConversation, DBMessage } from '../db/database';

export function useConversationActions() {
  const store = useChatHistoryStore();

  /**
   * Fork a conversation from a specific message.
   * Creates a new conversation with all messages up to and including messageId.
   */
  const forkConversation = useCallback(async (conversationId: string, messageId: string) => {
    const conversation = store.conversations.find(c => c.id === conversationId);
    if (!conversation) return null;

    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return null;

    const forkedMessages = conversation.messages.slice(0, messageIndex + 1);
    const newId = crypto.randomUUID();
    const now = new Date();

    // Create in-memory via store
    const newConversation = {
      id: newId,
      title: `${conversation.title} (fork)`,
      messages: forkedMessages.map(m => ({ ...m, conversationId: newId })),
      createdAt: now,
      updatedAt: now,
      tags: conversation.tags ? [...conversation.tags] : [],
      parentConversationId: conversationId,
      forkedFromMessageId: messageId,
    };

    // Also persist to Dexie
    try {
      const dbConv: DBConversation = {
        id: newId,
        title: newConversation.title,
        status: 'active',
        isPinned: false,
        isArchived: false,
        tags: newConversation.tags || [],
        webSearchEnabled: false,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        messageCount: forkedMessages.length,
        parentConversationId: conversationId,
        forkedFromMessageId: messageId,
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
        lastOpenedAt: now.getTime(),
      };

      const dbMessages: DBMessage[] = forkedMessages.map(m => ({
        id: `${newId}-${m.id}`,
        conversationId: newId,
        role: m.role,
        content: m.content,
        status: 'complete' as const,
        image: m.image,
        metadata: m.metadata,
        provider: m.provider,
        modelId: m.modelId,
        inputTokens: m.inputTokens,
        outputTokens: m.outputTokens,
        cost: m.cost,
        createdAt: m.timestamp instanceof Date ? m.timestamp.getTime() : Date.now(),
        updatedAt: Date.now(),
      }));

      await db.transaction('rw', [db.conversations, db.messages], async () => {
        await db.conversations.put(dbConv);
        await db.messages.bulkPut(dbMessages);
      });
    } catch (error) {
      console.error('[ConversationActions] Dexie fork failed:', error);
    }

    return newConversation;
  }, [store.conversations]);

  /**
   * Edit a user message and regenerate the assistant response.
   * Removes all messages after the edited one.
   */
  const editAndResend = useCallback(async (
    conversationId: string,
    messageId: string,
    newContent: string,
    onRegenerate: (content: string) => Promise<void>,
  ) => {
    const conversation = store.conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Update the message content
    const updatedMessages = conversation.messages.slice(0, messageIndex + 1);
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      content: newContent,
      timestamp: new Date(),
    };

    // Update in store (truncate messages after edit point)
    store.updateConversation(conversationId, {
      messages: updatedMessages,
      updatedAt: new Date(),
    });

    // Also update in Dexie
    try {
      await db.messages.update(messageId, { content: newContent, updatedAt: Date.now() });
      // Delete messages after this one
      const toDelete = conversation.messages.slice(messageIndex + 1).map(m => m.id);
      if (toDelete.length > 0) {
        await db.messages.bulkDelete(toDelete);
      }
    } catch (error) {
      console.error('[ConversationActions] Dexie edit failed:', error);
    }

    // Trigger regeneration
    await onRegenerate(newContent);
  }, [store]);

  /**
   * Regenerate the last assistant response.
   */
  const regenerateLastResponse = useCallback(async (
    conversationId: string,
    onRegenerate: (lastUserMessage: string) => Promise<void>,
  ) => {
    const conversation = store.conversations.find(c => c.id === conversationId);
    if (!conversation || conversation.messages.length < 2) return;

    // Find last assistant message and remove it
    const messages = [...conversation.messages];
    let lastAssistantIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        lastAssistantIndex = i;
        break;
      }
    }

    if (lastAssistantIndex === -1) return;

    const removedMessage = messages[lastAssistantIndex];
    const truncated = messages.slice(0, lastAssistantIndex);

    // Find last user message
    let lastUserContent = '';
    for (let i = truncated.length - 1; i >= 0; i--) {
      if (truncated[i].role === 'user') {
        lastUserContent = truncated[i].content;
        break;
      }
    }

    if (!lastUserContent) return;

    // Update store
    store.updateConversation(conversationId, {
      messages: truncated,
      updatedAt: new Date(),
    });

    // Remove from Dexie
    try {
      await db.messages.delete(removedMessage.id);
      // Also delete usage record for this message
      await db.usageRecords.where('messageId').equals(removedMessage.id).delete();
    } catch (error) {
      console.error('[ConversationActions] Dexie regenerate failed:', error);
    }

    // Trigger regeneration
    await onRegenerate(lastUserContent);
  }, [store]);

  return {
    forkConversation,
    editAndResend,
    regenerateLastResponse,
  };
}
