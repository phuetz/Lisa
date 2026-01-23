/**
 * PersonaPage
 * Page de gestion des personas Lisa
 */

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Button,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Check as ActiveIcon,
  Download as ExportIcon,
  Upload as ImportIcon,
} from '@mui/icons-material';
import { usePersonaStore } from '../store/personaStore';
import { PersonaBuilder } from '../components/PersonaBuilder';

export const PersonaPage: React.FC = () => {
  const {
    personas,
    activePersonaId,
    setActivePersona,
    startEditing,
    deletePersona,
    duplicatePersona,
    exportPersona,
    importPersona,
    isEditing,
  } = usePersonaStore();

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const data = event.target?.result as string;
          importPersona(data);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExport = (id: string, name: string) => {
    const data = exportPersona(id);
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-persona.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            🤖 Personas Lisa
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Créez et gérez différentes personnalités pour Lisa, comme les GPTs personnalisés
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={handleImport}
          >
            Importer
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => startEditing()}
          >
            Créer un Persona
          </Button>
        </Box>
      </Box>

      {/* Persona Grid */}
      <Grid container spacing={3}>
        {personas.map((persona) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={persona.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: persona.id === activePersonaId ? 2 : 1,
                borderColor: persona.id === activePersonaId ? 'primary.main' : 'divider',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                  <Avatar
                    src={persona.avatar}
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: 'primary.main',
                      fontSize: '1.5rem',
                    }}
                  >
                    {persona.name[0]}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" component="div">
                        {persona.name}
                      </Typography>
                      {persona.id === activePersonaId && (
                        <Chip
                          icon={<ActiveIcon />}
                          label="Actif"
                          size="small"
                          color="primary"
                        />
                      )}
                      {persona.isDefault && (
                        <Chip label="Défaut" size="small" variant="outlined" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {persona.description}
                    </Typography>
                  </Box>
                </Box>

                {/* Capabilities */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {persona.capabilities.vision && (
                    <Chip label="👁️ Vision" size="small" variant="outlined" />
                  )}
                  {persona.capabilities.hearing && (
                    <Chip label="👂 Ouïe" size="small" variant="outlined" />
                  )}
                  {persona.capabilities.codeInterpreter && (
                    <Chip label="💻 Code" size="small" variant="outlined" />
                  )}
                  {persona.capabilities.webSearch && (
                    <Chip label="🔍 Web" size="small" variant="outlined" />
                  )}
                  {persona.capabilities.memory && (
                    <Chip label="🧠 Mémoire" size="small" variant="outlined" />
                  )}
                </Box>

                {/* Personality */}
                <Typography variant="caption" color="text.secondary">
                  {persona.personality.formality === 'casual'
                    ? '😊 Décontracté'
                    : persona.personality.formality === 'formal'
                    ? '👔 Formel'
                    : '⚖️ Équilibré'}
                  {' • '}
                  {persona.personality.empathy === 'high'
                    ? '❤️ Empathique'
                    : persona.personality.empathy === 'minimal'
                    ? '🤖 Neutre'
                    : '🤝 Équilibré'}
                </Typography>
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Button
                  size="small"
                  variant={persona.id === activePersonaId ? 'outlined' : 'contained'}
                  onClick={() => setActivePersona(persona.id)}
                  disabled={persona.id === activePersonaId}
                >
                  {persona.id === activePersonaId ? 'Actif' : 'Activer'}
                </Button>
                <Box>
                  <Tooltip title="Modifier">
                    <IconButton
                      size="small"
                      onClick={() => startEditing(persona)}
                      aria-label="modifier"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Dupliquer">
                    <IconButton
                      size="small"
                      onClick={() => duplicatePersona(persona.id)}
                      aria-label="dupliquer"
                    >
                      <DuplicateIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Exporter">
                    <IconButton
                      size="small"
                      onClick={() => handleExport(persona.id, persona.name)}
                      aria-label="exporter"
                    >
                      <ExportIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!persona.isDefault && (
                    <Tooltip title="Supprimer">
                      <IconButton
                        size="small"
                        onClick={() => deletePersona(persona.id)}
                        aria-label="supprimer"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {/* Add New Card */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            sx={{
              height: '100%',
              minHeight: 280,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed',
              borderColor: 'divider',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
            onClick={() => startEditing()}
          >
            <Box sx={{ textAlign: 'center' }}>
              <AddIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary">
                Créer un Persona
              </Typography>
              <Typography variant="body2" color="text.disabled">
                Personnalisez Lisa selon vos besoins
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Persona Builder Modal */}
      {isEditing && <PersonaBuilder />}
    </Box>
  );
};

export default PersonaPage;
