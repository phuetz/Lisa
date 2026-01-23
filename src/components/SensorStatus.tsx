/**
 * 🔴 Sensor Status - Indicateurs d'État des Capteurs
 * Affiche l'état en temps réel des capteurs (caméra, microphone, géolocalisation)
 */

import React, { useEffect, useState } from 'react';
import { Camera, Mic, MapPin, AlertCircle } from 'lucide-react';

interface SensorState {
  camera: {
    active: boolean;
    recording: boolean;
    fps: number;
  };
  microphone: {
    active: boolean;
    recording: boolean;
    level: number; // 0-100
  };
  geolocation: {
    active: boolean;
    accuracy: number;
  };
}

interface Props {
  compact?: boolean;
  onClick?: () => void;
}

export const SensorStatus: React.FC<Props> = ({ compact = false, onClick }) => {
  const [sensors, setSensors] = useState<SensorState>({
    camera: { active: false, recording: false, fps: 0 },
    microphone: { active: false, recording: false, level: 0 },
    geolocation: { active: false, accuracy: 0 }
  });

  useEffect(() => {
    // Récupérer l'état des capteurs depuis localStorage
    const updateSensorState = () => {
      const permissions = localStorage.getItem('lisa:sensor:permissions');
      if (permissions) {
        try {
          const perms = JSON.parse(permissions);
          setSensors(prev => ({
            ...prev,
            camera: { ...prev.camera, active: perms.camera?.granted || false },
            microphone: { ...prev.microphone, active: perms.microphone?.granted || false },
            geolocation: { ...prev.geolocation, active: perms.geolocation?.granted || false }
          }));
        } catch (e) {
          console.error('Erreur parsing permissions:', e);
        }
      }
    };

    updateSensorState();

    // Écouter les changements
    const interval = setInterval(updateSensorState, 1000);
    window.addEventListener('storage', updateSensorState);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updateSensorState);
    };
  }, []);

  if (compact) {
    return (
      <div 
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={onClick}
        title="État des capteurs"
      >
        <div className={`w-2 h-2 rounded-full ${sensors.camera.active ? 'bg-red-500' : 'bg-gray-400'}`} />
        <div className={`w-2 h-2 rounded-full ${sensors.microphone.active ? 'bg-red-500' : 'bg-gray-400'}`} />
        <div className={`w-2 h-2 rounded-full ${sensors.geolocation.active ? 'bg-red-500' : 'bg-gray-400'}`} />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        État des Capteurs
      </h3>

      <div className="space-y-3">
        {/* Caméra */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className={`w-4 h-4 ${sensors.camera.active ? 'text-red-500' : 'text-gray-400'}`} />
            <span className="text-sm">Caméra</span>
          </div>
          <div className="flex items-center gap-2">
            {sensors.camera.recording && (
              <span className="text-xs text-red-500 font-semibold">● REC</span>
            )}
            <div className={`w-2 h-2 rounded-full ${sensors.camera.active ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
          </div>
        </div>

        {/* Microphone */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className={`w-4 h-4 ${sensors.microphone.active ? 'text-red-500' : 'text-gray-400'}`} />
            <span className="text-sm">Microphone</span>
          </div>
          <div className="flex items-center gap-2">
            {sensors.microphone.active && (
              <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${sensors.microphone.level}%` }}
                />
              </div>
            )}
            <div className={`w-2 h-2 rounded-full ${sensors.microphone.active ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
          </div>
        </div>

        {/* Géolocalisation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 ${sensors.geolocation.active ? 'text-red-500' : 'text-gray-400'}`} />
            <span className="text-sm">Géolocalisation</span>
          </div>
          <div className={`w-2 h-2 rounded-full ${sensors.geolocation.active ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
        </div>
      </div>

      {/* Légende */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          🔴 Actif • ⚪ Inactif
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Cliquez sur "🔐 Permissions" pour gérer
        </p>
      </div>
    </div>
  );
};
