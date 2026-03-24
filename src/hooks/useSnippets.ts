/**
 * Snippets Hook
 * CRUD operations for text snippets with shortcut expansion.
 * Snippets are stored in Dexie (LisaDB).
 */

import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';
import type { Snippet } from '../types/promptcommander';

export function useSnippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const all = await db.snippets.toArray();
      setSnippets(all);
    } catch (error) {
      console.error('[Snippets] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addSnippet = useCallback(async (data: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>) => {
    const snippet: Snippet = {
      ...data,
      id: `snip-${Date.now().toString(36)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.snippets.put(snippet);
    await refresh();
    return snippet;
  }, [refresh]);

  const updateSnippet = useCallback(async (id: string, data: Partial<Snippet>) => {
    await db.snippets.update(id, { ...data, updatedAt: Date.now() });
    await refresh();
  }, [refresh]);

  const deleteSnippet = useCallback(async (id: string) => {
    await db.snippets.delete(id);
    await refresh();
  }, [refresh]);

  const getCategories = useCallback(() => {
    const cats = new Set(snippets.map(s => s.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [snippets]);

  return { snippets, loading, addSnippet, updateSnippet, deleteSnippet, getCategories, refresh };
}

/**
 * Expand shortcut in text. If text ends with a known shortcut prefix,
 * returns the expanded content. Otherwise returns null.
 */
export function useSnippetExpansion() {
  const [shortcuts, setShortcuts] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let unmounted = false;
    db.snippets.toArray().then(snippets => {
      if (unmounted) return;
      const map = new Map<string, string>();
      for (const s of snippets) {
        if (s.shortcut) map.set(s.shortcut, s.content);
      }
      setShortcuts(map);
    }).catch(() => {});
    return () => { unmounted = true; };
  }, []);

  const tryExpand = useCallback((text: string): string | null => {
    if (!text || shortcuts.size === 0) return null;
    // Check if text matches a shortcut exactly (e.g., user typed "/greet")
    const match = shortcuts.get(text.trim());
    return match || null;
  }, [shortcuts]);

  return { tryExpand, hasShortcuts: shortcuts.size > 0 };
}
