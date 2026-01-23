/**
 * Chat Sidebar Component
 * Sidebar avec historique des conversations
 */

import { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  Archive,
  Pin,
  Trash2,
  Download
} from 'lucide-react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../../utils/cn';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ChatSidebar = ({ isOpen, onToggle }: ChatSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  const {
    conversations,
    currentConversationId,
    createConversation,
    setCurrentConversation,
    deleteConversation,
    archiveConversation,
    pinConversation,
    searchConversations,
  } = useChatHistoryStore();

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let result = searchQuery 
      ? searchConversations(searchQuery)
      : conversations;
    
    if (!showArchived) {
      result = result.filter(c => !c.archived);
    }
    
    // Sort: pinned first, then by date
    return result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      // Handle dates that may be strings (from localStorage) or Date objects
      const dateA = a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
      const dateB = b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [conversations, searchQuery, showArchived, searchConversations]);

  // Group by date
  const groupedConversations = useMemo(() => {
    const groups: { [key: string]: typeof filteredConversations } = {
      'Épinglé': [],
      "Aujourd'hui": [],
      'Hier': [],
      'Cette semaine': [],
      'Plus ancien': [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    filteredConversations.forEach((conv) => {
      // Handle dates that may be strings (from localStorage) or Date objects
      const convDate = conv.updatedAt instanceof Date ? conv.updatedAt : new Date(conv.updatedAt);
      
      if (conv.pinned) {
        groups['Épinglé'].push(conv);
      } else if (convDate >= today) {
        groups["Aujourd'hui"].push(conv);
      } else if (convDate >= yesterday) {
        groups['Hier'].push(conv);
      } else if (convDate >= weekAgo) {
        groups['Cette semaine'].push(conv);
      } else {
        groups['Plus ancien'].push(conv);
      }
    });

    return groups;
  }, [filteredConversations]);

  const handleNewConversation = () => {
    const id = createConversation();
    setCurrentConversation(id);
  };

  const handleExport = () => {
    const data = JSON.stringify(conversations, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lisa-conversations-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside 
      className={cn(
        'transition-all duration-300 bg-[#1a1a1a] border-r border-[#404040] flex flex-col',
        isOpen ? 'w-[280px]' : 'w-[64px]'
      )}
    >
      {/* Header avec toggle */}
      <div className="p-4 border-b border-[#404040] flex items-center justify-between">
        {isOpen && (
          <h2 className="text-lg font-semibold text-white">Conversations</h2>
        )}
        <button 
          onClick={onToggle}
          className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-400 hover:text-white"
          title={isOpen ? 'Réduire' : 'Étendre'}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Nouveau chat */}
          <div className="p-3">
            <button 
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              <Plus size={20} />
              Nouveau chat
            </button>
          </div>

          {/* Recherche */}
          <div className="px-3 pb-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2 bg-[#2a2a2a] border border-[#404040] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="px-3 pb-3 flex gap-2">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-xs transition-colors',
                showArchived 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
              )}
            >
              <Archive size={14} className="inline mr-1" />
              Archivées
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-2 bg-[#2a2a2a] text-gray-400 hover:text-white rounded-lg text-xs transition-colors"
              title="Exporter"
            >
              <Download size={14} />
            </button>
          </div>
        </>
      )}

      {/* Liste conversations */}
      <div className="flex-1 overflow-y-auto px-2">
        {isOpen ? (
          Object.entries(groupedConversations).map(([group, convs]) => {
            if (convs.length === 0) return null;
            
            return (
              <div key={group} className="mb-4">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  {group}
                </div>
                {convs.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setCurrentConversation(conv.id)}
                    className={cn(
                      'w-full group relative flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors mb-1',
                      currentConversationId === conv.id
                        ? 'bg-[#2a2a2a] text-white'
                        : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                    )}
                  >
                    <MessageSquare size={16} className="mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-left overflow-hidden">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        {conv.pinned && <Pin size={12} className="text-blue-400" />}
                        {conv.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {conv.messages.length} messages · {formatDistanceToNow(conv.updatedAt, { addSuffix: true, locale: fr })}
                      </div>
                    </div>
                    
                    {/* Actions au hover */}
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          pinConversation(conv.id);
                        }}
                        className="p-1 hover:bg-[#404040] rounded"
                        title="Épingler"
                      >
                        <Pin size={14} className={conv.pinned ? 'text-blue-400' : ''} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveConversation(conv.id);
                        }}
                        className="p-1 hover:bg-[#404040] rounded"
                        title="Archiver"
                      >
                        <Archive size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Supprimer cette conversation ?')) {
                            deleteConversation(conv.id);
                          }
                        }}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            );
          })
        ) : (
          // Icons only mode
          <div className="space-y-2">
            {filteredConversations.slice(0, 10).map((conv) => (
              <button
                key={conv.id}
                onClick={() => setCurrentConversation(conv.id)}
                className={cn(
                  'w-full p-3 rounded-lg transition-colors',
                  currentConversationId === conv.id
                    ? 'bg-[#2a2a2a] text-white'
                    : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                )}
                title={conv.title}
              >
                <MessageSquare size={20} className="mx-auto" />
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

export default ChatSidebar;
