/**
 * CodeInterpreterPanel - Panel for executing Python code
 * 
 * This component provides a user interface for writing and executing
 * Python code in a sandboxed environment using the Pyodide runtime.
 */

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  IconButton, 
  Alert, 
  Tooltip,
  CircularProgress,
  TextField
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { agentRegistry } from '../features/agents/core/registry';

interface CodeInterpreterPanelProps {
  expanded?: boolean;
}

export const CodeInterpreterPanel: React.FC<CodeInterpreterPanelProps> = ({ expanded = false }) => {
  // Component state
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [code, setCode] = useState<string>('# Enter your Python code here\n# Example:\nimport numpy as np\n\narr = np.array([1, 2, 3, 4, 5])\nresult = np.mean(arr)\nprint(f"Mean value: {result}")');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Reference to the CodeInterpreterAgent
  const codeInterpreterAgent = agentRegistry.getAgent('CodeInterpreterAgent');

  // Check if agent is available
  const agentAvailable = !!codeInterpreterAgent && codeInterpreterAgent.name === 'CodeInterpreterAgent';

  // Function to execute the code
  const executeCode = async () => {
    if (!agentAvailable) {
      setError('CodeInterpreterAgent is not available');
      return;
    }

    if (!code.trim()) {
      setError('Please enter some code to execute');
      return;
    }

    setError(null);
    setIsExecuting(true);
    setResult(null);
    
    try {
      const executionResult = await codeInterpreterAgent?.execute({
        intent: 'execute_code',
        parameters: { code }
      });

      if (!executionResult.success) {
        throw new Error(executionResult.error as string);
      }

      setResult(executionResult.output);
    } catch (err: any) {
      setError(err.message || 'An error occurred while executing the code');
    } finally {
      setIsExecuting(false);
    }
  };

  // Function to copy the result to clipboard
  const copyResultToClipboard = () => {
    if (result !== null) {
      const resultText = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
      navigator.clipboard.writeText(resultText)
        .then(() => {
          // Visual feedback
          const temp = result;
          setResult('Copied!');
          setTimeout(() => {
            setResult(temp);
          }, 1000);
        })
        .catch(err => {
          console.error('Error copying to clipboard:', err);
          setError('Failed to copy to clipboard');
        });
    }
  };

  // Toggle panel expansion
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Format the execution result for display
  const formatResult = (result: any): string => {
    if (result === null || result === undefined) return 'No result';
    
    if (typeof result === 'object') {
      try {
        return JSON.stringify(result, null, 2);
      } catch {
        return String(result);
      }
    }
    
    return String(result);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          borderRadius: 2,
          bgcolor: 'background.paper',
          transition: 'all 0.3s ease'
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: isExpanded ? 2 : 0 
          }}
          onClick={toggleExpand}
          style={{ cursor: 'pointer' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CodeIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Code Interpreter</Typography>
          </Box>
          <IconButton>
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {isExpanded && (
          <>
            {!agentAvailable ? (
              <Alert severity="error">
                Code interpreter functionality is not available. Please check your configuration.
              </Alert>
            ) : (
              <>
                <Box sx={{ mb: 2 }}>
                  <TextField
                    label="Python Code"
                    multiline
                    rows={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    variant="outlined"
                    fullWidth
                    InputProps={{
                      style: { fontFamily: 'monospace', fontSize: '0.9rem' }
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', mb: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={executeCode}
                    disabled={isExecuting}
                    startIcon={isExecuting ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                  >
                    {isExecuting ? 'Executing...' : 'Run Code'}
                  </Button>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {result !== null && (
                  <Paper 
                    elevation={1}
                    sx={{ 
                      p: 2, 
                      mb: 2, 
                      position: 'relative',
                      backgroundColor: 'grey.100',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '200px',
                      overflow: 'auto'
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom>
                      Output:
                    </Typography>
                    <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                      {formatResult(result)}
                    </Typography>
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                      <Tooltip title="Copy result">
                        <IconButton
                          onClick={copyResultToClipboard}
                          aria-label="Copy result"
                        >
                          <ContentCopyIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Paper>
                )}

                <Typography variant="body2" color="text.secondary">
                  Execute Python code using the built-in Pyodide interpreter. Note that only sandboxed operations are supported.
                </Typography>
              </>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default CodeInterpreterPanel;
