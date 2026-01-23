/**
 * PersonaBuilder Component
 * Interface pour créer et configurer des personas Lisa (similaire au GPT Builder)
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as PreviewIcon,
  Settings as SettingsIcon,
  Psychology as PsychologyIcon,
  Chat as ChatIcon,
  Storage as StorageIcon,
  RecordVoiceOver as VoiceIcon,
  SmartToy as BotIcon,
} from '@mui/icons-material';
import { usePersonaStore } from '../store/personaStore';
import type { PersonaCapabilities, PersonalityTraits, VoiceSettings } from '../types/persona';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`persona-tabpanel-${index}`}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const PersonaBuilder: React.FC = () => {
  const {
    isEditing,
    editingPersona,
    updateEditing,
    saveEditing,
    cancelEditing,
  } = usePersonaStore();

  const [activeTab, setActiveTab] = useState(0);
  const [newStarter, setNewStarter] = useState('');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSave = useCallback(() => {
    const id = saveEditing();
    if (id) {
      // Success notification could be added here
    }
  }, [saveEditing]);

  const handleCapabilityChange = useCallback(
    (key: keyof PersonaCapabilities) => {
      if (!editingPersona?.capabilities) return;
      updateEditing({
        capabilities: {
          ...editingPersona.capabilities,
          [key]: !editingPersona.capabilities[key],
        },
      });
    },
    [editingPersona, updateEditing]
  );

  const handlePersonalityChange = useCallback(
    (key: keyof PersonalityTraits, value: string) => {
      if (!editingPersona?.personality) return;
      updateEditing({
        personality: {
          ...editingPersona.personality,
          [key]: value,
        },
      });
    },
    [editingPersona, updateEditing]
  );

  const handleVoiceChange = useCallback(
    (key: keyof VoiceSettings, value: unknown) => {
      if (!editingPersona?.voice) return;
      updateEditing({
        voice: {
          ...editingPersona.voice,
          [key]: value,
        },
      });
    },
    [editingPersona, updateEditing]
  );

  const addConversationStarter = useCallback(() => {
    if (!newStarter.trim() || !editingPersona?.conversationStarters) return;
    updateEditing({
      conversationStarters: [...editingPersona.conversationStarters, newStarter.trim()],
    });
    setNewStarter('');
  }, [newStarter, editingPersona, updateEditing]);

  const removeConversationStarter = useCallback(
    (index: number) => {
      if (!editingPersona?.conversationStarters) return;
      updateEditing({
        conversationStarters: editingPersona.conversationStarters.filter((_, i) => i !== index),
      });
    },
    [editingPersona, updateEditing]
  );

  if (!isEditing || !editingPersona) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'background.default',
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <BotIcon />
          </Avatar>
          <Box>
            <Typography variant="h6">
              {editingPersona.id ? 'Modifier le Persona' : 'Créer un Persona'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Configurez Lisa selon vos besoins
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<CloseIcon />}
            onClick={cancelEditing}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!editingPersona.name || !editingPersona.instructions}
          >
            Enregistrer
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Panel - Configuration */}
        <Box
          sx={{
            width: '60%',
            borderRight: 1,
            borderColor: 'divider',
            overflow: 'auto',
            p: 3,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="persona configuration tabs"
            sx={{ mb: 2 }}
          >
            <Tab icon={<SettingsIcon />} label="Base" />
            <Tab icon={<PsychologyIcon />} label="Personnalité" />
            <Tab icon={<ChatIcon />} label="Conversation" />
            <Tab icon={<StorageIcon />} label="Capacités" />
            <Tab icon={<VoiceIcon />} label="Voix" />
          </Tabs>

          {/* Tab 0: Base Configuration */}
          <TabPanel value={activeTab} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                fullWidth
                label="Nom du Persona"
                value={editingPersona.name || ''}
                onChange={(e) => updateEditing({ name: e.target.value })}
                placeholder="Ex: Lisa Pro, Lisa Developer, Lisa Home..."
                required
              />

              <TextField
                fullWidth
                label="Description courte"
                value={editingPersona.description || ''}
                onChange={(e) => updateEditing({ description: e.target.value })}
                placeholder="Une brève description de ce que fait ce persona"
                multiline
                rows={2}
              />

              <TextField
                fullWidth
                label="Instructions (System Prompt)"
                value={editingPersona.instructions || ''}
                onChange={(e) => updateEditing({ instructions: e.target.value })}
                placeholder="Décris qui est Lisa, comment elle doit se comporter, ses règles..."
                multiline
                rows={10}
                required
                helperText="Ces instructions définissent le comportement et la personnalité de Lisa"
              />

              <TextField
                fullWidth
                label="URL de l'avatar (optionnel)"
                value={editingPersona.avatar || ''}
                onChange={(e) => updateEditing({ avatar: e.target.value })}
                placeholder="https://example.com/avatar.png"
              />
            </Box>
          </TabPanel>

          {/* Tab 1: Personality */}
          <TabPanel value={activeTab} index={1}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Formalité
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {(['casual', 'balanced', 'formal'] as const).map((v) => (
                    <Chip
                      key={v}
                      label={v === 'casual' ? 'Décontracté' : v === 'formal' ? 'Formel' : 'Équilibré'}
                      onClick={() => handlePersonalityChange('formality', v)}
                      color={editingPersona.personality?.formality === v ? 'primary' : 'default'}
                      variant={editingPersona.personality?.formality === v ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Verbosité
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {(['concise', 'balanced', 'detailed'] as const).map((v) => (
                    <Chip
                      key={v}
                      label={v === 'concise' ? 'Concis' : v === 'detailed' ? 'Détaillé' : 'Équilibré'}
                      onClick={() => handlePersonalityChange('verbosity', v)}
                      color={editingPersona.personality?.verbosity === v ? 'primary' : 'default'}
                      variant={editingPersona.personality?.verbosity === v ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Humour
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {(['none', 'light', 'playful'] as const).map((v) => (
                    <Chip
                      key={v}
                      label={v === 'none' ? 'Aucun' : v === 'playful' ? 'Joueur' : 'Léger'}
                      onClick={() => handlePersonalityChange('humor', v)}
                      color={editingPersona.personality?.humor === v ? 'primary' : 'default'}
                      variant={editingPersona.personality?.humor === v ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Empathie
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {(['minimal', 'balanced', 'high'] as const).map((v) => (
                    <Chip
                      key={v}
                      label={v === 'minimal' ? 'Minimale' : v === 'high' ? 'Élevée' : 'Équilibrée'}
                      onClick={() => handlePersonalityChange('empathy', v)}
                      color={editingPersona.personality?.empathy === v ? 'primary' : 'default'}
                      variant={editingPersona.personality?.empathy === v ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Créativité
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {(['factual', 'balanced', 'creative'] as const).map((v) => (
                    <Chip
                      key={v}
                      label={v === 'factual' ? 'Factuel' : v === 'creative' ? 'Créatif' : 'Équilibré'}
                      onClick={() => handlePersonalityChange('creativity', v)}
                      color={editingPersona.personality?.creativity === v ? 'primary' : 'default'}
                      variant={editingPersona.personality?.creativity === v ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </TabPanel>

          {/* Tab 2: Conversation Starters */}
          <TabPanel value={activeTab} index={2}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info">
                Les conversation starters sont des suggestions affichées quand l'utilisateur démarre une nouvelle conversation.
              </Alert>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Ajouter une suggestion"
                  value={newStarter}
                  onChange={(e) => setNewStarter(e.target.value)}
                  placeholder="Ex: 👋 Bonjour Lisa !"
                  onKeyDown={(e) => e.key === 'Enter' && addConversationStarter()}
                />
                <Button
                  variant="contained"
                  onClick={addConversationStarter}
                  disabled={!newStarter.trim()}
                >
                  <AddIcon />
                </Button>
              </Box>

              <List>
                {editingPersona.conversationStarters?.map((starter, index) => (
                  <ListItem key={index} divider>
                    <ListItemText primary={starter} />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => removeConversationStarter(index)}
                        aria-label="supprimer"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          </TabPanel>

          {/* Tab 3: Capabilities */}
          <TabPanel value={activeTab} index={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Activez ou désactivez les capacités de Lisa pour ce persona
              </Typography>

              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>🎯 Perception</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingPersona.capabilities?.vision ?? true}
                        onChange={() => handleCapabilityChange('vision')}
                      />
                    }
                    label="👁️ Vision (caméra, analyse d'images)"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingPersona.capabilities?.hearing ?? true}
                        onChange={() => handleCapabilityChange('hearing')}
                      />
                    }
                    label="👂 Ouïe (microphone, reconnaissance vocale)"
                  />
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>🛠️ Outils</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingPersona.capabilities?.codeInterpreter ?? true}
                        onChange={() => handleCapabilityChange('codeInterpreter')}
                      />
                    }
                    label="💻 Interpréteur de code"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingPersona.capabilities?.webSearch ?? true}
                        onChange={() => handleCapabilityChange('webSearch')}
                      />
                    }
                    label="🔍 Recherche web"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingPersona.capabilities?.fileUpload ?? true}
                        onChange={() => handleCapabilityChange('fileUpload')}
                      />
                    }
                    label="📎 Upload de fichiers"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingPersona.capabilities?.imageGeneration ?? false}
                        onChange={() => handleCapabilityChange('imageGeneration')}
                      />
                    }
                    label="🎨 Génération d'images (DALL-E)"
                  />
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>🤖 Intégrations</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingPersona.capabilities?.ros ?? false}
                        onChange={() => handleCapabilityChange('ros')}
                      />
                    }
                    label="🦾 ROS (Robot Operating System)"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingPersona.capabilities?.mqtt ?? false}
                        onChange={() => handleCapabilityChange('mqtt')}
                      />
                    }
                    label="🏠 MQTT (Domotique)"
                  />
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>🧠 Mémoire</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingPersona.capabilities?.memory ?? true}
                        onChange={() => handleCapabilityChange('memory')}
                      />
                    }
                    label="💾 Mémoire long-terme"
                  />
                </CardContent>
              </Card>
            </Box>
          </TabPanel>

          {/* Tab 4: Voice Settings */}
          <TabPanel value={activeTab} index={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={editingPersona.voice?.enabled ?? true}
                    onChange={(e) => handleVoiceChange('enabled', e.target.checked)}
                  />
                }
                label="Activer la synthèse vocale"
              />

              <FormControl fullWidth disabled={!editingPersona.voice?.enabled}>
                <InputLabel>Langue</InputLabel>
                <Select
                  value={editingPersona.voice?.language || 'fr-FR'}
                  label="Langue"
                  onChange={(e) => handleVoiceChange('language', e.target.value)}
                >
                  <MenuItem value="fr-FR">🇫🇷 Français</MenuItem>
                  <MenuItem value="en-US">🇺🇸 English</MenuItem>
                  <MenuItem value="es-ES">🇪🇸 Español</MenuItem>
                </Select>
              </FormControl>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Hauteur de voix: {editingPersona.voice?.pitch?.toFixed(1) || 1}
                </Typography>
                <Slider
                  value={editingPersona.voice?.pitch || 1}
                  onChange={(_, value) => handleVoiceChange('pitch', value)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  disabled={!editingPersona.voice?.enabled}
                  marks={[
                    { value: 0.5, label: 'Grave' },
                    { value: 1, label: 'Normal' },
                    { value: 2, label: 'Aigu' },
                  ]}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Vitesse: {editingPersona.voice?.rate?.toFixed(1) || 1}
                </Typography>
                <Slider
                  value={editingPersona.voice?.rate || 1}
                  onChange={(_, value) => handleVoiceChange('rate', value)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  disabled={!editingPersona.voice?.enabled}
                  marks={[
                    { value: 0.5, label: 'Lent' },
                    { value: 1, label: 'Normal' },
                    { value: 2, label: 'Rapide' },
                  ]}
                />
              </Box>
            </Box>
          </TabPanel>
        </Box>

        {/* Right Panel - Preview */}
        <Box
          sx={{
            width: '40%',
            bgcolor: 'grey.900',
            p: 3,
            overflow: 'auto',
          }}
        >
          <Typography variant="h6" gutterBottom color="white">
            <PreviewIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Aperçu
          </Typography>

          <Card sx={{ mb: 3, bgcolor: 'grey.800' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar
                  src={editingPersona.avatar}
                  sx={{ width: 60, height: 60, bgcolor: 'primary.main' }}
                >
                  {editingPersona.name?.[0] || 'L'}
                </Avatar>
                <Box>
                  <Typography variant="h6" color="white">
                    {editingPersona.name || 'Sans nom'}
                  </Typography>
                  <Typography variant="body2" color="grey.400">
                    {editingPersona.description || 'Pas de description'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2, borderColor: 'grey.700' }} />

              <Typography variant="subtitle2" color="grey.400" gutterBottom>
                Suggestions de conversation
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {editingPersona.conversationStarters?.slice(0, 4).map((starter, i) => (
                  <Chip
                    key={i}
                    label={starter}
                    size="small"
                    sx={{ bgcolor: 'grey.700', color: 'white' }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ bgcolor: 'grey.800' }}>
            <CardContent>
              <Typography variant="subtitle2" color="grey.400" gutterBottom>
                Capacités actives
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {editingPersona.capabilities?.vision && <Chip label="👁️ Vision" size="small" color="primary" />}
                {editingPersona.capabilities?.hearing && <Chip label="👂 Ouïe" size="small" color="primary" />}
                {editingPersona.capabilities?.codeInterpreter && <Chip label="💻 Code" size="small" color="secondary" />}
                {editingPersona.capabilities?.webSearch && <Chip label="🔍 Web" size="small" color="secondary" />}
                {editingPersona.capabilities?.memory && <Chip label="🧠 Mémoire" size="small" color="success" />}
                {editingPersona.capabilities?.ros && <Chip label="🦾 ROS" size="small" color="warning" />}
                {editingPersona.capabilities?.mqtt && <Chip label="🏠 MQTT" size="small" color="warning" />}
              </Box>

              <Divider sx={{ my: 2, borderColor: 'grey.700' }} />

              <Typography variant="subtitle2" color="grey.400" gutterBottom>
                Personnalité
              </Typography>
              <Typography variant="body2" color="grey.300">
                {editingPersona.personality?.formality === 'casual' ? '😊 Décontracté' : 
                 editingPersona.personality?.formality === 'formal' ? '👔 Formel' : '⚖️ Équilibré'}
                {' • '}
                {editingPersona.personality?.empathy === 'high' ? '❤️ Empathique' : 
                 editingPersona.personality?.empathy === 'minimal' ? '🤖 Neutre' : '🤝 Équilibré'}
                {' • '}
                {editingPersona.personality?.humor === 'playful' ? '😄 Joueur' : 
                 editingPersona.personality?.humor === 'light' ? '🙂 Léger' : '😐 Sérieux'}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default PersonaBuilder;
