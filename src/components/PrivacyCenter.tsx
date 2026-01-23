/**
 * 🔒 Privacy Center - Centre de Confidentialité
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
        // Supprimer toutes les conversations
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('conversation') || key.includes('document'))) {
            keys.push(key);
          }
        }
        keys.forEach(key => localStorage.removeItem(key));
      } else if (scope === 'conversation') {
        // Supprimer les conversations
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('conversation')) {
            keys.push(key);
          }
        }
        keys.forEach(key => localStorage.removeItem(key));
      } else if (scope === 'document') {
        // Supprimer les documents
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Lock className="text-blue-500" />
          Centre de Confidentialité
        </h2>
        <button
          onClick={exportPrivacyReport}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Rapport
        </button>
      </div>

      {/* Stockage */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold mb-3">📊 Stockage Utilisé</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Conversations:</span>
            <span className="font-mono">{(storageInfo.conversations / 1024).toFixed(2)} KB</span>
          </div>
          <div className="flex justify-between">
            <span>Documents:</span>
            <span className="font-mono">{(storageInfo.documents / 1024).toFixed(2)} KB</span>
          </div>
          <div className="flex justify-between">
            <span>Paramètres:</span>
            <span className="font-mono">{(storageInfo.settings / 1024).toFixed(2)} KB</span>
          </div>
          <div className="flex justify-between">
            <span>Cache:</span>
            <span className="font-mono">{(storageInfo.cache / 1024).toFixed(2)} KB</span>
          </div>
          <div className="border-t border-blue-200 dark:border-blue-700 pt-2 mt-2 flex justify-between font-bold">
            <span>Total:</span>
            <span className="font-mono">{storageInfo.totalMB.toFixed(2)} MB</span>
          </div>
        </div>
      </div>

      {/* Politique de Confidentialité */}
      <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Politique de Confidentialité
        </h3>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li>✅ <strong>Stockage Local:</strong> Toutes les données sont stockées localement dans votre navigateur</li>
          <li>✅ <strong>Aucune Synchronisation:</strong> Pas de synchronisation avec des serveurs cloud</li>
          <li>✅ <strong>Aucun Partage:</strong> Vos données ne sont jamais partagées avec des tiers</li>
          <li>✅ <strong>Contrôle Total:</strong> Vous pouvez supprimer vos données à tout moment</li>
          <li>✅ <strong>Pas de Tracking:</strong> Aucun suivi comportemental ou analytique</li>
        </ul>
      </div>

      {/* Actions de Suppression */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-500" />
          Supprimer les Données
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => setShowConfirm('conversation')}
            disabled={isDeleting}
            className="w-full px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors disabled:opacity-50"
          >
            🗑️ Supprimer les Conversations
          </button>
          <button
            onClick={() => setShowConfirm('document')}
            disabled={isDeleting}
            className="w-full px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors disabled:opacity-50"
          >
            🗑️ Supprimer les Documents
          </button>
          <button
            onClick={() => setShowConfirm('all')}
            disabled={isDeleting}
            className="w-full px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
          >
            🗑️ Supprimer TOUT
          </button>
        </div>
      </div>

      {/* Confirmation */}
      {showConfirm && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-200">
                Êtes-vous sûr?
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Cette action est irréversible. Les données supprimées ne peuvent pas être récupérées.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleForget(showConfirm)}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isDeleting ? '⏳ Suppression...' : '🗑️ Confirmer la Suppression'}
            </button>
            <button
              onClick={() => setShowConfirm(null)}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
        <p>💡 <strong>Conseil:</strong> Exportez régulièrement vos données importantes avant de les supprimer.</p>
      </div>
    </div>
  );
};
