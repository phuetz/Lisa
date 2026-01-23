/**
 * Hook d'authentification pour la gestion des tokens JWT
 */

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

interface UseAuthReturn extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (credentials: RegisterCredentials) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const API_BASE_URL = `http://localhost:${import.meta.env.VITE_API_PORT || 3001}`;

// Auto-login en mode développement ET sur mobile (Capacitor)
const DEV_AUTO_LOGIN = import.meta.env.DEV || typeof window !== 'undefined' && !!Capacitor?.isNativePlatform?.();
const DEV_USER: User = {
  id: 'dev-user-001',
  email: 'dev@lisa.local',
  name: 'Développeur',
};

export const useAuth = (): UseAuthReturn => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const isNativePlatform = () => {
    return typeof window !== 'undefined' && !!Capacitor?.isNativePlatform?.();
  };

  const getStoredToken = useCallback(async () => {
    if (isNativePlatform()) {
      try {
        const { value } = await Preferences.get({ key: 'authToken' });
        return value ?? null;
      } catch {
        return null;
      }
    }
    return typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  }, []);

  const setStoredToken = useCallback(async (token: string) => {
    if (isNativePlatform()) {
      try {
        await Preferences.set({ key: 'authToken', value: token });
        return;
      } catch {
        // Fallback to web storage if Preferences fails
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }, []);

  const clearStoredToken = useCallback(async () => {
    if (isNativePlatform()) {
      try {
        await Preferences.remove({ key: 'authToken' });
        return;
      } catch {
        // Fallback to web storage if Preferences fails
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }, []);

  // Vérifier le token au chargement (ou auto-login en dev)
  useEffect(() => {
    let isMounted = true;

    const finishLoading = (nextState: AuthState) => {
      if (isMounted) {
        setAuthState(nextState);
      }
    };

    if (DEV_AUTO_LOGIN) {
      console.log('[useAuth] 🔓 Mode développement: auto-login activé');
      finishLoading({
        user: DEV_USER,
        token: 'dev-token-bypass',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return () => {
        isMounted = false;
      };
    }

    (async () => {
      const token = await getStoredToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));

          if (payload.exp * 1000 > Date.now()) {
            finishLoading({
              user: { id: payload.userId, email: payload.email, name: payload.name },
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return;
          }

          await clearStoredToken();
          finishLoading({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Token expiré',
          });
          return;
        } catch {
          await clearStoredToken();
          finishLoading({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Token invalide',
          });
          return;
        }
      }

      finishLoading({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    })();

    return () => {
      isMounted = false;
    };
  }, [getStoredToken, clearStoredToken]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success && data.data?.token) {
        const { token, user } = data.data;
        
        // Stocker le token
        await setStoredToken(token);
        
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        return true;
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Erreur de connexion',
        }));
        return false;
      }
    } catch {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erreur de connexion au serveur',
      }));
      return false;
    }
  }, [setStoredToken]);

  const register = useCallback(async (credentials: RegisterCredentials): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success && data.data?.token) {
        const { token, user } = data.data;
        
        // Stocker le token
        await setStoredToken(token);
        
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        return true;
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Erreur lors de l\'inscription',
        }));
        return false;
      }
    } catch {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erreur de connexion au serveur',
      }));
      return false;
    }
  }, [setStoredToken]);

  const logout = useCallback(() => {
    void clearStoredToken();
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, [clearStoredToken]);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...authState,
    login,
    register,
    logout,
    clearError,
  };
};
