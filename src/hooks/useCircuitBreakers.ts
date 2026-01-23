/**
 * 🔄 Circuit Breakers Hook
 * Hook React pour monitorer l'état des circuit breakers
 */

import { useState, useEffect } from 'react';
import { resilientExecutor } from '../utils/resilience/ResilientExecutor';

interface CircuitInfo {
  key: string;
  failures: number;
  state: 'closed' | 'open' | 'half-open';
  lastFailure: number;
  lastSuccess: number;
}

export function useCircuitBreakers() {
  const [circuits, setCircuits] = useState<CircuitInfo[]>([]);
  
  useEffect(() => {
    const updateCircuits = () => {
      const allCircuits = resilientExecutor.getAllCircuits();
      const circuitList: CircuitInfo[] = [];
      
      allCircuits.forEach((state, key) => {
        circuitList.push({
          key,
          failures: state.failures,
          state: state.state,
          lastFailure: state.lastFailure,
          lastSuccess: state.lastSuccess
        });
      });
      
      setCircuits(circuitList);
    };
    
    // Mettre à jour toutes les 2 secondes
    const interval = setInterval(updateCircuits, 2000);
    updateCircuits(); // Première mise à jour immédiate
    
    return () => clearInterval(interval);
  }, []);
  
  const resetCircuit = (key: string) => {
    resilientExecutor.resetCircuit(key);
    // Forcer une mise à jour
    const allCircuits = resilientExecutor.getAllCircuits();
    const circuitList: CircuitInfo[] = [];
    allCircuits.forEach((state, key) => {
      circuitList.push({
        key,
        failures: state.failures,
        state: state.state,
        lastFailure: state.lastFailure,
        lastSuccess: state.lastSuccess
      });
    });
    setCircuits(circuitList);
  };
  
  return {
    circuits,
    resetCircuit
  };
}
