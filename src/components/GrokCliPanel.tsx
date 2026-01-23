/**
 * GrokCliPanel
 * 
 * Interface utilisateur pour piloter Grok-CLI depuis Lisa.
 * Permet de créer des tâches, voir les résultats, gérer les sessions et suivre les coûts.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Card,
  CardContent,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  LinearProgress,
  Tooltip,
  Alert,
  Paper,
  Grid,
} from '@mui/material';
import {
  Send as SendIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Memory as MemoryIcon,
  Psychology as SkillIcon,
  AttachMoney as CostIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  BugReport as BugIcon,
  Code as CodeIcon,
  Search as SearchIcon,
  Description as DocIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useGrokCliStore } from '../store/grokCliStore';
import type {
  GrokModel,
  GrokSkill,
  GrokPipeline,
  GrokCliTaskKind,
  GrokCliReasoningMode,
  GrokCliSecurityMode,
} from '../types/grokCli';

// ============================================
// Constantes
// ============================================

const TASK_KINDS: { id: GrokCliTaskKind; label: string; icon: React.ReactNode }[] = [
  { id: 'explain', label: 'Expliquer', icon: <DocIcon /> },
  { id: 'review', label: 'Review', icon: <CodeIcon /> },
  { id: 'fix', label: 'Bug Fix', icon: <BugIcon /> },
  { id: 'refactor', label: 'Refactor', icon: <CodeIcon /> },
  { id: 'test', label: 'Tests', icon: <SecurityIcon /> },
  { id: 'search', label: 'Recherche', icon: <SearchIcon /> },
  { id: 'custom', label: 'Custom', icon: <CodeIcon /> },
];

const REASONING_MODES: { id: GrokCliReasoningMode; label: string; description: string }[] = [
  { id: 'shallow', label: 'Shallow', description: 'Réponse rapide' },
  { id: 'medium', label: 'Medium', description: 'Réflexion standard (4K tokens)' },
  { id: 'deep', label: 'Deep', description: 'Megathink (10K tokens)' },
  { id: 'exhaustive', label: 'Exhaustive', description: 'Ultrathink (32K tokens)' },
];

const SECURITY_MODES: { id: GrokCliSecurityMode; label: string; icon: string }[] = [
  { id: 'read_only', label: 'Read Only', icon: '🔒' },
  { id: 'auto', label: 'Auto', icon: '⚖️' },
  { id: 'full_access', label: 'Full Access', icon: '🔓' },
];

const AVAILABLE_SKILLS: { id: GrokSkill; label: string; icon: string }[] = [
  { id: 'typescript-expert', label: 'TypeScript Expert', icon: '🔷' },
  { id: 'react-specialist', label: 'React Specialist', icon: '⚛️' },
  { id: 'security-auditor', label: 'Security Auditor', icon: '🔒' },
  { id: 'database-expert', label: 'Database Expert', icon: '🗄️' },
  { id: 'devops-engineer', label: 'DevOps Engineer', icon: '🚀' },
  { id: 'api-designer', label: 'API Designer', icon: '🔌' },
  { id: 'performance-optimizer', label: 'Performance Optimizer', icon: '⚡' },
  { id: 'documentation-writer', label: 'Documentation Writer', icon: '📝' },
];

const AVAILABLE_PIPELINES: { id: GrokPipeline; label: string; icon: string }[] = [
  { id: 'code-review', label: 'Code Review', icon: '👁️' },
  { id: 'bug-fix', label: 'Bug Fix', icon: '🐛' },
  { id: 'security-audit', label: 'Security Audit', icon: '🔐' },
  { id: 'documentation', label: 'Documentation', icon: '📚' },
  { id: 'refactoring', label: 'Refactoring', icon: '🔄' },
];

const AVAILABLE_MODELS: { id: GrokModel; label: string }[] = [
  { id: 'grok-4', label: 'Grok 4 (Premium)' },
  { id: 'grok-3', label: 'Grok 3 (Recommandé)' },
  { id: 'grok-3-mini', label: 'Grok 3 Mini (Économique)' },
  { id: 'grok-2', label: 'Grok 2' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
];

// ============================================
// Composant Principal
// ============================================

export const GrokCliPanel: React.FC = () => {
  // Form state
  const [description, setDescription] = useState('');
  const [taskKind, setTaskKind] = useState<GrokCliTaskKind>('custom');
  const [filePattern, setFilePattern] = useState('');
  const [pipelineTarget, setPipelineTarget] = useState('');
  const [newMemoryKey, setNewMemoryKey] = useState('');
  const [newMemoryValue, setNewMemoryValue] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Store
  const {
    config,
    setModel,
    setSecurityMode,
    setReasoningMode,
    currentTaskId,
    isExecuting,
    currentStatus,
    currentLogs,
    streamOutput,
    runTask,
    cancelTask,
    getResult,
    isPipelineRunning,
    runPipeline,
    memories,
    remember,
    forgetMemory,
    loadMemories,
    activeSkills,
    toggleSkill,
    costReport,
    refreshCostReport,
    selectedTab,
    setSelectedTab,
    logs,
    clearLogs,
  } = useGrokCliStore();

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentLogs, logs]);

  // Load data on mount
  useEffect(() => {
    loadMemories();
    refreshCostReport();
  }, [loadMemories, refreshCostReport]);

  // ============================================
  // Handlers
  // ============================================

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || isExecuting) return;

    await runTask({
      kind: taskKind,
      description: description.trim(),
      filePattern: filePattern || undefined,
      reasoningMode: config.reasoningMode,
      securityMode: config.securityMode,
    });

    setDescription('');
  };

  const handleRunPipeline = async (pipeline: GrokPipeline) => {
    await runPipeline(pipeline, pipelineTarget || undefined);
  };

  const handleAddMemory = () => {
    if (newMemoryKey && newMemoryValue) {
      remember(newMemoryKey, newMemoryValue);
      setNewMemoryKey('');
      setNewMemoryValue('');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // ============================================
  // Render
  // ============================================

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          🤖 Grok CLI
          <Chip 
            label={config.securityMode} 
            size="small" 
            color={config.securityMode === 'read_only' ? 'error' : config.securityMode === 'auto' ? 'warning' : 'success'}
          />
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Model Selector */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Modèle</InputLabel>
            <Select
              value={config.model}
              label="Modèle"
              onChange={(e) => setModel(e.target.value as GrokModel)}
            >
              {AVAILABLE_MODELS.map((model) => (
                <MenuItem key={model.id} value={model.id}>{model.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Reasoning Mode */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Raisonnement</InputLabel>
            <Select
              value={config.reasoningMode}
              label="Raisonnement"
              onChange={(e) => setReasoningMode(e.target.value as GrokCliReasoningMode)}
            >
              {REASONING_MODES.map((mode) => (
                <MenuItem key={mode.id} value={mode.id}>
                  <Tooltip title={mode.description}>
                    <span>{mode.label}</span>
                  </Tooltip>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Security Mode */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sécurité</InputLabel>
            <Select
              value={config.securityMode}
              label="Sécurité"
              onChange={(e) => setSecurityMode(e.target.value as GrokCliSecurityMode)}
            >
              {SECURITY_MODES.map((mode) => (
                <MenuItem key={mode.id} value={mode.id}>
                  {mode.icon} {mode.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={selectedTab}
        onChange={(_, v) => setSelectedTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab label="Tâches" value="tasks" />
        <Tab label="Pipelines" value="sessions" />
        <Tab label="Skills" value="skills" icon={<SkillIcon />} iconPosition="start" />
        <Tab label="Mémoire" value="memory" icon={<MemoryIcon />} iconPosition="start" />
        <Tab label="Coûts" value="costs" icon={<CostIcon />} iconPosition="start" />
        <Tab label="Logs" value="logs" />
      </Tabs>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Tasks Tab */}
        {selectedTab === 'tasks' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Quick Actions */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {TASK_KINDS.map((kind) => (
                <Chip
                  key={kind.id}
                  icon={kind.icon as React.ReactElement}
                  label={kind.label}
                  onClick={() => setTaskKind(kind.id)}
                  variant={taskKind === kind.id ? 'filled' : 'outlined'}
                  color={taskKind === kind.id ? 'primary' : 'default'}
                />
              ))}
            </Box>

            {/* Active Skills */}
            {activeSkills.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Skills actifs:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                  {activeSkills.map((skill) => {
                    const skillInfo = AVAILABLE_SKILLS.find((s) => s.id === skill);
                    return (
                      <Chip
                        key={skill}
                        label={`${skillInfo?.icon} ${skillInfo?.label}`}
                        size="small"
                        onDelete={() => toggleSkill(skill)}
                      />
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Execution Status */}
            {isExecuting && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress />
                <Typography variant="caption" color="text.secondary">
                  Status: {currentStatus} | Logs: {currentLogs.length}
                </Typography>
              </Box>
            )}

            {/* Output/Logs Panel */}
            <Paper
              sx={{
                flex: 1,
                p: 2,
                mb: 2,
                overflow: 'auto',
                bgcolor: 'grey.900',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                minHeight: 200,
                maxHeight: 400,
              }}
            >
              {currentLogs.length > 0 ? (
                currentLogs.map((log, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      color: log.level === 'error' ? 'error.main' : 
                             log.level === 'warning' ? 'warning.main' : 'text.primary',
                      mb: 0.5,
                    }}
                  >
                    <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                      [{log.source}]
                    </Typography>{' '}
                    {log.message}
                  </Box>
                ))
              ) : streamOutput ? (
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{streamOutput}</Typography>
              ) : (
                <Typography color="text.secondary">
                  Créez une tâche pour commencer...
                </Typography>
              )}
              <div ref={logsEndRef} />
            </Paper>

            {/* Last Result */}
            {currentTaskId && getResult(currentTaskId) && (
              <Alert 
                severity={getResult(currentTaskId)?.status === 'succeeded' ? 'success' : 'error'}
                sx={{ mb: 2 }}
              >
                {getResult(currentTaskId)?.summary}
                {getResult(currentTaskId)?.cost && (
                  <Typography variant="caption" sx={{ ml: 2 }}>
                    Coût: ${getResult(currentTaskId)?.cost?.totalUsd.toFixed(4)}
                  </Typography>
                )}
              </Alert>
            )}

            {/* Input Form */}
            <Box component="form" onSubmit={handleSubmitTask}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  label="Fichiers (glob)"
                  value={filePattern}
                  onChange={(e) => setFilePattern(e.target.value)}
                  placeholder="src/**/*.ts"
                  sx={{ width: 200 }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`Décrivez votre tâche (${taskKind})...`}
                  disabled={isExecuting}
                  autoFocus
                  multiline
                  maxRows={4}
                />
                {isExecuting ? (
                  <IconButton onClick={cancelTask} color="error">
                    <StopIcon />
                  </IconButton>
                ) : (
                  <IconButton type="submit" color="primary" disabled={!description.trim()}>
                    <SendIcon />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* Pipelines Tab */}
        {selectedTab === 'sessions' && (
          <Box>
            <TextField
              fullWidth
              label="Cible (optionnel)"
              value={pipelineTarget}
              onChange={(e) => setPipelineTarget(e.target.value)}
              placeholder="ex: src/ ou package.json"
              sx={{ mb: 2 }}
            />

            {isPipelineRunning && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress />
              </Box>
            )}

            <Grid container spacing={2}>
              {AVAILABLE_PIPELINES.map((pipeline) => (
                <Grid item xs={12} sm={6} md={4} key={pipeline.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {pipeline.icon} {pipeline.label}
                      </Typography>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<PlayIcon />}
                        onClick={() => handleRunPipeline(pipeline.id)}
                        disabled={isPipelineRunning}
                      >
                        Lancer
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Skills Tab */}
        {selectedTab === 'skills' && (
          <Grid container spacing={2}>
            {AVAILABLE_SKILLS.map((skill) => (
              <Grid item xs={12} sm={6} md={4} key={skill.id}>
                <Card
                  sx={{
                    bgcolor: activeSkills.includes(skill.id) ? 'primary.dark' : 'background.paper',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6">
                        {skill.icon} {skill.label}
                      </Typography>
                      <Switch
                        checked={activeSkills.includes(skill.id)}
                        onChange={() => toggleSkill(skill.id)}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Memory Tab */}
        {selectedTab === 'memory' && (
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                label="Clé"
                value={newMemoryKey}
                onChange={(e) => setNewMemoryKey(e.target.value)}
                size="small"
              />
              <TextField
                label="Valeur"
                value={newMemoryValue}
                onChange={(e) => setNewMemoryValue(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddMemory}
                disabled={!newMemoryKey || !newMemoryValue}
              >
                Ajouter
              </Button>
            </Box>

            <List>
              {memories.map((memory) => (
                <ListItem key={memory.key}>
                  <ListItemText primary={memory.key} secondary={memory.value} />
                  <ListItemSecondaryAction>
                    <Tooltip title="Copier">
                      <IconButton onClick={() => copyToClipboard(memory.value)}>
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton onClick={() => forgetMemory(memory.key)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {memories.length === 0 && (
                <Typography color="text.secondary" sx={{ p: 2 }}>
                  Aucune mémoire enregistrée
                </Typography>
              )}
            </List>
          </Box>
        )}

        {/* Costs Tab */}
        {selectedTab === 'costs' && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <IconButton onClick={refreshCostReport}>
                <RefreshIcon />
              </IconButton>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>Session</Typography>
                    <Typography variant="h4">${costReport.sessionCost.toFixed(4)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>Aujourd'hui</Typography>
                    <Typography variant="h4">${costReport.dailyCost.toFixed(4)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>Total</Typography>
                    <Typography variant="h4">${costReport.totalCost.toFixed(4)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>Tokens</Typography>
                    <Typography variant="h4">
                      {(costReport.tokensUsed.input + costReport.tokensUsed.output).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {costReport.isOverBudget && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                ⚠️ Budget dépassé!
              </Alert>
            )}
          </Box>
        )}

        {/* Logs Tab */}
        {selectedTab === 'logs' && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button onClick={clearLogs} startIcon={<DeleteIcon />}>
                Effacer
              </Button>
            </Box>

            <Paper
              sx={{
                p: 2,
                bgcolor: 'grey.900',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                maxHeight: 500,
                overflow: 'auto',
              }}
            >
              {logs.length > 0 ? (
                logs.map((log, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      color: log.level === 'error' ? 'error.main' : 
                             log.level === 'warning' ? 'warning.main' : 
                             log.level === 'debug' ? 'text.secondary' : 'text.primary',
                      mb: 0.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      pb: 0.5,
                    }}
                  >
                    <Typography component="span" sx={{ color: 'info.main', fontSize: '0.65rem', mr: 1 }}>
                      {new Date(log.ts).toLocaleTimeString()}
                    </Typography>
                    <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.7rem', mr: 1 }}>
                      [{log.source}]
                    </Typography>
                    {log.message}
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary">Aucun log</Typography>
              )}
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default GrokCliPanel;
