/**
 * AIAgentNode - Nœud de workflow pour exécuter un agent Lisa
 * 
 * Permet de:
 * - Sélectionner un agent parmi les 46+ disponibles
 * - Configurer les paramètres de l'agent
 * - Exécuter et voir les résultats
 */

import { memo, useState, useCallback, useMemo } from 'react';
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
  Select,
  MenuItem,
  InputLabel,
  TextField,
  Alert,
  CircularProgress,
  Collapse,
  Autocomplete,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

// Types pour le nœud
export interface AIAgentNodeData {
  label?: string;
  agentId: string;
  agentCategory?: string;
  prompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  // État d'exécution
  isRunning?: boolean;
  lastResult?: unknown;
  lastError?: string;
  executionTime?: number;
  executionCount?: number;
}

// Catégories d'agents disponibles
const AGENT_CATEGORIES = [
  { id: 'communication', label: 'Communication', icon: '💬' },
  { id: 'perception', label: 'Perception', icon: '👁️' },
  { id: 'productivity', label: 'Productivité', icon: '📊' },
  { id: 'development', label: 'Développement', icon: '💻' },
  { id: 'analysis', label: 'Analyse', icon: '🔍' },
  { id: 'integration', label: 'Intégration', icon: '🔗' },
  { id: 'workflow', label: 'Workflow', icon: '⚙️' },
  { id: 'security', label: 'Sécurité', icon: '🔐' },
];

// Agents disponibles par catégorie
const AGENTS_BY_CATEGORY: Record<string, Array<{ id: string; name: string; description: string }>> = {
  communication: [
    { id: 'ChatAgent', name: 'Chat Agent', description: 'Agent de conversation général' },
    { id: 'EmailAgent', name: 'Email Agent', description: 'Rédaction et gestion d\'emails' },
    { id: 'TranslationAgent', name: 'Translation Agent', description: 'Traduction multilingue' },
    { id: 'SummaryAgent', name: 'Summary Agent', description: 'Résumé de textes' },
  ],
  perception: [
    { id: 'VisionAgent', name: 'Vision Agent', description: 'Analyse d\'images et vidéos' },
    { id: 'OCRAgent', name: 'OCR Agent', description: 'Extraction de texte' },
    { id: 'AudioAgent', name: 'Audio Agent', description: 'Transcription audio' },
    { id: 'SentimentAgent', name: 'Sentiment Agent', description: 'Analyse de sentiment' },
  ],
  productivity: [
    { id: 'CalendarAgent', name: 'Calendar Agent', description: 'Gestion de calendrier' },
    { id: 'TaskAgent', name: 'Task Agent', description: 'Gestion de tâches' },
    { id: 'ReminderAgent', name: 'Reminder Agent', description: 'Rappels et notifications' },
    { id: 'NotesAgent', name: 'Notes Agent', description: 'Prise de notes' },
  ],
  development: [
    { id: 'CodeAgent', name: 'Code Agent', description: 'Génération de code' },
    { id: 'DebugAgent', name: 'Debug Agent', description: 'Débogage assisté' },
    { id: 'ReviewAgent', name: 'Review Agent', description: 'Revue de code' },
    { id: 'GitAgent', name: 'Git Agent', description: 'Opérations Git' },
  ],
  analysis: [
    { id: 'DataAgent', name: 'Data Agent', description: 'Analyse de données' },
    { id: 'ReportAgent', name: 'Report Agent', description: 'Génération de rapports' },
    { id: 'ResearchAgent', name: 'Research Agent', description: 'Recherche d\'informations' },
  ],
  integration: [
    { id: 'RosAgent', name: 'ROS Agent', description: 'Intégration robotique ROS' },
    { id: 'APIAgent', name: 'API Agent', description: 'Appels API externes' },
    { id: 'WebhookAgent', name: 'Webhook Agent', description: 'Gestion webhooks' },
    { id: 'MQTTAgent', name: 'MQTT Agent', description: 'Communication MQTT' },
  ],
  workflow: [
    { id: 'PlannerAgent', name: 'Planner Agent', description: 'Planification de tâches' },
    { id: 'CriticAgent', name: 'Critic Agent', description: 'Validation et critique' },
    { id: 'OrchestratorAgent', name: 'Orchestrator Agent', description: 'Orchestration multi-agents' },
  ],
  security: [
    { id: 'AuditAgent', name: 'Audit Agent', description: 'Audit de sécurité' },
    { id: 'ValidationAgent', name: 'Validation Agent', description: 'Validation de données' },
  ],
};

