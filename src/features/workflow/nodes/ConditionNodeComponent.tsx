/**
 * ConditionNodeComponent - Nœud de workflow pour le branching conditionnel
 * 
 * Permet de:
 * - Définir des conditions JavaScript
 * - Utiliser des comparaisons visuelles simples
 * - Router le flux vers différentes branches
 */

import { memo, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from 'reactflow';
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Chip,
  Tooltip,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import CodeIcon from '@mui/icons-material/Code';
import TuneIcon from '@mui/icons-material/Tune';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// Types pour le nœud
export interface ConditionNodeData {
  label?: string;
  mode: 'simple' | 'advanced';
  // Mode simple
  leftOperand?: string;
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'matches';
  rightOperand?: string;
  // Mode avancé
  condition?: string;
  // État
  lastResult?: boolean;
  executionCount?: number;
}

// Opérateurs disponibles
const OPERATORS = [
  { value: 'eq', label: '=', description: 'Égal à' },
  { value: 'neq', label: '≠', description: 'Différent de' },
  { value: 'gt', label: '>', description: 'Supérieur à' },
  { value: 'gte', label: '≥', description: 'Supérieur ou égal à' },
  { value: 'lt', label: '<', description: 'Inférieur à' },
  { value: 'lte', label: '≤', description: 'Inférieur ou égal à' },
  { value: 'contains', label: '∋', description: 'Contient' },
  { value: 'startsWith', label: '^', description: 'Commence par' },
  { value: 'endsWith', label: '$', description: 'Se termine par' },
  { value: 'matches', label: '~', description: 'Correspond à (regex)' },
];

// Variables courantes
const COMMON_VARIABLES = [
  '{{input.value}}',
  '{{input.type}}',
  '{{percept.confidence}}',
  '{{percept.modality}}',
  '{{agent.result}}',
  '{{env.time}}',
  '{{env.dayOfWeek}}',
];

const DEFAULT_DATA: ConditionNodeData = {
  mode: 'simple',
  leftOperand: '{{input.value}}',
  operator: 'eq',
  rightOperand: '',
  condition: 'true',
};

const ConditionNodeComponent = memo(({ id, data: inputData }: NodeProps<ConditionNodeData>) => {
  const data = { ...DEFAULT_DATA, ...inputData };
  const { setNodes } = useReactFlow();
  const [showHelp, setShowHelp] = useState(false);

  // Mise à jour immutable
  const updateNodeData = useCallback((updates: Partial<ConditionNodeData>) => {
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? { ...node, data: { ...node.data, ...updates } }
        : node
    ));
  }, [id, setNodes]);

  // Générer la condition à partir du mode simple
  const generatedCondition = (() => {
    if (data.mode === 'advanced') return data.condition ?? 'true';
    
    const left = data.leftOperand ?? '';
    const right = data.rightOperand ?? '';
    const op = data.operator ?? 'eq';
    
    switch (op) {
      case 'eq': return `${left} === ${right}`;
      case 'neq': return `${left} !== ${right}`;
      case 'gt': return `${left} > ${right}`;
      case 'gte': return `${left} >= ${right}`;
      case 'lt': return `${left} < ${right}`;
      case 'lte': return `${left} <= ${right}`;
      case 'contains': return `String(${left}).includes(${right})`;
      case 'startsWith': return `String(${left}).startsWith(${right})`;
      case 'endsWith': return `String(${left}).endsWith(${right})`;
      case 'matches': return `new RegExp(${right}).test(${left})`;
      default: return 'true';
    }
  })();

  return (
    <Card
      sx={{
        width: 300,
        border: '2px solid #FF9800',
        background: 'linear-gradient(135deg, rgba(255,152,0,0.1) 0%, rgba(255,193,7,0.1) 100%)',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CallSplitIcon sx={{ color: '#FF9800' }} />
            <Typography variant="subtitle1" fontWeight="bold">
              Condition
            </Typography>
            {data.executionCount !== undefined && data.executionCount > 0 && (
              <Chip
                label={`×${data.executionCount}`}
                size="small"
                sx={{ bgcolor: '#FF9800', color: 'white' }}
              />
            )}
          </Box>
          <Tooltip title="Afficher l'aide sur les conditions">
            <IconButton 
              size="small" 
              onClick={() => setShowHelp(!showHelp)}
              aria-label="Afficher l'aide sur les conditions"
              aria-expanded={showHelp}
              aria-controls="condition-help-panel"
            >
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Mode toggle */}
        <ToggleButtonGroup
          value={data.mode}
          exclusive
          onChange={(_, newMode) => newMode && updateNodeData({ mode: newMode })}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
          aria-label="Choisir le mode de condition"
        >
          <ToggleButton value="simple" aria-label="Mode simple avec comparaison visuelle">
            <TuneIcon fontSize="small" sx={{ mr: 0.5 }} aria-hidden="true" />
            Simple
          </ToggleButton>
          <ToggleButton value="advanced" aria-label="Mode avancé avec code JavaScript">
            <CodeIcon fontSize="small" sx={{ mr: 0.5 }} aria-hidden="true" />
            Code
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Mode Simple */}
        {data.mode === 'simple' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Left operand */}
            <TextField
              label="Valeur gauche"
              size="small"
              fullWidth
              value={data.leftOperand}
              onChange={(e) => updateNodeData({ leftOperand: e.target.value })}
              placeholder="{{input.value}}"
              sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            />

            {/* Operator */}
            <FormControl fullWidth size="small">
              <InputLabel>Opérateur</InputLabel>
              <Select
                value={data.operator}
                label="Opérateur"
                onChange={(e) => updateNodeData({ operator: e.target.value as ConditionNodeData['operator'] })}
              >
                {OPERATORS.map(op => (
                  <MenuItem key={op.value} value={op.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontFamily: 'monospace', width: 24 }}>{op.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{op.description}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Right operand */}
            <TextField
              label="Valeur droite"
              size="small"
              fullWidth
              value={data.rightOperand}
              onChange={(e) => updateNodeData({ rightOperand: e.target.value })}
              placeholder="valeur ou {{variable}}"
              sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            />
          </Box>
        )}

        {/* Mode Avancé */}
        {data.mode === 'advanced' && (
          <TextField
            label="Condition JavaScript"
            size="small"
            fullWidth
            multiline
            rows={3}
            value={data.condition}
            onChange={(e) => updateNodeData({ condition: e.target.value })}
            placeholder="input.value > 10 && input.type === 'number'"
            sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.85rem' } }}
          />
        )}

        {/* Preview de la condition */}
        <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Condition générée:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
            {generatedCondition}
          </Typography>
        </Box>

        {/* Dernier résultat */}
        {data.lastResult !== undefined && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Chip
              label={data.lastResult ? 'TRUE' : 'FALSE'}
              size="small"
              color={data.lastResult ? 'success' : 'error'}
            />
          </Box>
        )}

        {/* Help panel */}
        {showHelp && (
          <Box 
            id="condition-help-panel"
            role="region"
            aria-label="Aide sur les conditions"
            sx={{ mt: 2, p: 1, bgcolor: 'info.main', borderRadius: 1, opacity: 0.9 }}
          >
            <Typography variant="caption" color="white">
              Variables disponibles:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {COMMON_VARIABLES.map(v => (
                <Chip
                  key={v}
                  label={v}
                  size="small"
                  sx={{ 
                    fontSize: '0.65rem', 
                    height: 20,
                    bgcolor: 'white',
                    color: 'info.main',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (data.mode === 'simple') {
                      updateNodeData({ leftOperand: v });
                    } else {
                      updateNodeData({ condition: (data.condition ?? '') + v });
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{ background: '#FF9800', width: 12, height: 12 }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          style={{ background: '#4CAF50', width: 12, height: 12, top: '35%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          style={{ background: '#f44336', width: 12, height: 12, top: '65%' }}
        />

        {/* Labels pour les handles */}
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            right: 20,
            top: '32%',
            color: '#4CAF50',
            fontWeight: 'bold',
          }}
        >
          ✓
        </Typography>
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            right: 20,
            top: '62%',
            color: '#f44336',
            fontWeight: 'bold',
          }}
        >
          ✗
        </Typography>
      </CardContent>
    </Card>
  );
});

ConditionNodeComponent.displayName = 'ConditionNodeComponent';

export default ConditionNodeComponent;
