'use client';

import { useRef, useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface PinnedScrollUnfoldProps {
  onExploreClick?: () => void;
}

export default function PinnedScrollUnfold({ onExploreClick }: PinnedScrollUnfoldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // IntersectionObserver para activar el listener solo cuando esté visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { rootMargin: '100px 0px 100px 0px' }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isIntersecting) return;

    let rafId: number;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollable = rect.height - windowHeight;

      if (totalScrollable <= 0) return;

      const scrolled = -rect.top;
      const currentProgress = Math.max(0, Math.min(1, scrolled / totalScrollable));

      rafId = requestAnimationFrame(() => {
        setProgress(currentProgress);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isIntersecting]);

  // Interpolaciones calculadas puramente para transform y border-radius (cero reflow)
  const scale = 1 - progress * 0.08; // De 1 a 0.92
  const borderRadius = `${progress * 24}px`; // De 0px a 24px (rounded-2xl)

  const handleCta = () => {
    if (onExploreClick) {
      onExploreClick();
    } else {
      const el = document.getElementById('catalogo');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="unfold-story"
      ref={containerRef}
      className="relative h-[180vh] bg-[#F9ECEF] transition-colors w-full max-w-full overflow-hidden"
    >
      {/* Contenedor sticky que permanece fijo en pantalla durante el scroll */}
      <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">
        {/* Contenedor Interior con Escala y Bordes Interpolados */}
        <div
          className="relative w-full h-full flex flex-col lg:flex-row items-center justify-between overflow-hidden shadow-2xl transition-[border-radius] duration-75 ease-out"
          style={{
            transform: `scale(${scale})`,
            borderRadius,
            willChange: isIntersecting ? 'transform' : 'auto',
          }}
        >
          {/* Imagen Lateral Izquierda (Arreglo floral de autor) */}
          <div className="w-full lg:w-1/3 h-1/3 lg:h-full relative overflow-hidden shrink-0">
            <img
              src="https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/boxes/IMG-20260912-WA0044.jpg"
              alt="Arreglo de lujo ROZIER"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/30 lg:to-transparent" />
          </div>

          {/* Bloque Central Editorial de Alto Impacto */}
          <div className="flex-1 h-auto lg:h-full bg-ink-950 text-white flex flex-col items-center justify-center p-8 sm:p-12 lg:p-16 text-center z-10 space-y-5">
            <div className="inline-flex items-center gap-2 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold uppercase tracking-[0.25em] px-4 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>Manifesto Floral</span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.12]">
              EL ARTE DE EMOCIONAR
            </h2>

            <p className="text-xs sm:text-sm md:text-base text-neutral-300 font-light max-w-xl leading-relaxed">
              Cada tallo seleccionado a mano, cada lazo anudado con absoluta precisión. En ROZIER entendemos que no estás enviando simplemente un ramo; estás confiando la entrega de un sentimiento inolvidable.
            </p>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleCta}
                className="btn-tactile inline-flex items-center gap-2.5 bg-[var(--rose-300)] text-ink-900 rounded-full px-7 py-3 font-bold text-xs sm:text-sm tracking-wider uppercase hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <span>Descubrir Creaciones</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Imagen Lateral Derecha (Composición de girasoles / lifestyle) */}
          <div className="w-full lg:w-1/3 h-1/3 lg:h-full relative overflow-hidden shrink-0">
            <img
              src="https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/ramos/IMG-20260912-WA0045.jpg"
              alt="Taller floral ROZIER"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-transparent to-black/30 lg:to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
