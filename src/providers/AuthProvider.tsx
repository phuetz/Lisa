/**
 * AuthProvider - Manages authentication state and UI
 *
 * Extracts auth logic from App.tsx
 */

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState<'login' | 'register' | null>(null);

  // If not authenticated and not loading, show auth form
  if (!isAuthenticated && !isLoading && !showAuthForm) {
    setShowAuthForm('login');
  }

  // Show authentication forms
  if (showAuthForm === 'login') {
    return (
      <LoginForm
        onRegisterClick={() => setShowAuthForm('register')}
        onSuccess={() => setShowAuthForm(null)}
      />
    );
  }

  if (showAuthForm === 'register') {
    return (
      <RegisterForm
        onLoginClick={() => setShowAuthForm('login')}
        onSuccess={() => setShowAuthForm(null)}
      />
    );
  }

  // Authenticated - render children
  return <>{children}</>;
}

/**
 * Hook to access auth state
 */
export function useAuthProvider() {
  const auth = useAuth();
  return auth;
}
