/**
 * Knowledge Base Panel (C10)
 * UI for managing knowledge bases: create, upload documents, delete, search.
 */

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, X, Plus, Trash2, FileText, Upload, Search } from 'lucide-react';
import type { KnowledgeBase } from '../../types/promptcommander';
import {
  createKnowledgeBase, getAllKnowledgeBases, deleteKnowledgeBase,
  addDocumentToKB, removeDocumentFromKB, getKBDocuments, searchKnowledgeBase,
} from '../../utils/kbManager';

interface KnowledgeBasePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeBasePanel = ({ isOpen, onClose }: KnowledgeBasePanelProps) => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<Array<{ name: string; chunkCount: number }>>([]);
  const [newKBName, setNewKBName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const kbs = await getAllKnowledgeBases();
    setKnowledgeBases(kbs);
  }, []);

  useEffect(() => { if (isOpen) refresh(); }, [isOpen, refresh]);

  const loadDocuments = useCallback(async (kb: KnowledgeBase) => {
    setSelectedKB(kb);
    const docs = await getKBDocuments(kb.id);
    setDocuments(docs);
    setSearchResults([]);
    setSearchQuery('');
  }, []);

  const handleCreate = useCallback(async () => {
    if (!newKBName.trim()) return;
    await createKnowledgeBase(newKBName.trim());
    setNewKBName('');
    await refresh();
  }, [newKBName, refresh]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteKnowledgeBase(id);
    if (selectedKB?.id === id) { setSelectedKB(null); setDocuments([]); }
    await refresh();
  }, [selectedKB, refresh]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedKB || !e.target.files) return;
    setLoading(true);
    for (const file of Array.from(e.target.files)) {
      try {
        let text: string;
        if (file.name.endsWith('.pdf')) {
          const pdfjsLib = await import(/* @vite-ignore */ 'pdfjs-dist');
          const buf = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
          const pages: string[] = [];
          for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            pages.push(content.items.map((it: { str?: string }) => it.str || '').join(' '));
          }
          text = pages.join('\n\n');
        } else if (file.name.endsWith('.docx')) {
          const mammoth = await import(/* @vite-ignore */ 'mammoth');
          const buf = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer: buf });
          text = result.value;
        } else {
          text = await file.text();
        }
        await addDocumentToKB(selectedKB.id, file.name, text);
      } catch (error) {
        console.error(`[KB] Failed to process ${file.name}:`, error);
      }
    }
    await loadDocuments(selectedKB);
    await refresh();
    setLoading(false);
    e.target.value = '';
  }, [selectedKB, loadDocuments, refresh]);

  const handleRemoveDoc = useCallback(async (docName: string) => {
    if (!selectedKB) return;
    await removeDocumentFromKB(selectedKB.id, docName);
    await loadDocuments(selectedKB);
    await refresh();
  }, [selectedKB, loadDocuments, refresh]);

  const handleSearch = useCallback(async () => {
    if (!selectedKB || !searchQuery.trim()) return;
    const results = await searchKnowledgeBase(selectedKB.id, searchQuery);
    setSearchResults(results);
  }, [selectedKB, searchQuery]);

  if (!isOpen) return null;

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
    fontSize: '13px', color: 'var(--text-primary)', transition: 'background 0.1s',
  };

  return (
    <>
      <div onClick={onClose} aria-hidden="true" style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998,
      }} />

      <div role="dialog" aria-label="Base de connaissances" aria-modal="true" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '95vw', maxWidth: '700px', maxHeight: '80vh',
        backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-secondary)', zIndex: 9999,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: 'var(--shadow-modal)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border-primary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} color="var(--color-accent)" />
            <span style={{ fontSize: '16px', fontWeight: 600 }}>Bases de connaissances</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left: KB list */}
          <div style={{ width: '220px', borderRight: '1px solid var(--border-primary)', padding: '12px', overflow: 'auto' }}>
            {/* Create new KB */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
              <input
                type="text"
                value={newKBName}
                onChange={e => setNewKBName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Nouvelle base..."
                style={{
                  flex: 1, padding: '6px 8px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)', fontSize: '12px', outline: 'none',
                }}
              />
              <button onClick={handleCreate} style={{
                padding: '6px', borderRadius: 'var(--radius-md)', border: 'none',
                backgroundColor: 'var(--color-accent)', color: '#fff', cursor: 'pointer',
              }}>
                <Plus size={14} />
              </button>
            </div>

            {knowledgeBases.length === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                Aucune base de connaissances
              </div>
            )}

            {knowledgeBases.map(kb => (
              <div
                key={kb.id}
                onClick={() => loadDocuments(kb)}
                style={{
                  ...rowStyle,
                  backgroundColor: selectedKB?.id === kb.id ? 'var(--bg-tertiary)' : 'transparent',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{kb.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {kb.documentCount} docs · {kb.chunkCount} chunks
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(kb.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Right: Documents + Search */}
          <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
            {!selectedKB ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                Sélectionnez une base de connaissances
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedKB.name}</h3>
                  <label style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '6px 12px', borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-accent)', color: '#fff',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}>
                    <Upload size={14} /> {loading ? 'Chargement...' : 'Ajouter'}
                    <input type="file" multiple accept=".txt,.md,.pdf,.docx,.csv,.json,.xml" onChange={handleUpload} style={{ display: 'none' }} />
                  </label>
                </div>

                {/* Documents */}
                <div style={{ marginBottom: '16px' }}>
                  {documents.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>
                      Aucun document. Utilisez le bouton "Ajouter" pour importer des fichiers.
                    </div>
                  ) : documents.map(doc => (
                    <div key={doc.name} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0', borderBottom: '1px solid var(--border-primary)', fontSize: '13px',
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={14} color="var(--text-tertiary)" />
                        {doc.name}
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({doc.chunkCount} chunks)</span>
                      </span>
                      <button onClick={() => handleRemoveDoc(doc.name)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                      }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Search */}
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-primary)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder="Rechercher dans la base..."
                      style={{
                        flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
                      }}
                    />
                    <button onClick={handleSearch} style={{
                      padding: '8px 12px', borderRadius: 'var(--radius-md)', border: 'none',
                      backgroundColor: 'var(--color-accent)', color: '#fff', cursor: 'pointer',
                    }}>
                      <Search size={14} />
                    </button>
                  </div>
                  {searchResults.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {searchResults.map((chunk, i) => (
                        <div key={i} style={{
                          padding: '8px 10px', borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-tertiary)', fontSize: '12px',
                          color: 'var(--text-secondary)', lineHeight: 1.5,
                          borderLeft: '3px solid var(--color-accent)',
                        }}>
                          {chunk.slice(0, 300)}{chunk.length > 300 ? '...' : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default KnowledgeBasePanel;
