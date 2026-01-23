import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Card, CardContent, Typography, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';

interface MQTTNodeData {
  action: 'connect' | 'publish' | 'subscribe' | 'unsubscribe' | 'disconnect';
  brokerUrl?: string;
  topic?: string;
  message?: string;
  options?: Record<string, unknown> | null;
}

const MQTTNode: React.FC<NodeProps<MQTTNodeData>> = memo(({ data }) => {
  return (
    <Card sx={{ width: 350, border: '1px solid #9C27B0' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          MQTT
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Gère les connexions, publications et souscriptions MQTT.
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="action-label">Action</InputLabel>
          <Select
            labelId="action-label"
            value={data.action}
            label="Action"
            onChange={(evt: SelectChangeEvent<MQTTNodeData['action']>) => {
              const value = evt.target.value as MQTTNodeData['action'];
              data.action = value;
            }}
          >
            <MenuItem value="connect">Connecter</MenuItem>
            <MenuItem value="publish">Publier</MenuItem>
            <MenuItem value="subscribe">Souscrire</MenuItem>
            <MenuItem value="unsubscribe">Désouscrire</MenuItem>
            <MenuItem value="disconnect">Déconnecter</MenuItem>
          </Select>
        </FormControl>

        {data.action === 'connect' && (
          <TextField
            label="URL du Broker"
            variant="outlined"
            size="small"
            fullWidth
            value={data.brokerUrl || ''}
            onChange={(evt) => {
              data.brokerUrl = evt.target.value;
            }}
            sx={{ mb: 2 }}
          />
        )}

        {(data.action === 'publish' || data.action === 'subscribe' || data.action === 'unsubscribe') && (
          <TextField
            label="Topic"
            variant="outlined"
            size="small"
            fullWidth
            value={data.topic || ''}
            onChange={(evt) => {
              data.topic = evt.target.value;
            }}
            sx={{ mb: 2 }}
          />
        )}

        {data.action === 'publish' && (
          <TextField
            label="Message"
            variant="outlined"
            size="small"
            fullWidth
            multiline
            rows={4}
            value={data.message || ''}
            onChange={(evt) => {
              data.message = evt.target.value;
            }}
            sx={{ mb: 2 }}
          />
        )}

        {(data.action === 'connect' || data.action === 'publish' || data.action === 'subscribe') && (
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
        )}

        <Handle type="target" position={Position.Left} id="input" />
        <Handle type="source" position={Position.Right} id="output" />
      </CardContent>
    </Card>
  );
});

export default MQTTNode;
