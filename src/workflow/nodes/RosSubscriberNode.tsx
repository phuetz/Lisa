import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, Typography, TextField, Box } from '@mui/material';

interface RosSubscriberNodeData {
  topicName: string;
  messageType: string;
  timeout?: number;
}

const RosSubscriberNode: React.FC<NodeProps<RosSubscriberNodeData>> = memo(({ data }) => {
  return (
    <Card sx={{ width: 300, border: '1px solid #1976d2' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          ROS Subscriber
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Subscribes to a ROS topic and outputs received messages.
        </Typography>
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Topic Name"
            variant="outlined"
            size="small"
            fullWidth
            value={data.topicName}
            onChange={(evt) => (data.topicName = evt.target.value)}
            sx={{ mb: 1 }}
          />
          <TextField
            label="Message Type"
            variant="outlined"
            size="small"
            fullWidth
            value={data.messageType}
            onChange={(evt) => (data.messageType = evt.target.value)}
            sx={{ mb: 1 }}
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

export default RosSubscriberNode;