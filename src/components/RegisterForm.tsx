/**
 * Composant d'inscription avec authentification JWT
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const { register, isLoading, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (password !== confirmPassword) {
      return;
    }
    
    const success = await register({ email, password, name });
    if (success) {
      onSuccess?.();
    }
  };

  const passwordsMatch = password === confirmPassword || confirmPassword === '';

  return (
    <div className="register-form-container">
      <div className="register-form" role="dialog" aria-modal="true" aria-labelledby="register-title">
        <h2 id="register-title">Inscription à Lisa</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="name">Nom (optionnel)</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              placeholder="Votre nom"
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input
              type="email"
              id="reg-email"
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
            <label htmlFor="reg-password">Mot de passe</label>
            <input
              type="password"
              id="reg-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="••••••••"
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              placeholder="••••••••"
              autoComplete="new-password"
              className={!passwordsMatch ? 'error' : ''}
              aria-invalid={!passwordsMatch && confirmPassword ? 'true' : undefined}
              aria-describedby={!passwordsMatch && confirmPassword ? 'password-mismatch' : undefined}
            />
            {!passwordsMatch && confirmPassword && (
              <div className="field-error" id="password-mismatch" role="alert">
                Les mots de passe ne correspondent pas
              </div>
            )}
          </div>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading || !email || !password || !passwordsMatch}
            className="submit-button"
          >
            {isLoading ? '🔄 Inscription...' : '✨ S\'inscrire'}
          </button>
        </form>

        <div className="form-footer">
          <p>
            Déjà un compte ?{' '}
            <button 
              type="button" 
              onClick={onSwitchToLogin}
              className="link-button"
            >
              Se connecter
            </button>
          </p>
        </div>
      </div>

      <style>{`
        .register-form-container {
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

        .register-form {
          background: var(--bg-panel, #1a1a26);
          padding: 2rem;
          border-radius: var(--radius-xl, 16px);
          border: 1px solid var(--border-primary, #2d2d44);
          box-shadow: var(--shadow-modal, 0 25px 50px -12px rgba(0, 0, 0, 0.8));
          width: 100%;
          max-width: 400px;
          margin: 1rem;
          max-height: 90vh;
          overflow-y: auto;
        }

        .register-form h2 {
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

        .form-group input.error {
          border-color: var(--color-error, #ef4444);
        }

        .form-group input:disabled {
          background-color: var(--bg-tertiary, #1a1a26);
          color: var(--text-disabled, #3d3d5c);
          cursor: not-allowed;
        }

        .form-group input::placeholder {
          color: var(--text-muted, #6a6a82);
        }

        .field-error {
          color: var(--color-error, #ef4444);
          font-size: 0.875rem;
          margin-top: 0.25rem;
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
