import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, Typography, TextField, Box } from '@mui/material';

interface RosPublisherNodeData {
  topicName: string;
  messageType: string;
  messageContent: string;
}

const RosPublisherNode: React.FC<NodeProps<RosPublisherNodeData>> = memo(({ data }) => {
  return (
    <Card sx={{ width: 300, border: '1px solid #1976d2' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          ROS Publisher
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Publishes a message to a ROS topic.
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
            label="Message Content (JSON)"
            variant="outlined"
            size="small"
            fullWidth
            multiline
            rows={4}
            value={data.messageContent}
            onChange={(evt) => (data.messageContent = evt.target.value)}
          />
        </Box>
        <Handle type="target" position={Position.Left} id="input" />
        <Handle type="source" position={Position.Right} id="output" />
      </CardContent>
    </Card>
  );
});

export default RosPublisherNode;