/**
 * 🔐 Panel de Permissions des Capteurs
 * Gère le consentement explicite pour caméra, microphone, géolocalisation
 */

import React, { useState, useEffect } from 'react';
import { Camera, Mic, MapPin, Shield } from 'lucide-react';

export interface SensorPermissions {
  camera: {
    granted: boolean;
    scope: 'session' | 'project' | 'task';
    lastActivated?: Date;
    activationCount: number;
  };
  microphone: {
    granted: boolean;
    scope: 'session' | 'project' | 'task';
    lastActivated?: Date;
    activationCount: number;
  };
  geolocation: {
    granted: boolean;
    scope: 'session' | 'project' | 'task';
    lastActivated?: Date;
  };
}

interface Props {
  onPermissionsChange?: (permissions: SensorPermissions) => void;
  onEmergencyCutoff?: () => void;
}

export const SensorPermissionsPanel: React.FC<Props> = ({
  onPermissionsChange,
  onEmergencyCutoff
}) => {
  const [permissions, setPermissions] = useState<SensorPermissions>(() => {
    const saved = localStorage.getItem('lisa:sensor:permissions');
    return saved ? JSON.parse(saved) : {
      camera: { granted: false, scope: 'session', activationCount: 0 },
      microphone: { granted: false, scope: 'session', activationCount: 0 },
      geolocation: { granted: false, scope: 'session' }
    };
  });

  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);

  useEffect(() => {
    // Sauvegarder les permissions
    localStorage.setItem('lisa:sensor:permissions', JSON.stringify(permissions));
    localStorage.setItem('lisa:sensor:consent', 
      (permissions.camera.granted || permissions.microphone.granted) ? 'granted' : 'denied'
    );
    
    // Notifier le parent
    onPermissionsChange?.(permissions);
  }, [permissions, onPermissionsChange]);

  const handlePermissionToggle = async (sensor: keyof SensorPermissions) => {
    const current = permissions[sensor];
    const newGranted = !current.granted;

    if (newGranted) {
      // Demander la permission du navigateur
      try {
        if (sensor === 'camera') {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
        } else if (sensor === 'microphone') {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
        } else if (sensor === 'geolocation') {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
        }

        // Mise à jour des permissions
        setPermissions(prev => ({
          ...prev,
          [sensor]: {
            ...prev[sensor],
            granted: true,
            lastActivated: new Date()
          }
        }));

        // Log d'audit
        const auditLog = JSON.parse(localStorage.getItem('lisa:sensor:audit') || '[]');
        auditLog.push({
          timestamp: new Date().toISOString(),
          sensor,
          action: 'granted',
          scope: current.scope
        });
        localStorage.setItem('lisa:sensor:audit', JSON.stringify(auditLog));

      } catch (error) {
        console.error(`Permission refusée pour ${sensor}:`, error);
        alert(`Permission refusée pour ${sensor}. Veuillez vérifier les paramètres de votre navigateur.`);
      }
    } else {
      // Révoquer la permission
      setPermissions(prev => ({
        ...prev,
        [sensor]: {
          ...prev[sensor],
          granted: false
        }
      }));

      // Log d'audit
      const auditLog = JSON.parse(localStorage.getItem('lisa:sensor:audit') || '[]');
      auditLog.push({
        timestamp: new Date().toISOString(),
        sensor,
        action: 'revoked',
        scope: current.scope
      });
      localStorage.setItem('lisa:sensor:audit', JSON.stringify(auditLog));
    }
  };

  const handleScopeChange = (sensor: keyof SensorPermissions, scope: 'session' | 'project' | 'task') => {
    setPermissions(prev => ({
      ...prev,
      [sensor]: {
        ...prev[sensor],
        scope
      }
    }));
  };

  const handleEmergencyCutoff = () => {
    if (!showEmergencyConfirm) {
      setShowEmergencyConfirm(true);
      return;
    }

    // Couper tous les capteurs
    setPermissions({
      camera: { granted: false, scope: 'session', activationCount: 0 },
      microphone: { granted: false, scope: 'session', activationCount: 0 },
      geolocation: { granted: false, scope: 'session' }
    });

    // Stopper les streams actifs
    if (window.lisaStopCamera) window.lisaStopCamera();
    if (window.lisaStopMicrophone) window.lisaStopMicrophone();

    // Log d'audit
    const auditLog = JSON.parse(localStorage.getItem('lisa:sensor:audit') || '[]');
    auditLog.push({
      timestamp: new Date().toISOString(),
      action: 'EMERGENCY_CUTOFF',
      allSensors: true
    });
    localStorage.setItem('lisa:sensor:audit', JSON.stringify(auditLog));

    onEmergencyCutoff?.();
    setShowEmergencyConfirm(false);

    alert('🔴 Tous les capteurs ont été coupés');
  };

  const exportAuditLog = () => {
    const auditLog = localStorage.getItem('lisa:sensor:audit') || '[]';
    const blob = new Blob([auditLog], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lisa-sensor-audit-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="text-blue-500" />
          Permissions des Capteurs
        </h2>
        
        {/* Bouton Coupure d'Urgence */}
        <button
          onClick={handleEmergencyCutoff}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            showEmergencyConfirm 
              ? 'bg-red-600 text-white animate-pulse' 
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {showEmergencyConfirm ? '⚠️ CONFIRMER COUPURE' : '🔴 COUPURE D\'URGENCE'}
        </button>
      </div>

      {showEmergencyConfirm && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 rounded-lg">
          <p className="text-red-700 dark:text-red-300">
            ⚠️ Êtes-vous sûr? Tous les capteurs seront immédiatement coupés.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Camera */}
        <div className="border dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Camera className={permissions.camera.granted ? 'text-green-500' : 'text-gray-400'} />
              <div>
                <h3 className="font-semibold">Caméra</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Détection visage, mains, objets
                </p>
              </div>
            </div>
            
            <button
              onClick={() => handlePermissionToggle('camera')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                permissions.camera.granted
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
              }`}
            >
              {permissions.camera.granted ? '✅ Activé' : 'Désactivé'}
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            <span className="text-sm text-gray-600">Portée:</span>
            {(['session', 'project', 'task'] as const).map(scope => (
              <button
                key={scope}
                onClick={() => handleScopeChange('camera', scope)}
                className={`px-3 py-1 text-sm rounded ${
                  permissions.camera.scope === scope
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {scope}
              </button>
            ))}
          </div>

          {permissions.camera.lastActivated && (
            <p className="text-xs text-gray-500 mt-2">
              Dernière activation: {new Date(permissions.camera.lastActivated).toLocaleString()}
            </p>
          )}
        </div>

        {/* Microphone */}
        <div className="border dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Mic className={permissions.microphone.granted ? 'text-green-500' : 'text-gray-400'} />
              <div>
                <h3 className="font-semibold">Microphone</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Commandes vocales, transcription
                </p>
              </div>
            </div>
            
            <button
              onClick={() => handlePermissionToggle('microphone')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                permissions.microphone.granted
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
              }`}
            >
              {permissions.microphone.granted ? '✅ Activé' : 'Désactivé'}
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            <span className="text-sm text-gray-600">Portée:</span>
            {(['session', 'project', 'task'] as const).map(scope => (
              <button
                key={scope}
                onClick={() => handleScopeChange('microphone', scope)}
                className={`px-3 py-1 text-sm rounded ${
                  permissions.microphone.scope === scope
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {scope}
              </button>
            ))}
          </div>

          {permissions.microphone.lastActivated && (
            <p className="text-xs text-gray-500 mt-2">
              Dernière activation: {new Date(permissions.microphone.lastActivated).toLocaleString()}
            </p>
          )}
        </div>

        {/* Geolocation */}
        <div className="border dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <MapPin className={permissions.geolocation.granted ? 'text-green-500' : 'text-gray-400'} />
              <div>
                <h3 className="font-semibold">Géolocalisation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Services contextuels, météo locale
                </p>
              </div>
            </div>
            
            <button
              onClick={() => handlePermissionToggle('geolocation')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                permissions.geolocation.granted
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
              }`}
            >
              {permissions.geolocation.granted ? '✅ Activé' : 'Désactivé'}
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            <span className="text-sm text-gray-600">Portée:</span>
            {(['session', 'project', 'task'] as const).map(scope => (
              <button
                key={scope}
                onClick={() => handleScopeChange('geolocation', scope)}
                className={`px-3 py-1 text-sm rounded ${
                  permissions.geolocation.scope === scope
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {scope}
              </button>
            ))}
          </div>

          {permissions.geolocation.lastActivated && (
            <p className="text-xs text-gray-500 mt-2">
              Dernière activation: {new Date(permissions.geolocation.lastActivated).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Export Audit Log */}
      <div className="mt-6 pt-6 border-t dark:border-gray-700">
        <button
          onClick={exportAuditLog}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          📥 Exporter le Journal d'Audit
        </button>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Journal local des activations de capteurs (JSON, sans données personnelles)
        </p>
      </div>
    </div>
  );
};
