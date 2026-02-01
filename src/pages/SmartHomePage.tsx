/**
 * Smart Home Page - Automatisation Maison Intelligente
 */

import { useState, useEffect, useCallback } from 'react';
import { OfficePageLayout } from '../components/layout/OfficePageLayout';
import { useOfficeThemeStore } from '../store/officeThemeStore';
import {
  Home, Lightbulb, Thermometer, Lock, Camera, Speaker,
  Power, Plus, Settings, Play, Trash2, RefreshCw
} from 'lucide-react';
import {
  smartHomeService,
  type SmartDevice,
  type AutomationRule,
  type Scene
} from '../services/SmartHomeService';

interface ThemeColors {
  sidebar: string;
  sidebarHover: string;
  sidebarActive: string;
  editor: string;
  editorText: string;
  editorSecondary: string;
  dialog: string;
  border: string;
  accent: string;
  success: string;
  error: string;
}

const DEVICE_ICONS: Record<string, typeof Lightbulb> = {
  light: Lightbulb,
  thermostat: Thermometer,
  lock: Lock,
  camera: Camera,
  speaker: Speaker,
  switch: Power,
  sensor: Settings,
};

const DeviceCard = ({
  device,
  onToggle,
  colors
}: {
  device: SmartDevice;
  onToggle: (id: string, state: boolean) => void;
  colors: ThemeColors;
}) => {
  const Icon = DEVICE_ICONS[device.type] || Power;
  const isOn = device.state?.on === true || device.state?.power === true;

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: isOn ? `${colors.success}15` : colors.sidebar,
        borderRadius: '12px',
        border: `1px solid ${isOn ? `${colors.success}40` : colors.border}`,
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: isOn ? `${colors.success}20` : colors.dialog,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={20} color={isOn ? colors.success : colors.editorSecondary} />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: colors.editorText, margin: 0 }}>
              {device.name}
            </p>
            <p style={{ fontSize: '12px', color: colors.editorSecondary, margin: '4px 0 0 0' }}>
              {device.room}
            </p>
          </div>
        </div>
        <button
          onClick={() => onToggle(device.id, !isOn)}
          aria-label={isOn ? 'Eteindre' : 'Allumer'}
          style={{
            width: '48px',
            height: '28px',
            borderRadius: '14px',
            backgroundColor: isOn ? colors.success : colors.sidebarHover,
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background-color 0.2s ease',
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              position: 'absolute',
              top: '2px',
              left: isOn ? '22px' : '2px',
              transition: 'left 0.2s ease',
            }}
          />
        </button>
      </div>
      <div style={{
        marginTop: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: device.status === 'online' ? colors.success : colors.editorSecondary,
          }}
        />
        <span style={{ fontSize: '11px', color: colors.editorSecondary }}>
          {device.status === 'online' ? 'En ligne' : 'Hors ligne'}
        </span>
      </div>
    </div>
  );
};

const SceneCard = ({
  scene,
  onActivate,
  colors
}: {
  scene: Scene;
  onActivate: (id: string) => void;
  colors: ThemeColors;
}) => (
  <button
    onClick={() => onActivate(scene.id)}
    style={{
      padding: '16px',
      backgroundColor: colors.sidebar,
      borderRadius: '12px',
      border: `1px solid ${colors.border}`,
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.2s ease',
      width: '100%',
    }}
  >
    <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>
      {scene.icon}
    </span>
    <p style={{ fontSize: '14px', color: colors.editorText, margin: 0 }}>{scene.name}</p>
    <p style={{ fontSize: '11px', color: colors.editorSecondary, margin: '4px 0 0 0' }}>
      {scene.devices.length} appareils
    </p>
  </button>
);

