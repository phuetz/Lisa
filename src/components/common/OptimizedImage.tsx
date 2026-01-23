/**
 * Optimized Image Component
 * 
 * Composant pour optimiser les images avec support WebP et lazy loading
 */

import React, { useState } from 'react';
import { toWebP } from './imageUtils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Composant d'image optimisée avec support WebP et lazy loading
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Générer le chemin WebP
  const webpSrc = toWebP(src);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    onError?.();
  };

  return (
    <picture>
      {/* WebP format (moderne) */}
      <source srcSet={webpSrc} type="image/webp" />
      
      {/* Format de fallback */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          opacity: isLoaded ? 1 : 0.5,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
    </picture>
  );
};

/**
 * Composant pour précharger les images critiques
 */
export const ImagePreloader: React.FC<{ images: string[] }> = ({ images }) => {
  React.useEffect(() => {
    images.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  }, [images]);

  return null;
};

/**
 * Composant pour les images responsives
 */
interface ResponsiveImageProps extends OptimizedImageProps {
  srcSet?: string;
  sizes?: string;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  srcSet,
  sizes,
  alt,
  className,
  priority = false,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  return (
    <picture>
      {/* WebP format */}
      <source
        srcSet={srcSet ? toWebP(srcSet) : toWebP(src)}
        type="image/webp"
        sizes={sizes}
      />
      
      {/* Format de fallback */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={handleLoad}
        onError={onError}
        style={{
          opacity: isLoaded ? 1 : 0.5,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
    </picture>
  );
};

export default OptimizedImage;
