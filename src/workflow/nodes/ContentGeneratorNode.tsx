import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, Typography, TextField, Box, MenuItem, Select, FormControl, InputLabel } from '@mui/material';

interface ContentGeneratorNodeData {
  action: 'summarize' | 'translate' | 'rewrite' | 'generate' | 'draft_email' | 'draft_message';
  text?: string;
  prompt?: string;
  targetLanguage?: string;
  style?: 'formal' | 'casual' | 'creative' | 'technical' | 'persuasive';
  length?: 'short' | 'medium' | 'long';
  subject?: string;
  recipient?: string;
  points?: string[];
  context?: string;
}

const ContentGeneratorNode: React.FC<NodeProps<ContentGeneratorNodeData>> = memo(({ data }) => {
  return (
    <Card sx={{ width: 350, border: '1px solid #FF5722' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          Générateur de Contenu
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Génère et manipule du contenu textuel.
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="action-label">Action</InputLabel>
          <Select
            labelId="action-label"
            value={data.action}
            label="Action"
            onChange={(evt) => (data.action = evt.target.value as any)}
          >
            <MenuItem value="summarize">Résumer</MenuItem>
            <MenuItem value="translate">Traduire</MenuItem>
            <MenuItem value="rewrite">Réécrire</MenuItem>
            <MenuItem value="generate">Générer</MenuItem>
            <MenuItem value="draft_email">Rédiger Email</MenuItem>
            <MenuItem value="draft_message">Rédiger Message</MenuItem>
          </Select>
        </FormControl>

        {(data.action === 'summarize' || data.action === 'translate' || data.action === 'rewrite') && (
          <TextField
            label="Texte à traiter"
            variant="outlined"
            size="small"
            fullWidth
            multiline
            rows={4}
            value={data.text || ''}
            onChange={(evt) => (data.text = evt.target.value)}
            sx={{ mb: 2 }}
          />
        )}

        {data.action === 'generate' && (
          <TextField
            label="Prompt"
            variant="outlined"
            size="small"
            fullWidth
            multiline
            rows={4}
            value={data.prompt || ''}
            onChange={(evt) => (data.prompt = evt.target.value)}
            sx={{ mb: 2 }}
          />
        )}

        {data.action === 'translate' && (
          <TextField
            label="Langue Cible"
            variant="outlined"
            size="small"
            fullWidth
            value={data.targetLanguage || ''}
            onChange={(evt) => (data.targetLanguage = evt.target.value)}
            sx={{ mb: 2 }}
          />
        )}

        {(data.action === 'generate' || data.action === 'rewrite' || data.action === 'draft_email' || data.action === 'draft_message') && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="style-label">Style</InputLabel>
            <Select
              labelId="style-label"
              value={data.style || 'casual'}
              label="Style"
              onChange={(evt) => (data.style = evt.target.value as any)}
            >
              <MenuItem value="formal">Formel</MenuItem>
              <MenuItem value="casual">Décontracté</MenuItem>
              <MenuItem value="creative">Créatif</MenuItem>
              <MenuItem value="technical">Technique</MenuItem>
              <MenuItem value="persuasive">Persuasif</MenuItem>
            </Select>
          </FormControl>
        )}

        {(data.action === 'summarize' || data.action === 'generate') && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="length-label">Longueur</InputLabel>
            <Select
              labelId="length-label"
              value={data.length || 'medium'}
              label="Longueur"
              onChange={(evt) => (data.length = evt.target.value as any)}
            >
              <MenuItem value="short">Courte</MenuItem>
              <MenuItem value="medium">Moyenne</MenuItem>
              <MenuItem value="long">Longue</MenuItem>
            </Select>
          </FormControl>
        )}

        {data.action === 'draft_email' && (
          <>
            <TextField
              label="Sujet"
              variant="outlined"
              size="small"
              fullWidth
              value={data.subject || ''}
              onChange={(evt) => (data.subject = evt.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Destinataire"
              variant="outlined"
              size="small"
              fullWidth
              value={data.recipient || ''}
              onChange={(evt) => (data.recipient = evt.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Points Clés (séparés par des virgules)"
              variant="outlined"
              size="small"
              fullWidth
              multiline
              rows={2}
              value={data.points ? data.points.join(', ') : ''}
              onChange={(evt) => (data.points = evt.target.value.split(',').map(s => s.trim()))}
              sx={{ mb: 2 }}
            />
          </>
        )}

        {data.action === 'draft_message' && (
          <>
            <TextField
              label="Contexte"
              variant="outlined"
              size="small"
              fullWidth
              multiline
              rows={2}
              value={data.context || ''}
              onChange={(evt) => (data.context = evt.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Points Clés (séparés par des virgules)"
              variant="outlined"
              size="small"
              fullWidth
              multiline
              rows={2}
              value={data.points ? data.points.join(', ') : ''}
              onChange={(evt) => (data.points = evt.target.value.split(',').map(s => s.trim()))}
              sx={{ mb: 2 }}
            />
          </>
        )}

        <Handle type="target" position={Position.Left} id="input" />
        <Handle type="source" position={Position.Right} id="output" />
      </CardContent>
    </Card>
  );
});

export default ContentGeneratorNode;