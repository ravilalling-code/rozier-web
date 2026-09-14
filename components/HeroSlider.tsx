'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { HeroSlide } from '@/lib/types';
import { DEFAULT_HERO_SLIDES } from '@/lib/heroSlides';

interface HeroSliderProps {
  slides?: HeroSlide[];
  onCtaClick?: (target: string) => void;
}

export default function HeroSlider({ slides, onCtaClick }: HeroSliderProps) {
  const activeSlides = slides && slides.length > 0 ? slides : DEFAULT_HERO_SLIDES;
  const totalSlides = activeSlides.length;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [incomingIdx, setIncomingIdx] = useState<number | null>(null);
  const [isWiping, setIsWiping] = useState(false);
  const [textVisible, setTextVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const wipeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Asegurar que currentIdx esté dentro del rango si la cantidad de slides cambia dinámicamente
  useEffect(() => {
    if (currentIdx >= totalSlides) {
      setCurrentIdx(Math.max(0, totalSlides - 1));
    }
  }, [totalSlides, currentIdx]);

  const goToSlide = useCallback(
    (targetIndex: number) => {
      if (isWiping || targetIndex === currentIdx || totalSlides <= 1) return;

      // 1. Coreografía: Fade-out rápido del texto saliente (150ms)
      setTextVisible(false);

      // Iniciar el wipe horizontal
      setIncomingIdx(targetIndex);
      setIsWiping(true);

      // 800ms de Wipe horizontal con curva cubic-bezier(0.16, 1, 0.3, 1)
      if (wipeTimeoutRef.current) clearTimeout(wipeTimeoutRef.current);
      wipeTimeoutRef.current = setTimeout(() => {
        setCurrentIdx(targetIndex);
        setIncomingIdx(null);
        setIsWiping(false);

        // Retardo de ~100ms tras completar el wipe para fade-in del texto nuevo
        if (textTimeoutRef.current) clearTimeout(textTimeoutRef.current);
        textTimeoutRef.current = setTimeout(() => {
          setTextVisible(true);
        }, 100);
      }, 800);
    },
    [isWiping, currentIdx, totalSlides]
  );

  const nextSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    const next = (currentIdx + 1) % totalSlides;
    goToSlide(next);
  }, [currentIdx, totalSlides, goToSlide]);

  const prevSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    const prev = (currentIdx - 1 + totalSlides) % totalSlides;
    goToSlide(prev);
  }, [currentIdx, totalSlides, goToSlide]);

  // Autoplay de 5.5s con pausa on-hover
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5500);

    return () => clearInterval(interval);
  }, [isPaused, nextSlide, totalSlides]);

  // Limpieza de timeouts
  useEffect(() => {
    return () => {
      if (wipeTimeoutRef.current) clearTimeout(wipeTimeoutRef.current);
      if (textTimeoutRef.current) clearTimeout(textTimeoutRef.current);
    };
  }, []);

  // Swipe táctil en dispositivos móviles
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || totalSlides <= 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    touchStartX.current = null;
  };

  const safeIdx = Math.min(currentIdx, totalSlides - 1);
  const activeSlide = activeSlides[safeIdx] || activeSlides[0];

  const handleCta = (target?: string) => {
    const cleanTarget = target || '#catalogo';
    if (onCtaClick) {
      onCtaClick(cleanTarget);
    } else {
      const el = document.getElementById(cleanTarget.replace('#', ''));
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      className="relative w-full h-[88vh] md:h-screen overflow-hidden bg-ink-950 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. SLIDE ACTUAL (Estático detrás durante el wipe) */}
      <div className="absolute inset-0 z-0">
        <img
          src={activeSlide.image_url}
          alt={activeSlide.title}
          className="w-full h-full object-cover"
        />
        {/* Overlay multicapa para contraste garantizado WCAG AA (> 4.5:1) */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-black/25 to-black/35" />
      </div>

      {/* 2. SLIDE ENTRANTE CON WIPE HORIZONTAL */}
      {incomingIdx !== null && activeSlides[incomingIdx] && (
        <div
          className="absolute inset-0 z-10 overflow-hidden"
          style={{
            transform: isWiping ? 'translateX(0%)' : 'translateX(100%)',
            transition: 'transform 800ms cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform',
          }}
        >
          <img
            src={activeSlides[incomingIdx].image_url}
            alt={activeSlides[incomingIdx].title}
            className="w-full h-full object-cover"
          />
          {/* Overlay del slide entrante */}
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-black/25 to-black/35" />
        </div>
      )}

      {/* 3. MARCA DE AGUA DECORATIVA (Watermark Script) */}
      {activeSlide.watermark_text && (
        <div
          className="pointer-events-none select-none font-serif italic text-8xl md:text-[13rem] text-white/10 absolute -bottom-4 md:-bottom-8 right-6 md:right-16 z-10 leading-none tracking-tight transition-opacity duration-700"
          style={{
            opacity: textVisible ? 0.15 : 0,
          }}
        >
          {activeSlide.watermark_text}
        </div>
      )}

      {/* 4. CONTENIDO EDITORIAL COREOGRAFIADO EN 2 TIEMPOS */}
      <div className="relative z-20 max-w-6xl mx-auto h-full flex flex-col justify-end pb-20 md:pb-24 px-6 md:px-12 text-white">
        <div
          className="max-w-3xl space-y-4 md:space-y-6"
          style={{
            opacity: textVisible ? 1 : 0,
            transform: textVisible ? 'translateY(0px)' : 'translateY(8px)',
            transition: textVisible
              ? 'opacity 350ms cubic-bezier(0.16, 1, 0.3, 1), transform 350ms cubic-bezier(0.16, 1, 0.3, 1)'
              : 'opacity 150ms ease-out, transform 150ms ease-out',
            willChange: 'opacity, transform',
          }}
        >
          {/* Insignia / Badge de Slide */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white text-xs font-semibold uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full border border-white/30 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--rose-300)]" />
            <span>{activeSlide.badge_text}</span>
          </div>

          {/* Título Editorial Imponente en Serif Display */}
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal text-white tracking-tight leading-[1.06] drop-shadow-md">
            {activeSlide.title}
          </h1>

          {/* Bajada Editorial */}
          <p className="text-sm sm:text-base md:text-lg text-white/85 font-light leading-relaxed max-w-2xl drop-shadow-xs">
            {activeSlide.subtitle}
          </p>

          {/* Dual CTA: Botón circular con flecha diagonal (↗) + Botón pill */}
          <div className="pt-2 sm:pt-4 flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => handleCta(activeSlide.cta_link)}
              className="btn-tactile bg-[var(--rose-300)] text-[var(--ink-900)] rounded-full px-7 py-3.5 font-bold text-xs sm:text-sm tracking-wider uppercase hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/30 flex items-center gap-2 cursor-pointer"
            >
              <span>{activeSlide.cta_text || 'Explorar Colección'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCta(activeSlide.cta_link)}
              aria-label="Ir a la colección"
              className="btn-tactile w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 text-white flex items-center justify-center hover:bg-white hover:text-ink-900 transition-all cursor-pointer shadow-lg"
            >
              <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. NAVEGACIÓN VERTICAL POR DOTS DINÁMICOS (Columna Derecha, 1 a 5 dots según cantidad) */}
      {totalSlides > 1 && (
        <div className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
          {activeSlides.map((slide, idx) => {
            const isActive = idx === safeIdx;
            return (
              <button
                key={slide.id || idx}
                type="button"
                onClick={() => goToSlide(idx)}
                aria-label={`Ir al slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  isActive
                    ? 'h-8 w-2 bg-[var(--rose-300)] shadow-md'
                    : 'h-2 w-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
