/**
 * Workspace Settings Persistence
 * Stores workspace settings in localStorage (simple key-value, no IndexedDB needed)
 */

import type { WorkspaceSettings } from '../types/promptcommander';

const SETTINGS_KEY = 'lisa_workspace_settings';

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  theme: 'dark',
  locale: 'fr',
  currency: 'USD',
  defaultProviderId: 'gemini',
  defaultModelId: 'gemini-2.0-flash',
  defaultRoleId: 'role-assistant',
  temperature: 0.7,
  maxTokens: 4096,
  streamResponses: true,
  contextStrategy: 'full',
  contextMaxMessages: 50,
  fontSize: 'base',
  densityMode: 'comfortable',
  confirmBeforeDelete: true,
  enableTTS: true,
  enableSTT: true,
  ttsVoice: '',
  notificationSound: true,
  onboardingCompleted: false,
  autoArchiveDays: 0,
};

export function loadSettings(): WorkspaceSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('[Settings] Failed to load settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: WorkspaceSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('[Settings] Failed to save settings:', error);
  }
}

export function updateSettings(partial: Partial<WorkspaceSettings>): WorkspaceSettings {
  const current = loadSettings();
  const updated = { ...current, ...partial };
  saveSettings(updated);
  return updated;
}
