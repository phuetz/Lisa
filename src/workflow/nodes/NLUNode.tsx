import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, Typography, TextField, Box, MenuItem, Select, FormControl, InputLabel } from '@mui/material';

interface NLUNodeData {
  task: 'sentiment_analysis' | 'zero_shot_classification' | 'feature_extraction';
  text?: string;
  candidate_labels?: string[];
}

const NLUNode: React.FC<NodeProps<NLUNodeData>> = memo(({ data }) => {
  return (
    <Card sx={{ width: 350, border: '1px solid #607D8B' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          NLU
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Effectue des tâches de compréhension du langage naturel.
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="task-label">Tâche</InputLabel>
          <Select
            labelId="task-label"
            value={data.task}
            label="Tâche"
            onChange={(evt) => (data.task = evt.target.value as any)}
          >
            <MenuItem value="sentiment_analysis">Analyse de Sentiment</MenuItem>
            <MenuItem value="zero_shot_classification">Classification Zero-Shot</MenuItem>
            <MenuItem value="feature_extraction">Extraction de Caractéristiques</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Texte"
          variant="outlined"
          size="small"
          fullWidth
          multiline
          rows={4}
          value={data.text || ''}
          onChange={(evt) => (data.text = evt.target.value)}
          sx={{ mb: 2 }}
        />

        {data.task === 'zero_shot_classification' && (
          <TextField
            label="Labels Candidats (séparés par des virgules)"
            variant="outlined"
            size="small"
            fullWidth
            value={data.candidate_labels ? data.candidate_labels.join(', ') : ''}
            onChange={(evt) => (data.candidate_labels = evt.target.value.split(',').map(s => s.trim()))}
            sx={{ mb: 2 }}
          />
        )}

        <Handle type="target" position={Position.Left} id="input" />
        <Handle type="source" position={Position.Right} id="output" />
      </CardContent>
    </Card>
  );
});

export default NLUNode;