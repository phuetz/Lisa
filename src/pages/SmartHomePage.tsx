/**
 * 🏠 Smart Home Page - Automatisation Maison Intelligente
 */

import { useState, useEffect, useCallback } from 'react';
import { ModernLayout } from '../components/layout/ModernLayout';
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
  onToggle 
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
        backgroundColor: isOn ? 'rgba(16, 163, 127, 0.1)' : '#1a1a1a',
        borderRadius: '12px',
        border: `1px solid ${isOn ? 'rgba(16, 163, 127, 0.3)' : '#2d2d2d'}`,
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
              backgroundColor: isOn ? 'rgba(16, 163, 127, 0.2)' : '#2d2d2d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={20} color={isOn ? '#10a37f' : '#666'} />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#fff', margin: 0 }}>
              {device.name}
            </p>
            <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
              {device.room}
            </p>
          </div>
        </div>
        <button
          onClick={() => onToggle(device.id, !isOn)}
          aria-label={isOn ? 'Éteindre' : 'Allumer'}
          style={{
            width: '48px',
            height: '28px',
            borderRadius: '14px',
            backgroundColor: isOn ? '#10a37f' : '#3d3d3d',
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
            backgroundColor: device.status === 'online' ? '#10a37f' : '#666',
          }}
        />
        <span style={{ fontSize: '11px', color: '#666' }}>
          {device.status === 'online' ? 'En ligne' : 'Hors ligne'}
        </span>
      </div>
    </div>
  );
};

const SceneCard = ({ 
  scene, 
  onActivate 
}: { 
  scene: Scene; 
  onActivate: (id: string) => void;
}) => (
  <button
    onClick={() => onActivate(scene.id)}
    style={{
      padding: '16px',
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      border: '1px solid #2d2d2d',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.2s ease',
      width: '100%',
    }}
  >
    <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>
      {scene.icon}
    </span>
    <p style={{ fontSize: '14px', color: '#fff', margin: 0 }}>{scene.name}</p>
    <p style={{ fontSize: '11px', color: '#666', margin: '4px 0 0 0' }}>
      {scene.devices.length} appareils
    </p>
  </button>
);

const RuleCard = ({ 
  rule, 
  onToggle, 
  onDelete 
}: { 
  rule: AutomationRule; 
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}) => (
  <div
    style={{
      padding: '14px 16px',
      backgroundColor: '#1a1a1a',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px',
    }}
  >
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: '14px', fontWeight: 500, color: '#fff', margin: 0 }}>
        {rule.name}
      </p>
      <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
        {rule.triggerCount} exécutions
      </p>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={() => onToggle(rule.id, !rule.enabled)}
        style={{
          padding: '6px 12px',
          backgroundColor: rule.enabled ? 'rgba(16, 163, 127, 0.2)' : '#2d2d2d',
          color: rule.enabled ? '#10a37f' : '#666',
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
        aria-label="Supprimer la règle"
        style={{
          padding: '6px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#666',
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
    <ModernLayout title="Maison Intelligente">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Home size={24} color="#10a37f" />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', margin: 0 }}>
              Maison Intelligente
            </h2>
            <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0 0' }}>
              {devices.length} appareils • {devices.filter(d => d.status === 'online').length} en ligne
            </p>
          </div>
        </div>
        <button
          onClick={handleDiscover}
          disabled={isDiscovering}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#10a37f',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: isDiscovering ? 'wait' : 'pointer',
            fontSize: '14px',
          }}
        >
          <RefreshCw size={16} style={{ animation: isDiscovering ? 'spin 1s linear infinite' : 'none' }} />
          {isDiscovering ? 'Recherche...' : 'Découvrir'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '1px solid #2d2d2d',
        paddingBottom: '12px',
      }}>
        {(['devices', 'scenes', 'rules'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              backgroundColor: activeTab === tab ? '#10a37f' : 'transparent',
              color: activeTab === tab ? '#fff' : '#888',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {tab === 'devices' ? 'Appareils' : tab === 'scenes' ? 'Scènes' : 'Automatisations'}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'devices' && (
        <div>
          {Object.entries(devicesByRoom).length > 0 ? (
            Object.entries(devicesByRoom).map(([room, roomDevices]) => (
              <div key={room} style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '12px', textTransform: 'uppercase' }}>
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
              color: '#666',
            }}>
              <Home size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>Aucun appareil détecté</p>
              <p style={{ fontSize: '13px' }}>Cliquez sur "Découvrir" pour rechercher des appareils</p>
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
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              border: '2px dashed #2d2d2d',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <Plus size={24} color="#666" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Nouvelle scène</p>
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
              color: '#666',
            }}>
              <Play size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>Aucune automatisation</p>
              <p style={{ fontSize: '13px' }}>Créez des règles pour automatiser votre maison</p>
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
              backgroundColor: '#1a1a1a',
              border: '2px dashed #2d2d2d',
              borderRadius: '10px',
              cursor: 'pointer',
              color: '#666',
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
    </ModernLayout>
  );
}
