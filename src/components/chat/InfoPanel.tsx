/**
 * Info Panel Component
 * Panel latéral droit avec informations contextuelles
 */

import { X, Clock, Tag, FileText, Settings } from 'lucide-react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface InfoPanelProps {
  onClose: () => void;
}

export const InfoPanel = ({ onClose }: InfoPanelProps) => {
  const { getCurrentConversation } = useChatHistoryStore();
  const conversation = getCurrentConversation();

  if (!conversation) {
    return null;
  }

  return (
    <aside className="w-[320px] bg-[#1a1a26] border-l border-[#2d2d44] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#2d2d44] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Informations</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-[#1a1a26] rounded-lg transition-colors text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Conversation Info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <FileText size={16} />
            Conversation
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Messages:</span>
              <span className="text-white font-medium">{conversation.messages.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Créée:</span>
              <span className="text-white">
                {formatDistanceToNow(conversation.createdAt, { addSuffix: true, locale: fr })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Modifiée:</span>
              <span className="text-white">
                {formatDistanceToNow(conversation.updatedAt, { addSuffix: true, locale: fr })}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Clock size={16} />
            Statistiques
          </h3>
          <div className="space-y-2">
            <div className="p-3 bg-[#1a1a26] rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Messages utilisateur</div>
              <div className="text-2xl font-bold text-white">
                {conversation.messages.filter(m => m.role === 'user').length}
              </div>
            </div>
            <div className="p-3 bg-[#1a1a26] rounded-lg">
              <div className="text-xs text-gray-400 mb-1">Messages assistant</div>
              <div className="text-2xl font-bold text-white">
                {conversation.messages.filter(m => m.role === 'assistant').length}
              </div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Tag size={16} />
            Tags
          </h3>
          {conversation.tags && conversation.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {conversation.tags.map((tag, i) => (
                <span 
                  key={i}
                  className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aucun tag</p>
          )}
        </div>

        {/* Settings */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Settings size={16} />
            Paramètres
          </h3>
          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 bg-[#1a1a26] rounded-lg cursor-pointer hover:bg-[#2d2d44] transition-colors">
              <span className="text-sm text-white">Épinglé</span>
              <input 
                type="checkbox" 
                checked={conversation.pinned}
                onChange={() => {
                  useChatHistoryStore.getState().pinConversation(conversation.id);
                }}
                className="w-4 h-4"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-[#1a1a26] rounded-lg cursor-pointer hover:bg-[#2d2d44] transition-colors">
              <span className="text-sm text-white">Archivé</span>
              <input 
                type="checkbox" 
                checked={conversation.archived}
                onChange={() => {
                  useChatHistoryStore.getState().archiveConversation(conversation.id);
                }}
                className="w-4 h-4"
              />
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default InfoPanel;
