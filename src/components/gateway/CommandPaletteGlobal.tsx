/**
 * Lisa Global Command Palette
 * Self-contained command palette with keyboard shortcut
 */

import { useState, useEffect, useCallback } from 'react';
import { CommandPalette } from './CommandPalette';

export function CommandPaletteGlobal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+K or Cmd+K to open
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }
    // Escape to close
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <CommandPalette 
      isOpen={isOpen} 
      onClose={() => setIsOpen(false)} 
    />
  );
}

export default CommandPaletteGlobal;
