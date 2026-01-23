/**
 * 🔄 Resilient Executor
 * Système de retry avec exponential backoff et circuit breaker
 * Améliore la robustesse des agents face aux erreurs réseau
 */

interface RetryOptions {
  maxRetries?: number;
  backoffMs?: number;
  circuitBreakerKey?: string;
  onRetry?: (attempt: number, maxRetries: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  lastSuccess: number;
  state: 'closed' | 'open' | 'half-open';
}

export class ResilientExecutor {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly failureThreshold = 5;
  private readonly openDurationMs = 30000; // 30 secondes
  private readonly halfOpenMaxAttempts = 3;
  
  /**
   * Exécute une fonction avec retry automatique
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      backoffMs = 1000,
      circuitBreakerKey,
      onRetry,
      shouldRetry = this.defaultShouldRetry
    } = options;
    
    // Vérifier le circuit breaker
    if (circuitBreakerKey && this.isCircuitOpen(circuitBreakerKey)) {
      throw new Error(`Circuit breaker open for ${circuitBreakerKey}`);
    }
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await fn();
        
        // Succès - réinitialiser le circuit breaker
        if (circuitBreakerKey) {
          this.recordSuccess(circuitBreakerKey);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        const isLastAttempt = attempt === maxRetries - 1;
        
        // Ne pas retry si l'erreur n'est pas retryable
        if (!shouldRetry(lastError)) {
          if (circuitBreakerKey) {
            this.recordFailure(circuitBreakerKey);
          }
          throw lastError;
        }
        
        if (isLastAttempt) {
          // Dernier essai échoué - enregistrer échec
          if (circuitBreakerKey) {
            this.recordFailure(circuitBreakerKey);
          }
          throw lastError;
        }
        
        // Exponential backoff
        const delay = backoffMs * Math.pow(2, attempt);
        await this.sleep(delay);
        
        // Notification de retry
        if (onRetry) {
          onRetry(attempt + 1, maxRetries, lastError);
        }
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }
  
  /**
   * Vérifie si le circuit est ouvert
   */
  isCircuitOpen(key: string): boolean {
    const state = this.circuitBreakers.get(key);
    if (!state) return false;
    
    const now = Date.now();
    
    // Circuit ouvert?
    if (state.state === 'open') {
      // Vérifier si on peut passer en half-open
      if (now - state.lastFailure > this.openDurationMs) {
        state.state = 'half-open';
        this.circuitBreakers.set(key, state);
        return false;
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * Enregistre un succès
   */
  recordSuccess(key: string): void {
    const state = this.circuitBreakers.get(key);
    
    if (!state) {
      this.circuitBreakers.set(key, {
        failures: 0,
        lastFailure: 0,
        lastSuccess: Date.now(),
        state: 'closed'
      });
      return;
    }
    
    // Réinitialiser les échecs
    state.failures = 0;
    state.lastSuccess = Date.now();
    state.state = 'closed';
    this.circuitBreakers.set(key, state);
  }
  
  /**
   * Enregistre un échec
   */
  recordFailure(key: string): void {
    const state = this.circuitBreakers.get(key) || {
      failures: 0,
      lastFailure: 0,
      lastSuccess: 0,
      state: 'closed' as const
    };
    
    state.failures += 1;
    state.lastFailure = Date.now();
    
    // Ouvrir le circuit si seuil dépassé
    if (state.failures >= this.failureThreshold) {
      state.state = 'open';
      console.warn(`Circuit breaker opened for ${key} (${state.failures} failures)`);
    }
    
    this.circuitBreakers.set(key, state);
  }
  
  /**
   * Obtenir l'état d'un circuit
   */
  getCircuitState(key: string): CircuitBreakerState | undefined {
    return this.circuitBreakers.get(key);
  }
  
  /**
   * Obtenir tous les circuits
   */
  getAllCircuits(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }
  
  /**
   * Réinitialiser un circuit manuellement
   */
  resetCircuit(key: string): void {
    this.circuitBreakers.delete(key);
    console.log(`Circuit breaker reset for ${key}`);
  }
  
  /**
   * Détermine si l'erreur est retryable par défaut
   */
  private defaultShouldRetry(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Ne pas retry les erreurs client
    if (message.includes('400') || message.includes('invalid')) {
      return false;
    }
    
    // Ne pas retry les erreurs d'authentification
    if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
      return false;
    }
    
    // Retry les erreurs serveur et réseau
    return true;
  }
  
  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instance singleton
export const resilientExecutor = new ResilientExecutor();
