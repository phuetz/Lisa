/**
 * SenseNode - Nœud de workflow pour lire les percepts des 5 sens de Lisa
 * 
 * Permet de:
 * - Sélectionner un ou plusieurs sens à écouter
 * - Filtrer les percepts par type
 * - Déclencher le workflow sur nouveaux percepts
 */

import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from 'reactflow';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Tooltip,
  IconButton,
  FormControl,
  FormGroup,
  Select,
  MenuItem,
  InputLabel,
  Slider,
  Alert,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import HearingIcon from '@mui/icons-material/Hearing';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import PublicIcon from '@mui/icons-material/Public';
import PsychologyIcon from '@mui/icons-material/Psychology';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import type { SenseModality } from '../../../types';

// Types pour le nœud
export interface SenseNodeData {
  label?: string;
  enabledSenses: SenseModality[];
  triggerMode: 'any' | 'all' | 'specific';
  specificSense?: SenseModality;
  minConfidence: number;
  bufferSize: number;
  isListening?: boolean;
  lastPercept?: {
    modality: SenseModality;
    timestamp: number;
    confidence: number;
  };
}

// Configuration par défaut
const DEFAULT_DATA: SenseNodeData = {
  enabledSenses: ['vision', 'hearing'],
  triggerMode: 'any',
  minConfidence: 0.5,
  bufferSize: 10,
  isListening: false,
};

// Mapping sens -> icône
const SENSE_ICONS: Record<SenseModality, React.ReactNode> = {
  vision: <VisibilityIcon fontSize="small" />,
  hearing: <HearingIcon fontSize="small" />,
  touch: <TouchAppIcon fontSize="small" />,
  environment: <PublicIcon fontSize="small" />,
  proprioception: <PsychologyIcon fontSize="small" />,
};

const SENSE_LABELS: Record<SenseModality, string> = {
  vision: 'Vision',
  hearing: 'Ouïe',
  touch: 'Toucher',
  environment: 'Environnement',
  proprioception: 'Proprioception',
};

const SENSE_COLORS: Record<SenseModality, string> = {
  vision: '#2196F3',
  hearing: '#4CAF50',
  touch: '#FF9800',
  environment: '#9C27B0',
  proprioception: '#E91E63',
};

