/**
 * SettingsBeautiful.tsx
 * 
 * Page de paramètres avec design époustouflant et UX parfaite
 */

import { useState, useEffect } from 'react';
import {
  Settings, User, Bell, Shield, Palette, Globe, 
  Volume2, Eye, Brain, Zap, Moon, Sun, Monitor,
  Check, ChevronRight, Save, RotateCcw, Sparkles
} from 'lucide-react';
import { AuroraBackground } from '../components/ui/AnimatedBackground';
import { GlowingCard } from '../components/ui/GlowingCard';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'cyan' | 'emerald' | 'rose' | 'amber';
}

const sections: SettingSection[] = [
  { id: 'profile', title: 'Profil', description: 'Informations personnelles', icon: User, color: 'blue' },
  { id: 'notifications', title: 'Notifications', description: 'Alertes et rappels', icon: Bell, color: 'purple' },
  { id: 'privacy', title: 'Confidentialité', description: 'Données et permissions', icon: Shield, color: 'cyan' },
  { id: 'appearance', title: 'Apparence', description: 'Thème et affichage', icon: Palette, color: 'emerald' },
  { id: 'language', title: 'Langue', description: 'Région et format', icon: Globe, color: 'amber' },
  { id: 'ai', title: 'Intelligence IA', description: 'Comportement de Lisa', icon: Brain, color: 'rose' },
];

