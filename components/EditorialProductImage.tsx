'use client';

import React, { useState } from 'react';

interface EditorialProductImageProps {
  src: string;
  alt: string;
  aspect?: string;
  rounded?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  showHoverVignette?: boolean;
}

export default function EditorialProductImage({
  src,
  alt,
  aspect = 'aspect-[4/5]',
  rounded = 'rounded-xl',
  className = '',
  loading = 'lazy',
  children,
  onClick,
  showHoverVignette = true,
}: EditorialProductImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      onClick={onClick}
      className={`editorial-photo-wrapper relative w-full ${aspect} ${rounded} shrink-0 cursor-pointer select-none ${className}`}
    >
      {/* 1. Placeholder Shimmer de Marca (.skeleton-brand) */}
      <div
        className={`absolute inset-0 skeleton-brand pointer-events-none z-0 transition-opacity duration-500 ease-out ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      />

      {/* 2. Fotografía Editorial con reveal scale-in (0.97 -> 1) y Ken Burns en hover */}
      <img
        src={hasError ? '/placeholder.jpg' : src}
        alt={alt}
        loading={loading}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
        className={`w-full h-full object-cover editorial-img-reveal editorial-ken-burns ${
          isLoaded ? 'is-loaded' : ''
        }`}
      />

      {/* 3. Overlay sutil de contraste con gradiente inferior en hover (realza texto y badges) */}
      {showHoverVignette && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-[1]"
          aria-hidden="true"
        />
      )}

      {/* 4. Badges e insignias flotantes (z-10 para mantener nitidez sin lavarse por el zoom) */}
      {children && <div className="relative z-10 pointer-events-none">{children}</div>}
    </div>
  );
}
