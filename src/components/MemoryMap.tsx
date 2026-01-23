/**
 * 🧠 Memory Map - Carte Mémoire de Lisa
 * Visualise ce que Lisa se souvient et d'où ça vient
 */

import React, { useState, useEffect } from 'react';
import { Brain, Clock } from 'lucide-react';

interface MemoryItem {
  id: string;
  type: 'conversation' | 'document' | 'fact' | 'preference';
  content: string;
  source: string;
  timestamp: string;
  relevance: number; // 0-100
  tags: string[];
}

interface MemoryStats {
  totalItems: number;
  byType: Record<string, number>;
  oldestMemory: string;
  newestMemory: string;
  averageRelevance: number;
}

interface Props {
  onMemoryClick?: (memory: MemoryItem) => void;
}

export const MemoryMap: React.FC<Props> = ({ onMemoryClick }) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [stats, setStats] = useState<MemoryStats>({
    totalItems: 0,
    byType: {},
    oldestMemory: '',
    newestMemory: '',
    averageRelevance: 0
  });
  const [filter, setFilter] = useState<'all' | 'conversation' | 'document' | 'fact' | 'preference'>('all');

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = () => {
    // Charger les souvenirs depuis localStorage
    const memories: MemoryItem[] = [];
    let totalRelevance = 0;
    const typeCount: Record<string, number> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('lisa:memory:')) continue;

      try {
        const value = localStorage.getItem(key);
        if (value) {
          const memory = JSON.parse(value) as MemoryItem;
          memories.push(memory);
          totalRelevance += memory.relevance;
          typeCount[memory.type] = (typeCount[memory.type] || 0) + 1;
        }
      } catch (e) {
        console.error('Erreur parsing mémoire:', e);
      }
    }

    // Trier par timestamp (plus récent d'abord)
    memories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setMemories(memories);
    setStats({
      totalItems: memories.length,
      byType: typeCount,
      oldestMemory: memories.length > 0 ? memories[memories.length - 1].timestamp : '',
      newestMemory: memories.length > 0 ? memories[0].timestamp : '',
      averageRelevance: memories.length > 0 ? Math.round(totalRelevance / memories.length) : 0
    });
  };

  const filteredMemories = filter === 'all' 
    ? memories 
    : memories.filter(m => m.type === filter);

  const getTypeColor = (type: MemoryItem['type']) => {
    switch (type) {
      case 'conversation': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
      case 'document': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'fact': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200';
      case 'preference': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200';
    }
  };

  const getTypeIcon = (type: MemoryItem['type']) => {
    switch (type) {
      case 'conversation': return '💬';
      case 'document': return '📄';
      case 'fact': return '💡';
      case 'preference': return '⭐';
    }
  };

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 80) return 'text-green-600 dark:text-green-400';
    if (relevance >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (relevance >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="text-purple-500" />
          Carte Mémoire
        </h2>
        <button
          onClick={loadMemories}
          className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          🔄 Rafraîchir
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalItems}</p>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Conversations</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.byType.conversation || 0}</p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Documents</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.byType.document || 0}</p>
        </div>
        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">Pertinence Moy.</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.averageRelevance}%</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'conversation', 'document', 'fact', 'preference'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 text-sm rounded whitespace-nowrap transition-colors ${
              filter === type
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
            }`}
          >
            {type === 'all' ? 'Tous' : type}
          </button>
        ))}
      </div>

      {/* Liste des Souvenirs */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredMemories.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aucun souvenir pour le moment</p>
          </div>
        ) : (
          filteredMemories.map(memory => (
            <div
              key={memory.id}
              onClick={() => onMemoryClick?.(memory)}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getTypeColor(memory.type)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2 flex-1">
                  <span className="text-lg">{getTypeIcon(memory.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm line-clamp-2">{memory.content}</p>
                    <p className="text-xs opacity-75 mt-1">{memory.source}</p>
                  </div>
                </div>
                <div className={`text-sm font-bold ${getRelevanceColor(memory.relevance)}`}>
                  {memory.relevance}%
                </div>
              </div>

              {/* Tags */}
              {memory.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {memory.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-black/10 dark:bg-white/10 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <div className="flex items-center gap-1 text-xs opacity-75">
                <Clock className="w-3 h-3" />
                {new Date(memory.timestamp).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="mt-6 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
        <p>💡 <strong>Comment ça marche:</strong> Lisa se souvient des conversations, documents et préférences. La pertinence indique l'importance du souvenir pour les futures interactions.</p>
      </div>
    </div>
  );
};
