import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Card, CardContent, Typography, TextField } from '@mui/material';

interface DelayNodeData {
  delayMs: number;
}

const DelayNode: React.FC<NodeProps<DelayNodeData>> = memo(({ data }) => {
  return (
    <Card sx={{ width: 250, border: '1px solid #FFC107' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          Délai
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Introduit un délai configurable.
        </Typography>
        <TextField
          label="Délai (ms)"
          variant="outlined"
          size="small"
          fullWidth
          type="number"
          value={data.delayMs || ''}
          onChange={(evt) => {
            const value = Number.parseInt(evt.target.value, 10);
            data.delayMs = Number.isNaN(value) ? 0 : value;
          }}
          sx={{ mb: 2 }}
        />
        <Handle type="target" position={Position.Left} id="input" />
        <Handle type="source" position={Position.Right} id="output" />
      </CardContent>
    </Card>
  );
});

export default DelayNode;
