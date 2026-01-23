/**
 * ExportPDF Component
 * Exporte une conversation en PDF avec support LaTeX, tableaux et graphiques
 * Utilise html2canvas pour capturer le rendu et jsPDF pour générer le PDF
 */

import { useState, useRef, useCallback } from 'react';
import { FileDown, Loader2, CheckCircle, XCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { Message } from '../../types/chat';

interface ExportPDFProps {
  messages: Message[];
  conversationTitle: string;
  onClose?: () => void;
}

type ExportStatus = 'idle' | 'preparing' | 'rendering' | 'generating' | 'success' | 'error';

export const ExportPDF = ({ messages, conversationTitle, onClose }: ExportPDFProps) => {
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const exportToPDF = useCallback(async () => {
    if (!contentRef.current || messages.length === 0) return;

    try {
      setStatus('preparing');
      setProgress(10);

      // Attendre que le contenu soit complètement rendu (notamment KaTeX)
      await new Promise(resolve => setTimeout(resolve, 500));

      setStatus('rendering');
      setProgress(30);

      // Capturer le contenu HTML en canvas
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // Haute résolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Appliquer des styles pour l'impression
          const container = clonedDoc.querySelector('[data-export-content]');
          if (container) {
            (container as HTMLElement).style.padding = '20px';
          }
        }
      });

      setProgress(60);
      setStatus('generating');

      // Créer le PDF
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: imgHeight > pageHeight ? 'portrait' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Ajouter le titre
      pdf.setFontSize(16);
      pdf.setTextColor(33, 33, 33);
      pdf.text(conversationTitle, 15, 15);
      
      // Ajouter la date
      pdf.setFontSize(10);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Exporté le ${new Date().toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, 15, 22);

      setProgress(80);

      // Ajouter l'image du contenu
      const imgData = canvas.toDataURL('image/png');
      const marginTop = 30;
      const marginLeft = 10;
      const contentWidth = imgWidth - 2 * marginLeft;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      // Gérer les pages multiples si nécessaire
      let heightLeft = contentHeight;
      let position = marginTop;
      pdf.addImage(imgData, 'PNG', marginLeft, position, contentWidth, contentHeight);
      heightLeft -= (pageHeight - marginTop);

      while (heightLeft > 0) {
        position = heightLeft - contentHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', marginLeft, position, contentWidth, contentHeight);
        heightLeft -= pageHeight;
      }

      setProgress(95);

      // Ajouter les numéros de page
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Page ${i} / ${totalPages}`, imgWidth - 25, pageHeight - 10);
        pdf.text('Lisa AI', 15, pageHeight - 10);
      }

      // Télécharger le PDF
      const fileName = `${conversationTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      setProgress(100);
      setStatus('success');

      // Fermer après succès
      setTimeout(() => {
        onClose?.();
      }, 2000);

    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }, [messages, conversationTitle, onClose]);

  const getStatusText = () => {
    switch (status) {
      case 'preparing': return 'Préparation du contenu...';
      case 'rendering': return 'Rendu des formules et graphiques...';
      case 'generating': return 'Génération du PDF...';
      case 'success': return 'Export réussi !';
      case 'error': return `Erreur: ${errorMessage}`;
      default: return 'Prêt à exporter';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #333',
          paddingBottom: '16px'
        }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
            📄 Export PDF
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          backgroundColor: status === 'error' ? '#3f1515' : '#252525',
          borderRadius: '8px'
        }}>
          {status === 'idle' && <FileDown size={20} color="#888" />}
          {['preparing', 'rendering', 'generating'].includes(status) && (
            <Loader2 size={20} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
          )}
          {status === 'success' && <CheckCircle size={20} color="#22c55e" />}
          {status === 'error' && <XCircle size={20} color="#ef4444" />}
          
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontSize: '14px' }}>{getStatusText()}</div>
            {status !== 'idle' && status !== 'error' && (
              <div style={{
                marginTop: '8px',
                height: '4px',
                backgroundColor: '#333',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  backgroundColor: status === 'success' ? '#22c55e' : '#3b82f6',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          maxHeight: '400px'
        }}>
          <div 
            ref={contentRef}
            data-export-content
            style={{
              padding: '24px',
              color: '#333',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {messages.map((message, index) => (
              <div 
                key={message.id || index}
                style={{
                  marginBottom: '24px',
                  paddingBottom: '16px',
                  borderBottom: index < messages.length - 1 ? '1px solid #eee' : 'none'
                }}
              >
                <div style={{
                  fontWeight: 600,
                  color: message.role === 'assistant' ? '#059669' : '#3b82f6',
                  marginBottom: '8px',
                  fontSize: '14px'
                }}>
                  {message.role === 'assistant' ? '🤖 Lisa' : '👤 Vous'}
                </div>
                <div style={{ fontSize: '14px', lineHeight: 1.6 }}>
                  <MarkdownRenderer content={message.content} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          paddingTop: '16px',
          borderTop: '1px solid #333'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#333',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Annuler
          </button>
          <button
            onClick={exportToPDF}
            disabled={status !== 'idle' && status !== 'error'}
            style={{
              padding: '10px 20px',
              backgroundColor: status === 'success' ? '#22c55e' : '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: status === 'idle' || status === 'error' ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: status !== 'idle' && status !== 'error' ? 0.7 : 1
            }}
          >
            <FileDown size={16} />
            {status === 'success' ? 'Téléchargé !' : 'Exporter en PDF'}
          </button>
        </div>
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ExportPDF;