// Tous les agents à plat pour l'autocomplétion
const ALL_AGENTS = Object.values(AGENTS_BY_CATEGORY).flat();

// Modèles disponibles
const AVAILABLE_MODELS = [
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Le plus économique' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Rapide et abordable' },
  { id: 'gpt-5', name: 'GPT-5', description: 'Meilleur pour code et agents' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Équilibré' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Anthropic' },
];

const DEFAULT_DATA: AIAgentNodeData = {
  agentId: 'ChatAgent',
  agentCategory: 'communication',
  model: 'gpt-5-nano',
  temperature: 0.7,
  maxTokens: 1000,
  timeout: 30000,
};

const AIAgentNode = memo(({ id, data: inputData }: NodeProps<AIAgentNodeData>) => {
  const data = { ...DEFAULT_DATA, ...inputData };
  const { setNodes } = useReactFlow();
  const [showSettings, setShowSettings] = useState(false);
  const [isRunning, setIsRunning] = useState(data.isRunning ?? false);

  // Mise à jour immutable
  const updateNodeData = useCallback((updates: Partial<AIAgentNodeData>) => {
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? { ...node, data: { ...node.data, ...updates } }
        : node
    ));
  }, [id, setNodes]);

  // Trouver les infos de l'agent sélectionné
  const selectedAgent = useMemo(() => {
    return ALL_AGENTS.find(a => a.id === data.agentId) ?? ALL_AGENTS[0];
  }, [data.agentId]);

  // Trouver la catégorie
  const selectedCategory = useMemo(() => {
    return AGENT_CATEGORIES.find(c => c.id === data.agentCategory) ?? AGENT_CATEGORIES[0];
  }, [data.agentCategory]);

  // Handler de changement d'agent
  const handleAgentChange = useCallback((agentId: string) => {
    // Trouver la catégorie de cet agent
    const category = Object.entries(AGENTS_BY_CATEGORY).find(([_, agents]) =>
      agents.some(a => a.id === agentId)
    )?.[0];
    
    updateNodeData({ 
      agentId, 
      agentCategory: category ?? data.agentCategory,
    });
  }, [data.agentCategory, updateNodeData]);

  // Simuler l'exécution
  const handleExecute = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    const startTime = Date.now();
    
    try {
      // TODO: Connecter avec le vrai agent via registry
      // const agent = await getAgentAsync(data.agentId);
      // const result = await agent.execute({ prompt: data.prompt });
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulation
      
      updateNodeData({
        isRunning: false,
        lastResult: { success: true, output: 'Agent executed successfully' },
        lastError: undefined,
        executionTime: Date.now() - startTime,
        executionCount: (data.executionCount ?? 0) + 1,
      });
    } catch (error) {
      updateNodeData({
        isRunning: false,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastResult: undefined,
        executionTime: Date.now() - startTime,
      });
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, data.executionCount, updateNodeData]);

  // Status color
  const statusColor = useMemo(() => {
    if (isRunning) return 'info';
    if (data.lastError) return 'error';
    if (data.lastResult) return 'success';
    return 'default';
  }, [isRunning, data.lastError, data.lastResult]);

  return (
    <Card
      sx={{
        width: 340,
        border: `2px solid ${
          statusColor === 'error' ? '#f44336' :
          statusColor === 'success' ? '#4caf50' :
          statusColor === 'info' ? '#2196f3' :
          '#9c27b0'
        }`,
        transition: 'all 0.3s ease',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartToyIcon color="secondary" />
            <Typography variant="subtitle1" fontWeight="bold">
              AI Agent
            </Typography>
            {data.executionCount !== undefined && data.executionCount > 0 && (
              <Chip
                label={`×${data.executionCount}`}
                size="small"
                color="secondary"
                variant="outlined"
              />
            )}
          </Box>
          <Box role="group" aria-label="Actions de l'agent">
            <Tooltip title="Paramètres de l'agent">
              <IconButton 
                size="small" 
                onClick={() => setShowSettings(!showSettings)}
                aria-label="Ouvrir les paramètres de l'agent"
                aria-expanded={showSettings}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={isRunning ? 'Exécution en cours...' : 'Exécuter l\'agent'}>
              <IconButton
                size="small"
                onClick={handleExecute}
                disabled={isRunning}
                color="secondary"
                aria-label={isRunning ? 'Agent en cours d\'exécution' : 'Exécuter l\'agent IA'}
                aria-busy={isRunning}
              >
                {isRunning ? <CircularProgress size={20} aria-hidden="true" /> : <PlayArrowIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Status */}
        <Collapse in={!!data.lastResult || !!data.lastError}>
          <Alert
            severity={statusColor === 'error' ? 'error' : 'success'}
            icon={statusColor === 'error' ? <ErrorIcon /> : <CheckCircleIcon />}
            sx={{ mb: 2, py: 0 }}
          >
            {data.lastError ?? `Succès (${data.executionTime}ms)`}
          </Alert>
        </Collapse>

        {/* Agent Selection */}
        <Autocomplete
          size="small"
          options={ALL_AGENTS}
          getOptionLabel={(option) => option.name}
          value={selectedAgent}
          onChange={(_, newValue) => newValue && handleAgentChange(newValue.id)}
          renderOption={(props, option) => (
            <li {...props}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2">{option.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.description}
                </Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} label="Agent" placeholder="Sélectionner un agent" />
          )}
          sx={{ mb: 2 }}
        />

        {/* Category chip */}
        <Box sx={{ mb: 2 }}>
          <Chip
            icon={<span>{selectedCategory.icon}</span>}
            label={selectedCategory.label}
            size="small"
            color="secondary"
            variant="outlined"
          />
        </Box>

        {/* Prompt input */}
        <TextField
          label="Prompt / Instructions"
          variant="outlined"
          size="small"
          fullWidth
          multiline
          rows={2}
          value={data.prompt ?? ''}
          onChange={(e) => updateNodeData({ prompt: e.target.value })}
          placeholder="Instructions pour l'agent..."
          sx={{ mb: 2 }}
        />

        {/* Settings panel */}
        <Collapse in={showSettings}>
          <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, mb: 2 }}>
            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
              <InputLabel>Modèle</InputLabel>
              <Select
                value={data.model}
                label="Modèle"
                onChange={(e) => updateNodeData({ model: e.target.value })}
              >
                {AVAILABLE_MODELS.map(model => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Temperature"
              type="number"
              size="small"
              fullWidth
              value={data.temperature}
              onChange={(e) => updateNodeData({ temperature: parseFloat(e.target.value) })}
              inputProps={{ min: 0, max: 2, step: 0.1 }}
              sx={{ mb: 1 }}
            />

            <TextField
              label="Max Tokens"
              type="number"
              size="small"
              fullWidth
              value={data.maxTokens}
              onChange={(e) => updateNodeData({ maxTokens: parseInt(e.target.value) })}
              inputProps={{ min: 1, max: 128000 }}
            />
          </Box>
        </Collapse>

        {/* Handles */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{ background: '#9c27b0', width: 12, height: 12 }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{ background: '#4caf50', width: 12, height: 12, top: '35%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="error"
          style={{ background: '#f44336', width: 12, height: 12, top: '65%' }}
        />
      </CardContent>
    </Card>
  );
});

AIAgentNode.displayName = 'AIAgentNode';

export default AIAgentNode;
