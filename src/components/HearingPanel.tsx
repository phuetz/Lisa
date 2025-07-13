
// src/components/HearingPanel.tsx

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Paper, Alert, Switch, FormControlLabel } from '@mui/material';
import HearingIcon from '@mui/icons-material/Hearing';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useAppStore } from '../store/appStore';
import { hearingSense, HearingPerceptPayload } from '../senses/hearing';

interface HearingPanelProps {
  expanded?: boolean;
}

export const HearingPanel: React.FC<HearingPanelProps> = ({ expanded = false }) => {
  const { featureFlags, setState } = useAppStore((s) => ({
    featureFlags: s.featureFlags,
    setState: s.setState,
  }));
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [isListening, setIsListening] = useState(false);
  const [lastPercept, setLastPercept] = useState<HearingPerceptPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdvancedHearingToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState((state) => ({
      featureFlags: {
        ...state.featureFlags,
        advancedHearing: event.target.checked,
      },
    }));
  };

  useEffect(() => {
    const handleHearingPercept = (percept: { payload: HearingPerceptPayload }) => {
      setLastPercept(percept.payload);
    };

    if (featureFlags.advancedHearing) {
      hearingSense.setOnPerceptCallback(handleHearingPercept);
      // Initialize the worker with audio context and stream
      // Note: micStream might be null initially, handle this in initializeHearingWorker
      hearingSense.initialize(); // No longer passing audioCtx and micStream directly
      setIsListening(true);
    } else {
      hearingSense.terminate();
      setIsListening(false);
    }

    return () => {
      hearingSense.terminate();
      hearingSense.setOnPerceptCallback(null);
    };
  }, [featureFlags.advancedHearing]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Box sx={{
      border: '1px solid #e0e0e0',
      borderRadius: 1,
      mb: 2,
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      {/* Panel Header */}
      <Box
        sx={{
          p: 1,
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }}
        onClick={toggleExpand}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <HearingIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1">Audition Avancée</Typography>
        </Box>
        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>

      {/* Panel Content */}
      {isExpanded && (
        <Box sx={{ p: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={featureFlags.advancedHearing}
                onChange={handleAdvancedHearingToggle}
                name="advancedHearing"
                color="primary"
              />
            }
            label="Activer l'Audition Avancée (STT, NLU, SER)"
          />

          {featureFlags.advancedHearing && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Statut:</Typography>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="body1">
                  Statut d'écoute: {isListening ? 'Actif' : 'Inactif'}
                </Typography>
                {lastPercept && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6">Dernier Percept Audio:</Typography>
                    {lastPercept.text && (
                      <Typography variant="body2"><strong>Texte:</strong> {lastPercept.text}</Typography>
                    )}
                    {lastPercept.emotion && (
                      <Typography variant="body2"><strong>Émotion:</strong> {lastPercept.emotion}</Typography>
                    )}
                    {lastPercept.sentiment && (
                      <Typography variant="body2"><strong>Sentiment:</strong> {lastPercept.sentiment}</Typography>
                    )}
                    {lastPercept.intent && (
                      <Typography variant="body2"><strong>Intention:</strong> {lastPercept.intent}</Typography>
                    )}
                  </Box>
                )}
              </Paper>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            L'audition avancée permet à Lisa de comprendre la parole (STT), le sentiment, l'intention (NLU) et l'émotion (SER).
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default HearingPanel;