export default function SettingsBeautiful() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState('appearance');
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Settings states
  const [settings, setSettings] = useState({
    notifications: { email: true, push: true, sound: true, desktop: false },
    privacy: { analytics: true, personalization: true, history: true },
    ai: { proactive: true, voice: true, learning: true, suggestions: true },
    appearance: { animations: true, blur: true, compactMode: false },
  });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const updateSetting = (category: string, key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [category]: { ...prev[category as keyof typeof prev], [key]: value }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
  };

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
        enabled ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-all duration-300 ${
          enabled ? 'left-7' : 'left-1'
        }`}
      />
    </button>
  );

  const renderAppearanceSettings = () => (
    <div className="space-y-6">
      {/* Theme Selection */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Thème</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'dark', label: 'Sombre', icon: Moon },
            { id: 'light', label: 'Clair', icon: Sun },
            { id: 'system', label: 'Système', icon: Monitor },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id as typeof theme); setHasChanges(true); }}
              className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                theme === t.id
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              <t.icon className="w-6 h-6" />
              <span className="text-sm font-medium">{t.label}</span>
              {theme === t.id && (
                <Check className="w-4 h-4 text-blue-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Options visuelles</h3>
        {[
          { key: 'animations', label: 'Animations', description: 'Effets de transition fluides' },
          { key: 'blur', label: 'Effets de flou', description: 'Glassmorphism et backdrop blur' },
          { key: 'compactMode', label: 'Mode compact', description: 'Interface plus dense' },
        ].map((option) => (
          <div key={option.key} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl">
            <div>
              <p className="font-medium text-white">{option.label}</p>
              <p className="text-sm text-slate-400">{option.description}</p>
            </div>
            <ToggleSwitch
              enabled={settings.appearance[option.key as keyof typeof settings.appearance]}
              onChange={() => updateSetting('appearance', option.key, !settings.appearance[option.key as keyof typeof settings.appearance])}
            />
          </div>
        ))}
      </div>

      {/* Accent Color */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Couleur d'accent</h3>
        <div className="flex gap-3">
          {[
            { color: 'bg-blue-500', name: 'Bleu' },
            { color: 'bg-purple-500', name: 'Violet' },
            { color: 'bg-cyan-500', name: 'Cyan' },
            { color: 'bg-emerald-500', name: 'Émeraude' },
            { color: 'bg-rose-500', name: 'Rose' },
            { color: 'bg-amber-500', name: 'Ambre' },
          ].map((c, i) => (
            <button
              key={c.name}
              className={`w-10 h-10 rounded-full ${c.color} ring-2 ring-offset-2 ring-offset-slate-900 transition-all hover:scale-110 ${
                i === 0 ? 'ring-blue-500' : 'ring-transparent hover:ring-slate-600'
              }`}
              title={c.name}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderAISettings = () => (
    <div className="space-y-4">
      <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span className="font-semibold text-white">Lisa Intelligence</span>
        </div>
        <p className="text-sm text-slate-400">
          Personnalisez le comportement de votre assistant IA pour une expérience optimale.
        </p>
      </div>

      {[
        { key: 'proactive', label: 'Suggestions proactives', description: 'Lisa propose des actions automatiquement', icon: Zap },
        { key: 'voice', label: 'Commandes vocales', description: 'Contrôle par la voix activé', icon: Volume2 },
        { key: 'learning', label: 'Apprentissage adaptatif', description: 'Lisa apprend de vos préférences', icon: Brain },
        { key: 'suggestions', label: 'Suggestions contextuelles', description: 'Recommandations basées sur le contexte', icon: Eye },
      ].map((option) => (
        <div key={option.key} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl group hover:bg-slate-800/60 transition-colors">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <option.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-white">{option.label}</p>
              <p className="text-sm text-slate-400">{option.description}</p>
            </div>
          </div>
          <ToggleSwitch
            enabled={settings.ai[option.key as keyof typeof settings.ai]}
            onChange={() => updateSetting('ai', option.key, !settings.ai[option.key as keyof typeof settings.ai])}
          />
        </div>
      ))}
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-4">
      {[
        { key: 'email', label: 'Notifications email', description: 'Recevoir des résumés par email' },
        { key: 'push', label: 'Notifications push', description: 'Alertes en temps réel' },
        { key: 'sound', label: 'Sons', description: 'Effets sonores pour les alertes' },
        { key: 'desktop', label: 'Notifications bureau', description: 'Pop-ups sur le bureau' },
      ].map((option) => (
        <div key={option.key} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl">
          <div>
            <p className="font-medium text-white">{option.label}</p>
            <p className="text-sm text-slate-400">{option.description}</p>
          </div>
          <ToggleSwitch
            enabled={settings.notifications[option.key as keyof typeof settings.notifications]}
            onChange={() => updateSetting('notifications', option.key, !settings.notifications[option.key as keyof typeof settings.notifications])}
          />
        </div>
      ))}
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-4">
      <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          <span className="font-semibold text-white">Vos données sont protégées</span>
        </div>
        <p className="text-sm text-slate-400">
          Toutes vos données sont chiffrées et stockées localement. Vous gardez le contrôle total.
        </p>
      </div>

      {[
        { key: 'analytics', label: 'Analytiques anonymes', description: 'Aide à améliorer Lisa' },
        { key: 'personalization', label: 'Personnalisation', description: 'Expérience adaptée à vos besoins' },
        { key: 'history', label: 'Historique des conversations', description: 'Conserver l\'historique des échanges' },
      ].map((option) => (
        <div key={option.key} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl">
          <div>
            <p className="font-medium text-white">{option.label}</p>
            <p className="text-sm text-slate-400">{option.description}</p>
          </div>
          <ToggleSwitch
            enabled={settings.privacy[option.key as keyof typeof settings.privacy]}
            onChange={() => updateSetting('privacy', option.key, !settings.privacy[option.key as keyof typeof settings.privacy])}
          />
        </div>
      ))}

      <button className="w-full mt-4 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl hover:bg-rose-500/20 transition-colors">
        Supprimer toutes mes données
      </button>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'appearance': return renderAppearanceSettings();
      case 'ai': return renderAISettings();
      case 'notifications': return renderNotificationSettings();
      case 'privacy': return renderPrivacySettings();
      default: return (
        <div className="text-center py-12 text-slate-400">
          <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Section en cours de développement</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen relative">
      <AuroraBackground intensity="subtle" />

      <div className="relative z-10 p-6 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <header className={`mb-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                <span className="animate-gradient-text">Paramètres</span>
              </h1>
              <p className="text-slate-400">
                Personnalisez votre expérience Lisa selon vos préférences
              </p>
            </div>
            {hasChanges && (
              <div className="flex items-center gap-3 animate-fade-in-up">
                <button
                  onClick={() => setHasChanges(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 text-slate-400 rounded-xl hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className={`grid grid-cols-1 lg:grid-cols-4 gap-6 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Sidebar */}
          <GlowingCard glowColor="blue" className="lg:col-span-1 h-fit">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{section.title}</p>
                      <p className="text-xs text-slate-500 truncate">{section.description}</p>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </button>
                );
              })}
            </nav>
          </GlowingCard>

          {/* Content */}
          <GlowingCard glowColor="purple" className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">
                {sections.find(s => s.id === activeSection)?.title}
              </h2>
              <p className="text-slate-400">
                {sections.find(s => s.id === activeSection)?.description}
              </p>
            </div>
            {renderContent()}
          </GlowingCard>
        </div>
      </div>
    </div>
  );
}
