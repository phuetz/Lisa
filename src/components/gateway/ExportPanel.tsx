/**
 * Lisa Export Panel
 * Export conversations and data UI
 */

import { useState } from 'react';
import { getExportManager } from '../../gateway';
import type { ExportFormat, ExportResult } from '../../gateway';

interface ExportPanelProps {
  conversationId?: string;
  conversationTitle?: string;
}

export function ExportPanel({ conversationId, conversationTitle }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [includeSystemMessages, setIncludeSystemMessages] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);
  const [exports, setExports] = useState<ExportResult[]>([]);

  const handleExport = async () => {
    if (!conversationId) {
      alert('Aucune conversation sélectionnée');
      return;
    }

    setIsExporting(true);

    try {
      const manager = getExportManager();
      
      // Mock conversation for demo - in real app, fetch from store
      const conversation = {
        id: conversationId,
        title: conversationTitle || 'Conversation',
        messages: [], // Would be populated from state/store
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = manager.exportConversation(conversation, {
        format,
        includeTimestamps,
        includeMetadata,
        includeSystemMessages
      });

      setLastExport(result);
      setExports(manager.getExports());

      // Auto-download
      manager.download(result);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions: { value: ExportFormat; label: string; icon: string }[] = [
    { value: 'markdown', label: 'Markdown', icon: '📝' },
    { value: 'html', label: 'HTML', icon: '🌐' },
    { value: 'json', label: 'JSON', icon: '📋' },
    { value: 'txt', label: 'Texte', icon: '📄' },
    { value: 'csv', label: 'CSV', icon: '📊' }
  ];

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>📤 Exporter</h2>
      </div>

      {/* Format Selection */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Format</h3>
        <div style={styles.formatGrid}>
          {formatOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFormat(opt.value)}
              style={{
                ...styles.formatButton,
                ...(format === opt.value ? styles.formatButtonActive : {})
              }}
            >
              <span style={styles.formatIcon}>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Options</h3>
        <div style={styles.optionsList}>
          <label style={styles.option}>
            <input
              type="checkbox"
              checked={includeTimestamps}
              onChange={(e) => setIncludeTimestamps(e.target.checked)}
              style={styles.checkbox}
            />
            <span>Inclure les horodatages</span>
          </label>
          <label style={styles.option}>
            <input
              type="checkbox"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              style={styles.checkbox}
            />
            <span>Inclure les métadonnées</span>
          </label>
          <label style={styles.option}>
            <input
              type="checkbox"
              checked={includeSystemMessages}
              onChange={(e) => setIncludeSystemMessages(e.target.checked)}
              style={styles.checkbox}
            />
            <span>Inclure les messages système</span>
          </label>
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isExporting || !conversationId}
        style={{
          ...styles.exportButton,
          opacity: isExporting || !conversationId ? 0.5 : 1
        }}
      >
        {isExporting ? '⏳ Export en cours...' : '📥 Exporter maintenant'}
      </button>

      {/* Last Export */}
      {lastExport && (
        <div style={styles.lastExport}>
          <div style={styles.lastExportHeader}>
            <span style={styles.lastExportTitle}>Dernier export</span>
            <span style={styles.lastExportSize}>{formatBytes(lastExport.size)}</span>
          </div>
          <div style={styles.lastExportInfo}>
            <span>{lastExport.filename}</span>
            <span style={styles.lastExportTime}>
              {lastExport.createdAt.toLocaleTimeString('fr-FR')}
            </span>
          </div>
        </div>
      )}

      {/* Export History */}
      {exports.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Historique ({exports.length})</h3>
          <div style={styles.historyList}>
            {exports.slice(0, 10).map((exp) => (
              <div key={exp.id} style={styles.historyRow}>
                <span style={styles.historyFormat}>
                  {formatOptions.find(f => f.value === exp.format)?.icon}
                </span>
                <span style={styles.historyFilename}>{exp.filename}</span>
                <span style={styles.historySize}>{formatBytes(exp.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
    marginBottom: '24px'
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600
  },
  section: {
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6a6a82',
    marginBottom: '12px'
  },
  formatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '10px'
  },
  formatButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: '#252525',
    border: '2px solid transparent',
    borderRadius: '8px',
    color: '#6a6a82',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.15s'
  },
  formatButtonActive: {
    borderColor: '#3b82f6',
    color: '#fff',
    backgroundColor: '#1e3a5f'
  },
  formatIcon: {
    fontSize: '24px'
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    accentColor: '#3b82f6'
  },
  exportButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 600,
    marginBottom: '16px'
  },
  lastExport: {
    backgroundColor: '#252525',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px'
  },
  lastExportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  lastExportTitle: {
    fontSize: '12px',
    color: '#6a6a82',
    textTransform: 'uppercase'
  },
  lastExportSize: {
    fontSize: '12px',
    color: '#10b981'
  },
  lastExportInfo: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  lastExportTime: {
    color: '#6a6a82',
    fontSize: '12px'
  },
  historyList: {
    backgroundColor: '#252525',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  historyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid #2d2d44'
  },
  historyFormat: {
    fontSize: '16px'
  },
  historyFilename: {
    flex: 1,
    fontSize: '13px',
    color: '#ccc'
  },
  historySize: {
    fontSize: '12px',
    color: '#6a6a82'
  }
};

export default ExportPanel;
