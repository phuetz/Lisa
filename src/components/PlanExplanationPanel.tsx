/**
 * PlanExplanationPanel.tsx
 * 
 * Composant pour afficher des explications contextuelles sur les plans
 * générés et exécutés par le PlannerAgent.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';

interface PlanExplanationPanelProps {
  /** ID facultatif d'une trace de plan spécifique à afficher */
  traceId?: string;
  /** Style personnalisé pour le conteneur */
  style?: React.CSSProperties;
}

/**
 * Affiche une explication contextuelle des actions du système
 * en se basant sur les traces d'exécution des plans.
 */
export default function PlanExplanationPanel({ traceId, style }: PlanExplanationPanelProps) {
  const { t } = useTranslation();
  const lastPlanExplanation = useAppStore(s => s.lastPlanExplanation);
  const setLastPlanExplanation = useAppStore(s => s.setLastPlanExplanation);
  const [visible, setVisible] = useState(Boolean(lastPlanExplanation));
  const [fadeOut, setFadeOut] = useState(false);
  
  useEffect(() => {
    if (lastPlanExplanation) {
      setVisible(true);
      setFadeOut(false);
      
      // Masquer automatiquement après 10 secondes
      const hideTimeout = setTimeout(() => {
        setFadeOut(true);
        
        // Attendre que l'animation de fade-out soit terminée
        setTimeout(() => {
          setVisible(false);
        }, 500);
      }, 10000);
      
      return () => clearTimeout(hideTimeout);
    } else {
      setVisible(false);
    }
  }, [lastPlanExplanation]);
  
  // Si pas d'explication, ne rien afficher
  if (!visible || !lastPlanExplanation) return null;
  
  return (
    <div
      role="region" 
      aria-live="polite"
      aria-label={t('plan_explanation')}
      style={{
        position: 'fixed',
        bottom: 70,
        left: 20,
        right: 20,
        maxWidth: 600,
        margin: '0 auto',
        backgroundColor: 'rgba(60, 60, 60, 0.85)',
        color: '#fff',
        borderRadius: 8,
        padding: '15px 20px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        zIndex: 1000,
        transition: 'opacity 0.5s ease-in-out',
        opacity: fadeOut ? 0 : 1,
        ...style
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 'bold', fontSize: 14 }}>
          {t('lisa_is_working')}
        </div>
        <button
          aria-label={t('close')}
          onClick={() => {
            setFadeOut(true);
            setTimeout(() => {
              setVisible(false);
              setLastPlanExplanation(null);
            }, 500);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#aaa',
            cursor: 'pointer',
            fontSize: 14,
            padding: 0,
          }}
        >
          ✖
        </button>
      </div>
      
      <div style={{ 
        fontSize: 14,
        lineHeight: 1.4,
        whiteSpace: 'pre-wrap'
      }}>
        {lastPlanExplanation}
      </div>
      
      {traceId && (
        <div style={{ 
          marginTop: 12,
          fontSize: 12,
          color: '#aaa',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={() => {
              // Ouvrir le DebugPanel si besoin
              const event = new CustomEvent('open-debug-trace', { 
                detail: { traceId } 
              });
              window.dispatchEvent(event);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#8af',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
              fontSize: 12
            }}
          >
            {t('view_details')}
          </button>
        </div>
      )}
    </div>
  );
}
