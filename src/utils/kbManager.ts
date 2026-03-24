/**
 * Knowledge Base Manager
 * CRUD operations for knowledge bases, bridging Dexie metadata with Lisa's RAG backend.
 * The UI manages KB metadata in Dexie; actual embedding/retrieval uses RAGService.
 */

import { db } from '../db/database';
import type { KnowledgeBase, KnowledgeChunk } from '../types/promptcommander';

const CHUNK_SIZE = 1000; // chars
const CHUNK_OVERLAP = 100; // chars

// ─── Knowledge Base CRUD ──────────────────────────────────────────

export async function createKnowledgeBase(name: string, description?: string): Promise<KnowledgeBase> {
  const kb: KnowledgeBase = {
    id: `kb-${Date.now().toString(36)}`,
    name,
    description,
    documentCount: 0,
    chunkCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.knowledgeBases.put(kb);
  return kb;
}

export async function getAllKnowledgeBases(): Promise<KnowledgeBase[]> {
  return db.knowledgeBases.orderBy('createdAt').reverse().toArray();
}

export async function getKnowledgeBase(id: string): Promise<KnowledgeBase | undefined> {
  return db.knowledgeBases.get(id);
}

export async function deleteKnowledgeBase(id: string): Promise<void> {
  await db.transaction('rw', [db.knowledgeBases, db.knowledgeChunks], async () => {
    await db.knowledgeChunks.where('knowledgeBaseId').equals(id).delete();
    await db.knowledgeBases.delete(id);
  });
}

export async function renameKnowledgeBase(id: string, name: string): Promise<void> {
  await db.knowledgeBases.update(id, { name, updatedAt: Date.now() });
}

// ─── Document Management ──────────────────────────────────────────

export async function addDocumentToKB(kbId: string, documentName: string, content: string): Promise<number> {
  const chunks = chunkText(content, CHUNK_SIZE, CHUNK_OVERLAP);

  const dbChunks: KnowledgeChunk[] = chunks.map((text, index) => ({
    id: `chunk-${Date.now().toString(36)}-${index}`,
    knowledgeBaseId: kbId,
    documentName,
    content: text,
    index,
    createdAt: Date.now(),
  }));

  await db.knowledgeChunks.bulkPut(dbChunks);

  // Update KB metadata
  const kb = await db.knowledgeBases.get(kbId);
  if (kb) {
    const allChunks = await db.knowledgeChunks.where('knowledgeBaseId').equals(kbId).count();
    const docs = await getKBDocuments(kbId);
    await db.knowledgeBases.update(kbId, {
      documentCount: docs.length,
      chunkCount: allChunks,
      updatedAt: Date.now(),
    });
  }

  // Also index in RAG if available
  try {
    const { ragService } = await import('../services/RAGService');
    if (ragService?.indexDocument) {
      await ragService.indexDocument(content, { name: documentName, kbId });
    }
  } catch {
    // RAG service may not be available — KB still works with BM25 fallback
  }

  return chunks.length;
}

export async function removeDocumentFromKB(kbId: string, documentName: string): Promise<void> {
  await db.knowledgeChunks
    .where('knowledgeBaseId').equals(kbId)
    .filter(c => c.documentName === documentName)
    .delete();

  // Update metadata
  const allChunks = await db.knowledgeChunks.where('knowledgeBaseId').equals(kbId).count();
  const docs = await getKBDocuments(kbId);
  await db.knowledgeBases.update(kbId, {
    documentCount: docs.length,
    chunkCount: allChunks,
    updatedAt: Date.now(),
  });
}

export async function getKBDocuments(kbId: string): Promise<Array<{ name: string; chunkCount: number }>> {
  const chunks = await db.knowledgeChunks.where('knowledgeBaseId').equals(kbId).toArray();
  const docMap = new Map<string, number>();
  for (const chunk of chunks) {
    docMap.set(chunk.documentName, (docMap.get(chunk.documentName) || 0) + 1);
  }
  return Array.from(docMap.entries()).map(([name, chunkCount]) => ({ name, chunkCount }));
}

// ─── Search (BM25-like fallback) ──────────────────────────────────

export async function searchKnowledgeBase(kbId: string, query: string, limit = 5): Promise<string[]> {
  // Try RAG first (vector search)
  try {
    const { ragService } = await import('../services/RAGService');
    if (ragService?.searchSimilar) {
      const results = await ragService.searchSimilar(query, limit);
      if (results.length > 0) return results.map((r: { content?: string; text?: string }) => r.content || r.text || String(r));
    }
  } catch {
    // Fall through to BM25
  }

  // BM25-like fallback
  const chunks = await db.knowledgeChunks.where('knowledgeBaseId').equals(kbId).toArray();
  if (chunks.length === 0) return [];

  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (queryTerms.length === 0) return chunks.slice(0, limit).map(c => c.content);

  const scored = chunks.map(chunk => {
    const text = chunk.content.toLowerCase();
    let score = 0;
    for (const term of queryTerms) {
      if (text.includes(term)) {
        // Count occurrences
        const count = (text.match(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        score += count;
      }
    }
    // Length normalization (guard against empty chunks)
    score = chunk.content.length > 0 ? score / Math.sqrt(chunk.content.length) : 0;
    return { chunk, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.chunk.content);
}

// ─── Chunking ─────────────────────────────────────────────────────

function chunkText(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += size - overlap;
    if (start >= text.length) break;
  }
  return chunks;
}
