import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Card, CardContent, Typography, TextField, MenuItem, Select, FormControl, InputLabel, Checkbox, FormControlLabel } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';

interface GitHubNodeData {
  action: 'listRepositories' | 'getRepository' | 'listIssues' | 'createIssue' | 'listPullRequests' | 'listCommits' | 'getReadme';
  owner?: string;
  repo?: string;
  username?: string;
  state?: 'open' | 'closed' | 'all';
  title?: string;
  body?: string;
  labels?: string[];
  token?: string;
  useCache?: boolean;
}

const GitHubNode: React.FC<NodeProps<GitHubNodeData>> = memo(({ data }) => {
  return (
    <Card sx={{ width: 350, border: '1px solid #181717' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ mb: 1 }}>
          GitHub
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Interagit avec l'API GitHub.
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="action-label">Action</InputLabel>
          <Select
            labelId="action-label"
            value={data.action}
            label="Action"
            onChange={(evt: SelectChangeEvent<GitHubNodeData['action']>) => {
              const value = evt.target.value as GitHubNodeData['action'];
              data.action = value;
            }}
          >
            <MenuItem value="listRepositories">Lister Dépôts</MenuItem>
            <MenuItem value="getRepository">Obtenir Dépôt</MenuItem>
            <MenuItem value="listIssues">Lister Issues</MenuItem>
            <MenuItem value="createIssue">Créer Issue</MenuItem>
            <MenuItem value="listPullRequests">Lister Pull Requests</MenuItem>
            <MenuItem value="listCommits">Lister Commits</MenuItem>
            <MenuItem value="getReadme">Obtenir README</MenuItem>
          </Select>
        </FormControl>

        {(data.action === 'listRepositories' || data.action === 'getRepository' || data.action === 'listIssues' || data.action === 'createIssue' || data.action === 'listPullRequests' || data.action === 'listCommits' || data.action === 'getReadme') && (
          <TextField
            label="Propriétaire (Owner)"
            variant="outlined"
            size="small"
            fullWidth
            value={data.owner || ''}
            onChange={(evt) => {
              data.owner = evt.target.value;
            }}
            sx={{ mb: 2 }}
          />
        )}

        {(data.action === 'getRepository' || data.action === 'listIssues' || data.action === 'createIssue' || data.action === 'listPullRequests' || data.action === 'listCommits' || data.action === 'getReadme') && (
          <TextField
            label="Dépôt (Repo)"
            variant="outlined"
            size="small"
            fullWidth
            value={data.repo || ''}
            onChange={(evt) => {
              data.repo = evt.target.value;
            }}
            sx={{ mb: 2 }}
          />
        )}

        {data.action === 'listRepositories' && (
          <TextField
            label="Nom d'utilisateur (Username)"
            variant="outlined"
            size="small"
            fullWidth
            value={data.username || ''}
            onChange={(evt) => {
              data.username = evt.target.value;
            }}
            sx={{ mb: 2 }}
          />
        )}

        {(data.action === 'listIssues' || data.action === 'listPullRequests') && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="state-label">État</InputLabel>
            <Select
              labelId="state-label"
              value={data.state || 'all'}
              label="État"
              onChange={(evt: SelectChangeEvent<GitHubNodeData['state'] | undefined>) => {
                const value = evt.target.value as GitHubNodeData['state'];
                data.state = value;
              }}
            >
              <MenuItem value="open">Ouvert</MenuItem>
              <MenuItem value="closed">Fermé</MenuItem>
              <MenuItem value="all">Tous</MenuItem>
            </Select>
          </FormControl>
        )}

        {data.action === 'createIssue' && (
          <>
            <TextField
              label="Titre"
              variant="outlined"
              size="small"
              fullWidth
              value={data.title || ''}
              onChange={(evt) => {
                data.title = evt.target.value;
              }}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Corps"
              variant="outlined"
              size="small"
              fullWidth
              multiline
              rows={4}
              value={data.body || ''}
              onChange={(evt) => {
                data.body = evt.target.value;
              }}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Labels (comma-separated)"
              variant="outlined"
              size="small"
              fullWidth
              value={data.labels ? data.labels.join(', ') : ''}
              onChange={(evt) => {
                data.labels = evt.target.value.split(',').map((s) => s.trim()).filter(Boolean);
              }}
              sx={{ mb: 2 }}
            />
          </>
        )}

        <TextField
          label="Token GitHub (optionnel)"
          variant="outlined"
          size="small"
          fullWidth
          type="password"
          value={data.token || ''}
          onChange={(evt) => {
            data.token = evt.target.value;
          }}
          sx={{ mb: 2 }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={data.useCache !== undefined ? data.useCache : true}
              onChange={(evt) => {
                data.useCache = evt.target.checked;
              }}
              name="useCache"
              color="primary"
            />
          }
          label="Utiliser le cache"
          sx={{ mb: 2 }}
        />

        <Handle type="target" position={Position.Left} id="input" />
        <Handle type="source" position={Position.Right} id="output" />
      </CardContent>
    </Card>
  );
});

export default GitHubNode;
