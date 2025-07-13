import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, Typography, TextField, Box, MenuItem, Select, FormControl, InputLabel } from '@mui/material';

interface LogNodeData {
  message: string;
  level: 'info' | 'warn' | 'error' | 'debug';
}

const LogNode: React.FC<NodeProps<LogNodeData>> = memo(({ data }) => {
  return (
    <Card sx={{ width: 300, border: '1px solid #607D8B' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          Log
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enregistre un message dans les logs du workflow.
        </Typography>
        <TextField
          label="Message"
          variant="outlined"
          size="small"
          fullWidth
          multiline
          rows={3}
          value={data.message || ''}
          onChange={(evt) => (data.message = evt.target.value)}
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="level-label">Niveau</InputLabel>
          <Select
            labelId="level-label"
            value={data.level || 'info'}
            label="Niveau"
            onChange={(evt) => (data.level = evt.target.value as any)}
          >
            <MenuItem value="info">Info</MenuItem>
            <MenuItem value="warn">Avertissement</MenuItem>
            <MenuItem value="error">Erreur</MenuItem>
            <MenuItem value="debug">Debug</MenuItem>
          </Select>
        </FormControl>
        <Handle type="target" position={Position.Left} id="input" />
        <Handle type="source" position={Position.Right} id="output" />
      </CardContent>
    </Card>
  );
});

export default LogNode;