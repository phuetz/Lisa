import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, Typography, TextField, Box, MenuItem, Select, FormControl, InputLabel } from '@mui/material';

interface MemoryNodeData {
  action: 'store' | 'retrieve' | 'update' | 'delete' | 'summarize';
  content?: string;
  query?: any;
  id?: string;
  type?: 'fact' | 'preference' | 'interaction' | 'context';
  tags?: string[];
  context?: string;
}

const MemoryNode: React.FC<NodeProps<MemoryNodeData>> = memo(({ data }) => {
  return (
    <Card sx={{ width: 350, border: '1px solid #FF6F00' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          Mémoire
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Stocke ou récupère des informations de la mémoire de Lisa.
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="action-label">Action</InputLabel>
          <Select
            labelId="action-label"
            value={data.action}
            label="Action"
            onChange={(evt) => (data.action = evt.target.value as any)}
          >
            <MenuItem value="store">Stocker</MenuItem>
            <MenuItem value="retrieve">Récupérer</MenuItem>
            <MenuItem value="update">Mettre à jour</MenuItem>
            <MenuItem value="delete">Supprimer</MenuItem>
            <MenuItem value="summarize">Résumer</MenuItem>
          </Select>
        </FormControl>

        {data.action === 'store' && (
          <>
            <TextField
              label="Contenu"
              variant="outlined"
              size="small"
              fullWidth
              multiline
              rows={4}
              value={data.content || ''}
              onChange={(evt) => (data.content = evt.target.value)}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="type-label">Type</InputLabel>
              <Select
                labelId="type-label"
                value={data.type || 'fact'}
                label="Type"
                onChange={(evt) => (data.type = evt.target.value as any)}
              >
                <MenuItem value="fact">Fait</MenuItem>
                <MenuItem value="preference">Préférence</MenuItem>
                <MenuItem value="interaction">Interaction</MenuItem>
                <MenuItem value="context">Contexte</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Tags (séparés par des virgules)"
              variant="outlined"
              size="small"
              fullWidth
              value={data.tags ? data.tags.join(', ') : ''}
              onChange={(evt) => (data.tags = evt.target.value.split(',').map(s => s.trim()))}
              sx={{ mb: 2 }}
            />
          </>
        )}

        {(data.action === 'retrieve' || data.action === 'summarize') && (
          <TextField
            label="Requête/Contexte"
            variant="outlined"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={data.query ? JSON.stringify(data.query) : (data.context || '')}
            onChange={(evt) => {
              try {
                if (data.action === 'retrieve') data.query = JSON.parse(evt.target.value);
                else data.context = evt.target.value;
              } catch { /* ignore */ }
            }}
            sx={{ mb: 2 }}
          />
        )}

        {(data.action === 'update' || data.action === 'delete') && (
          <TextField
            label="ID de la mémoire"
            variant="outlined"
            size="small"
            fullWidth
            value={data.id || ''}
            onChange={(evt) => (data.id = evt.target.value)}
            sx={{ mb: 2 }}
          />
        )}

        {data.action === 'update' && (
          <TextField
            label="Mises à jour (JSON)"
            variant="outlined"
            size="small"
            fullWidth
            multiline
            rows={4}
            value={data.content || ''}
            onChange={(evt) => (data.content = evt.target.value)}
            sx={{ mb: 2 }}
          />
        )}

        <Handle type="target" position={Position.Left} id="input" />
        <Handle type="source" position={Position.Right} id="output" />
      </CardContent>
    </Card>
  );
});

export default MemoryNode;