const SenseNode = memo(({ id, data: inputData }: NodeProps<SenseNodeData>) => {
  const data = { ...DEFAULT_DATA, ...inputData };
  const { setNodes } = useReactFlow();
  const [isListening, setIsListening] = useState(data.isListening ?? false);

  // Mise à jour immutable des données
  const updateNodeData = useCallback((updates: Partial<SenseNodeData>) => {
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? { ...node, data: { ...node.data, ...updates } }
        : node
    ));
  }, [id, setNodes]);

  // Toggle un sens
  const handleSenseToggle = useCallback((sense: SenseModality) => {
    const current = data.enabledSenses;
    const updated = current.includes(sense)
      ? current.filter(s => s !== sense)
      : [...current, sense];
    updateNodeData({ enabledSenses: updated });
  }, [data.enabledSenses, updateNodeData]);

  // Démarrer/Arrêter l'écoute
  const handleToggleListening = useCallback(() => {
    const newState = !isListening;
    setIsListening(newState);
    updateNodeData({ isListening: newState });
  }, [isListening, updateNodeData]);

  // Changer le mode de déclenchement
  const handleTriggerModeChange = useCallback((mode: SenseNodeData['triggerMode']) => {
    updateNodeData({ triggerMode: mode });
  }, [updateNodeData]);

  // Changer la confiance minimale
  const handleConfidenceChange = useCallback((_: Event, value: number | number[]) => {
    updateNodeData({ minConfidence: value as number });
  }, [updateNodeData]);

  const activeSensesCount = data.enabledSenses.length;

  return (
    <Card
      sx={{
        width: 320,
        border: `2px solid ${isListening ? '#4CAF50' : '#1976d2'}`,
        background: isListening ? 'linear-gradient(135deg, rgba(76,175,80,0.1) 0%, rgba(33,150,243,0.1) 100%)' : undefined,
        transition: 'all 0.3s ease',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              🧠 Sense Input
            </Typography>
            <Chip
              label={`${activeSensesCount}/5`}
              size="small"
              color={activeSensesCount > 0 ? 'primary' : 'default'}
            />
          </Box>
          <Tooltip title={isListening ? 'Arrêter l\'\u00e9coute' : 'D\u00e9marrer l\'\u00e9coute'}>
            <IconButton
              size="small"
              onClick={handleToggleListening}
              color={isListening ? 'error' : 'success'}
              disabled={activeSensesCount === 0}
              aria-label={isListening ? 'Arrêter l\'\u00e9coute des sens' : 'D\u00e9marrer l\'\u00e9coute des sens'}
              aria-pressed={isListening}
            >
              {isListening ? <StopIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Status */}
        {isListening && (
          <Alert severity="success" sx={{ mb: 2, py: 0 }}>
            Écoute active sur {activeSensesCount} sens
          </Alert>
        )}

        {/* Sélection des sens */}
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Sens à écouter:
        </Typography>
        <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
          <FormGroup row sx={{ gap: 0.5, flexWrap: 'wrap' }}>
            {(Object.keys(SENSE_LABELS) as SenseModality[]).map(sense => (
              <Chip
                key={sense}
                icon={SENSE_ICONS[sense] as React.ReactElement}
                label={SENSE_LABELS[sense]}
                onClick={() => handleSenseToggle(sense)}
                color={data.enabledSenses.includes(sense) ? 'primary' : 'default'}
                variant={data.enabledSenses.includes(sense) ? 'filled' : 'outlined'}
                size="small"
                sx={{
                  borderColor: SENSE_COLORS[sense],
                  '&.MuiChip-colorPrimary': {
                    backgroundColor: SENSE_COLORS[sense],
                  },
                }}
              />
            ))}
          </FormGroup>
        </FormControl>

        {/* Mode de déclenchement */}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Mode de déclenchement</InputLabel>
          <Select
            value={data.triggerMode}
            label="Mode de déclenchement"
            onChange={(e) => handleTriggerModeChange(e.target.value as SenseNodeData['triggerMode'])}
          >
            <MenuItem value="any">Tout percept</MenuItem>
            <MenuItem value="all">Tous les sens simultanément</MenuItem>
            <MenuItem value="specific">Sens spécifique</MenuItem>
          </Select>
        </FormControl>

        {/* Sens spécifique si mode = specific */}
        {data.triggerMode === 'specific' && (
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Sens cible</InputLabel>
            <Select
              value={data.specificSense ?? 'vision'}
              label="Sens cible"
              onChange={(e) => updateNodeData({ specificSense: e.target.value as SenseModality })}
            >
              {data.enabledSenses.map(sense => (
                <MenuItem key={sense} value={sense}>
                  {SENSE_LABELS[sense]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Confiance minimale */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Confiance minimale: {Math.round(data.minConfidence * 100)}%
          </Typography>
          <Slider
            value={data.minConfidence}
            onChange={handleConfidenceChange}
            min={0}
            max={1}
            step={0.05}
            size="small"
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
          />
        </Box>

        {/* Dernier percept reçu */}
        {data.lastPercept && (
          <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Dernier: {SENSE_LABELS[data.lastPercept.modality]} ({Math.round(data.lastPercept.confidence * 100)}%)
            </Typography>
          </Box>
        )}

        {/* Handles */}
        <Handle
          type="source"
          position={Position.Right}
          id="percept"
          style={{ background: '#4CAF50', width: 12, height: 12, top: '30%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="vision"
          style={{ background: SENSE_COLORS.vision, width: 10, height: 10, top: '45%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="hearing"
          style={{ background: SENSE_COLORS.hearing, width: 10, height: 10, top: '55%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="touch"
          style={{ background: SENSE_COLORS.touch, width: 10, height: 10, top: '65%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="environment"
          style={{ background: SENSE_COLORS.environment, width: 10, height: 10, top: '75%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="proprioception"
          style={{ background: SENSE_COLORS.proprioception, width: 10, height: 10, top: '85%' }}
        />
      </CardContent>
    </Card>
  );
});

SenseNode.displayName = 'SenseNode';

export default SenseNode;
