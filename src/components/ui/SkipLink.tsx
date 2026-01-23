/**
 * SkipLink - Lien d'évitement pour l'accessibilité
 * Permet aux utilisateurs de clavier de sauter directement au contenu principal
 * 
 * WCAG 2.4.1 - Contourner des blocs
 */

import React from 'react';

interface SkipLinkProps {
  /** ID de l'élément cible (sans le #) */
  targetId?: string;
  /** Texte du lien */
  label?: string;
  /** Classes CSS additionnelles */
  className?: string;
}

/**
 * Composant SkipLink - Lien d'évitement accessible
 * 
 * @example
 * ```tsx
 * // Dans votre layout principal
 * <SkipLink targetId="main-content" />
 * 
 * // Plus loin dans le DOM
 * <main id="main-content">
 *   ...
 * </main>
 * ```
 */
export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId = 'main-content',
  label = 'Aller au contenu principal',
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-[9999]
        bg-blue-600 text-white
        px-4 py-3 rounded-lg
        font-semibold text-sm
        shadow-lg shadow-blue-500/30
        focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600
        transition-all duration-200
        ${className}
      `}
    >
      {label}
    </a>
  );
};

/**
 * SkipLinks multiples pour navigation complexe
 */
interface SkipLinksProps {
  links: Array<{
    targetId: string;
    label: string;
  }>;
}

export const SkipLinks: React.FC<SkipLinksProps> = ({ links }) => {
  return (
    <nav aria-label="Liens d'évitement" className="skip-links">
      {links.map((link, index) => (
        <SkipLink
          key={link.targetId}
          targetId={link.targetId}
          label={link.label}
          className={index > 0 ? 'left-48' : ''}
        />
      ))}
    </nav>
  );
};

export default SkipLink;
