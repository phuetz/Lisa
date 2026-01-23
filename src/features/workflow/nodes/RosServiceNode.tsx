import { memo, useState, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps, useReactFlow } from 'reactflow';
import { 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Box,
  Chip,
  Tooltip,
  IconButton,
  Autocomplete,
  Alert,
  Collapse,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// Types exportés pour réutilisation
export interface RosServiceNodeData {
  serviceName: string;
  serviceType: string;
  requestContent: string;
  timeout?: number;
  // Nouvelles propriétés
  lastResult?: unknown;
  lastError?: string;
  executionCount?: number;
  label?: string;
}

// Services ROS courants pour l'autocomplétion
const COMMON_ROS_SERVICES = [
  '/rosout/get_loggers',
  '/rosout/set_logger_level',
  '/move_base/make_plan',
  '/move_base/clear_costmaps',
  '/gazebo/get_model_state',
  '/gazebo/set_model_state',
  '/controller_manager/list_controllers',
  '/tf2_frames',
];

const COMMON_SERVICE_TYPES = [
  'std_srvs/Empty',
  'std_srvs/Trigger',
  'std_srvs/SetBool',
  'nav_msgs/GetPlan',
  'gazebo_msgs/GetModelState',
  'gazebo_msgs/SetModelState',
  'controller_manager_msgs/ListControllers',
];

// Validation JSON
function isValidJson(str: string): boolean {
  if (!str.trim()) return true; // Vide est valide
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

const RosServiceNode = memo(({ id, data }: NodeProps<RosServiceNodeData>) => {
  const { setNodes } = useReactFlow();
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Mise à jour immutable des données du nœud
  const updateNodeData = useCallback((updates: Partial<RosServiceNodeData>) => {
    setNodes(nodes => nodes.map(node => 
      node.id === id 
        ? { ...node, data: { ...node.data, ...updates } }
        : node
    ));
  }, [id, setNodes]);

  // Handlers typés
  const handleServiceNameChange = useCallback((
    _event: React.SyntheticEvent,
    value: string | null
  ) => {
    updateNodeData({ serviceName: value ?? '' });
  }, [updateNodeData]);

  const handleServiceTypeChange = useCallback((
    _event: React.SyntheticEvent,
    value: string | null
  ) => {
    updateNodeData({ serviceType: value ?? '' });
  }, [updateNodeData]);

  const handleRequestContentChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    updateNodeData({ requestContent: value });
    
    // Validation JSON en temps réel
    if (value.trim() && !isValidJson(value)) {
      setJsonError('JSON invalide');
    } else {
      setJsonError(null);
    }
  }, [updateNodeData]);

  const handleTimeoutChange = useCallback((
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    const parsed = Number.parseInt(value, 10);
    updateNodeData({ 
      timeout: value === '' ? undefined : (Number.isNaN(parsed) ? undefined : parsed)
    });
  }, [updateNodeData]);

  // Simulation d'exécution (à connecter avec RosAgent)
  const handleExecute = useCallback(async () => {
    if (!data.serviceName || !data.serviceType) return;
    
    setIsExecuting(true);
    try {
      // TODO: Connecter avec RosAgent.callService()
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulation
      
      updateNodeData({ 
        lastResult: { success: true, message: 'Service called successfully' },
        lastError: undefined,
        executionCount: (data.executionCount ?? 0) + 1,
      });
    } catch (error) {
      updateNodeData({ 
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastResult: undefined,
      });
    } finally {
      setIsExecuting(false);
    }
  }, [data.serviceName, data.serviceType, data.executionCount, updateNodeData]);

  // Status visuel
  const statusColor = useMemo(() => {
    if (data.lastError) return 'error';
    if (data.lastResult) return 'success';
    return 'default';
  }, [data.lastError, data.lastResult]);

  const isConfigValid = data.serviceName && data.serviceType && !jsonError;

  return (
    <Card 
      sx={{ 
        width: 340, 
        border: `2px solid ${
          statusColor === 'error' ? '#f44336' : 
          statusColor === 'success' ? '#4caf50' : 
          '#1976d2'
        }`,
        transition: 'border-color 0.3s ease',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header avec status */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              🤖 ROS Service
            </Typography>
            {data.executionCount !== undefined && data.executionCount > 0 && (
              <Chip 
                label={`×${data.executionCount}`} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
            )}
          </Box>
          <Box>
            <Tooltip title="Tester le service ROS">
              <IconButton 
                size="small" 
                onClick={handleExecute}
                disabled={!isConfigValid || isExecuting}
                color="primary"
                aria-label={isExecuting ? 'Test en cours...' : 'Tester le service ROS'}
                aria-busy={isExecuting}
              >
                {isExecuting ? <RefreshIcon className="animate-spin" /> : <PlayArrowIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Aide sur les services ROS">
              <IconButton 
                size="small"
                aria-label="Afficher l'aide sur les services ROS"
              >
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Status indicator */}
        <Collapse in={!!data.lastResult || !!data.lastError}>
          <Alert 
            severity={statusColor === 'error' ? 'error' : 'success'}
            icon={statusColor === 'error' ? <ErrorIcon /> : <CheckCircleIcon />}
            sx={{ mb: 2, py: 0 }}
          >
            {data.lastError ?? 'Succès'}
          </Alert>
        </Collapse>

        {/* Service Name avec autocomplétion */}
        <Autocomplete
          freeSolo
          size="small"
          options={COMMON_ROS_SERVICES}
          value={data.serviceName}
          onInputChange={handleServiceNameChange}
          renderInput={(params) => (
            <TextField 
              {...params} 
              label="Service Name" 
              placeholder="/namespace/service"
              required
              error={!data.serviceName}
              sx={{ mb: 1.5 }}
            />
          )}
        />

        {/* Service Type avec autocomplétion */}
        <Autocomplete
          freeSolo
          size="small"
          options={COMMON_SERVICE_TYPES}
          value={data.serviceType}
          onInputChange={handleServiceTypeChange}
          renderInput={(params) => (
            <TextField 
              {...params} 
              label="Service Type" 
              placeholder="package/ServiceType"
              required
              error={!data.serviceType}
              sx={{ mb: 1.5 }}
            />
          )}
        />

        {/* Request Content avec validation JSON */}
        <TextField
          label="Request (JSON)"
          variant="outlined"
          size="small"
          fullWidth
          multiline
          rows={3}
          value={data.requestContent}
          onChange={handleRequestContentChange}
          error={!!jsonError}
          helperText={jsonError}
          placeholder='{"key": "value"}'
          sx={{ 
            mb: 1.5,
            '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.8rem' }
          }}
        />

        {/* Timeout */}
        <TextField
          label="Timeout (ms)"
          variant="outlined"
          size="small"
          fullWidth
          type="number"
          value={data.timeout ?? ''}
          onChange={handleTimeoutChange}
          placeholder="5000"
          InputProps={{
            inputProps: { min: 0, max: 60000 }
          }}
        />

        {/* Handles */}
        <Handle 
          type="target" 
          position={Position.Left} 
          id="input"
          style={{ background: '#1976d2', width: 12, height: 12 }}
        />
        <Handle 
          type="source" 
          position={Position.Right} 
          id="output"
          style={{ background: '#4caf50', width: 12, height: 12 }}
        />
        <Handle 
          type="source" 
          position={Position.Right} 
          id="error"
          style={{ background: '#f44336', width: 12, height: 12, top: '70%' }}
        />
      </CardContent>
    </Card>
  );
});

RosServiceNode.displayName = 'RosServiceNode';

export default RosServiceNode;
