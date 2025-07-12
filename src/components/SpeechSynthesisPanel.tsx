/**
 * SpeechSynthesisPanel - Panneau de contrôle pour la synthèse vocale
 * 
 * Ce composant fournit une interface utilisateur pour la synthèse vocale,
 * permettant de lire du texte à haute voix, modifier les paramètres de voix,
 * et communiquer avec d'autres assistants comme Alexa et Gemini.
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Slider, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import { useVisionAudioStore } from '../store/visionAudioStore';

interface SpeechSynthesisPanelProps {
  expanded?: boolean;
}

export const SpeechSynthesisPanel: React.FC<SpeechSynthesisPanelProps> = ({ expanded = false }) => {
  const { speak, stop, getVoices, updateSettings, state, availableVoices, currentSettings } = useSpeechSynthesis();
  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [showSettings, setShowSettings] = useState(false);
  const [rate, setRate] = useState(currentSettings.rate);
  const [pitch, setPitch] = useState(currentSettings.pitch);
  const [volume, setVolume] = useState(currentSettings.volume);
  const [selectedVoice, setSelectedVoice] = useState(currentSettings.voice);
  
  const lastIntent = useVisionAudioStore((state) => state.lastIntent);
  const lastSpokenText = useVisionAudioStore((state) => state.lastSpokenText);
  const isListening = useVisionAudioStore((state) => state.isListening);
  const audioEnabled = useVisionAudioStore((state) => state.audioEnabled);

  // Mise à jour des paramètres locaux quand les paramètres actuels changent
  useEffect(() => {
    setRate(currentSettings.rate);
    setPitch(currentSettings.pitch);
    setVolume(currentSettings.volume);
    setSelectedVoice(currentSettings.voice);
  }, [currentSettings]);

  // Récupérer à nouveau la liste des voix quand le composant est monté
  useEffect(() => {
    getVoices();
  }, [getVoices]);

  // Appliquer les modifications de paramètres
  const applySettings = async () => {
    await updateSettings({
      rate,
      pitch,
      volume,
      voice: selectedVoice
    });
    setShowSettings(false);
  };

  // Fonction pour parler
  const handleSpeak = async () => {
    if (text.trim()) {
      await speak(text);
    }
  };

  // Fonction pour arrêter de parler
  const handleStop = async () => {
    await stop();
  };

  // Génère une réponse vocale à une commande récente
  const handleRespondVocally = async () => {
    if (lastIntent && lastIntent.intent) {
      const response = generateVocalResponse(lastIntent.intent, lastIntent.entities);
      await speak(response);
    }
  };

  // Fonction pour générer une réponse vocale en fonction de l'intention
  const generateVocalResponse = (intent: string, entities: any): string => {
    // Exemple simple - dans une implémentation réelle, ceci serait plus sophistiqué
    switch (intent) {
      case 'get_weather':
        return `Voici la météo pour ${entities.location || 'votre région'}. Il fait beau aujourd'hui avec une température de 22 degrés.`;
      case 'set_alarm':
        return `J'ai réglé une alarme pour ${entities.time || 'l\'heure demandée'}.`;
      case 'create_todo':
        return `J'ai ajouté "${entities.task || 'votre tâche'}" à votre liste de tâches.`;
      default:
        return "Je suis là pour vous aider. N'hésitez pas à me poser des questions.";
    }
  };

  // Bouton de bascule d'expansion
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Bouton de bascule des paramètres
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  return (
    <Box sx={{ 
      border: '1px solid #e0e0e0',
      borderRadius: 2,
      padding: 2,
      margin: 2,
      backgroundColor: '#f9f9f9',
      boxShadow: 1
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2
      }}>
        <Typography variant="h6" component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
          <VolumeUpIcon sx={{ mr: 1 }} /> Synthèse Vocale
        </Typography>
        <Button 
          variant="text" 
          size="small"
          onClick={toggleExpand}
          startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        >
          {isExpanded ? 'Réduire' : 'Développer'}
        </Button>
      </Box>

      {isExpanded && (
        <>
          <TextField
            label="Texte à prononcer"
            variant="outlined"
            fullWidth
            multiline
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<VolumeUpIcon />}
              onClick={handleSpeak}
              disabled={!text.trim() || state === 'speaking' || !audioEnabled}
              fullWidth
            >
              Prononcer
            </Button>
            <Button 
              variant="outlined"
              color="secondary"
              startIcon={<StopIcon />}
              onClick={handleStop}
              disabled={state !== 'speaking'}
            >
              Stop
            </Button>
            <Button 
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={toggleSettings}
            >
              Paramètres
            </Button>
          </Box>

          {isListening && (
            <Box sx={{ mt: 2, mb: 2, p: 1, bgcolor: 'primary.main', color: 'white', borderRadius: 1 }}>
              <Typography variant="body2">En écoute... Parlez maintenant</Typography>
            </Box>
          )}

          {lastIntent && lastIntent.intent && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Dernière intention: {lastIntent.intent}</Typography>
              <Button 
                variant="text" 
                size="small"
                onClick={handleRespondVocally}
                startIcon={<VolumeUpIcon />}
                disabled={!audioEnabled}
              >
                Répondre vocalement
              </Button>
            </Box>
          )}

          {lastSpokenText && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Dernier texte prononcé:</Typography>
              <Typography variant="body2" color="text.secondary">
                {lastSpokenText.length > 50 
                  ? `${lastSpokenText.substring(0, 50)}...` 
                  : lastSpokenText
                }
              </Typography>
            </Box>
          )}

          {showSettings && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              border: '1px solid #e0e0e0', 
              borderRadius: 1,
              bgcolor: 'background.paper' 
            }}>
              <Typography variant="subtitle1" gutterBottom>Paramètres de voix</Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Voix</InputLabel>
                <Select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  label="Voix"
                >
                  {availableVoices.map((voice: any) => (
                    <MenuItem key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Typography gutterBottom>Vitesse: {rate}</Typography>
              <Slider
                value={rate}
                onChange={(_, value) => setRate(value as number)}
                min={0.5}
                max={2.0}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                sx={{ mb: 2 }}
              />
              
              <Typography gutterBottom>Hauteur: {pitch}</Typography>
              <Slider
                value={pitch}
                onChange={(_, value) => setPitch(value as number)}
                min={0.5}
                max={2.0}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                sx={{ mb: 2 }}
              />
              
              <Typography gutterBottom>Volume: {volume}</Typography>
              <Slider
                value={volume}
                onChange={(_, value) => setVolume(value as number)}
                min={0.1}
                max={1.0}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                sx={{ mb: 2 }}
              />
              
              <Button 
                variant="contained" 
                onClick={applySettings}
                fullWidth
              >
                Appliquer les paramètres
              </Button>
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Utilisez la synthèse vocale pour communiquer avec Alexa, Gemini et d'autres personnes.
              Statut actuel : {state === 'speaking' ? 'En train de parler' : 'Prêt'}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

export default SpeechSynthesisPanel;
