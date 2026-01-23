import { useState } from 'react';
import { ModernLayout } from '../components/layout/ModernLayout';
import { User, Bell, Palette, Globe, Save, Check, ChevronRight, Cpu } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { AVAILABLE_LLMS, AVAILABLE_VISION_MODELS } from '../config';
import { visionSense } from '../features/vision/api';

// Settings Section Component
const SettingsSection = ({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode;
}) => (
  <div style={{
    backgroundColor: '#2d2d2d',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px'
  }}>
    <h3 style={{ 
      fontSize: '16px', 
      fontWeight: 600, 
      color: '#fff', 
      marginBottom: '16px',
      margin: '0 0 16px 0'
    }}>
      {title}
    </h3>
    {children}
  </div>
);

// Input Component
const SettingsInput = ({ 
  label, 
  value, 
  onChange, 
  type = 'text' 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  type?: string;
}) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ 
      display: 'block', 
      fontSize: '13px', 
      color: '#888', 
      marginBottom: '8px' 
    }}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '12px 14px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #404040',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        outline: 'none'
      }}
    />
  </div>
);

// Select Component
const SettingsSelect = ({ 
  label, 
  value, 
  onChange, 
  options 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  options: { value: string; label: string }[];
}) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ 
      display: 'block', 
      fontSize: '13px', 
      color: '#888', 
      marginBottom: '8px' 
    }}>
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '12px 14px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #404040',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        outline: 'none',
        cursor: 'pointer'
      }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// Toggle Component
const SettingsToggle = ({ 
  label, 
  description, 
  checked, 
  onChange 
}: { 
  label: string; 
  description?: string; 
  checked: boolean; 
  onChange: (checked: boolean) => void;
}) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #404040'
  }}>
    <div>
      <p style={{ fontSize: '14px', color: '#fff', marginBottom: description ? '4px' : 0 }}>{label}</p>
      {description && <p style={{ fontSize: '12px', color: '#666' }}>{description}</p>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        backgroundColor: checked ? '#10a37f' : '#404040',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background-color 0.2s ease'
      }}
    >
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: '#fff',
        position: 'absolute',
        top: '2px',
        left: checked ? '22px' : '2px',
        transition: 'left 0.2s ease'
      }} />
    </button>
  </div>
);

