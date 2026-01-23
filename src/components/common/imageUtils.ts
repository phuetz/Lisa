/**
 * Image Utilities
 * 
 * Utilitaires pour l'optimisation des images
 */

import React from 'react';

/**
 * Hook pour précharger les images
 */
export function useImagePreload(src: string) {
  React.useEffect(() => {
    const img = new Image();
    img.src = src;
  }, [src]);
}

/**
 * Hook pour précharger plusieurs images
 */
export function useImagesPreload(images: string[]) {
  React.useEffect(() => {
    images.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, [images]);
}

/**
 * Convertir une image en WebP
 */
export function toWebP(src: string): string {
  return src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
}

/**
 * Vérifier le support WebP
 */
export function supportsWebP(): boolean {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
}

/**
 * Obtenir le format d'image optimal
 */
export function getOptimalImageFormat(src: string): string {
  return supportsWebP() ? toWebP(src) : src;
}

/**
 * Générer des srcSet responsives
 */
export function generateSrcSet(baseSrc: string, sizes: number[]): string {
  return sizes
    .map(size => {
      const resized = baseSrc.replace(/\.(jpg|jpeg|png)$/i, `-${size}w.$1`);
      return `${resized} ${size}w`;
    })
    .join(', ');
}

/**
 * Générer des sizes pour responsive images
 */
export function generateSizes(breakpoints: Record<string, string>): string {
  return Object.entries(breakpoints)
    .map(([bp, size]) => `(max-width: ${bp}) ${size}`)
    .join(', ');
}

/**
 * Optimiser une image pour le web
 */
export interface ImageOptimizationOptions {
  maxWidth?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png';
}

export function optimizeImageUrl(
  src: string,
  options: ImageOptimizationOptions = {}
): string {
  const { maxWidth = 1920, quality = 80, format = 'webp' } = options;
  
  // Si c'est une URL externe, retourner telle quelle
  if (src.startsWith('http')) {
    return src;
  }

  // Ajouter les paramètres d'optimisation
  const params = new URLSearchParams();
  if (maxWidth) params.append('w', maxWidth.toString());
  if (quality) params.append('q', quality.toString());
  if (format) params.append('f', format);

  return `${src}?${params.toString()}`;
}

/**
 * Calculer les dimensions responsives
 */
export function calculateResponsiveDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number
): { width: number; height: number } {
  if (originalWidth <= maxWidth) {
    return { width: originalWidth, height: originalHeight };
  }

  const ratio = originalHeight / originalWidth;
  return {
    width: maxWidth,
    height: Math.round(maxWidth * ratio),
  };
}
