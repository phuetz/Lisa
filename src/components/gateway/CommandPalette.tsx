/**
 * Lisa Command Palette
 * Quick action launcher (Ctrl+K)
 * Inspired by VS Code and OpenClaw
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  getChatCommandManager, 
  getSearchManager,
  getKeyboardShortcutManager
} from '../../gateway';

interface CommandItem {
  id: string;
  type: 'command' | 'search' | 'shortcut' | 'action' | 'recent';
  title: string;
  description?: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string) => void;
}

export function CommandPalette({ isOpen, onClose, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<'commands' | 'search' | 'files'>('commands');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
      setMode('commands');
    }
  }, [isOpen]);

  // Build items list
  useEffect(() => {
    const buildItems = async () => {
      const commandManager = getChatCommandManager();
      const searchManager = getSearchManager();
      const shortcutManager = getKeyboardShortcutManager();

      const newItems: CommandItem[] = [];

      // Determine mode from query prefix
      if (query.startsWith('>')) {
        setMode('commands');
        const searchQuery = query.slice(1).trim().toLowerCase();
        
        // Chat commands
        const commands = commandManager.listCommands();
        for (const cmd of commands) {
          if (!searchQuery || cmd.name.toLowerCase().includes(searchQuery) || 
              cmd.description.toLowerCase().includes(searchQuery)) {
            newItems.push({
              id: `cmd_${cmd.name}`,
              type: 'command',
              title: `/${cmd.name}`,
              description: cmd.description,
              icon: '💬',
              action: () => {
                onAction?.(`command:${cmd.name}`);
                onClose();
              }
            });
          }
        }
      } else if (query.startsWith('@')) {
        setMode('files');
        const searchQuery = query.slice(1).trim();
        
        // Search files
        if (searchQuery.length > 0) {
          const results = searchManager.searchFiles(searchQuery, 10);
          for (const result of results) {
            newItems.push({
              id: result.id,
              type: 'search',
              title: result.title,
              description: result.excerpt,
              icon: '📄',
              action: () => {
                onAction?.(`file:${result.id}`);
                onClose();
              }
            });
          }
        }
      } else {
        setMode('search');
        const searchQuery = query.toLowerCase();

        // Quick actions
        const quickActions: CommandItem[] = [
          { id: 'new_chat', type: 'action', title: 'Nouvelle conversation', description: 'Démarrer une nouvelle conversation', icon: '➕', shortcut: 'Ctrl+N', action: () => { onAction?.('navigate:/chat?new=true'); onClose(); }},
          { id: 'settings', type: 'action', title: 'Paramètres', description: 'Ouvrir les paramètres', icon: '⚙️', shortcut: 'Ctrl+,', action: () => { onAction?.('navigate:/settings'); onClose(); }},
          { id: 'gateway', type: 'action', title: 'Gateway', description: 'Ouvrir le dashboard Gateway', icon: '🌐', action: () => { onAction?.('navigate:/gateway'); onClose(); }},
          { id: 'skills', type: 'action', title: 'Skills', description: 'Gérer les skills', icon: '🧩', action: () => { onAction?.('navigate:/skills'); onClose(); }},
          { id: 'automation', type: 'action', title: 'Automation', description: 'Cron jobs et webhooks', icon: '⚡', action: () => { onAction?.('navigate:/automation'); onClose(); }},
          { id: 'toggle_theme', type: 'action', title: 'Changer le thème', description: 'Basculer clair/sombre', icon: '🎨', shortcut: 'Ctrl+Shift+L', action: () => { onAction?.('theme:toggle'); onClose(); }},
          { id: 'toggle_voice', type: 'action', title: 'Activer la voix', description: 'Hey Lisa', icon: '🎤', shortcut: 'Ctrl+M', action: () => { onAction?.('voice:toggle'); onClose(); }},
          { id: 'export', type: 'action', title: 'Exporter', description: 'Exporter la conversation', icon: '📥', shortcut: 'Ctrl+E', action: () => { onAction?.('chat:export'); onClose(); }},
        ];

        // Filter quick actions
        for (const action of quickActions) {
          if (!searchQuery || action.title.toLowerCase().includes(searchQuery) ||
              action.description?.toLowerCase().includes(searchQuery)) {
            newItems.push(action);
          }
        }

        // Keyboard shortcuts
        const shortcuts = shortcutManager.listShortcuts({ enabledOnly: true });
        for (const shortcut of shortcuts.slice(0, 5)) {
          if (!searchQuery || shortcut.name.toLowerCase().includes(searchQuery)) {
            newItems.push({
              id: `shortcut_${shortcut.id}`,
              type: 'shortcut',
              title: shortcut.name,
              description: shortcut.description,
              icon: '⌨️',
              shortcut: shortcutManager.formatKeys(shortcut.keys),
              action: () => {
                onAction?.(shortcut.action);
                onClose();
              }
            });
          }
        }

        // Search results
        if (searchQuery.length > 1) {
          const results = searchManager.search({ text: searchQuery, limit: 5 });
          for (const result of results) {
            newItems.push({
              id: result.id,
              type: 'search',
              title: result.title,
              description: result.excerpt,
              icon: result.type === 'message' ? '💬' : '📄',
              action: () => {
                onAction?.(`open:${result.type}:${result.id}`);
                onClose();
              }
            });
          }
        }
      }

      setItems(newItems);
      setSelectedIndex(0);
    };

    buildItems();
  }, [query, onAction, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        e.preventDefault();
        // Cycle through modes
        if (mode === 'commands') {
          setQuery('@');
        } else if (mode === 'files') {
          setQuery('');
        } else {
          setQuery('>');
        }
        break;
    }
  }, [items, selectedIndex, mode, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        zIndex: 10000
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{
        width: '560px',
        maxWidth: '90vw',
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        border: '1px solid #333',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Input */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>
            {mode === 'commands' ? '>' : mode === 'files' ? '@' : '🔍'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'commands' ? 'Tapez une commande...' :
              mode === 'files' ? 'Rechercher des fichiers...' :
              'Rechercher ou taper > pour les commandes, @ pour les fichiers'
            }
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '16px'
            }}
          />
          <kbd style={{
            padding: '4px 8px',
            backgroundColor: '#333',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#888'
          }}>Esc</kbd>
        </div>

        {/* Results */}
        <div 
          ref={listRef}
          style={{
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          {items.length === 0 ? (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              color: '#666'
            }}>
              {query ? 'Aucun résultat' : 'Commencez à taper pour rechercher'}
            </div>
          ) : (
            items.map((item, index) => (
              <div
                key={item.id}
                onClick={() => item.action()}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  backgroundColor: index === selectedIndex ? '#2a2a2a' : 'transparent',
                  borderLeft: index === selectedIndex ? '3px solid #3b82f6' : '3px solid transparent'
                }}
              >
                <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>
                  {item.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: '#fff',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.title}
                  </div>
                  {item.description && (
                    <div style={{
                      color: '#888',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.description}
                    </div>
                  )}
                </div>
                {item.shortcut && (
                  <kbd style={{
                    padding: '4px 8px',
                    backgroundColor: '#333',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#888'
                  }}>
                    {item.shortcut}
                  </kbd>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid #333',
          display: 'flex',
          gap: '16px',
          fontSize: '12px',
          color: '#666'
        }}>
          <span>
            <kbd style={{ padding: '2px 4px', backgroundColor: '#333', borderRadius: '2px', marginRight: '4px' }}>↑↓</kbd>
            naviguer
          </span>
          <span>
            <kbd style={{ padding: '2px 4px', backgroundColor: '#333', borderRadius: '2px', marginRight: '4px' }}>↵</kbd>
            sélectionner
          </span>
          <span>
            <kbd style={{ padding: '2px 4px', backgroundColor: '#333', borderRadius: '2px', marginRight: '4px' }}>Tab</kbd>
            changer mode
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
