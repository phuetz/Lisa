/**
 * PersonaSelector Component
 * Sélecteur de persona dans la sidebar (similaire au sélecteur GPT)
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Chip,
  Button,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Add as AddIcon,
  Edit as EditIcon,
  ContentCopy as DuplicateIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  SmartToy as BotIcon,
} from '@mui/icons-material';
import { usePersonaStore } from '../store/personaStore';

export const PersonaSelector: React.FC = () => {
  const {
    personas,
    activePersonaId,
    setActivePersona,
    startEditing,
    duplicatePersona,
    deletePersona,
    getPersonaById,
  } = usePersonaStore();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuMode, setMenuMode] = useState<'select' | 'manage'>('select');
  const open = Boolean(anchorEl);

  const activePersona = getPersonaById(activePersonaId);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setMenuMode('select');
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectPersona = (id: string) => {
    setActivePersona(id);
    handleClose();
  };

  const handleCreateNew = () => {
    handleClose();
    startEditing();
  };

  const handleEdit = (id: string) => {
    handleClose();
    const persona = getPersonaById(id);
    if (persona) {
      startEditing(persona);
    }
  };

  const handleDuplicate = (id: string) => {
    const newId = duplicatePersona(id);
    if (newId) {
      setActivePersona(newId);
    }
    handleClose();
  };

  const handleDelete = (id: string) => {
    if (id === 'default') return;
    deletePersona(id);
    handleClose();
  };

  return (
    <>
      {/* Persona Button */}
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.5,
          borderRadius: 2,
          cursor: 'pointer',
          bgcolor: 'rgba(255,255,255,0.05)',
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: 'rgba(255,255,255,0.1)',
          },
        }}
        role="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Sélectionner un persona"
      >
        <Avatar
          src={activePersona?.avatar}
          sx={{
            width: 40,
            height: 40,
            bgcolor: 'primary.main',
            fontSize: '1rem',
          }}
        >
          {activePersona?.name?.[0] || <BotIcon />}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {activePersona?.name || 'Lisa'}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {activePersona?.description || 'Assistant IA'}
          </Typography>
        </Box>
        <ExpandMoreIcon
          sx={{
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </Box>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 320,
            maxHeight: 480,
            bgcolor: 'background.paper',
          },
        }}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
      >
        {menuMode === 'select' ? (
          <>
            {/* Persona List */}
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="overline" color="text.secondary">
                Mes Personas
              </Typography>
            </Box>

            {personas.map((persona) => (
              <MenuItem
                key={persona.id}
                onClick={() => handleSelectPersona(persona.id)}
                selected={persona.id === activePersonaId}
                sx={{ py: 1.5 }}
              >
                <ListItemIcon>
                  <Avatar
                    src={persona.avatar}
                    sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
                  >
                    {persona.name[0]}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={persona.name}
                  secondary={persona.description}
                  primaryTypographyProps={{ fontWeight: 500 }}
                  secondaryTypographyProps={{
                    sx: {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  }}
                />
                {persona.id === activePersonaId && (
                  <CheckIcon color="primary" fontSize="small" />
                )}
                {persona.isDefault && (
                  <Chip label="Défaut" size="small" sx={{ ml: 1 }} />
                )}
              </MenuItem>
            ))}

            <Divider sx={{ my: 1 }} />

            {/* Actions */}
            <MenuItem onClick={handleCreateNew}>
              <ListItemIcon>
                <AddIcon />
              </ListItemIcon>
              <ListItemText primary="Créer un nouveau persona" />
            </MenuItem>

            <MenuItem onClick={() => setMenuMode('manage')}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Gérer les personas" />
            </MenuItem>
          </>
        ) : (
          <>
            {/* Manage Mode */}
            <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton size="small" onClick={() => setMenuMode('select')}>
                <ExpandMoreIcon sx={{ transform: 'rotate(90deg)' }} />
              </IconButton>
              <Typography variant="subtitle2">Gérer les personas</Typography>
            </Box>

            <Divider />

            {personas.map((persona) => (
              <Box
                key={persona.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  gap: 1,
                }}
              >
                <Avatar
                  src={persona.avatar}
                  sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}
                >
                  {persona.name[0]}
                </Avatar>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {persona.name}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleEdit(persona.id)}
                  aria-label="modifier"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDuplicate(persona.id)}
                  aria-label="dupliquer"
                >
                  <DuplicateIcon fontSize="small" />
                </IconButton>
                {!persona.isDefault && (
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(persona.id)}
                    aria-label="supprimer"
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}

            <Divider sx={{ my: 1 }} />

            <Box sx={{ px: 2, py: 1 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleCreateNew}
              >
                Nouveau persona
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
};

export default PersonaSelector;
