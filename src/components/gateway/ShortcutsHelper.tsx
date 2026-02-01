/**
 * Lisa Shortcuts Helper
 * Keyboard shortcuts overlay and reference
 */

import { useState, useEffect, useCallback } from 'react';
import { getKeyboardShortcutManager } from '../../gateway';
import type { KeyboardShortcut, ShortcutCategory } from '../../gateway';

interface ShortcutsHelperProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsHelper({ isOpen, onClose }: ShortcutsHelperProps) {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [activeCategory, setActiveCategory] = useState<ShortcutCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const manager = getKeyboardShortcutManager();
    setShortcuts(manager.listShortcuts({ enabledOnly: true }));
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredShortcuts = shortcuts.filter(shortcut => {
    const matchesCategory = activeCategory === 'all' || shortcut.category === activeCategory;
    const matchesSearch = !searchQuery || 
      shortcut.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories: { key: ShortcutCategory | 'all'; label: string; icon: string }[] = [
    { key: 'all', label: 'Tous', icon: '📋' },
    { key: 'navigation', label: 'Navigation', icon: '🧭' },
    { key: 'chat', label: 'Chat', icon: '💬' },
    { key: 'editor', label: 'Éditeur', icon: '✏️' },
    { key: 'tools', label: 'Outils', icon: '🔧' },
    { key: 'workflow', label: 'Workflow', icon: '⚡' },
    { key: 'accessibility', label: 'Accessibilité', icon: '♿' },
    { key: 'general', label: 'Général', icon: '⚙️' }
  ];

  const formatKeys = useCallback((keys: string[]) => {
    return keys.map(key => {
      const formatted = key
        .replace('Control', 'Ctrl')
        .replace('Meta', '⌘')
        .replace('Alt', 'Alt')
        .replace('Shift', '⇧')
        .replace('ArrowUp', '↑')
        .replace('ArrowDown', '↓')
        .replace('ArrowLeft', '←')
        .replace('ArrowRight', '→')
        .replace('Escape', 'Esc')
        .replace('Enter', '↵')
        .replace('Backspace', '⌫')
        .replace('Delete', 'Del')
        .replace('Space', 'Space');
      return formatted;
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>⌨️ Raccourcis Clavier</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        {/* Search */}
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Rechercher un raccourci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
            autoFocus
          />
        </div>

        {/* Categories */}
        <div style={styles.categories}>
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                ...styles.categoryButton,
                ...(activeCategory === cat.key ? styles.categoryButtonActive : {})
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Shortcuts List */}
        <div style={styles.shortcutsList}>
          {filteredShortcuts.length === 0 ? (
            <div style={styles.emptyState}>
              Aucun raccourci trouvé
            </div>
          ) : (
            filteredShortcuts.map((shortcut) => (
              <div key={shortcut.id} style={styles.shortcutRow}>
                <div style={styles.shortcutInfo}>
                  <span style={styles.shortcutName}>{shortcut.name}</span>
                  {shortcut.description && (
                    <span style={styles.shortcutDescription}>{shortcut.description}</span>
                  )}
                </div>
                <div style={styles.shortcutKeys}>
                  {formatKeys(shortcut.keys).map((key, index) => (
                    <span key={index}>
                      <kbd style={styles.kbd}>{key}</kbd>
                      {index < shortcut.keys.length - 1 && (
                        <span style={styles.keyPlus}>+</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={styles.footerText}>
            Appuyez sur <kbd style={styles.kbdSmall}>?</kbd> pour afficher/masquer cette aide
          </span>
        </div>
      </div>
    </div>
  );
}

// Floating help button
export function ShortcutsButton() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsOpen(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={styles.floatingButton}
        title="Raccourcis clavier (?)"
      >
        ⌨️
      </button>
      <ShortcutsHelper isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(4px)'
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    width: '600px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    border: '1px solid #333'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #333'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#fff'
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#666',
    fontSize: '28px',
    cursor: 'pointer',
    padding: '0 8px',
    lineHeight: 1
  },
  searchContainer: {
    padding: '16px 24px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#252525',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none'
  },
  categories: {
    display: 'flex',
    gap: '8px',
    padding: '0 24px 16px',
    overflowX: 'auto',
    flexWrap: 'wrap'
  },
  categoryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: '#252525',
    border: 'none',
    borderRadius: '6px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '13px',
    whiteSpace: 'nowrap'
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
    color: '#fff'
  },
  shortcutsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 24px'
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#666'
  },
  shortcutRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #2a2a2a',
    gap: '16px'
  },
  shortcutInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0
  },
  shortcutName: {
    fontWeight: 500,
    fontSize: '14px',
    color: '#fff'
  },
  shortcutDescription: {
    fontSize: '12px',
    color: '#666'
  },
  shortcutKeys: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0
  },
  kbd: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#333',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#fff',
    border: '1px solid #444',
    boxShadow: '0 2px 0 #222'
  },
  keyPlus: {
    color: '#666',
    margin: '0 2px'
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #333',
    textAlign: 'center'
  },
  footerText: {
    fontSize: '12px',
    color: '#666'
  },
  kbdSmall: {
    display: 'inline-block',
    padding: '2px 6px',
    backgroundColor: '#333',
    borderRadius: '3px',
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#fff',
    border: '1px solid #444',
    margin: '0 4px'
  },
  floatingButton: {
    position: 'fixed',
    bottom: '20px',
    right: '80px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#252525',
    border: '1px solid #333',
    cursor: 'pointer',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: 9999
  }
};

export default ShortcutsHelper;
