/**
 * MetaHumanUE56Controls.tsx
 * 
 * Interface de contrôle pour les fonctionnalités Unreal Engine 5.6
 * Lumen, Nanite, Chaos Physics, MetaSound
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  Slider,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  Button,
  Chip
} from '@mui/material';
import LightMode from '@mui/icons-material/LightMode';
import Memory from '@mui/icons-material/Memory';
import Science from '@mui/icons-material/Science';
import VolumeUp from '@mui/icons-material/VolumeUp';
import Settings from '@mui/icons-material/Settings';
import { useUnrealEngine } from '../hooks/useUnrealEngine';

interface UE56Settings {
  lumen: {
    globalIllumination: boolean;
    reflections: boolean;
    quality: 'low' | 'medium' | 'high' | 'epic';
    updateRate: number;
  };
  nanite: {
    enabled: boolean;
    clusterCulling: boolean;
    programmableRaster: boolean;
    maxTriangles: number;
  };
  chaos: {
    enabled: boolean;
    clothSimulation: boolean;
    hairPhysics: boolean;
    fluidSimulation: boolean;
  };
  metaSound: {
    volume: number;
    pitch: number;
    spatialAudio: boolean;
  };
}

export const MetaHumanUE56Controls: React.FC = () => {
  const { configureLumen, configureNanite, configureChaosPhysics, playMetaSound, status } = useUnrealEngine();
  
  const [settings, setSettings] = useState<UE56Settings>({
    lumen: {
      globalIllumination: true,
      reflections: true,
      quality: 'high',
      updateRate: 60
    },
    nanite: {
      enabled: true,
      clusterCulling: true,
      programmableRaster: true,
      maxTriangles: 1000000
    },
    chaos: {
      enabled: true,
      clothSimulation: true,
      hairPhysics: true,
      fluidSimulation: false
    },
    metaSound: {
      volume: 0.8,
      pitch: 1.0,
      spatialAudio: true
    }
  });

  const handleLumenUpdate = () => {
    configureLumen(settings.lumen);
  };

  const handleNaniteUpdate = () => {
    configureNanite(settings.nanite);
  };

  const handleChaosUpdate = () => {
    configureChaosPhysics(settings.chaos);
  };

  const handleMetaSoundTest = () => {
    playMetaSound({
      soundAsset: '/Game/MetaHuman/Audio/TestSound',
      ...settings.metaSound,
      position: { x: 0, y: 0, z: 100 }
    });
  };

  const updateSetting = (category: keyof UE56Settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Settings />
        Contrôles Unreal Engine 5.6
        <Chip 
          label={status.isConnected ? 'Connecté' : 'Déconnecté'} 
          color={status.isConnected ? 'success' : 'error'} 
          size="small" 
        />
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Lumen Controls */}
        <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LightMode />
                Lumen Global Illumination
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Illumination Globale</FormLabel>
                <Switch
                  checked={settings.lumen.globalIllumination}
                  onChange={(e) => updateSetting('lumen', 'globalIllumination', e.target.checked)}
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Réflexions</FormLabel>
                <Switch
                  checked={settings.lumen.reflections}
                  onChange={(e) => updateSetting('lumen', 'reflections', e.target.checked)}
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Qualité</FormLabel>
                <Select
                  value={settings.lumen.quality}
                  onChange={(e) => updateSetting('lumen', 'quality', e.target.value)}
                >
                  <MenuItem value="low">Faible</MenuItem>
                  <MenuItem value="medium">Moyenne</MenuItem>
                  <MenuItem value="high">Élevée</MenuItem>
                  <MenuItem value="epic">Épique</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Taux de mise à jour (FPS): {settings.lumen.updateRate}</FormLabel>
                <Slider
                  value={settings.lumen.updateRate}
                  onChange={(_, value) => updateSetting('lumen', 'updateRate', value)}
                  min={30}
                  max={120}
                  step={10}
                  marks
                />
              </FormControl>

              <Button variant="contained" onClick={handleLumenUpdate} fullWidth>
                Appliquer Lumen
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Nanite Controls */}
        <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Memory />
                Nanite Virtualized Geometry
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Activé</FormLabel>
                <Switch
                  checked={settings.nanite.enabled}
                  onChange={(e) => updateSetting('nanite', 'enabled', e.target.checked)}
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Cluster Culling</FormLabel>
                <Switch
                  checked={settings.nanite.clusterCulling}
                  onChange={(e) => updateSetting('nanite', 'clusterCulling', e.target.checked)}
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Programmable Raster</FormLabel>
                <Switch
                  checked={settings.nanite.programmableRaster}
                  onChange={(e) => updateSetting('nanite', 'programmableRaster', e.target.checked)}
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Max Triangles: {settings.nanite.maxTriangles.toLocaleString()}</FormLabel>
                <Slider
                  value={settings.nanite.maxTriangles}
                  onChange={(_, value) => updateSetting('nanite', 'maxTriangles', value)}
                  min={100000}
                  max={5000000}
                  step={100000}
                />
              </FormControl>

              <Button variant="contained" onClick={handleNaniteUpdate} fullWidth>
                Appliquer Nanite
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Chaos Physics Controls */}
        <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Science />
                Chaos Physics
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Activé</FormLabel>
                <Switch
                  checked={settings.chaos.enabled}
                  onChange={(e) => updateSetting('chaos', 'enabled', e.target.checked)}
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Simulation de Vêtements</FormLabel>
                <Switch
                  checked={settings.chaos.clothSimulation}
                  onChange={(e) => updateSetting('chaos', 'clothSimulation', e.target.checked)}
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Physique des Cheveux</FormLabel>
                <Switch
                  checked={settings.chaos.hairPhysics}
                  onChange={(e) => updateSetting('chaos', 'hairPhysics', e.target.checked)}
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Simulation de Fluides</FormLabel>
                <Switch
                  checked={settings.chaos.fluidSimulation}
                  onChange={(e) => updateSetting('chaos', 'fluidSimulation', e.target.checked)}
                />
              </FormControl>

              <Button variant="contained" onClick={handleChaosUpdate} fullWidth>
                Appliquer Chaos
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* MetaSound Controls */}
        <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <VolumeUp />
                MetaSound Audio
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Volume: {Math.round(settings.metaSound.volume * 100)}%</FormLabel>
                <Slider
                  value={settings.metaSound.volume}
                  onChange={(_, value) => updateSetting('metaSound', 'volume', value)}
                  min={0}
                  max={1}
                  step={0.1}
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Pitch: {settings.metaSound.pitch}x</FormLabel>
                <Slider
                  value={settings.metaSound.pitch}
                  onChange={(_, value) => updateSetting('metaSound', 'pitch', value)}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <FormLabel>Audio Spatial</FormLabel>
                <Switch
                  checked={settings.metaSound.spatialAudio}
                  onChange={(e) => updateSetting('metaSound', 'spatialAudio', e.target.checked)}
                />
              </FormControl>

              <Button variant="contained" onClick={handleMetaSoundTest} fullWidth>
                Tester MetaSound
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default MetaHumanUE56Controls;
