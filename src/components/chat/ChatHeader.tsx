/**
 * Chat Header Component
 * En-tête du chat avec titre et actions
 */

import { useState } from 'react';
import { Menu, Info, Trash2, Download, Star, FileText, Share2, Copy, Link, Check, FileCode } from 'lucide-react';
import { useChatHistoryStore } from '../../store/chatHistoryStore';
import { cn } from '../../utils/cn';
import { pdfExportService } from '../../services/PDFExportService';
import { markdownExportService } from '../../services/MarkdownExportService';
import { shareService } from '../../services/ShareService';

interface ChatHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onToggleInfo: () => void;
}

export const ChatHeader = ({ sidebarOpen, onToggleSidebar, onToggleInfo }: ChatHeaderProps) => {
  const { 
    getCurrentConversation,
    clearCurrentConversation,
    exportConversation,
    currentConversationId,
    pinConversation,
  } = useChatHistoryStore();
  
  const conversation = getCurrentConversation();

  const handleClear = () => {
    if (confirm('Effacer tous les messages de cette conversation ?')) {
      clearCurrentConversation();
    }
  };

  const handleExportJSON = () => {
    if (!currentConversationId) return;
    const data = exportConversation(currentConversationId);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${currentConversationId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!conversation) return;
    const messages = conversation.messages.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      timestamp: m.timestamp,
      metadata: m.metadata,
    }));
    await pdfExportService.exportConversation(
      messages,
      `${conversation.title || 'conversation'}.pdf`,
      { title: conversation.title || 'Conversation Lisa AI' }
    );
  };

  const handleExportMarkdown = () => {
    if (!conversation) return;
    const messages = conversation.messages.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      timestamp: m.timestamp,
      metadata: m.metadata,
    }));
    const md = markdownExportService.exportConversation(messages, {
      title: conversation.title || 'Conversation Lisa AI',
    });
    markdownExportService.download(md, `${conversation.title || 'conversation'}.md`);
  };

  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const handleCopyToClipboard = async () => {
    if (!conversation) return;
    const messages = conversation.messages.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      timestamp: m.timestamp,
    }));
    const result = await shareService.copyToClipboard(messages, { format: 'text' });
    if (result.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareLink = () => {
    if (!conversation || !currentConversationId) return;
    const messages = conversation.messages.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      timestamp: m.timestamp,
    }));
    const result = shareService.generateShareLink(currentConversationId, messages, {
      title: conversation.title || 'Conversation Lisa AI',
    });
    if (result.success && result.url) {
      navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setShowShareMenu(false);
  };

  return (
    <header className="border-b border-[#404040] px-6 py-4 flex items-center justify-between bg-[#1a1a1a]">
      <div className="flex items-center gap-4">
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <Menu size={20} />
          </button>
        )}
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg">
            🤖
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">
              {conversation?.title || 'Lisa'}
            </h1>
            {conversation && (
              <p className="text-xs text-gray-400">
                {conversation.messages.length} messages
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {currentConversationId && (
          <>
            <button
              onClick={() => pinConversation(currentConversationId)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                conversation?.pinned
                  ? 'text-blue-400 bg-blue-500/20'
                  : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
              )}
              title="Épingler"
            >
              <Star size={18} fill={conversation?.pinned ? 'currentColor' : 'none'} />
            </button>
            
            <button
              onClick={handleExportJSON}
              className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Exporter JSON"
            >
              <Download size={18} />
            </button>
            
            <button
              onClick={handleExportPDF}
              className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-400 hover:text-red-400"
              title="Exporter PDF"
            >
              <FileText size={18} />
            </button>
            
            <button
              onClick={handleExportMarkdown}
              className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-400 hover:text-purple-400"
              title="Exporter Markdown"
            >
              <FileCode size={18} />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-400 hover:text-blue-400"
                title="Partager"
              >
                {copied ? <Check size={18} className="text-green-400" /> : <Share2 size={18} />}
              </button>
              
              {showShareMenu && (
                <div className="absolute right-0 top-full mt-2 bg-[#2a2a2a] rounded-lg shadow-xl border border-[#404040] py-1 z-50 min-w-[160px]">
                  <button
                    onClick={handleCopyToClipboard}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#3a3a3a] flex items-center gap-2"
                  >
                    <Copy size={14} />
                    Copier le texte
                  </button>
                  <button
                    onClick={handleShareLink}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#3a3a3a] flex items-center gap-2"
                  >
                    <Link size={14} />
                    Créer un lien
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={handleClear}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
              title="Effacer"
            >
              <Trash2 size={18} />
            </button>
          </>
        )}
        
        <div className="w-px h-6 bg-[#404040]" />
        
        <button
          onClick={onToggleInfo}
          className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-400 hover:text-white"
          title="Informations"
        >
          <Info size={18} />
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
