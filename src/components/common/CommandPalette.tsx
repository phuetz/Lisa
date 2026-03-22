/**
 * Command Palette (C14)
 * Quick navigation and command execution via Ctrl+K.
 * Fuzzy search conversations, quick actions.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MessageSquare, Plus, Settings, BarChart3, BookOpen, FileText, X } from 'lucide-react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'conversation' | 'action';
}

export const CommandPalette = ({ isOpen, onClose }: CommandPaletteProps) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { conversations, createConversation, selectConversation } = useChatHistoryStore();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build command list
  const commands: CommandItem[] = [];

  // Quick actions
  commands.push({
    id: 'new-conversation',
    label: 'Nouvelle conversation',
    icon: <Plus size={16} />,
    action: () => { createConversation(); onClose(); },
    category: 'action',
  });
  commands.push({
    id: 'open-settings',
    label: 'Paramètres',
    icon: <Settings size={16} />,
    action: () => { onClose(); },
    category: 'action',
  });
  commands.push({
    id: 'open-stats',
    label: 'Statistiques',
    icon: <BarChart3 size={16} />,
    action: () => { onClose(); },
    category: 'action',
  });
  commands.push({
    id: 'open-knowledge',
    label: 'Base de connaissances',
    icon: <BookOpen size={16} />,
    action: () => { onClose(); },
    category: 'action',
  });
  commands.push({
    id: 'open-snippets',
    label: 'Snippets',
    icon: <FileText size={16} />,
    action: () => { onClose(); },
    category: 'action',
  });

  // Conversations
  for (const conv of conversations.slice(0, 20)) {
    commands.push({
      id: conv.id,
      label: conv.title,
      description: new Date(conv.updatedAt).toLocaleDateString('fr-FR'),
      icon: <MessageSquare size={16} />,
      action: () => { selectConversation(conv.id); onClose(); },
      category: 'conversation',
    });
  }

  // Filter
  const filtered = query.trim()
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 9998,
        }}
      />

      {/* Palette */}
      <div
        role="dialog"
        aria-label="Palette de commandes"
        aria-modal="true"
        style={{
          position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '95vw', maxWidth: '600px', maxHeight: '60vh',
          backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-secondary)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', borderBottom: '1px solid var(--border-primary)',
        }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une conversation ou une commande..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: '15px',
            }}
          />
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div style={{ overflow: 'auto', padding: '8px' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              Aucun résultat
            </div>
          )}
          {filtered.map((item, i) => (
            <button
              key={item.id}
              onClick={item.action}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '10px 12px', textAlign: 'left',
                background: i === selectedIndex ? 'var(--bg-tertiary)' : 'transparent',
                border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                color: 'var(--text-primary)', fontSize: '14px',
                transition: 'background 0.1s',
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
              {item.description && (
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', flexShrink: 0 }}>
                  {item.description}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px', borderTop: '1px solid var(--border-primary)',
          display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-muted)',
        }}>
          <span>↑↓ Naviguer</span>
          <span>↵ Sélectionner</span>
          <span>Esc Fermer</span>
        </div>
      </div>
    </>
  );
};

export default CommandPalette;
