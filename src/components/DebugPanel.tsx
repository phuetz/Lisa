import { useVisionAudioStore } from '../store/visionAudioStore';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import usePlanTracer from '../hooks/usePlanTracer';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function DebugPanel() {
  const { t } = useTranslation();
  const snapshot = useVisionAudioStore();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'store' | 'plans' | 'trace'>('store');
  const { traces, selectedTrace, selectTrace, getTracesStats } = usePlanTracer({
    refreshInterval: 3000, // Rafraîchir toutes les 3 secondes
    limit: 10 // Limiter à 10 traces
  });

  useEffect(() => {
    // auto-open when smile+speech for demo
    if (snapshot.smileDetected && snapshot.speechDetected) setOpen(true);
  }, [snapshot.smileDetected, snapshot.speechDetected]);
  
  useEffect(() => {
    // Gestionnaire d'événement pour ouvrir le debug panel avec une trace spécifique
    const handleOpenTrace = (event: CustomEvent<{traceId: string}>) => {
      setOpen(true);
      setMode('trace');
      selectTrace(event.detail.traceId);
    };
    
    // TypeScript ne permet pas directement de typer l'événement personnalisé
    // donc on doit utiliser 'as any' ici
    window.addEventListener('open-debug-trace', handleOpenTrace as any);
    
    return () => {
      window.removeEventListener('open-debug-trace', handleOpenTrace as any);
    };
  }, [selectTrace]);
  
  // Format de date relative
  const formatRelativeTime = (timestamp: number) => {
    return formatDistance(new Date(timestamp), new Date(), {
      addSuffix: true,
      locale: fr
    });
  };

  // Rendu du contenu en fonction du mode sélectionné
  const renderContent = () => {
    switch (mode) {
      case 'store':
        return <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '400px', overflow: 'auto' }}>
          {JSON.stringify(snapshot, null, 2)}
        </pre>;
        
      case 'plans':
        const stats = getTracesStats();
        return <div style={{ maxHeight: '400px', overflow: 'auto' }}>
          <div style={{ marginBottom: '10px', padding: '5px', backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <div>Total: {stats.total} plans</div>
            <div>Réussis: {stats.successful} | Échecs: {stats.failed}</div>
            <div>Durée moyenne: {Math.round(stats.averageDuration / 1000)}s</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {traces.map(trace => (
              <div 
                key={trace.id}
                onClick={() => selectTrace(trace.id)}
                style={{
                  padding: '5px',
                  cursor: 'pointer',
                  backgroundColor: selectedTrace?.id === trace.id ? 'rgba(50,150,255,0.3)' : 'rgba(0,0,0,0.2)',
                  borderLeft: `3px solid ${trace.endTime ? 
                    (trace.summary?.includes('failed') ? '#ff5555' : '#55ff55') : 
                    '#ffff55'}`
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                  {trace.requestId.substring(0, 30)}{trace.requestId.length > 30 ? '...' : ''}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                  <span>{trace.steps.length} étapes</span>
                  <span>{formatRelativeTime(trace.startTime)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>;
        
      case 'trace':
        if (!selectedTrace) {
          return <div style={{ padding: '10px', color: '#aaaaaa' }}>
            Sélectionnez d'abord un plan dans l'onglet "Plans"
          </div>;
        }
        
        return <div style={{ maxHeight: '400px', overflow: 'auto' }}>
          <div style={{ marginBottom: '10px', padding: '5px', backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              {selectedTrace.requestId.substring(0, 50)}{selectedTrace.requestId.length > 50 ? '...' : ''}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span>Démarré: {new Date(selectedTrace.startTime).toLocaleTimeString()}</span>
              {selectedTrace.endTime && 
                <span>Durée: {Math.round((selectedTrace.endTime - selectedTrace.startTime) / 1000)}s</span>
              }
            </div>
            {selectedTrace.summary && 
              <div style={{ 
                marginTop: '5px', 
                padding: '3px', 
                backgroundColor: selectedTrace.summary.includes('failed') ? 'rgba(255,0,0,0.2)' : 'rgba(0,255,0,0.2)'
              }}>
                {selectedTrace.summary}
              </div>
            }
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {selectedTrace.steps.map(step => {
              const timestamp = new Date(step.timestamp).toLocaleTimeString();
              let icon = '🔄';
              let color = '#dddddd';
              
              // Icônes en fonction du type d'opération
              switch (step.operation) {
                case 'plan_generation': icon = '🧩'; break;
                case 'plan_execution': icon = step.details.error ? '❌' : '▶️'; break;
                case 'plan_revision': icon = '🔧'; break;
                case 'checkpoint': icon = '💾'; break;
                case 'template_operation': icon = '📋'; break;
              }
              
              return (
                <div key={step.id} style={{ padding: '5px', backgroundColor: 'rgba(0,0,0,0.2)', borderLeft: `3px solid ${color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span>
                      {icon} {step.operation}
                    </span>
                    <span style={{ color: '#aaaaaa', fontSize: '10px' }}>{timestamp}</span>
                  </div>
                  
                  {step.details.explanation && (
                    <div style={{ margin: '5px 0', padding: '3px', backgroundColor: 'rgba(255,255,255,0.1)', fontSize: '11px' }}>
                      {step.details.explanation}
                    </div>
                  )}
                  
                  {step.details.error && (
                    <div style={{ margin: '5px 0', padding: '3px', backgroundColor: 'rgba(255,0,0,0.2)', fontSize: '11px' }}>
                      {step.details.error}
                    </div>
                  )}
                  
                  {step.details.metadata && (
                    <div style={{ fontSize: '10px', color: '#aaaaaa', marginTop: '3px' }}>
                      {Object.entries(step.details.metadata).map(([key, value]) => (
                        <span key={key} style={{ marginRight: '5px' }}>{key}={String(value)}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>;
        
      default:
        return null;
    }
  };

  return (
    <div role="region" aria-live="polite" aria-label={t('debug_panel')}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        padding: open ? '10px' : '5px',
        maxWidth: open ? 500 : 80,
        maxHeight: open ? 500 : 30,
        fontSize: 12,
        overflowY: 'auto',
        zIndex: 9999,
        borderBottomLeftRadius: '5px',
        boxShadow: '0 0 10px rgba(0,0,0,0.5)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: open ? '10px' : 0 }}>
        <button onClick={() => setOpen(!open)} style={{ fontSize: 10 }}>
          {open ? t('hide') : t('debug')}
        </button>
        
        {open && (
          <div style={{ display: 'flex', gap: '5px' }}>
            <button 
              onClick={() => setMode('store')} 
              style={{ 
                fontSize: 10, 
                backgroundColor: mode === 'store' ? 'rgba(255,255,255,0.2)' : undefined 
              }}
            >
              Store
            </button>
            <button 
              onClick={() => setMode('plans')} 
              style={{ 
                fontSize: 10, 
                backgroundColor: mode === 'plans' ? 'rgba(255,255,255,0.2)' : undefined 
              }}
            >
              Plans
            </button>
            <button 
              onClick={() => setMode('trace')} 
              style={{ 
                fontSize: 10, 
                backgroundColor: mode === 'trace' ? 'rgba(255,255,255,0.2)' : undefined 
              }}
            >
              Trace
            </button>
          </div>
        )}
      </div>
      
      {open && renderContent()}
    </div>
  );
}
