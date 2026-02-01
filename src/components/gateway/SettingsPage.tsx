/**
 * Lisa Settings Page
 * Comprehensive settings management UI
 */

import { useState, useEffect } from 'react';
import { getSettingsManager, getThemeManager } from '../../gateway';
import type { Settings } from '../../gateway';

type SettingsCategory = keyof Settings;

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');
  const [_hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const manager = getSettingsManager();
    setSettings(manager.getAll());

    const handleChange = () => {
      setSettings(manager.getAll());
    };

    manager.on('settings:changed', handleChange);
    manager.on('setting:changed', handleChange);

    return () => {
      manager.off('settings:changed', handleChange);
      manager.off('setting:changed', handleChange);
    };
  }, []);

  const handleSettingChange = (category: SettingsCategory, key: string, value: unknown) => {
    const manager = getSettingsManager();
    manager.setSetting(category, key as keyof Settings[typeof category], value as never);
    setHasChanges(true);

    // Apply theme immediately if changed
    if (category === 'appearance' && key === 'theme') {
      const themeManager = getThemeManager();
      themeManager.setTheme(value as string);
    }
  };

  const handleReset = (category: SettingsCategory) => {
    const manager = getSettingsManager();
    manager.resetCategory(category);
    setHasChanges(true);
  };

  const handleResetAll = () => {
    if (confirm('Réinitialiser tous les paramètres ?')) {
      const manager = getSettingsManager();
      manager.resetAll();
      setHasChanges(false);
    }
  };

  const handleExport = () => {
    const manager = getSettingsManager();
    const data = manager.exportSettings();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lisa-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        const manager = getSettingsManager();
        if (manager.importSettings(text)) {
          alert('Paramètres importés avec succès');
        } else {
          alert('Erreur lors de l\'importation');
        }
      }
    };
    input.click();
  };

  if (!settings) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  const categories: { key: SettingsCategory; label: string; icon: string }[] = [
    { key: 'general', label: 'Général', icon: '⚙️' },
    { key: 'appearance', label: 'Apparence', icon: '🎨' },
    { key: 'chat', label: 'Chat', icon: '💬' },
    { key: 'ai', label: 'Intelligence Artificielle', icon: '🤖' },
    { key: 'voice', label: 'Voix', icon: '🎤' },
    { key: 'notifications', label: 'Notifications', icon: '🔔' },
    { key: 'privacy', label: 'Confidentialité', icon: '🔒' },
    { key: 'accessibility', label: 'Accessibilité', icon: '♿' },
    { key: 'advanced', label: 'Avancé', icon: '🔧' }
  ];

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h2 style={styles.sidebarTitle}>⚙️ Paramètres</h2>
        <nav style={styles.nav}>
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                ...styles.navItem,
                ...(activeCategory === cat.key ? styles.navItemActive : {})
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </nav>
        
        <div style={styles.sidebarActions}>
          <button onClick={handleExport} style={styles.actionButton}>
            📥 Exporter
          </button>
          <button onClick={handleImport} style={styles.actionButton}>
            📤 Importer
          </button>
          <button onClick={handleResetAll} style={styles.dangerButton}>
            🔄 Tout réinitialiser
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.contentHeader}>
          <h3 style={styles.contentTitle}>
            {categories.find(c => c.key === activeCategory)?.icon}{' '}
            {categories.find(c => c.key === activeCategory)?.label}
          </h3>
          <button 
            onClick={() => handleReset(activeCategory)}
            style={styles.resetButton}
          >
            Réinitialiser cette section
          </button>
        </div>

        <div style={styles.settingsGrid}>
          {renderCategorySettings(activeCategory, settings, handleSettingChange)}
        </div>
      </div>
    </div>
  );
}

function renderCategorySettings(
  category: SettingsCategory,
  settings: Settings,
  onChange: (category: SettingsCategory, key: string, value: unknown) => void
) {
  const categorySettings = settings[category];
  
  return Object.entries(categorySettings).map(([key, value]) => {
    const settingKey = key as string;
    const settingValue = value;

    return (
      <SettingItem
        key={settingKey}
        category={category}
        settingKey={settingKey}
        value={settingValue}
        onChange={(newValue) => onChange(category, settingKey, newValue)}
      />
    );
  });
}

