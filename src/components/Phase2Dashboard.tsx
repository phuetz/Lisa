/**
 * 📊 Phase 2 Dashboard - Dashboard d'Agentivité
 * Affiche les statistiques et contrôles pour Phase 2
 */

import { useState, useEffect } from 'react';
import { usePhase2 } from '../hooks/usePhase2';
import type { Memory } from '../services/MemoryService';
import type { AugmentedContext } from '../services/RAGService';
import { Brain, Trash2, Search, BarChart3 } from 'lucide-react';

export function Phase2Dashboard() {
  const {
    state,
    getStats,
    searchMemories,
    augmentContext,
    forgetConversations,
    forgetDocuments,
    forgetAll
  } = usePhase2();

  const [stats, setStats] = useState(getStats());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Memory[]>([]);
  const [augmentedContext, setAugmentedContext] = useState<AugmentedContext | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getStats());
    }, 5000);
    return () => clearInterval(interval);
  }, [getStats]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const results = searchMemories(searchQuery, 5);
      setSearchResults(results);
    }
  };

  const handleAugment = async () => {
    if (searchQuery.trim()) {
      const context = await augmentContext(searchQuery, 5);
      setAugmentedContext(context);
    }
  };

  const handleForget = async (scope: 'conversation' | 'document' | 'all') => {
    if (confirm(`Êtes-vous sûr de vouloir oublier ${scope}?`)) {
      if (scope === 'conversation') {
        await forgetConversations('User initiated');
      } else if (scope === 'document') {
        await forgetDocuments('User initiated');
      } else {
        await forgetAll('User initiated');
      }
      setStats(getStats());
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Titre */}
      <div className="flex items-center gap-3">
        <Brain className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold">Phase 2 - Agentivité</h1>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CriticAgent */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Validations</p>
          <p className="text-3xl font-bold">{stats.critic.totalValidations}</p>
          <p className="text-xs opacity-75">Taux: {stats.critic.approvalRate}%</p>
        </div>

        {/* Memory */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Souvenirs</p>
          <p className="text-3xl font-bold">{stats.memory.totalMemories}</p>
          <p className="text-xs opacity-75">Pertinence: {stats.memory.averageRelevance}%</p>
        </div>

        {/* RAG */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Embeddings</p>
          <p className="text-3xl font-bold">{stats.rag.totalEmbeddings}</p>
          <p className="text-xs opacity-75">Dim: {stats.rag.embeddingDimension}</p>
        </div>

        {/* Forget */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Suppressions</p>
          <p className="text-3xl font-bold">{stats.forget.totalRequests}</p>
          <p className="text-xs opacity-75">Supprimés: {stats.forget.totalDeleted}</p>
        </div>
      </div>

      {/* Recherche et Augmentation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Search className="w-5 h-5" />
          Recherche et Augmentation
        </h2>

        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher des souvenirs..."
            className="flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={state.isSearching}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Chercher
          </button>
          <button
            onClick={handleAugment}
            disabled={state.isAugmenting}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
          >
            Augmenter
          </button>
        </div>

        {/* Résultats de recherche */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold text-sm">Souvenirs trouvés:</p>
            {searchResults.map((memory, i) => (
              <div key={i} className="p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                <p className="font-semibold">[{memory.type}]</p>
                <p className="text-xs opacity-75">{memory.content.substring(0, 100)}...</p>
                <p className="text-xs opacity-50">Pertinence: {memory.relevance}%</p>
              </div>
            ))}
          </div>
        )}

        {/* Contexte augmenté */}
        {augmentedContext && (
          <div className="space-y-2">
            <p className="font-semibold text-sm">Contexte augmenté:</p>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded text-sm">
              <p className="whitespace-pre-wrap text-xs">{augmentedContext.context}</p>
              <p className="text-xs opacity-50 mt-2">Confiance: {augmentedContext.confidence}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Gestion de la Mémoire */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Gestion de la Mémoire
        </h2>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleForget('conversation')}
            disabled={state.isForgetting}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 text-sm"
          >
            Oublier Conversations
          </button>
          <button
            onClick={() => handleForget('document')}
            disabled={state.isForgetting}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm"
          >
            Oublier Documents
          </button>
          <button
            onClick={() => handleForget('all')}
            disabled={state.isForgetting}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 text-sm"
          >
            Oublier Tout
          </button>
        </div>
      </div>

      {/* Détails des Statistiques */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Détails
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold">CriticAgent</p>
            <p className="text-xs opacity-75">Approuvées: {stats.critic.approved}</p>
            <p className="text-xs opacity-75">Rejetées: {stats.critic.rejected}</p>
            <p className="text-xs opacity-75">Score moyen: {stats.critic.averageRiskScore}</p>
          </div>

          <div>
            <p className="font-semibold">Memory</p>
            <p className="text-xs opacity-75">Taille: {(stats.memory.totalSize / 1024).toFixed(2)} KB</p>
            <p className="text-xs opacity-75">Par type:</p>
            <div className="text-xs opacity-50">
              {Object.entries(stats.memory.byType).map(([type, count]) => (
                <p key={type}>{type}: {count}</p>
              ))}
            </div>
          </div>

          <div>
            <p className="font-semibold">RAG</p>
            <p className="text-xs opacity-75">Taille: {(stats.rag.totalSize / 1024).toFixed(2)} KB</p>
          </div>

          <div>
            <p className="font-semibold">Forget</p>
            <p className="text-xs opacity-75">Données supprimées: {(stats.forget.totalDataRemoved / 1024).toFixed(2)} KB</p>
            <p className="text-xs opacity-75">Par scope:</p>
            <div className="text-xs opacity-50">
              {Object.entries(stats.forget.byScope).map(([scope, count]) => (
                <p key={scope}>{scope}: {count}</p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* État */}
      {(state.isValidating || state.isSearching || state.isAugmenting || state.isForgetting) && (
        <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg text-sm">
          <p className="font-semibold">En cours...</p>
          {state.isValidating && <p>Validation en cours...</p>}
          {state.isSearching && <p>Recherche en cours...</p>}
          {state.isAugmenting && <p>Augmentation en cours...</p>}
          {state.isForgetting && <p>Suppression en cours...</p>}
        </div>
      )}
    </div>
  );
}
