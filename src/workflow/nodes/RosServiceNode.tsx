import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, Typography, TextField, Box } from '@mui/material';

interface RosServiceNodeData {
  serviceName: string;
  serviceType: string;
  requestContent: string;
  timeout?: number;
}

const RosServiceNode: React.FC<NodeProps<RosServiceNodeData>> = memo(({ data }) => {
  return (
    <Card sx={{ width: 300, border: '1px solid #1976d2' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          ROS Service
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Calls a ROS service and outputs the response.
        </Typography>
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Service Name"
            variant="outlined"
            size="small"
            fullWidth
            value={data.serviceName}
            onChange={(evt) => (data.serviceName = evt.target.value)}
            sx={{ mb: 1 }}
          />
          <TextField
            label="Service Type"
            variant="outlined"
            size="small"
            fullWidth
            value={data.serviceType}
            onChange={(evt) => (data.serviceType = evt.target.value)}
            sx={{ mb: 1 }}
          />
          <TextField
            label="Request Content (JSON)"
            variant="outlined"
            size="small"
            fullWidth
            multiline
            rows={4}
            value={data.requestContent}
            onChange={(evt) => (data.requestContent = evt.target.value)}
          />
          <TextField
            label="Timeout (ms)"
            variant="outlined"
            size="small"
            fullWidth
            type="number"
            value={data.timeout || ''}
            onChange={(evt) => (data.timeout = parseInt(evt.target.value) || undefined)}
          />
        </Box>
        <Handle type="target" position={Position.Left} id="input" />
        <Handle type="source" position={Position.Right} id="output" />
      </CardContent>
    </Card>
  );
});

export default RosServiceNode;