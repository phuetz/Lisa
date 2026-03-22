/**
 * Folders Hook (B3)
 * CRUD operations for conversation folders stored in Dexie.
 */

import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';
import type { Folder } from '../types/promptcommander';

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);

  const refresh = useCallback(async () => {
    try {
      const all = await db.folders.toArray();
      setFolders(all);
    } catch (error) {
      console.error('[Folders] Failed to load:', error);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createFolder = useCallback(async (name: string, color = '#6366f1', icon = '📁', parentId: string | null = null) => {
    const folder: Folder = {
      id: `folder-${Date.now().toString(36)}`,
      name,
      color,
      icon,
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.folders.put(folder);
    await refresh();
    return folder;
  }, [refresh]);

  const renameFolder = useCallback(async (id: string, name: string) => {
    await db.folders.update(id, { name, updatedAt: Date.now() });
    await refresh();
  }, [refresh]);

  const deleteFolder = useCallback(async (id: string) => {
    // Delete folder but keep conversations (move to root)
    await db.folders.delete(id);
    // Also delete child folders
    const children = await db.folders.where('parentId').equals(id).toArray();
    for (const child of children) {
      await db.folders.delete(child.id);
    }
    await refresh();
  }, [refresh]);

  const getFolderTree = useCallback(() => {
    const roots = folders.filter(f => !f.parentId);
    const getChildren = (parentId: string): (Folder & { children: Folder[] })[] =>
      folders
        .filter(f => f.parentId === parentId)
        .map(f => ({ ...f, children: getChildren(f.id) }));

    return roots.map(f => ({ ...f, children: getChildren(f.id) }));
  }, [folders]);

  return { folders, createFolder, renameFolder, deleteFolder, getFolderTree, refresh };
}
