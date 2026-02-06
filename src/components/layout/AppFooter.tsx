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
          className="fixed bottom-4 left-4 z-50 px-3 py-1 text-xs bg-slate-900/50 hover:bg-slate-900 text-white rounded transition-colors"
          title="Se déconnecter"
        >
          Déconnexion
        </button>
      ) : (
        <button
          onClick={onLoginClick}
          className="fixed bottom-4 left-4 z-50 px-3 py-1 text-xs bg-slate-900/50 hover:bg-slate-900 text-white rounded transition-colors"
          title="Se connecter"
        >
          🔐 Connexion
        </button>
      )}
    </>
  );
}
