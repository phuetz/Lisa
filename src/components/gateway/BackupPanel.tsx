/**
 * Lisa Backup Panel
 * Backup and restore management UI
 */

import { useState, useEffect, useCallback } from 'react';
import { getBackupManager } from '../../gateway';
import type { Backup, BackupSchedule } from '../../gateway';

export function BackupPanel() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);

  const refreshData = useCallback(() => {
    const manager = getBackupManager();
    setBackups(manager.listBackups());
    setSchedules(manager.listSchedules());
  }, []);

  useEffect(() => {
    refreshData();
    
    const manager = getBackupManager();
    manager.on('backup:completed', refreshData);
    manager.on('backup:deleted', refreshData);
    
    return () => {
      manager.off('backup:completed', refreshData);
      manager.off('backup:deleted', refreshData);
    };
  }, [refreshData]);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const manager = getBackupManager();
      await manager.createBackup({
        name: `Backup ${new Date().toLocaleDateString('fr-FR')}`,
        type: 'full'
      });
      refreshData();
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!confirm('Restaurer cette sauvegarde ? Les données actuelles seront remplacées.')) {
      return;
    }

    try {
      const manager = getBackupManager();
      await manager.restore(backupId, {
        overwrite: true,
        includeSettings: true,
        includeConversations: true,
        includePlugins: true
      });
      alert('Restauration réussie !');
    } catch (error) {
      console.error('Restore failed:', error);
      alert('Erreur lors de la restauration');
    }
  };

  const handleDelete = (backupId: string) => {
    if (!confirm('Supprimer cette sauvegarde ?')) return;
    
    const manager = getBackupManager();
    manager.deleteBackup(backupId);
    refreshData();
  };

  const handleDownload = (backupId: string) => {
    const manager = getBackupManager();
    manager.downloadBackup(backupId);
  };

  const handleToggleSchedule = (scheduleId: string) => {
    const manager = getBackupManager();
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      if (schedule.enabled) {
        manager.disableSchedule(scheduleId);
      } else {
        manager.enableSchedule(scheduleId);
      }
      refreshData();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: Backup['status']) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'failed': return '#ef4444';
      case 'expired': return '#6a6a82';
      default: return '#6a6a82';
    }
  };

  const getStatusLabel = (status: Backup['status']) => {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'in_progress': return 'En cours';
      case 'failed': return 'Échoué';
      case 'expired': return 'Expiré';
      case 'pending': return 'En attente';
      default: return status;
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>💾 Sauvegardes</h2>
        <button
          onClick={handleCreateBackup}
          disabled={isCreating}
          style={{
            ...styles.createButton,
            opacity: isCreating ? 0.6 : 1
          }}
        >
          {isCreating ? '⏳ Création...' : '➕ Nouvelle sauvegarde'}
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{backups.length}</span>
          <span style={styles.statLabel}>Sauvegardes</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statValue}>
            {formatBytes(backups.reduce((sum, b) => sum + b.size, 0))}
          </span>
          <span style={styles.statLabel}>Espace utilisé</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statValue}>
            {schedules.filter(s => s.enabled).length}
          </span>
          <span style={styles.statLabel}>Planifiées actives</span>
        </div>
      </div>

      {/* Schedules */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📅 Planification</h3>
        <div style={styles.schedulesList}>
          {schedules.map((schedule) => (
            <div key={schedule.id} style={styles.scheduleRow}>
              <div style={styles.scheduleInfo}>
                <span style={styles.scheduleName}>{schedule.name}</span>
                <span style={styles.scheduleCron}>{schedule.cron}</span>
              </div>
              <div style={styles.scheduleActions}>
                <span style={styles.scheduleRetention}>
                  {schedule.retention}j rétention
                </span>
                <button
                  onClick={() => handleToggleSchedule(schedule.id)}
                  style={{
                    ...styles.toggleButton,
                    backgroundColor: schedule.enabled ? '#10b981' : '#2d2d44'
                  }}
                >
                  {schedule.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Backups List */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📦 Sauvegardes ({backups.length})</h3>
        <div style={styles.backupsList}>
          {backups.length === 0 ? (
            <div style={styles.emptyState}>
              Aucune sauvegarde. Créez-en une !
            </div>
          ) : (
            backups.map((backup) => (
              <div 
                key={backup.id} 
                style={{
                  ...styles.backupRow,
                  ...(selectedBackup === backup.id ? styles.backupRowSelected : {})
                }}
                onClick={() => setSelectedBackup(
                  selectedBackup === backup.id ? null : backup.id
                )}
              >
                <div style={styles.backupMain}>
                  <div style={styles.backupHeader}>
                    <span style={styles.backupName}>{backup.name}</span>
                    <span style={{
                      ...styles.backupStatus,
                      color: getStatusColor(backup.status)
                    }}>
                      {getStatusLabel(backup.status)}
                    </span>
                  </div>
                  <div style={styles.backupMeta}>
                    <span>{formatDate(backup.createdAt)}</span>
                    <span>•</span>
                    <span>{formatBytes(backup.size)}</span>
                    <span>•</span>
                    <span>{backup.type}</span>
                  </div>
                </div>
                
                {selectedBackup === backup.id && (
                  <div style={styles.backupActions}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRestore(backup.id); }}
                      style={styles.actionButton}
                    >
                      🔄 Restaurer
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(backup.id); }}
                      style={styles.actionButton}
                    >
                      📥 Télécharger
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(backup.id); }}
                      style={styles.deleteButton}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1a1a26',
    borderRadius: '12px',
    padding: '24px',
    color: '#fff'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600
  },
  createButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500
  },
  statsRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px'
  },
  statItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#252525',
    borderRadius: '8px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#3b82f6'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6a6a82',
    marginTop: '4px'
  },
  section: {
    marginTop: '24px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#ccc',
    marginBottom: '12px'
  },
  schedulesList: {
    backgroundColor: '#252525',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  scheduleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #2d2d44'
  },
  scheduleInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  scheduleName: {
    fontWeight: 500,
    fontSize: '14px'
  },
  scheduleCron: {
    fontSize: '12px',
    color: '#6a6a82',
    fontFamily: 'monospace'
  },
  scheduleActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  scheduleRetention: {
    fontSize: '12px',
    color: '#6a6a82'
  },
  toggleButton: {
    padding: '4px 12px',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 600
  },
  backupsList: {
    backgroundColor: '#252525',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#6a6a82'
  },
  backupRow: {
    padding: '16px',
    borderBottom: '1px solid #2d2d44',
    cursor: 'pointer',
    transition: 'background-color 0.15s'
  },
  backupRowSelected: {
    backgroundColor: '#2a2a2a'
  },
  backupMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  backupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backupName: {
    fontWeight: 500,
    fontSize: '14px'
  },
  backupStatus: {
    fontSize: '12px',
    fontWeight: 600
  },
  backupMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: '#6a6a82'
  },
  backupActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #2d2d44'
  },
  actionButton: {
    padding: '6px 12px',
    backgroundColor: '#2d2d44',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px'
  },
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: '#3f1515',
    border: 'none',
    borderRadius: '4px',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '12px'
  }
};

export default BackupPanel;