function SettingItem({
  category: _category,
  settingKey,
  value,
  onChange
}: {
  category: SettingsCategory;
  settingKey: string;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const labels: Record<string, string> = {
    language: 'Langue',
    timezone: 'Fuseau horaire',
    dateFormat: 'Format de date',
    timeFormat: 'Format d\'heure',
    theme: 'Thème',
    fontSize: 'Taille de police',
    fontFamily: 'Police',
    compactMode: 'Mode compact',
    showAvatars: 'Afficher les avatars',
    animationsEnabled: 'Animations',
    sendOnEnter: 'Envoyer avec Entrée',
    showTimestamps: 'Afficher les horodatages',
    groupMessages: 'Grouper les messages',
    enableMarkdown: 'Activer Markdown',
    enableCodeHighlight: 'Coloration syntaxique',
    enableLatex: 'Rendu LaTeX',
    maxHistoryLength: 'Longueur historique max',
    defaultModel: 'Modèle par défaut',
    temperature: 'Température',
    maxTokens: 'Tokens maximum',
    streamResponses: 'Streaming des réponses',
    showThinking: 'Afficher la réflexion',
    autoSuggest: 'Auto-suggestion',
    enabled: 'Activé',
    wakeWord: 'Mot de réveil',
    sensitivity: 'Sensibilité',
    autoListen: 'Écoute automatique',
    speakResponses: 'Lire les réponses',
    voiceId: 'Voix',
    sound: 'Son',
    desktop: 'Notifications bureau',
    quietHoursEnabled: 'Heures calmes',
    quietHoursStart: 'Début heures calmes',
    quietHoursEnd: 'Fin heures calmes',
    saveHistory: 'Sauvegarder l\'historique',
    shareAnalytics: 'Partager les analytics',
    encryptStorage: 'Chiffrer le stockage',
    highContrast: 'Contraste élevé',
    reducedMotion: 'Réduire les animations',
    screenReaderMode: 'Mode lecteur d\'écran',
    keyboardNavigation: 'Navigation clavier',
    focusIndicators: 'Indicateurs de focus',
    developerMode: 'Mode développeur',
    debugLogging: 'Logs de debug',
    experimentalFeatures: 'Fonctionnalités expérimentales',
    apiEndpoint: 'Endpoint API',
    timeout: 'Timeout (ms)'
  };

  const label = labels[settingKey] || settingKey;

  // Determine input type
  if (typeof value === 'boolean') {
    return (
      <div style={styles.settingItem}>
        <div style={styles.settingInfo}>
          <label style={styles.settingLabel}>{label}</label>
        </div>
        <label style={styles.toggle}>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            style={styles.toggleInput}
          />
          <span style={{
            ...styles.toggleSlider,
            backgroundColor: value ? '#3b82f6' : '#444'
          }} />
        </label>
      </div>
    );
  }

  if (typeof value === 'number') {
    const isRange = ['temperature', 'sensitivity', 'fontSize'].includes(settingKey);
    const min = settingKey === 'temperature' || settingKey === 'sensitivity' ? 0 : 
                settingKey === 'fontSize' ? 10 : 0;
    const max = settingKey === 'temperature' || settingKey === 'sensitivity' ? 1 : 
                settingKey === 'fontSize' ? 24 : 100000;
    const step = settingKey === 'temperature' || settingKey === 'sensitivity' ? 0.1 : 1;

    return (
      <div style={styles.settingItem}>
        <div style={styles.settingInfo}>
          <label style={styles.settingLabel}>{label}</label>
          <span style={styles.settingValue}>{value}</span>
        </div>
        {isRange ? (
          <input
            type="range"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            style={styles.rangeInput}
          />
        ) : (
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            style={styles.numberInput}
          />
        )}
      </div>
    );
  }

  // Select for specific fields
  if (settingKey === 'theme') {
    return (
      <div style={styles.settingItem}>
        <label style={styles.settingLabel}>{label}</label>
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          style={styles.select}
        >
          <option value="lisa-dark">Lisa Dark</option>
          <option value="lisa-light">Lisa Light</option>
          <option value="midnight-purple">Midnight Purple</option>
          <option value="ocean-blue">Ocean Blue</option>
        </select>
      </div>
    );
  }

  if (settingKey === 'defaultModel') {
    return (
      <div style={styles.settingItem}>
        <label style={styles.settingLabel}>{label}</label>
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          style={styles.select}
        >
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="claude-3-opus">Claude 3 Opus</option>
          <option value="claude-3-sonnet">Claude 3 Sonnet</option>
          <option value="gemini-pro">Gemini Pro</option>
        </select>
      </div>
    );
  }

  if (settingKey === 'language') {
    return (
      <div style={styles.settingItem}>
        <label style={styles.settingLabel}>{label}</label>
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          style={styles.select}
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="de">Deutsch</option>
        </select>
      </div>
    );
  }

  if (settingKey === 'timeFormat') {
    return (
      <div style={styles.settingItem}>
        <label style={styles.settingLabel}>{label}</label>
        <select
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          style={styles.select}
        >
          <option value="24h">24 heures</option>
          <option value="12h">12 heures (AM/PM)</option>
        </select>
      </div>
    );
  }

  // Default text input
  return (
    <div style={styles.settingItem}>
      <label style={styles.settingLabel}>{label}</label>
      <input
        type="text"
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
        style={styles.textInput}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100%',
    backgroundColor: '#0a0a0a',
    color: '#fff'
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#888'
  },
  sidebar: {
    width: '280px',
    backgroundColor: '#1a1a1a',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #333'
  },
  sidebarTitle: {
    margin: '0 0 24px 0',
    fontSize: '20px',
    fontWeight: 600
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'left',
    transition: 'all 0.15s'
  },
  navItemActive: {
    backgroundColor: '#252525',
    color: '#fff'
  },
  sidebarActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #333'
  },
  actionButton: {
    padding: '10px 16px',
    backgroundColor: '#252525',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    textAlign: 'left'
  },
  dangerButton: {
    padding: '10px 16px',
    backgroundColor: '#3f1515',
    border: 'none',
    borderRadius: '6px',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '13px',
    textAlign: 'left'
  },
  content: {
    flex: 1,
    padding: '32px',
    overflowY: 'auto'
  },
  contentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  contentTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600
  },
  resetButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #444',
    borderRadius: '6px',
    color: '#888',
    cursor: 'pointer',
    fontSize: '13px'
  },
  settingsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#1a1a1a',
    borderRadius: '10px',
    gap: '20px'
  },
  settingInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  settingLabel: {
    fontSize: '14px',
    fontWeight: 500
  },
  settingValue: {
    fontSize: '13px',
    color: '#888',
    backgroundColor: '#252525',
    padding: '4px 8px',
    borderRadius: '4px',
    minWidth: '40px',
    textAlign: 'center'
  },
  toggle: {
    position: 'relative',
    display: 'inline-block',
    width: '48px',
    height: '26px',
    cursor: 'pointer'
  },
  toggleInput: {
    opacity: 0,
    width: 0,
    height: 0
  },
  toggleSlider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: '13px',
    transition: '0.2s'
  },
  rangeInput: {
    width: '200px',
    accentColor: '#3b82f6'
  },
  numberInput: {
    width: '100px',
    padding: '8px 12px',
    backgroundColor: '#252525',
    border: '1px solid #333',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px'
  },
  textInput: {
    width: '200px',
    padding: '8px 12px',
    backgroundColor: '#252525',
    border: '1px solid #333',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px'
  },
  select: {
    padding: '8px 12px',
    backgroundColor: '#252525',
    border: '1px solid #333',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    minWidth: '180px'
  }
};

export default SettingsPage;
