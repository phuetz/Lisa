/**
 * 📄 Documents Page - Analyse de Documents
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ModernLayout } from '../components/layout/ModernLayout';
import { 
  FileText, Upload, Search, Trash2,
  Eye, AlertCircle, Loader2
} from 'lucide-react';
import { 
  documentAnalysisService, 
  type DocumentAnalysis 
} from '../services/DocumentAnalysisService';

const StatusBadge = ({ status }: { status: DocumentAnalysis['status'] }) => {
  const config = {
    pending: { color: '#666', bg: '#66666620', label: 'En attente' },
    processing: { color: '#f59e0b', bg: '#f59e0b20', label: 'Analyse...' },
    completed: { color: '#10a37f', bg: '#10a37f20', label: 'Terminé' },
    error: { color: '#ef4444', bg: '#ef444420', label: 'Erreur' },
  };

  const c = config[status];

  return (
    <span
      style={{
        padding: '4px 8px',
        backgroundColor: c.bg,
        color: c.color,
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
      }}
    >
      {c.label}
    </span>
  );
};

const DocumentCard = ({ 
  doc, 
  onView, 
  onDelete 
}: { 
  doc: DocumentAnalysis; 
  onView: (id: string) => void;
  onDelete: (id: string) => void;
}) => (
  <div
    style={{
      padding: '16px',
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      border: '1px solid #2d2d2d',
      marginBottom: '12px',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: '#2d2d2d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FileText size={20} color="#888" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ 
            fontSize: '14px', 
            fontWeight: 500, 
            color: '#fff', 
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {doc.filename}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <StatusBadge status={doc.status} />
            <span style={{ fontSize: '12px', color: '#666' }}>
              {doc.content?.wordCount || 0} mots
            </span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => onView(doc.id)}
          aria-label="Voir les détails"
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#888',
            borderRadius: '6px',
          }}
        >
          <Eye size={16} />
        </button>
        <button
          onClick={() => onDelete(doc.id)}
          aria-label="Supprimer"
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#888',
            borderRadius: '6px',
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>

    {doc.status === 'completed' && (
      <>
        {doc.summary && (
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #2d2d2d' }}>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Résumé</p>
            <p style={{ fontSize: '13px', color: '#ccc', margin: 0, lineHeight: 1.5 }}>
              {doc.summary.substring(0, 200)}...
            </p>
          </div>
        )}

        {doc.keywords && doc.keywords.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
            {doc.keywords.slice(0, 5).map((keyword, i) => (
              <span
                key={i}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#2d2d2d',
                  color: '#888',
                  borderRadius: '4px',
                  fontSize: '11px',
                }}
              >
                {keyword}
              </span>
            ))}
          </div>
        )}

        {doc.entities && doc.entities.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
              {doc.entities.length} entités détectées
            </p>
          </div>
        )}
      </>
    )}

    {doc.status === 'error' && doc.error && (
      <div style={{ 
        marginTop: '12px', 
        padding: '10px', 
        backgroundColor: '#ef444420', 
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <AlertCircle size={16} color="#ef4444" />
        <span style={{ fontSize: '12px', color: '#ef4444' }}>{doc.error}</span>
      </div>
    )}
  </div>
);

const DocumentDetail = ({ 
  doc, 
  onClose 
}: { 
  doc: DocumentAnalysis; 
  onClose: () => void;
}) => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}
    onClick={onClose}
  >
    <div
      style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '16px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '24px',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', margin: 0 }}>
            {doc.filename}
          </h2>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
            Analysé le {new Date(doc.timestamp).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2d2d2d',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Fermer
        </button>
      </div>

      {doc.summary && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>Résumé</h3>
          <p style={{ fontSize: '14px', color: '#ccc', lineHeight: 1.6, margin: 0 }}>
            {doc.summary}
          </p>
        </div>
      )}

      {doc.entities && doc.entities.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
            Entités Extraites ({doc.entities.length})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {doc.entities.map((entity, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#2d2d2d',
                  borderRadius: '6px',
                }}
              >
                <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>
                  {entity.type}
                </span>
                <p style={{ fontSize: '13px', color: '#fff', margin: '4px 0 0 0' }}>
                  {entity.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {doc.keywords && doc.keywords.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>Mots-clés</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {doc.keywords.map((keyword, i) => (
              <span
                key={i}
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#10a37f20',
                  color: '#10a37f',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {doc.content?.text && (
        <div>
          <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
            Contenu ({doc.content.wordCount} mots)
          </h3>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#0d0d0d',
              borderRadius: '8px',
              maxHeight: '300px',
              overflow: 'auto',
            }}
          >
            <pre style={{ 
              fontSize: '12px', 
              color: '#aaa', 
              margin: 0, 
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
            }}>
              {doc.content.text}
            </pre>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentAnalysis[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentAnalysis | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDocuments(documentAnalysisService.getAllAnalyses());
    const unsubscribe = documentAnalysisService.subscribe(setDocuments);
    return unsubscribe;
  }, []);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (const file of Array.from(files)) {
      await documentAnalysisService.analyzeDocument(file, file.name);
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleView = useCallback((id: string) => {
    const doc = documentAnalysisService.getAnalysis(id);
    if (doc) setSelectedDoc(doc);
  }, []);

  const handleDelete = useCallback((id: string) => {
    documentAnalysisService.deleteAnalysis(id);
  }, []);

  const filteredDocuments = documents.filter(doc =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <ModernLayout title="Documents">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={24} color="#3b82f6" />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', margin: 0 }}>
              Analyse de Documents
            </h2>
            <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0 0' }}>
              {documents.length} documents analysés
            </p>
          </div>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.jpg,.jpeg,.png,.gif"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: isUploading ? 'wait' : 'pointer',
              fontSize: '14px',
            }}
          >
            {isUploading ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Upload size={16} />
            )}
            {isUploading ? 'Analyse...' : 'Importer'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{
        position: 'relative',
        marginBottom: '24px',
      }}>
        <Search 
          size={18} 
          color="#666" 
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} 
        />
        <input
          type="text"
          placeholder="Rechercher par nom ou mot-clé..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 12px 12px 44px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #2d2d2d',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '14px',
          }}
        />
      </div>

      {/* Documents List */}
      {filteredDocuments.length > 0 ? (
        <div>
          {filteredDocuments.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onView={handleView}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#666',
        }}>
          <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>
            {searchQuery ? 'Aucun document trouvé' : 'Aucun document analysé'}
          </p>
          <p style={{ fontSize: '13px' }}>
            {searchQuery ? 'Essayez une autre recherche' : 'Importez un document pour commencer'}
          </p>
        </div>
      )}

      {/* Document Detail Modal */}
      {selectedDoc && (
        <DocumentDetail
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </ModernLayout>
  );
}
