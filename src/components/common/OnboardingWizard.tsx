/**
 * Onboarding Wizard (C11)
 * First-run setup wizard for Lisa.
 * Steps: Welcome → API Keys → Default Model → Complete
 */

import { useState, useCallback } from 'react';
import { Sparkles, Key, Cpu, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { PROVIDERS } from '../../domain/modelCatalog';
import type { ProviderKey } from '../../types/promptcommander';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const STEPS = ['welcome', 'apikeys', 'model', 'complete'] as const;
type Step = typeof STEPS[number];

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const [step, setStep] = useState<Step>('welcome');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const settings = useSettingsStore();

  const stepIndex = STEPS.indexOf(step);

  const goNext = useCallback(() => {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  }, [stepIndex]);

  const goBack = useCallback(() => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev);
  }, [stepIndex]);

  const handleSaveKeys = useCallback(async () => {
    for (const [provider, key] of Object.entries(apiKeys)) {
      if (key.trim()) {
        await settings.setCredential(provider as ProviderKey, key.trim());
      }
    }
    goNext();
  }, [apiKeys, settings, goNext]);

  const handleComplete = useCallback(() => {
    settings.updateSettings({ onboardingCompleted: true });
    onComplete();
  }, [settings, onComplete]);

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 10000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  };

  const cardStyle: React.CSSProperties = {
    width: '95vw', maxWidth: '520px', backgroundColor: 'var(--bg-surface)',
    borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-secondary)',
    padding: '32px', boxShadow: 'var(--shadow-modal)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px', color: 'var(--text-tertiary)', marginBottom: '24px', lineHeight: 1.5,
  };

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 20px', borderRadius: 'var(--radius-md)', border: 'none',
    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    transition: 'background 0.15s',
  };

  const primaryBtn: React.CSSProperties = {
    ...btnStyle, backgroundColor: 'var(--color-accent)', color: '#fff',
  };

  const secondaryBtn: React.CSSProperties = {
    ...btnStyle, backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'monospace',
    outline: 'none',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: i <= stepIndex ? 'var(--color-accent)' : 'var(--border-primary)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        {step === 'welcome' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <Sparkles size={48} color="var(--color-accent)" />
            </div>
            <div style={{ ...titleStyle, textAlign: 'center' }}>Bienvenue dans Lisa</div>
            <div style={{ ...subtitleStyle, textAlign: 'center' }}>
              Assistant IA multi-sensoriel avec 60+ agents, workflows visuels et support multi-providers.
              Configurons votre environnement en quelques étapes.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button onClick={goNext} style={primaryBtn}>
                Commencer <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {step === 'apikeys' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Key size={24} color="var(--color-accent)" />
              <div style={titleStyle}>Clés API</div>
            </div>
            <div style={subtitleStyle}>
              Ajoutez au moins une clé API pour commencer. Vous pourrez en ajouter d'autres plus tard.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {(['gemini', 'openai', 'anthropic'] as ProviderKey[]).map(provider => (
                <div key={provider}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    {PROVIDERS[provider]?.name || provider}
                  </label>
                  <input
                    type="password"
                    value={apiKeys[provider] || ''}
                    onChange={e => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                    placeholder={PROVIDERS[provider]?.keyPlaceholder || '...'}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={goBack} style={secondaryBtn}>
                <ArrowLeft size={16} /> Retour
              </button>
              <button onClick={handleSaveKeys} style={primaryBtn}>
                Suivant <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {step === 'model' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Cpu size={24} color="var(--color-accent)" />
              <div style={titleStyle}>Modèle par défaut</div>
            </div>
            <div style={subtitleStyle}>
              Choisissez le modèle IA par défaut. Gemini 2.0 Flash est recommandé (rapide et économique).
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {[
                { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Rapide, 1M contexte, $0.10/1M tokens' },
                { id: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Compact et efficace, $0.15/1M tokens' },
                { id: 'claude-haiku-35', label: 'Claude Haiku 3.5', desc: 'Rapide et précis, $0.80/1M tokens' },
              ].map(model => (
                <button
                  key={model.id}
                  onClick={() => settings.updateSettings({ defaultModelId: model.id })}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: settings.settings.defaultModelId === model.id
                      ? '2px solid var(--color-accent)'
                      : '1px solid var(--border-primary)',
                    backgroundColor: settings.settings.defaultModelId === model.id
                      ? 'var(--color-accent-subtle)'
                      : 'var(--bg-surface)',
                    color: 'var(--text-primary)', textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{model.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{model.desc}</div>
                  </div>
                  {settings.settings.defaultModelId === model.id && (
                    <Check size={18} color="var(--color-accent)" />
                  )}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={goBack} style={secondaryBtn}>
                <ArrowLeft size={16} /> Retour
              </button>
              <button onClick={goNext} style={primaryBtn}>
                Suivant <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {step === 'complete' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <Check size={48} color="var(--color-accent)" />
            </div>
            <div style={{ ...titleStyle, textAlign: 'center' }}>Tout est prêt !</div>
            <div style={{ ...subtitleStyle, textAlign: 'center' }}>
              Lisa est configurée. Vous pouvez modifier les paramètres à tout moment
              depuis le menu latéral.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button onClick={handleComplete} style={primaryBtn}>
                Commencer à discuter <Sparkles size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
