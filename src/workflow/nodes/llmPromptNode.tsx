/**
 * @file React component for the LLM Prompt node in the workflow editor.
 * This node allows users to send prompts to a language model agent like GeminiCodeAgent.
 */

import React, { useState, memo } from 'react';
import { Handle, Position } from 'reactflow';

// --- Node Component ---

const LlmPromptNode = ({ data }: { data: any }) => {
  // Data can be pre-populated from the workflow or previous nodes
  const [prompt, setPrompt] = useState(data.prompt || 'Write a TypeScript function to sort an array.');
  const [llmResponse, setLlmResponse] = useState(data.response || null);

  return (
    <div style={{
      border: '1px solid #4CAF50',
      borderRadius: '8px',
      padding: '10px',
      background: '#FFF',
      width: '350px'
    }}>
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 'bold', color: '#4CAF50', marginBottom: '10px' }}>
        LLM Prompt (Gemini)
      </div>
      <label style={{ display: 'block', marginBottom: '5px' }}>
        Prompt:
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          style={{ width: '100%', boxSizing: 'border-box', marginTop: '3px', fontFamily: 'monospace' }}
        />
      </label>
      {llmResponse && (
        <div style={{ marginTop: '10px' }}>
          <strong>Response:</strong>
          <pre style={{
            background: '#F5F5F5',
            padding: '8px',
            borderRadius: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}>
            <code>{llmResponse}</code>
          </pre>
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(LlmPromptNode);
