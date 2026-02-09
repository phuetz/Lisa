/**
 * Privacy Center - Centre de Confidentialité
 * Gère la transparence sur les données stockées et leur suppression
 */

import React, { useState, useEffect } from 'react';
import { Lock, Trash2, Download, AlertTriangle, CheckCircle } from 'lucide-react';

interface StorageInfo {
  conversations: number;
  documents: number;
  settings: number;
  cache: number;
  totalMB: number;
}

interface Props {
  onForget?: (scope: 'conversation' | 'document' | 'all') => Promise<void>;
}

export const PrivacyCenter: React.FC<Props> = ({ onForget }) => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    conversations: 0,
    documents: 0,
    settings: 0,
    cache: 0,
    totalMB: 0
  });

  const [showConfirm, setShowConfirm] = useState<'conversation' | 'document' | 'all' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    calculateStorage();
  }, []);

  const calculateStorage = () => {
    let total = 0;
    let conversations = 0;
    let documents = 0;
    let settings = 0;
    let cache = 0;

    // Parcourir localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key) || '';
      const size = new Blob([value]).size;
      total += size;

      if (key.includes('conversation')) conversations += size;
      else if (key.includes('document')) documents += size;
      else if (key.includes('settings')) settings += size;
      else if (key.includes('cache')) cache += size;
    }

    setStorageInfo({
      conversations,
      documents,
      settings,
      cache,
      totalMB: total / (1024 * 1024)
    });
  };

  const handleForget = async (scope: 'conversation' | 'document' | 'all') => {
    setIsDeleting(true);
    try {
      if (scope === 'all') {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('conversation') || key.includes('document'))) {
            keys.push(key);
          }
        }
        keys.forEach(key => localStorage.removeItem(key));
      } else if (scope === 'conversation') {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('conversation')) {
            keys.push(key);
          }
        }
        keys.forEach(key => localStorage.removeItem(key));
      } else if (scope === 'document') {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('document')) {
            keys.push(key);
          }
        }
        keys.forEach(key => localStorage.removeItem(key));
      }

      // Log d'audit
      const auditLog = JSON.parse(localStorage.getItem('lisa:privacy:audit') || '[]');
      auditLog.push({
        timestamp: new Date().toISOString(),
        action: 'forget',
        scope,
        success: true
      });
      localStorage.setItem('lisa:privacy:audit', JSON.stringify(auditLog));

      // Appeler le callback
      if (onForget) {
        await onForget(scope);
      }

      // Recalculer le stockage
      calculateStorage();
      setShowConfirm(null);

      // Notification
      if (window.lisaShowNotification) {
        window.lisaShowNotification({
          type: 'success',
          title: 'Données Supprimées',
          message: `Les ${scope === 'all' ? 'données' : scope}s ont été supprimées avec succès.`
        });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      if (window.lisaShowNotification) {
        window.lisaShowNotification({
          type: 'error',
          title: 'Erreur',
          message: 'Impossible de supprimer les données.'
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const exportPrivacyReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      storage: storageInfo,
      dataTypes: {
        conversations: 'Historique des conversations avec Lisa',
        documents: 'Documents téléchargés et analysés',
        settings: 'Préférences utilisateur et configuration',
        cache: 'Données en cache pour performance'
      },
      retention: {
        conversations: 'Stocké localement jusqu\'à suppression manuelle',
        documents: 'Stocké localement jusqu\'à suppression manuelle',
        settings: 'Stocké localement indéfiniment',
        cache: 'Stocké localement, peut être vidé à tout moment'
      },
      privacy: {
        encryption: 'Données non chiffrées (stockage local)',
        sync: 'Aucune synchronisation cloud',
        sharing: 'Aucun partage avec tiers',
        tracking: 'Aucun suivi comportemental'
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lisa-privacy-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg p-6" style={{ background: 'var(--bg-panel, #1a1a26)', color: 'var(--text-primary, #e8e8f0)', border: '1px solid var(--border-primary, #2d2d44)', boxShadow: 'var(--shadow-elevated, 0 4px 20px rgba(0,0,0,0.4))' }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Lock style={{ color: 'var(--color-accent, #f5a623)' }} />
          Centre de Confidentialité
        </h2>
        <button
          onClick={exportPrivacyReport}
          className="px-3 py-1 text-sm text-white rounded flex items-center gap-2"
          style={{ background: 'var(--color-accent, #f5a623)', transition: 'opacity var(--transition-fast, 0.15s ease)' }}
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Rapport
        </button>
      </div>

      {/* Stockage */}
      <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--color-accent-subtle, rgba(245,166,35,0.12))', border: '1px solid rgba(16,163,127,0.3)' }}>
        <h3 className="font-semibold mb-3">Stockage Utilisé</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary, #9898b0)' }}>Conversations:</span>
            <span className="font-mono">{(storageInfo.conversations / 1024).toFixed(2)} KB</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary, #9898b0)' }}>Documents:</span>
            <span className="font-mono">{(storageInfo.documents / 1024).toFixed(2)} KB</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary, #9898b0)' }}>Paramètres:</span>
            <span className="font-mono">{(storageInfo.settings / 1024).toFixed(2)} KB</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary, #9898b0)' }}>Cache:</span>
            <span className="font-mono">{(storageInfo.cache / 1024).toFixed(2)} KB</span>
          </div>
          <div className="pt-2 mt-2 flex justify-between font-bold" style={{ borderTop: '1px solid rgba(16,163,127,0.3)' }}>
            <span>Total:</span>
            <span className="font-mono">{storageInfo.totalMB.toFixed(2)} MB</span>
          </div>
        </div>
      </div>

      {/* Politique de Confidentialité */}
      <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgba(16,163,127,0.08)', border: '1px solid rgba(16,163,127,0.2)' }}>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-accent, #f5a623)' }} />
          Politique de Confidentialité
        </h3>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary, #9898b0)' }}>
          <li><strong>Stockage Local:</strong> Toutes les données sont stockées localement dans votre navigateur</li>
          <li><strong>Aucune Synchronisation:</strong> Pas de synchronisation avec des serveurs cloud</li>
          <li><strong>Aucun Partage:</strong> Vos données ne sont jamais partagées avec des tiers</li>
          <li><strong>Contrôle Total:</strong> Vous pouvez supprimer vos données à tout moment</li>
          <li><strong>Pas de Tracking:</strong> Aucun suivi comportemental ou analytique</li>
        </ul>
      </div>

      {/* Actions de Suppression */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Trash2 className="w-5 h-5" style={{ color: 'var(--color-error, #ef4444)' }} />
          Supprimer les Données
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => setShowConfirm('conversation')}
            disabled={isDeleting}
            className="w-full px-4 py-2 rounded disabled:opacity-50 text-left"
            style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--color-warning, #f59e0b)', border: '1px solid rgba(245,158,11,0.25)', transition: 'opacity var(--transition-fast, 0.15s ease)' }}
          >
            Supprimer les Conversations
          </button>
          <button
            onClick={() => setShowConfirm('document')}
            disabled={isDeleting}
            className="w-full px-4 py-2 rounded disabled:opacity-50 text-left"
            style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)', transition: 'opacity var(--transition-fast, 0.15s ease)' }}
          >
            Supprimer les Documents
          </button>
          <button
            onClick={() => setShowConfirm('all')}
            disabled={isDeleting}
            className="w-full px-4 py-2 rounded disabled:opacity-50 text-left"
            style={{ background: 'var(--color-error-subtle, rgba(239,68,68,0.12))', color: 'var(--color-error, #ef4444)', border: '1px solid rgba(239,68,68,0.25)', transition: 'opacity var(--transition-fast, 0.15s ease)' }}
          >
            Supprimer TOUT
          </button>
        </div>
      </div>

      {/* Confirmation */}
      {showConfirm && (
        <div className="p-4 rounded-lg" role="alertdialog" aria-labelledby="confirm-title" style={{ background: 'var(--color-error-subtle, rgba(239,68,68,0.12))', border: '1px solid rgba(239,68,68,0.3)' }}>
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-error, #ef4444)' }} aria-hidden="true" />
            <div>
              <p id="confirm-title" className="font-semibold" style={{ color: 'var(--color-error, #ef4444)' }}>
                Êtes-vous sûr?
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary, #9898b0)' }}>
                Cette action est irréversible. Les données supprimées ne peuvent pas être récupérées.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleForget(showConfirm)}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 text-white rounded disabled:opacity-50"
              style={{ background: 'var(--color-error, #ef4444)', transition: 'opacity var(--transition-fast, 0.15s ease)' }}
            >
              {isDeleting ? 'Suppression...' : 'Confirmer la Suppression'}
            </button>
            <button
              onClick={() => setShowConfirm(null)}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 rounded disabled:opacity-50"
              style={{ background: 'var(--bg-surface, #12121a)', color: 'var(--text-secondary, #9898b0)', border: '1px solid var(--border-primary, #2d2d44)', transition: 'opacity var(--transition-fast, 0.15s ease)' }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-3 rounded text-xs" style={{ background: 'var(--bg-surface, #12121a)', color: 'var(--text-muted, #6a6a82)' }}>
        <p><strong>Conseil:</strong> Exportez régulièrement vos données importantes avant de les supprimer.</p>
      </div>
    </div>
  );
};
