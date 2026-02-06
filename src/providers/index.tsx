/**
 * Providers - Composition of all context providers
 *
 * Re-exports all providers for easy access and composition
 */

export { SenseProvider, useSenseRefs } from './SenseProvider';
export { AuthProvider, useAuthProvider } from './AuthProvider';
export { ServiceProvider } from './ServiceProvider';

/**
 * RootProviders - Composes all providers in correct order
 *
 * Order matters:
 * 1. ServiceProvider - Initializes background services
 * 2. SenseProvider - Initializes senses
 * 3. AuthProvider - Handles authentication (must wrap content since it may show login form)
 */
export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <ServiceProvider>
      <SenseProvider>
        <AuthProvider>{children}</AuthProvider>
      </SenseProvider>
    </ServiceProvider>
  );
}
