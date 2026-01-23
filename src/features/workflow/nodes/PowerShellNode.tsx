import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Card, CardContent, Typography, TextField } from '@mui/material';

interface PowerShellNodeData {
  command: string;
  options?: Record<string, unknown> | null;
}

const PowerShellNode: React.FC<NodeProps<PowerShellNodeData>> = memo(({ data }) => {
  return (
    <Card sx={{ width: 350, border: '1px solid #012456' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          PowerShell
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Exécute des commandes PowerShell sur le système hôte.
        </Typography>
        <TextField
          label="Commande"
          variant="outlined"
          size="small"
          fullWidth
          multiline
          rows={4}
          value={data.command || ''}
          onChange={(evt) => {
            data.command = evt.target.value;
          }}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Options (JSON)"
          variant="outlined"
          size="small"
          fullWidth
          multiline
          rows={2}
          value={data.options ? JSON.stringify(data.options) : ''}
          onChange={(evt) => {
            try {
              data.options = JSON.parse(evt.target.value) as Record<string, unknown>;
            } catch {
              data.options = null;
            }
          }}
          sx={{ mb: 2 }}
        />
        <Handle type="target" position={Position.Left} id="input" />
        <Handle type="source" position={Position.Right} id="output" />
      </CardContent>
    </Card>
  );
});

export default PowerShellNode;
