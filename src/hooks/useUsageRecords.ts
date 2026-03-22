/**
 * Usage Records Hook (C8 Stats support)
 * Tracks and queries token usage and costs from Dexie.
 */

import { useCallback } from 'react';
import { db } from '../db/database';
import type { UsageRecord, ProviderKey } from '../types/promptcommander';

export function useUsageRecords() {
  const addRecord = useCallback(async (record: Omit<UsageRecord, 'id' | 'createdAt'>) => {
    const entry: UsageRecord = {
      ...record,
      id: `usage-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    await db.usageRecords.put(entry);
    return entry;
  }, []);

  const getStats = useCallback(async (days = 30) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const records = await db.usageRecords.where('createdAt').above(cutoff).toArray();

    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalInput = records.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutput = records.reduce((sum, r) => sum + r.outputTokens, 0);

    // By provider
    const byProvider = new Map<ProviderKey, { cost: number; requests: number; tokens: number }>();
    for (const r of records) {
      const existing = byProvider.get(r.provider) || { cost: 0, requests: 0, tokens: 0 };
      existing.cost += r.cost;
      existing.requests += 1;
      existing.tokens += r.inputTokens + r.outputTokens;
      byProvider.set(r.provider, existing);
    }

    // By model
    const byModel = new Map<string, { cost: number; requests: number; tokens: number }>();
    for (const r of records) {
      const existing = byModel.get(r.modelId) || { cost: 0, requests: 0, tokens: 0 };
      existing.cost += r.cost;
      existing.requests += 1;
      existing.tokens += r.inputTokens + r.outputTokens;
      byModel.set(r.modelId, existing);
    }

    return {
      totalCost,
      totalInput,
      totalOutput,
      totalRequests: records.length,
      byProvider: Object.fromEntries(byProvider),
      byModel: Object.fromEntries(byModel),
    };
  }, []);

  const deleteForConversation = useCallback(async (conversationId: string) => {
    await db.usageRecords.where('conversationId').equals(conversationId).delete();
  }, []);

  return { addRecord, getStats, deleteForConversation };
}
