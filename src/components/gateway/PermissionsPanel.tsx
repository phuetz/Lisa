/**
 * Lisa Permissions Panel
 * Elevated mode and permission management UI
 */

import { useState, useEffect, useCallback } from 'react';
import { getElevatedMode } from '../../gateway';
import type { ElevatedLevel, AuditEntry } from '../../gateway/ElevatedMode';

export function PermissionsPanel() {
  const [currentLevel, setCurrentLevel] = useState<ElevatedLevel>('basic');
  const [hasSession, setHasSession] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  const refreshData = useCallback(() => {
    const elevated = getElevatedMode();
    const stats = elevated.getStats();
    setCurrentLevel(stats.currentLevel);
    setHasSession(stats.hasActiveSession);
    setExpiresIn(stats.sessionExpiresIn);
    setAuditLog(elevated.getAuditLog(10));
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 1000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleElevate = async (level: ElevatedLevel) => {
    const elevated = getElevatedMode();
    await elevated.elevate(level, { reason: 'User request' });
    refreshData();
  };

  const handleEndSession = () => {
    const elevated = getElevatedMode();
    elevated.endSession();
    refreshData();
  };

  const getLevelColor = (level: ElevatedLevel) => {
    switch (level) {
      case 'admin': return '#ef4444';
      case 'elevated': return '#f59e0b';
      case 'basic': return '#10b981';
      default: return '#6a6a82';
    }
  };

  const getLevelIcon = (level: ElevatedLevel) => {
    switch (level) {
      case 'admin': return '👑';
      case 'elevated': return '⚡';
      case 'basic': return '🔓';
      default: return '🔒';
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🔐 Permissions</h2>
      </div>

      {/* Current Level */}
      <div style={{ ...styles.levelCard, borderColor: getLevelColor(currentLevel) }}>
        <span style={styles.levelIcon}>{getLevelIcon(currentLevel)}</span>
        <div style={styles.levelInfo}>
          <span style={{ ...styles.levelName, color: getLevelColor(currentLevel) }}>
            {currentLevel.toUpperCase()}
          </span>
          {hasSession && expiresIn && (
            <span style={styles.expiresIn}>Expire dans {formatTime(expiresIn)}</span>
          )}
        </div>
        {hasSession && (
          <button onClick={handleEndSession} style={styles.endButton}>
            Terminer
          </button>
        )}
      </div>

      {/* Level Selection */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Niveau d'accès</h3>
        <div style={styles.levelsGrid}>
          {(['none', 'basic', 'elevated', 'admin'] as ElevatedLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => handleElevate(level)}
              style={{
                ...styles.levelButton,
                borderColor: currentLevel === level ? getLevelColor(level) : 'transparent',
                opacity: currentLevel === level ? 1 : 0.7
              }}
            >
              <span style={styles.levelBtnIcon}>{getLevelIcon(level)}</span>
              <span style={styles.levelBtnName}>{level}</span>
              <span style={styles.levelBtnDesc}>
                {level === 'none' && 'Lecture seule'}
                {level === 'basic' && 'Actions basiques'}
                {level === 'elevated' && 'Shell + fichiers'}
                {level === 'admin' && 'Accès complet'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Journal d'audit</h3>
        <div style={styles.auditList}>
          {auditLog.length === 0 ? (
            <div style={styles.emptyState}>Aucune action enregistrée</div>
          ) : (
            auditLog.slice().reverse().map((entry) => (
              <div key={entry.id} style={styles.auditItem}>
                <span style={{ ...styles.auditStatus, color: entry.success ? '#10b981' : '#ef4444' }}>
                  {entry.success ? '✓' : '✕'}
                </span>
                <span style={styles.auditAction}>{entry.action}</span>
                <span style={{ ...styles.auditLevel, color: getLevelColor(entry.level) }}>
                  {entry.level}
                </span>
                <span style={styles.auditTime}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { backgroundColor: '#1a1a26', borderRadius: '12px', padding: '24px', color: '#fff' },
  header: { marginBottom: '20px' },
  title: { margin: 0, fontSize: '20px', fontWeight: 600 },
  levelCard: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', backgroundColor: '#252525', borderRadius: '12px', border: '2px solid', marginBottom: '24px' },
  levelIcon: { fontSize: '32px' },
  levelInfo: { flex: 1 },
  levelName: { display: 'block', fontSize: '20px', fontWeight: 700, textTransform: 'capitalize' },
  expiresIn: { fontSize: '13px', color: '#6a6a82' },
  endButton: { padding: '8px 16px', backgroundColor: '#2d2d44', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' },
  section: { marginTop: '24px' },
  sectionTitle: { fontSize: '14px', fontWeight: 600, color: '#6a6a82', marginBottom: '12px', textTransform: 'uppercase' },
  levelsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' },
  levelButton: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', backgroundColor: '#252525', border: '2px solid transparent', borderRadius: '12px', color: '#fff', cursor: 'pointer', textAlign: 'center' },
  levelBtnIcon: { fontSize: '24px', marginBottom: '8px' },
  levelBtnName: { fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' },
  levelBtnDesc: { fontSize: '11px', color: '#6a6a82', marginTop: '4px' },
  auditList: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' },
  emptyState: { padding: '20px', textAlign: 'center', color: '#6a6a82' },
  auditItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', backgroundColor: '#252525', borderRadius: '6px', fontSize: '13px' },
  auditStatus: { fontWeight: 600 },
  auditAction: { flex: 1 },
  auditLevel: { fontSize: '11px', textTransform: 'uppercase' },
  auditTime: { fontSize: '11px', color: '#6a6a82' }
};

export default PermissionsPanel;
