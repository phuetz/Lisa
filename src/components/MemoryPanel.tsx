/**
 * MemoryPanel.tsx
 * 
 * Interface utilisateur pour la gestion des mémoires de Lisa.
 * Permet à l'utilisateur de visualiser, rechercher, ajouter et modifier les mémoires.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMemory } from '../hooks/useMemory';
import type { Memory } from '../agents/MemoryAgent';

const MemoryPanel: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'recent' | 'search' | 'add'>('recent');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchText, setSearchText] = useState('');
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryType, setNewMemoryType] = useState<Memory['type']>('fact');
  const [newMemoryTags, setNewMemoryTags] = useState('');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Memory[]>([]);

  const { 
    storeMemory, 
    retrieveMemories, 
    updateMemory, 
    deleteMemory, 
    getRecentMemories, 
    isLoading, 
    error, 
    clearError 
  } = useMemory({ defaultLimit: 10 });

  // Chargement initial des mémoires récentes
  useEffect(() => {
    loadRecentMemories();
  }, []);

  // Charger les mémoires récentes
  const loadRecentMemories = async () => {
    const recentMemories = await getRecentMemories(10);
    setMemories(recentMemories);
  };

  // Rechercher des mémoires
  const handleSearch = async () => {
    if (!searchText.trim()) {
      return;
    }
    
    const results = await retrieveMemories({
      text: searchText,
      limit: 20
    });
    
    setSearchResults(results);
  };

  // Ajouter une nouvelle mémoire
  const handleAddMemory = async () => {
    if (!newMemoryContent.trim()) {
      return;
    }
    
    const tags = newMemoryTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    await storeMemory(newMemoryContent, {
      type: newMemoryType,
      tags,
      source: 'manual_entry'
    });
    
    setNewMemoryContent('');
    setNewMemoryTags('');
    loadRecentMemories();
    setActiveTab('recent');
  };

  // Supprimer une mémoire
  const handleDeleteMemory = async (id: string) => {
    if (window.confirm(t('memory.confirmDelete'))) {
      await deleteMemory(id);
      
      // Mise à jour des listes
      if (activeTab === 'recent') {
        loadRecentMemories();
      } else if (activeTab === 'search') {
        setSearchResults(prev => prev.filter(mem => mem.id !== id));
      }
    }
  };

  // Commencer à éditer une mémoire
  const handleStartEditing = (memory: Memory) => {
    setEditingMemoryId(memory.id);
    setNewMemoryContent(memory.content);
    setNewMemoryType(memory.type);
    setNewMemoryTags(memory.tags.join(', '));
  };

  // Sauvegarder les modifications d'une mémoire
  const handleSaveEdit = async (id: string) => {
    const tags = newMemoryTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    await updateMemory(id, {
      content: newMemoryContent,
      type: newMemoryType,
      tags
    });
    
    setEditingMemoryId(null);
    
    // Mise à jour des listes
    if (activeTab === 'recent') {
      loadRecentMemories();
    } else if (activeTab === 'search') {
      const updatedResults = await retrieveMemories({
        text: searchText,
        limit: 20
      });
      setSearchResults(updatedResults);
    }
  };

  // Annuler l'édition
  const handleCancelEdit = () => {
    setEditingMemoryId(null);
  };

  // Format de date pour l'affichage
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Rendu d'une mémoire
  const renderMemory = (memory: Memory) => {
    const isEditing = editingMemoryId === memory.id;
    
    if (isEditing) {
      return (
        <div key={memory.id} className="memory-item editing">
          <div className="memory-edit-form">
            <select 
              value={newMemoryType}
              onChange={e => setNewMemoryType(e.target.value as Memory['type'])}
              className="memory-type-select"
            >
              <option value="fact">{t('memory.types.fact')}</option>
              <option value="preference">{t('memory.types.preference')}</option>
              <option value="interaction">{t('memory.types.interaction')}</option>
              <option value="context">{t('memory.types.context')}</option>
            </select>
            
            <textarea
              value={newMemoryContent}
              onChange={e => setNewMemoryContent(e.target.value)}
              className="memory-content-input"
            />
            
            <input 
              type="text"
              value={newMemoryTags}
              onChange={e => setNewMemoryTags(e.target.value)}
              placeholder={t('memory.tagsPlaceholder')}
              className="memory-tags-input"
            />
            
            <div className="memory-edit-actions">
              <button onClick={() => handleSaveEdit(memory.id)}>
                {t('common.save')}
              </button>
              <button onClick={handleCancelEdit} className="secondary">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div key={memory.id} className={`memory-item memory-type-${memory.type}`}>
        <div className="memory-header">
          <span className="memory-type">{t(`memory.types.${memory.type}`)}</span>
          <span className="memory-date">{formatDate(memory.timestamp)}</span>
        </div>
        
        <p className="memory-content">{memory.content}</p>
        
        {memory.tags.length > 0 && (
          <div className="memory-tags">
            {memory.tags.map(tag => (
              <span key={tag} className="memory-tag">{tag}</span>
            ))}
          </div>
        )}
        
        <div className="memory-actions">
          <button onClick={() => handleStartEditing(memory)} className="icon-button">
            ✏️
          </button>
          <button onClick={() => handleDeleteMemory(memory.id)} className="icon-button danger">
            🗑️
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="panel memory-panel">
      <h2>{t('memory.title')}</h2>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={clearError}>{t('common.dismiss')}</button>
        </div>
      )}
      
      <div className="memory-tabs">
        <button 
          className={activeTab === 'recent' ? 'active' : ''}
          onClick={() => { setActiveTab('recent'); loadRecentMemories(); }}
        >
          {t('memory.tabs.recent')}
        </button>
        <button 
          className={activeTab === 'search' ? 'active' : ''}
          onClick={() => setActiveTab('search')}
        >
          {t('memory.tabs.search')}
        </button>
        <button 
          className={activeTab === 'add' ? 'active' : ''}
          onClick={() => setActiveTab('add')}
        >
          {t('memory.tabs.add')}
        </button>
      </div>
      
      <div className="memory-tab-content">
        {/* Onglet Récentes */}
        {activeTab === 'recent' && (
          <div className="memory-recent">
            {isLoading ? (
              <div className="loading">{t('common.loading')}</div>
            ) : memories.length === 0 ? (
              <p className="empty-message">{t('memory.noMemories')}</p>
            ) : (
              <div className="memory-list">
                {memories.map(memory => renderMemory(memory))}
              </div>
            )}
            <button onClick={loadRecentMemories} className="refresh-button">
              {t('memory.refresh')}
            </button>
          </div>
        )}
        
        {/* Onglet Recherche */}
        {activeTab === 'search' && (
          <div className="memory-search">
            <div className="search-form">
              <input 
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder={t('memory.searchPlaceholder')}
                className="search-input"
              />
              <button onClick={handleSearch} disabled={isLoading}>
                {t('common.search')}
              </button>
            </div>
            
            {isLoading ? (
              <div className="loading">{t('common.loading')}</div>
            ) : searchResults.length > 0 ? (
              <div className="memory-list search-results">
                {searchResults.map(memory => renderMemory(memory))}
              </div>
            ) : searchText ? (
              <p className="empty-message">{t('memory.noResults')}</p>
            ) : null}
          </div>
        )}
        
        {/* Onglet Ajouter */}
        {activeTab === 'add' && (
          <div className="memory-add">
            <div className="add-form">
              <label>
                {t('memory.type')}
                <select 
                  value={newMemoryType}
                  onChange={e => setNewMemoryType(e.target.value as Memory['type'])}
                  className="memory-type-select"
                >
                  <option value="fact">{t('memory.types.fact')}</option>
                  <option value="preference">{t('memory.types.preference')}</option>
                  <option value="interaction">{t('memory.types.interaction')}</option>
                  <option value="context">{t('memory.types.context')}</option>
                </select>
              </label>
              
              <label>
                {t('memory.content')}
                <textarea
                  value={newMemoryContent}
                  onChange={e => setNewMemoryContent(e.target.value)}
                  className="memory-content-input"
                  placeholder={t('memory.contentPlaceholder')}
                  rows={4}
                />
              </label>
              
              <label>
                {t('memory.tags')}
                <input 
                  type="text"
                  value={newMemoryTags}
                  onChange={e => setNewMemoryTags(e.target.value)}
                  placeholder={t('memory.tagsPlaceholder')}
                  className="memory-tags-input"
                />
              </label>
              
              <button 
                onClick={handleAddMemory} 
                disabled={isLoading || !newMemoryContent.trim()}
              >
                {t('memory.addButton')}
              </button>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        .memory-panel {
          padding: 1rem;
          background-color: rgba(255, 255, 255, 0.9);
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          max-width: 800px;
          margin: 0 auto;
        }
        
        .memory-tabs {
          display: flex;
          margin-bottom: 1rem;
          border-bottom: 1px solid #ddd;
        }
        
        .memory-tabs button {
          padding: 0.5rem 1rem;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 500;
          color: #555;
        }
        
        .memory-tabs button.active {
          color: #007bff;
          border-bottom: 2px solid #007bff;
        }
        
        .memory-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .memory-item {
          border-radius: 8px;
          padding: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          position: relative;
        }
        
        .memory-type-fact {
          background-color: #e3f2fd;
        }
        
        .memory-type-preference {
          background-color: #e8f5e9;
        }
        
        .memory-type-interaction {
          background-color: #fff8e1;
        }
        
        .memory-type-context {
          background-color: #f3e5f5;
        }
        
        .memory-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        
        .memory-type {
          font-weight: 600;
          color: #333;
        }
        
        .memory-date {
          font-size: 0.8rem;
          color: #777;
        }
        
        .memory-content {
          margin: 0.5rem 0;
          font-size: 1rem;
          line-height: 1.5;
          color: #333;
        }
        
        .memory-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .memory-tag {
          background-color: rgba(0, 0, 0, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        .memory-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .icon-button {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.25rem;
        }
        
        .icon-button.danger {
          color: #dc3545;
        }
        
        .memory-edit-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .memory-type-select,
        .memory-content-input,
        .memory-tags-input {
          padding: 0.5rem;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .memory-content-input {
          resize: vertical;
          min-height: 100px;
        }
        
        .memory-edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .search-form {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .search-input {
          flex: 1;
          padding: 0.5rem;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .add-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .add-form label {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-weight: 500;
        }
        
        .empty-message {
          text-align: center;
          margin: 2rem 0;
          color: #666;
        }
        
        .loading {
          text-align: center;
          margin: 2rem 0;
          color: #666;
          font-style: italic;
        }
        
        .error-message {
          background-color: #f8d7da;
          color: #721c24;
          padding: 0.75rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .refresh-button {
          margin-top: 1rem;
          align-self: center;
        }
      `}</style>
    </div>
  );
};

export default MemoryPanel;
