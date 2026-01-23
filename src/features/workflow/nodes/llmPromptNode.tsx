/**
 * @file React component for the LLM Prompt node in the workflow editor.
 * This node allows users to send prompts to a language model agent like GeminiCodeAgent.
 */

import { memo, useMemo, useCallback } from 'react';
import type { ChangeEventHandler } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Card, CardContent, TextField, Typography } from '@mui/material';

interface LlmPromptNodeData {
  prompt: string;
  response?: string | null;
  placeholder?: string;
  description?: string;
}

const DEFAULT_PROMPT = 'Write a TypeScript function to sort an array.';

const LlmPromptNode = ({ data }: NodeProps<LlmPromptNodeData>) => {
  const effectivePrompt = data.prompt ?? DEFAULT_PROMPT;
  const response = data.response ?? null;

  const description = useMemo(
    () => data.description ?? 'Configure the prompt sent to the LLM agent.',
    [data.description]
  );

  const handlePromptChange = useCallback<ChangeEventHandler<HTMLTextAreaElement>>(
    (event) => {
      data.prompt = event.target.value;
    },
    [data]
  );

  return (
    <Card sx={{ width: 360, border: '1px solid #4CAF50' }}>
      <CardContent>
        <Typography variant="h6" component="div" sx={{ color: '#2E7D32', mb: 1 }}>
          LLM Prompt
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <TextField
          label="Prompt"
          multiline
          minRows={4}
          fullWidth
          value={effectivePrompt}
          onChange={handlePromptChange}
          placeholder={data.placeholder ?? DEFAULT_PROMPT}
          inputProps={{ style: { fontFamily: 'monospace' } }}
        />
        {response && (
          <TextField
            label="Response"
            value={response}
            multiline
            minRows={4}
            fullWidth
            InputProps={{ readOnly: true }}
            sx={{ mt: 2 }}
          />
        )}
      </CardContent>
      <Handle type="target" position={Position.Left} id="input" />
      <Handle type="source" position={Position.Right} id="output" />
    </Card>
  );
};

export default memo(LlmPromptNode);