// Tab Item Component
const TabItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="nav-item"
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      backgroundColor: active ? '#2d2d2d' : 'transparent',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      marginBottom: '4px',
      transition: 'all 0.2s ease'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <Icon size={20} color={active ? '#10a37f' : '#888'} />
      <span style={{ fontSize: '14px', color: active ? '#fff' : '#888' }}>{label}</span>
    </div>
    <ChevronRight size={16} color={active ? '#10a37f' : '#666'} />
  </button>
);

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  
  // App Store for AI settings
  const selectedLLM = useAppStore(s => s.selectedLLM);
  const selectedVisionModel = useAppStore(s => s.selectedVisionModel);
  const setState = useAppStore(s => s.setState);

  // Local settings state (for mock/other settings not yet in store)
  const [settings, setSettings] = useState({
    username: 'User',
    email: 'user@example.com',
    language: 'fr',
    theme: 'dark',
    notifications: true,
    autoSave: true,
    soundEffects: true,
    darkMode: true,
  });

  const handleSave = () => {
    console.log('Saving settings:', settings);
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'ai', label: 'IA & Modèles', icon: Cpu },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Apparence', icon: Palette },
    { id: 'language', label: 'Langue', icon: Globe },
  ];

  return (
    <ModernLayout
      title="Paramètres"
      action={
        <button
          onClick={handleSave}
          style={{
            padding: '10px 16px',
            backgroundColor: '#10a37f',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Save size={18} />
          Sauvegarder
        </button>
      }
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: '24px'
      }}>
        {/* Sidebar Tabs */}
        <div style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '12px',
          padding: '12px',
          height: 'fit-content'
        }}>
          {tabs.map(tab => (
            <TabItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        {/* Content */}
        <div>
          {activeTab === 'profile' && (
            <SettingsSection title="Informations du profil">
              <SettingsInput
                label="Nom d'utilisateur"
                value={settings.username}
                onChange={(value) => setSettings({ ...settings, username: value })}
              />
              <SettingsInput
                label="Email"
                type="email"
                value={settings.email}
                onChange={(value) => setSettings({ ...settings, email: value })}
              />
              <div style={{
                padding: '16px',
                backgroundColor: '#1a1a1a',
                borderRadius: '10px',
                marginTop: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10a37f, #1a7f64)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <User size={24} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>{settings.username}</p>
                    <p style={{ fontSize: '12px', color: '#888' }}>{settings.email}</p>
                  </div>
                </div>
              </div>
            </SettingsSection>
          )}

          {activeTab === 'ai' && (
            <SettingsSection title="Intelligence Artificielle">
              <SettingsSelect
                label="Modèle de Langage (LLM)"
                value={selectedLLM}
                onChange={(value) => setState({ selectedLLM: value })}
                options={AVAILABLE_LLMS.map(llm => ({
                  value: llm.id,
                  label: `${llm.name} (${llm.provider})`
                }))}
              />
              <div style={{ padding: '12px', backgroundColor: '#1a1a1a', borderRadius: '8px', marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', color: '#888', lineHeight: '1.5' }}>
                  Le modèle LLM est le "cerveau" conversationnel de Lisa. Les modèles plus gros (ex: GPT-4) sont plus intelligents mais peuvent être plus lents ou coûteux. Les modèles locaux garantissent une confidentialité totale.
                </p>
              </div>

              <SettingsSelect
                label="Modèle de Vision"
                value={selectedVisionModel}
                onChange={(value) => {
                  setState({ selectedVisionModel: value });
                  visionSense.setModel(value);
                }}
                options={AVAILABLE_VISION_MODELS.map(model => ({
                  value: model.id,
                  label: model.name
                }))}
              />
              <div style={{ padding: '12px', backgroundColor: '#1a1a1a', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: '#888', lineHeight: '1.5' }}>
                  YOLOv8 est recommandé pour une détection rapide et précise via WebGL. MediaPipe est une alternative légère fonctionnant sur CPU.
                </p>
              </div>
            </SettingsSection>
          )}

          {activeTab === 'notifications' && (
            <SettingsSection title="Préférences de notification">
              <SettingsToggle
                label="Activer les notifications"
                description="Recevoir des alertes pour les événements importants"
                checked={settings.notifications}
                onChange={(checked) => setSettings({ ...settings, notifications: checked })}
              />
              <SettingsToggle
                label="Sauvegarde automatique"
                description="Sauvegarder automatiquement vos conversations"
                checked={settings.autoSave}
                onChange={(checked) => setSettings({ ...settings, autoSave: checked })}
              />
              <SettingsToggle
                label="Effets sonores"
                description="Jouer des sons pour les notifications"
                checked={settings.soundEffects}
                onChange={(checked) => setSettings({ ...settings, soundEffects: checked })}
              />
            </SettingsSection>
          )}

          {activeTab === 'appearance' && (
            <SettingsSection title="Personnalisation">
              <SettingsSelect
                label="Thème"
                value={settings.theme}
                onChange={(value) => setSettings({ ...settings, theme: value })}
                options={[
                  { value: 'dark', label: 'Sombre' },
                  { value: 'light', label: 'Clair' },
                  { value: 'auto', label: 'Automatique' },
                ]}
              />
              <SettingsToggle
                label="Mode sombre"
                description="Utiliser le thème sombre pour l'interface"
                checked={settings.darkMode}
                onChange={(checked) => setSettings({ ...settings, darkMode: checked })}
              />
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginTop: '16px'
              }}>
                {['#10a37f', '#3b82f6', '#8b5cf6'].map(color => (
                  <button
                    key={color}
                    style={{
                      padding: '16px',
                      backgroundColor: '#1a1a1a',
                      border: color === '#10a37f' ? `2px solid ${color}` : '2px solid transparent',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {color === '#10a37f' && <Check size={16} color="#fff" />}
                    </div>
                  </button>
                ))}
              </div>
            </SettingsSection>
          )}

          {activeTab === 'language' && (
            <SettingsSection title="Langue et région">
              <SettingsSelect
                label="Langue de l'interface"
                value={settings.language}
                onChange={(value) => setSettings({ ...settings, language: value })}
                options={[
                  { value: 'fr', label: 'Français' },
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Español' },
                  { value: 'de', label: 'Deutsch' },
                ]}
              />
              <div style={{
                padding: '16px',
                backgroundColor: '#1a1a1a',
                borderRadius: '10px',
                marginTop: '16px'
              }}>
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                  Langue actuelle
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Globe size={20} color="#10a37f" />
                  <span style={{ fontSize: '14px', color: '#fff' }}>
                    {settings.language === 'fr' ? 'Français' : 
                     settings.language === 'en' ? 'English' : 
                     settings.language === 'es' ? 'Español' : 'Deutsch'}
                  </span>
                </div>
              </div>
            </SettingsSection>
          )}
        </div>
      </div>
    </ModernLayout>
  );
}
