/**
 * ShareButton Component
 * Bouton pour partager une conversation ou un message
 */

import { useState } from 'react';
import { Share2, Copy, Download, Link, Check, X } from 'lucide-react';
import { shareService, type ChatMessage } from '../../services/ShareService';
import { useMobile } from '../../hooks/useMobile';

interface ShareButtonProps {
  messages: ChatMessage[];
  conversationId?: string;
  title?: string;
  size?: number;
}

export const ShareButton = ({ messages, conversationId, title, size = 18 }: ShareButtonProps) => {
  const [showOptions, setShowOptions] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const { hapticTap, hapticSuccess, hapticError } = useMobile();

  const showStatus = (success: boolean, message: string) => {
    setStatus(success ? 'success' : 'error');
    setStatusMessage(message);
    
    if (success) hapticSuccess();
    else hapticError();

    setTimeout(() => {
      setStatus('idle');
      setStatusMessage('');
    }, 2000);
  };

  const handleCopy = async () => {
    hapticTap();
    setShowOptions(false);
    const result = await shareService.copyToClipboard(messages, { title });
    showStatus(result.success, result.message || '');
  };

  const handleNativeShare = async () => {
    hapticTap();
    setShowOptions(false);
    const result = await shareService.shareNative(messages, { title });
    showStatus(result.success, result.message || '');
  };

  const handleDownload = () => {
    hapticTap();
    setShowOptions(false);
    const filename = `conversation-${new Date().toISOString().split('T')[0]}`;
    const result = shareService.downloadAsFile(messages, filename, { title, format: 'markdown' });
    showStatus(result.success, result.message || '');
  };

  const handleGenerateLink = () => {
    hapticTap();
    setShowOptions(false);
    if (!conversationId) {
      showStatus(false, 'ID de conversation manquant');
      return;
    }
    const result = shareService.generateShareLink(conversationId, messages, { title });
    if (result.success && result.url) {
      navigator.clipboard.writeText(result.url);
      showStatus(true, 'Lien copié !');
    } else {
      showStatus(false, result.message || 'Erreur');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Main Button */}
      <button
        onClick={() => { hapticTap(); setShowOptions(!showOptions); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '8px',
          color: '#8e8ea0',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <Share2 size={size} />
      </button>

      {/* Options Popup */}
      {showOptions && (
        <>
          <div
            onClick={() => setShowOptions(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              marginBottom: '8px',
              backgroundColor: '#12121a',
              borderRadius: '12px',
              padding: '8px',
              zIndex: 101,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              minWidth: '180px',
            }}
          >
            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                textAlign: 'left',
              }}
            >
              <Copy size={16} />
              Copier le texte
            </button>

            {shareService.isNativeShareAvailable() && (
              <button
                onClick={handleNativeShare}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  textAlign: 'left',
                }}
              >
                <Share2 size={16} />
                Partager...
              </button>
            )}

            <button
              onClick={handleDownload}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                textAlign: 'left',
              }}
            >
              <Download size={16} />
              Télécharger
            </button>

            {conversationId && (
              <button
                onClick={handleGenerateLink}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  textAlign: 'left',
                }}
              >
                <Link size={16} />
                Copier le lien
              </button>
            )}
          </div>
        </>
      )}

      {/* Status Toast */}
      {status !== 'idle' && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: status === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            zIndex: 200,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          {status === 'success' ? <Check size={18} /> : <X size={18} />}
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default ShareButton;
