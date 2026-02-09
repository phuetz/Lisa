/**
 * AppFooter - Auth buttons footer for Lisa
 *
 * Renders authentication buttons at the bottom left:
 * - Login button when not authenticated
 * - Logout button when authenticated
 */

export interface AppFooterProps {
  isAuthenticated: boolean;
  onLogout: () => void;
  onLoginClick?: () => void;
}

export function AppFooter({ isAuthenticated, onLogout, onLoginClick }: AppFooterProps) {
  return (
    <>
      {/* Auth buttons - discreet at bottom left */}
      {isAuthenticated ? (
        <button
          onClick={onLogout}
          title="Se déconnecter"
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            zIndex: 50,
            padding: '4px 12px',
            fontSize: '12px',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            color: '#fff',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.9)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.5)')}
        >
          Déconnexion
        </button>
      ) : (
        <button
          onClick={onLoginClick}
          title="Se connecter"
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            zIndex: 50,
            padding: '4px 12px',
            fontSize: '12px',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            color: '#fff',
            borderRadius: '4px',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.9)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.5)')}
        >
          Connexion
        </button>
      )}
    </>
  );
}
