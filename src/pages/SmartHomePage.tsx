/**
 * Smart Home Page - Automatisation Maison Intelligente
 */

import { useState, useEffect, useCallback } from 'react';
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
}: {
  device: SmartDevice;
  onToggle: (id: string, state: boolean) => void;
}) => {
  const Icon = DEVICE_ICONS[device.type] || Power;
  const isOn = device.state?.on === true || device.state?.power === true;

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: isOn ? 'rgba(var(--color-green-rgb, 16, 163, 127), 0.08)' : 'var(--bg-panel)',
        borderRadius: '12px',
        border: isOn ? '1px solid rgba(var(--color-green-rgb, 16, 163, 127), 0.25)' : '1px solid var(--border-primary)',
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
              backgroundColor: isOn ? 'rgba(var(--color-green-rgb, 16, 163, 127), 0.12)' : 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={20} color={isOn ? 'var(--color-green)' : 'var(--text-secondary)'} />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
              {device.name}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
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
            backgroundColor: isOn ? 'var(--color-green)' : 'var(--bg-hover)',
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
            backgroundColor: device.status === 'online' ? 'var(--color-green)' : 'var(--text-secondary)',
          }}
        />
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          {device.status === 'online' ? 'En ligne' : 'Hors ligne'}
        </span>
      </div>
    </div>
  );
};

const SceneCard = ({
  scene,
  onActivate,
}: {
  scene: Scene;
  onActivate: (id: string) => void;
}) => (
  <button
    onClick={() => onActivate(scene.id)}
    style={{
      padding: '16px',
      backgroundColor: 'var(--bg-panel)',
      borderRadius: '12px',
      border: '1px solid var(--border-primary)',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.2s ease',
      width: '100%',
    }}
  >
    <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>
      {scene.icon}
    </span>
    <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>{scene.name}</p>
    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
      {scene.devices.length} appareils
    </p>
  </button>
);

const RuleCard = ({
  rule,
  onToggle,
  onDelete,
}: {
  rule: AutomationRule;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}) => (
  <div
    style={{
      padding: '14px 16px',
      backgroundColor: 'var(--bg-panel)',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px',
    }}
  >
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
        {rule.name}
      </p>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
        {rule.triggerCount} executions
      </p>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={() => onToggle(rule.id, !rule.enabled)}
        style={{
          padding: '6px 12px',
          backgroundColor: rule.enabled ? 'rgba(var(--color-green-rgb, 16, 163, 127), 0.12)' : 'var(--bg-surface)',
          color: rule.enabled ? 'var(--color-green)' : 'var(--text-secondary)',
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
          color: 'var(--text-secondary)',
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
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Maison Intelligente</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{devices.length} appareils - {devices.filter(d => d.status === 'online').length} en ligne</p>
        </div>
        <button
          onClick={handleDiscover}
          disabled={isDiscovering}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--bg-deep)',
            border: 'none',
            borderRadius: '8px',
            cursor: isDiscovering ? 'wait' : 'pointer',
            fontSize: '14px',
          }}
        >
          <RefreshCw size={16} style={{ animation: isDiscovering ? 'spin 1s linear infinite' : 'none' }} />
          {isDiscovering ? 'Recherche...' : 'Decouvrir'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-primary)',
        paddingBottom: '12px',
      }}>
        {(['devices', 'scenes', 'rules'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === tab ? 'var(--color-accent)' : 'transparent',
              color: activeTab === tab ? 'var(--bg-deep)' : 'var(--text-secondary)',
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
                <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>
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
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--text-secondary)',
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
            />
          ))}
          <button
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-panel)',
              borderRadius: '12px',
              border: '2px dashed var(--border-primary)',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <Plus size={24} color="var(--text-secondary)" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Nouvelle scene</p>
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
              />
            ))
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--text-secondary)',
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
              backgroundColor: 'var(--bg-panel)',
              border: '2px dashed var(--border-primary)',
              borderRadius: '10px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
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
    </div>
  );
}
