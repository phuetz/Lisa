/**
 * Search Panel (D1)
 * Cross-conversation full-text search using Dexie.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, MessageSquare, Clock } from 'lucide-react';
import { db } from '../../db/database';
import type { DBConversation, DBMessage } from '../../db/database';

interface SearchResult {
  conversation: DBConversation;
  matchedMessages: DBMessage[];
  score: number;
}

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
}

export const SearchPanel = ({ isOpen, onClose, onSelectConversation }: SearchPanelProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isOpen]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const terms = q.toLowerCase().split(/\s+/).filter(t => t.length > 1);

      // Search conversations by title
      const allConvs = await db.conversations
        .where('status').equals('active')
        .toArray();

      const matchedConvs: SearchResult[] = [];

      for (const conv of allConvs) {
        let score = 0;

        // Title match
        const titleLower = conv.title.toLowerCase();
        for (const term of terms) {
          if (titleLower.includes(term)) score += 10;
        }

        // Tag match
        for (const tag of conv.tags || []) {
          for (const term of terms) {
            if (tag.toLowerCase().includes(term)) score += 5;
          }
        }

        // Message content search (limited to 50 messages per conv for performance)
        const messages = await db.messages
          .where('conversationId').equals(conv.id)
          .limit(50)
          .toArray();

        const matchedMessages: DBMessage[] = [];
        for (const msg of messages) {
          const contentLower = msg.content.toLowerCase();
          for (const term of terms) {
            if (contentLower.includes(term)) {
              score += 2;
              matchedMessages.push(msg);
              break;
            }
          }
        }

        if (score > 0) {
          matchedConvs.push({ conversation: conv, matchedMessages: matchedMessages.slice(0, 3), score });
        }
      }

      // Sort by score descending
      matchedConvs.sort((a, b) => b.score - a.score);
      setResults(matchedConvs.slice(0, 20));
    } catch (error) {
      console.error('[Search] Failed:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }, [doSearch]);

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} aria-hidden="true" style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998,
      }} />

      <div role="dialog" aria-label="Recherche" aria-modal="true" style={{
        position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: '95vw', maxWidth: '650px', maxHeight: '75vh',
        backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-secondary)', zIndex: 9999,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: 'var(--shadow-modal)',
      }}>
        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', borderBottom: '1px solid var(--border-primary)',
        }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Rechercher dans toutes les conversations..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: '15px',
            }}
          />
          {searching && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>...</span>}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div style={{ overflow: 'auto', padding: '8px', flex: 1 }}>
          {results.length === 0 && query.length >= 2 && !searching && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              Aucun résultat pour "{query}"
            </div>
          )}
          {results.map(r => (
            <button
              key={r.conversation.id}
              onClick={() => { onSelectConversation(r.conversation.id); onClose(); }}
              style={{
                display: 'block', width: '100%', padding: '12px', textAlign: 'left',
                background: 'transparent', border: 'none', borderRadius: 'var(--radius-md)',
                cursor: 'pointer', color: 'var(--text-primary)',
                marginBottom: '4px',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <MessageSquare size={14} color="var(--text-tertiary)" />
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{r.conversation.title}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <Clock size={12} />
                  {new Date(r.conversation.updatedAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
              {r.matchedMessages.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', paddingLeft: '22px' }}>
                  {r.matchedMessages[0].content.slice(0, 120)}...
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default SearchPanel;
