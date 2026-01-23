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
      <div className="register-form">
        <h2>🤖 Inscription à Lisa</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Nom (optionnel)</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              placeholder="Votre nom"
            />
          </div>

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
              minLength={6}
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
              className={!passwordsMatch ? 'error' : ''}
            />
            {!passwordsMatch && confirmPassword && (
              <div className="field-error">
                Les mots de passe ne correspondent pas
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
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
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .register-form {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          width: 100%;
          max-width: 400px;
          margin: 1rem;
          max-height: 90vh;
          overflow-y: auto;
        }

        .register-form h2 {
          text-align: center;
          margin-bottom: 1.5rem;
          color: #333;
          font-size: 1.5rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #555;
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e1e5e9;
          border-radius: 6px;
          font-size: 1rem;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .form-group input.error {
          border-color: #dc3545;
        }

        .form-group input:disabled {
          background-color: #f8f9fa;
          cursor: not-allowed;
        }

        .field-error {
          color: #dc3545;
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          border: 1px solid #f5c6cb;
          font-size: 0.9rem;
        }

        .submit-button {
          width: 100%;
          padding: 0.875rem;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .submit-button:hover:not(:disabled) {
          background: #218838;
        }

        .submit-button:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .form-footer {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #e1e5e9;
        }

        .form-footer p {
          margin: 0;
          color: #666;
        }

        .link-button {
          background: none;
          border: none;
          color: #007bff;
          cursor: pointer;
          text-decoration: underline;
          font-size: inherit;
        }

        .link-button:hover {
          color: #0056b3;
        }
      `}</style>
    </div>
  );
};