const RuleCard = ({
  rule,
  onToggle,
  onDelete,
  colors
}: {
  rule: AutomationRule;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  colors: ThemeColors;
}) => (
  <div
    style={{
      padding: '14px 16px',
      backgroundColor: colors.sidebar,
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px',
    }}
  >
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: '14px', fontWeight: 500, color: colors.editorText, margin: 0 }}>
        {rule.name}
      </p>
      <p style={{ fontSize: '12px', color: colors.editorSecondary, margin: '4px 0 0 0' }}>
        {rule.triggerCount} executions
      </p>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={() => onToggle(rule.id, !rule.enabled)}
        style={{
          padding: '6px 12px',
          backgroundColor: rule.enabled ? `${colors.success}20` : colors.dialog,
          color: rule.enabled ? colors.success : colors.editorSecondary,
          border: 'none',
          borderRadius: '6px',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        {rule.enabled ? 'Actif' : 'Inactif'}
      </button>
      <button
        onClick={() => onDelete(rule.id)}
        aria-label="Supprimer la regle"
        style={{
          padding: '6px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: colors.editorSecondary,
        }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  </div>
);

export default function SmartHomePage() {
  const [devices, setDevices] = useState<SmartDevice[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [activeTab, setActiveTab] = useState<'devices' | 'scenes' | 'rules'>('devices');

  const { getCurrentColors } = useOfficeThemeStore();
  const colors = getCurrentColors();

  useEffect(() => {
    setDevices(smartHomeService.getAllDevices());
    setScenes(smartHomeService.getAllScenes());
    setRules(smartHomeService.getAllRules());

    const unsubscribe = smartHomeService.subscribe(setDevices);
    return unsubscribe;
  }, []);

  const handleDiscover = useCallback(async () => {
    setIsDiscovering(true);
    await smartHomeService.discoverDevices();
    setIsDiscovering(false);
  }, []);

  const handleToggleDevice = useCallback(async (deviceId: string, state: boolean) => {
    await smartHomeService.controlDevice(deviceId, 'power', state);
  }, []);

  const handleActivateScene = useCallback(async (sceneId: string) => {
    await smartHomeService.activateScene(sceneId);
  }, []);

  const handleToggleRule = useCallback((ruleId: string, enabled: boolean) => {
    smartHomeService.toggleRule(ruleId, enabled);
    setRules(smartHomeService.getAllRules());
  }, []);

  const handleDeleteRule = useCallback((ruleId: string) => {
    smartHomeService.deleteRule(ruleId);
    setRules(smartHomeService.getAllRules());
  }, []);

  // Group devices by room
  const devicesByRoom = devices.reduce((acc, device) => {
    const room = device.room || 'Autre';
    if (!acc[room]) acc[room] = [];
    acc[room].push(device);
    return acc;
  }, {} as Record<string, SmartDevice[]>);

  return (
    <OfficePageLayout
      title="Maison Intelligente"
      subtitle={`${devices.length} appareils - ${devices.filter(d => d.status === 'online').length} en ligne`}
      action={
        <button
          onClick={handleDiscover}
          disabled={isDiscovering}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: colors.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: isDiscovering ? 'wait' : 'pointer',
            fontSize: '14px',
          }}
        >
          <RefreshCw size={16} style={{ animation: isDiscovering ? 'spin 1s linear infinite' : 'none' }} />
          {isDiscovering ? 'Recherche...' : 'Decouvrir'}
        </button>
      }
    >
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: `1px solid ${colors.border}`,
        paddingBottom: '12px',
      }}>
        {(['devices', 'scenes', 'rules'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === tab ? colors.accent : 'transparent',
              color: activeTab === tab ? '#fff' : colors.editorSecondary,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {tab === 'devices' ? 'Appareils' : tab === 'scenes' ? 'Scenes' : 'Automatisations'}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'devices' && (
        <div>
          {Object.entries(devicesByRoom).length > 0 ? (
            Object.entries(devicesByRoom).map(([room, roomDevices]) => (
              <div key={room} style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', color: colors.editorSecondary, marginBottom: '12px', textTransform: 'uppercase' }}>
                  {room}
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '12px',
                }}>
                  {roomDevices.map(device => (
                    <DeviceCard
                      key={device.id}
                      device={device}
                      onToggle={handleToggleDevice}
                      colors={colors}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: colors.editorSecondary,
            }}>
              <Home size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>Aucun appareil detecte</p>
              <p style={{ fontSize: '13px' }}>Cliquez sur "Decouvrir" pour rechercher des appareils</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'scenes' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '12px',
        }}>
          {scenes.map(scene => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onActivate={handleActivateScene}
              colors={colors}
            />
          ))}
          <button
            style={{
              padding: '16px',
              backgroundColor: colors.sidebar,
              borderRadius: '12px',
              border: `2px dashed ${colors.border}`,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <Plus size={24} color={colors.editorSecondary} style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '14px', color: colors.editorSecondary, margin: 0 }}>Nouvelle scene</p>
          </button>
        </div>
      )}

      {activeTab === 'rules' && (
        <div>
          {rules.length > 0 ? (
            rules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={handleToggleRule}
                onDelete={handleDeleteRule}
                colors={colors}
              />
            ))
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: colors.editorSecondary,
            }}>
              <Play size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>Aucune automatisation</p>
              <p style={{ fontSize: '13px' }}>Creez des regles pour automatiser votre maison</p>
            </div>
          )}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '14px',
              marginTop: '16px',
              backgroundColor: colors.sidebar,
              border: `2px dashed ${colors.border}`,
              borderRadius: '10px',
              cursor: 'pointer',
              color: colors.editorSecondary,
              fontSize: '14px',
            }}
          >
            <Plus size={18} />
            Nouvelle automatisation
          </button>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </OfficePageLayout>
  );
}
