/**
 * Lisa Desktop Panel
 * PC control interface: mouse, keyboard, windows, apps
 */

import { useState, useEffect, useCallback } from 'react';
import { getDesktopController } from '../../gateway';
import type { DesktopAction, MousePosition } from '../../gateway/DesktopController';

export function DesktopPanel() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });
  const [history, setHistory] = useState<DesktopAction[]>([]);
  const [textToType, setTextToType] = useState('');
  const [targetX, setTargetX] = useState('500');
  const [targetY, setTargetY] = useState('500');

  const refreshData = useCallback(() => {
    const controller = getDesktopController();
    const stats = controller.getStats();
    setIsAvailable(stats.isAvailable);
    setIsEnabled(stats.isEnabled);
    setMousePos(controller.getMousePosition());
    setHistory(controller.getActionHistory(10));
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 1000);
    
    const controller = getDesktopController();
    controller.on('action:executed', refreshData);
    
    return () => {
      clearInterval(interval);
      controller.off('action:executed', refreshData);
    };
  }, [refreshData]);

  const handleMouseMove = async () => {
    const controller = getDesktopController();
    await controller.mouseMove(parseInt(targetX), parseInt(targetY));
    refreshData();
  };

  const handleClick = async () => {
    const controller = getDesktopController();
    await controller.mouseClick('left', parseInt(targetX), parseInt(targetY));
    refreshData();
  };

  const handleRightClick = async () => {
    const controller = getDesktopController();
    await controller.mouseClick('right', parseInt(targetX), parseInt(targetY));
    refreshData();
  };

  const handleDoubleClick = async () => {
    const controller = getDesktopController();
    await controller.mouseDoubleClick(parseInt(targetX), parseInt(targetY));
    refreshData();
  };

  const handleType = async () => {
    if (!textToType.trim()) return;
    const controller = getDesktopController();
    await controller.type(textToType);
    setTextToType('');
    refreshData();
  };

  const handleHotkey = async (name: string) => {
    const controller = getDesktopController();
    await controller.hotkey(name as 'copy' | 'paste' | 'undo' | 'save');
    refreshData();
  };

  const handleScroll = async (direction: 'up' | 'down') => {
    const controller = getDesktopController();
    await controller.mouseScroll(3, direction);
    refreshData();
  };

  const stats = getDesktopController().getStats();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🖥️ Desktop Control</h2>
        <span style={{
          ...styles.statusBadge,
          backgroundColor: isAvailable ? '#10b981' : '#f59e0b'
        }}>
          {isAvailable ? 'Native OK' : 'Browser Mode'}
        </span>
      </div>

      {/* Warning if native not available */}
      {!isAvailable && (
        <div style={styles.warning}>
          ⚠️ Module natif non installé. Installez <code>@nut-tree/nut-js</code> pour le contrôle PC complet.
        </div>
      )}

      {/* Mouse Position */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>🖱️ Souris</h3>
        <div style={styles.positionDisplay}>
          <span>Position: <strong>({mousePos.x}, {mousePos.y})</strong></span>
        </div>
        
        <div style={styles.coordInputs}>
          <input
            type="number"
            value={targetX}
            onChange={(e) => setTargetX(e.target.value)}
            placeholder="X"
            style={styles.coordInput}
          />
          <input
            type="number"
            value={targetY}
            onChange={(e) => setTargetY(e.target.value)}
            placeholder="Y"
            style={styles.coordInput}
          />
        </div>

        <div style={styles.mouseActions}>
          <button onClick={handleMouseMove} style={styles.actionBtn}>📍 Déplacer</button>
          <button onClick={handleClick} style={styles.actionBtn}>👆 Clic</button>
          <button onClick={handleRightClick} style={styles.actionBtn}>👇 Clic droit</button>
          <button onClick={handleDoubleClick} style={styles.actionBtn}>👆👆 Double</button>
        </div>

        <div style={styles.scrollActions}>
          <button onClick={() => handleScroll('up')} style={styles.scrollBtn}>⬆️ Scroll Up</button>
          <button onClick={() => handleScroll('down')} style={styles.scrollBtn}>⬇️ Scroll Down</button>
        </div>
      </div>

      {/* Keyboard */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>⌨️ Clavier</h3>
        <div style={styles.typeInput}>
          <input
            type="text"
            value={textToType}
            onChange={(e) => setTextToType(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleType()}
            placeholder="Texte à taper..."
            style={styles.textInput}
          />
          <button onClick={handleType} style={styles.typeBtn}>Taper</button>
        </div>

        <div style={styles.hotkeys}>
          <button onClick={() => handleHotkey('copy')} style={styles.hotkeyBtn}>📋 Copier</button>
          <button onClick={() => handleHotkey('paste')} style={styles.hotkeyBtn}>📄 Coller</button>
          <button onClick={() => handleHotkey('undo')} style={styles.hotkeyBtn}>↩️ Annuler</button>
          <button onClick={() => handleHotkey('save')} style={styles.hotkeyBtn}>💾 Sauver</button>
          <button onClick={() => handleHotkey('selectAll')} style={styles.hotkeyBtn}>☑️ Tout</button>
          <button onClick={() => handleHotkey('find')} style={styles.hotkeyBtn}>🔍 Chercher</button>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>⚡ Actions rapides</h3>
        <div style={styles.quickActions}>
          <button onClick={() => handleHotkey('desktop')} style={styles.quickBtn}>🖥️ Bureau</button>
          <button onClick={() => handleHotkey('switchWindow')} style={styles.quickBtn}>🔀 Alt+Tab</button>
          <button onClick={() => handleHotkey('run')} style={styles.quickBtn}>▶️ Exécuter</button>
          <button onClick={() => handleHotkey('screenshot')} style={styles.quickBtn}>📸 Screenshot</button>
        </div>
      </div>

      {/* History */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📜 Historique</h3>
        <div style={styles.historyList}>
          {history.length === 0 ? (
            <div style={styles.emptyState}>Aucune action</div>
          ) : (
            history.slice().reverse().map((action) => (
              <div key={action.id} style={styles.historyItem}>
                <span style={{
                  ...styles.historyStatus,
                  color: action.success ? '#10b981' : '#ef4444'
                }}>
                  {action.success ? '✓' : '✕'}
                </span>
                <span style={styles.historyType}>{action.type}</span>
                <span style={styles.historyTime}>
                  {new Date(action.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{stats.screenSize.width}x{stats.screenSize.height}</span>
          <span style={styles.statLabel}>Écran</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{stats.actionCount}</span>
          <span style={styles.statLabel}>Actions</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{stats.successRate}%</span>
          <span style={styles.statLabel}>Succès</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: '#1a1a26', borderRadius: '12px', padding: '24px', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  title: { margin: 0, fontSize: '20px', fontWeight: 600 },
  statusBadge: { padding: '4px 12px', borderRadius: '12px', fontSize: '12px' },
  warning: { padding: '12px 16px', backgroundColor: '#422006', border: '1px solid #854d0e', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: '#fef3c7' },
  section: { marginTop: '20px' },
  sectionTitle: { fontSize: '14px', fontWeight: 600, color: '#6a6a82', marginBottom: '12px', textTransform: 'uppercase' },
  positionDisplay: { padding: '12px', backgroundColor: '#252525', borderRadius: '8px', marginBottom: '12px', fontSize: '14px' },
  coordInputs: { display: 'flex', gap: '8px', marginBottom: '12px' },
  coordInput: { flex: 1, padding: '10px 14px', backgroundColor: '#252525', border: '1px solid #2d2d44', borderRadius: '6px', color: '#fff', fontSize: '14px' },
  mouseActions: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' },
  actionBtn: { padding: '12px 8px', backgroundColor: '#252525', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', cursor: 'pointer' },
  scrollActions: { display: 'flex', gap: '8px', marginTop: '8px' },
  scrollBtn: { flex: 1, padding: '10px', backgroundColor: '#252525', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' },
  typeInput: { display: 'flex', gap: '8px', marginBottom: '12px' },
  textInput: { flex: 1, padding: '12px 16px', backgroundColor: '#252525', border: '1px solid #2d2d44', borderRadius: '8px', color: '#fff', fontSize: '14px' },
  typeBtn: { padding: '12px 20px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' },
  hotkeys: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  hotkeyBtn: { padding: '10px 8px', backgroundColor: '#252525', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' },
  quickActions: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' },
  quickBtn: { padding: '14px 8px', backgroundColor: '#1e3a5f', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', cursor: 'pointer' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' },
  emptyState: { padding: '16px', textAlign: 'center', color: '#6a6a82' },
  historyItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', backgroundColor: '#252525', borderRadius: '6px', fontSize: '12px' },
  historyStatus: { fontWeight: 600 },
  historyType: { flex: 1 },
  historyTime: { color: '#6a6a82', fontSize: '11px' },
  stats: { display: 'flex', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #2d2d44' },
  statItem: { flex: 1, textAlign: 'center' },
  statValue: { display: 'block', fontSize: '16px', fontWeight: 600, color: '#3b82f6' },
  statLabel: { fontSize: '11px', color: '#6a6a82' }
};

export default DesktopPanel;
