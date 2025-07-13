import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, Typography, TextField, Box, MenuItem, Select, FormControl, InputLabel } from '@mui/material';

interface PersonalizationNodeData {
  action: 'get_preferences' | 'set_preference' | 'get_recommendations' | 'track_interaction' | 'get_user_profile' | 'adapt_response';
  category?: string;
  key?: string;
  value?: any;
  context?: any;
}

const PersonalizationNode: React.FC<NodeProps<PersonalizationNodeData>> = memo(({ data }) => {
  return (
    <Card sx={{ width: 350, border: '1px solid #4CAF50' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          Personnalisation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Adapte l'expérience utilisateur.
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="action-label">Action</InputLabel>
          <Select
            labelId="action-label"
            value={data.action}
            label="Action"
            onChange={(evt) => (data.action = evt.target.value as any)}
          >
            <MenuItem value="get_preferences">Obtenir Préférences</MenuItem>
            <MenuItem value="set_preference">Définir Préférence</MenuItem>
            <MenuItem value="get_recommendations">Obtenir Recommandations</MenuItem>
            <MenuItem value="track_interaction">Suivre Interaction</MenuItem>
            <MenuItem value="get_user_profile">Obtenir Profil Utilisateur</MenuItem>
            <MenuItem value="adapt_response">Adapter Réponse</MenuItem>
          </Select>
        </FormControl>

        {(data.action === 'get_preferences' || data.action === 'set_preference') && (
          <TextField
            label="Catégorie"
            variant="outlined"
            size="small"
            fullWidth
            value={data.category || ''}
            onChange={(evt) => (data.category = evt.target.value)}
            sx={{ mb: 2 }}
          />
        )}

        {data.action === 'set_preference' && (
          <>
            <TextField
              label="Clé"
              variant="outlined"
              size="small"
              fullWidth
              value={data.key || ''}
              onChange={(evt) => (data.key = evt.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Valeur"
              variant="outlined"
              size="small"
              fullWidth
              value={data.value || ''}
              onChange={(evt) => (data.value = evt.target.value)}
              sx={{ mb: 2 }}
            />
          </>
        )}

        {(data.action === 'get_recommendations' || data.action === 'adapt_response') && (
          <TextField
            label="Contexte (JSON)"
            variant="outlined"
            size="small"
            fullWidth
            multiline
            rows={4}
            value={data.context ? JSON.stringify(data.context) : ''}
            onChange={(evt) => {
              try {
                data.context = JSON.parse(evt.target.value);
              } catch { /* ignore */ }
            }}
            sx={{ mb: 2 }}
          />
        )}

        <Handle type="target" position={Position.Left} id="input" />
        <Handle type="source" position={Position.Right} id="output" />
      </CardContent>
    </Card>
  );
});

export default PersonalizationNode;