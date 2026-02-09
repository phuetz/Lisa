/**
 * Composant de connexion avec authentification JWT
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const success = await login({ email, password });
    if (success) {
      onSuccess?.();
    }
  };

  return (
    <div className="login-form-container">
      <div className="login-form" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <h2 id="login-title">Connexion à Lisa</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              placeholder="votre@email.com"
              autoComplete="email"
              aria-invalid={error ? 'true' : undefined}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={error ? 'true' : undefined}
            />
          </div>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading || !email || !password}
            className="submit-button"
          >
            {isLoading ? '🔄 Connexion...' : '🚀 Se connecter'}
          </button>
        </form>

        <div className="form-footer">
          <p>
            Pas encore de compte ?{' '}
            <button 
              type="button" 
              onClick={onSwitchToRegister}
              className="link-button"
            >
              S'inscrire
            </button>
          </p>
        </div>
      </div>

      <style>{`
        .login-form-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .login-form {
          background: var(--bg-panel, #1a1a26);
          padding: 2rem;
          border-radius: var(--radius-xl, 16px);
          border: 1px solid var(--border-primary, #2d2d44);
          box-shadow: var(--shadow-modal, 0 25px 50px -12px rgba(0, 0, 0, 0.8));
          width: 100%;
          max-width: 400px;
          margin: 1rem;
        }

        .login-form h2 {
          text-align: center;
          margin-bottom: 1.5rem;
          color: var(--text-primary, #e8e8f0);
          font-size: 1.5rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: var(--text-secondary, #9898b0);
          font-size: 0.9rem;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          background: var(--bg-primary, #12121a);
          color: var(--text-primary, #e8e8f0);
          border: 1px solid var(--border-primary, #2d2d44);
          border-radius: var(--radius-md, 8px);
          font-size: 1rem;
          transition: border-color var(--transition-fast, 0.15s ease), box-shadow var(--transition-fast, 0.15s ease);
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--color-accent, #f5a623);
          box-shadow: 0 0 0 2px var(--color-accent-subtle, rgba(245, 166, 35, 0.12));
        }

        .form-group input:disabled {
          background-color: var(--bg-tertiary, #1a1a26);
          color: var(--text-disabled, #3d3d5c);
          cursor: not-allowed;
        }

        .form-group input::placeholder {
          color: var(--text-muted, #6a6a82);
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-error, #ef4444);
          padding: 0.75rem;
          border-radius: var(--radius-md, 8px);
          margin-bottom: 1rem;
          border: 1px solid rgba(239, 68, 68, 0.3);
          font-size: 0.9rem;
        }

        .submit-button {
          width: 100%;
          padding: 0.875rem;
          background: var(--color-accent, #f5a623);
          color: #fff;
          border: none;
          border-radius: var(--radius-md, 8px);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color var(--transition-fast, 0.15s ease);
        }

        .submit-button:hover:not(:disabled) {
          background: var(--color-accent-hover, #e6951a);
        }

        .submit-button:focus-visible {
          outline: none;
          box-shadow: var(--focus-ring, 0 0 0 2px var(--color-accent));
        }

        .submit-button:disabled {
          background: var(--text-disabled, #3d3d5c);
          cursor: not-allowed;
          opacity: 0.6;
        }

        .form-footer {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-primary, #2d2d44);
        }

        .form-footer p {
          margin: 0;
          color: var(--text-muted, #6a6a82);
        }

        .link-button {
          background: none;
          border: none;
          color: var(--color-accent, #f5a623);
          cursor: pointer;
          text-decoration: underline;
          font-size: inherit;
        }

        .link-button:hover {
          color: var(--color-accent-hover, #e6951a);
        }

        .link-button:focus-visible {
          outline: none;
          box-shadow: var(--focus-ring, 0 0 0 2px var(--color-accent));
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};
