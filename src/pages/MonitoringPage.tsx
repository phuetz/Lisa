/**
 * 📊 Monitoring Dashboard
 * Vue en temps réel des métriques système et circuit breakers
 */

import { Grid, Card, CardContent, Typography, Chip, Button, Box, LinearProgress } from '@mui/material';
import { SmartToy, Speed, Error as ErrorIcon, Memory as MemoryIcon } from '@mui/icons-material';
import { useCircuitBreakers } from '../hooks/useCircuitBreakers';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

function MetricCard({ title, value, icon, trend, color = 'primary' }: MetricCardProps) {
  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          <Box color={`${color}.main`}>{icon}</Box>
        </Box>
        
        <Typography variant="h3" component="div">
          {value}
        </Typography>
        
        {trend && (
          <Typography variant="body2" color="text.secondary" mt={1}>
            {trend === 'up' && '↗ En hausse'}
            {trend === 'down' && '↘ En baisse'}
            {trend === 'stable' && '→ Stable'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export function MonitoringPage() {
  const { circuits, resetCircuit } = useCircuitBreakers();
  
  return (
    <Box p={3}>
      <Typography variant="h4" mb={3}>
        📊 Dashboard Monitoring
      </Typography>
      
      {/* Métriques globales */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Agents Actifs"
            value={circuits.length}
            icon={<SmartToy fontSize="large" />}
            trend="stable"
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Circuits Ouverts"
            value={circuits.filter(c => c.state === 'open').length}
            icon={<ErrorIcon fontSize="large" />}
            color="error"
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Circuits Fermés"
            value={circuits.filter(c => c.state === 'closed').length}
            icon={<Speed fontSize="large" />}
            color="success"
          />
        </Grid>
        
        <Grid item xs={12} md={3}>
          <MetricCard
            title="Half-Open"
            value={circuits.filter(c => c.state === 'half-open').length}
            icon={<MemoryIcon fontSize="large" />}
            color="warning"
          />
        </Grid>
      </Grid>
      
      {/* Circuit Breakers */}
      <Typography variant="h5" mb={2}>
        🔄 Circuit Breakers
      </Typography>
      
      {circuits.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary">
              Aucun circuit breaker actif pour le moment
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {circuits.map(circuit => (
            <Grid item xs={12} md={6} lg={4} key={circuit.key}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">{circuit.key}</Typography>
                    <Chip 
                      label={circuit.state}
                      color={
                        circuit.state === 'open' ? 'error' : 
                        circuit.state === 'half-open' ? 'warning' : 
                        'success'
                      }
                      size="small"
                    />
                  </Box>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      Échecs: {circuit.failures}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min((circuit.failures / 5) * 100, 100)}
                      color={circuit.failures >= 5 ? 'error' : 'primary'}
                    />
                  </Box>
                  
                  {circuit.lastFailure > 0 && (
                    <Typography variant="body2" color="error" mb={1}>
                      Dernier échec: {formatDistanceToNow(circuit.lastFailure, { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </Typography>
                  )}
                  
                  {circuit.lastSuccess > 0 && (
                    <Typography variant="body2" color="success.main" mb={2}>
                      Dernier succès: {formatDistanceToNow(circuit.lastSuccess, { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </Typography>
                  )}
                  
                  <Button 
                    variant="outlined" 
                    size="small" 
                    fullWidth
                    onClick={() => resetCircuit(circuit.key)}
                    disabled={circuit.state === 'closed' && circuit.failures === 0}
                  >
                    Réinitialiser
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Informations */}
      <Box mt={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>
              ℹ️ À propos des Circuit Breakers
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              <strong>Closed:</strong> Le circuit fonctionne normalement. Les requêtes passent.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              <strong>Open:</strong> Trop d'échecs détectés (≥5). Les requêtes sont bloquées pendant 30 secondes.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Half-Open:</strong> Test de rétablissement. Permet quelques requêtes pour vérifier si le service est revenu.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
