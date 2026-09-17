'use client';

import React, { useRef, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface PinnedScrollUnfoldProps {
  onExploreClick?: () => void;
}

export default function PinnedScrollUnfold({ onExploreClick }: PinnedScrollUnfoldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const leftImageRef = useRef<HTMLDivElement>(null);
  const rightImageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current || !cardRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 1024;

    const ctx = gsap.context(() => {
      // 1. Accesibilidad: Si el usuario prefiere movimiento reducido
      if (prefersReducedMotion) {
        gsap.from('.unfold-stagger-item', {
          opacity: 0,
          y: 16,
          duration: 0.4,
          stagger: 0.08,
          ease: 'power1.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%',
          },
        });
        return;
      }

      // 2. Degradación elegante en dispositivos móviles / tablets (< 1024px)
      // Sin pin forzado para evitar cualquier salto o espacio muerto en pantallas táctiles
      if (isMobile) {
        gsap.from(cardRef.current, {
          opacity: 0,
          y: 28,
          scale: 0.96,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 80%',
          },
        });

        gsap.from('.unfold-stagger-item', {
          opacity: 0,
          y: 20,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 75%',
          },
        });
        return;
      }

      // 3. Desktop (>= 1024px): Efecto Pinned Scroll Unfold completo con sticky y GSAP ScrollTrigger
      // Altura compacta a 116vh: recorrido conciso (~16vh) que elimina cualquier pozo o espacio vacío al terminar
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });

      // Transformación progresiva: scale 1 -> 0.93 y border-radius 0px -> 28px
      tl.fromTo(
        cardRef.current,
        {
          scale: 1,
          borderRadius: '0px',
        },
        {
          scale: 0.93,
          borderRadius: '28px',
          ease: 'none',
        },
        0
      );

      // Parallax vertical sutil en imágenes laterales
      if (leftImageRef.current) {
        tl.to(
          leftImageRef.current,
          {
            yPercent: -12,
            ease: 'none',
          },
          0
        );
      }

      if (rightImageRef.current) {
        tl.to(
          rightImageRef.current,
          {
            yPercent: 12,
            ease: 'none',
          },
          0
        );
      }

      // Entrada escalonada del contenido central al asomarse
      gsap.from('.unfold-stagger-item', {
        opacity: 0,
        y: 22,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

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
      className="relative lg:h-[116vh] bg-[#F7E8EC] transition-colors w-full max-w-full py-6 sm:py-8 lg:py-0"
    >
      {/* Contenedor sticky solo en desktop durante el recorrido progresivo */}
      <div className="relative lg:sticky lg:top-0 h-auto min-h-0 lg:h-[100dvh] overflow-hidden flex items-center justify-center p-3 sm:p-5 md:p-8">
        {/* Contenedor Interior con Escala y Bordes Controlados por GSAP */}
        <div
          ref={cardRef}
          className="relative w-full max-w-7xl h-auto min-h-0 lg:h-[86vh] bg-[#0E0C0D] rounded-2xl lg:rounded-none overflow-hidden shadow-2xl border border-white/10 flex flex-col lg:flex-row items-center justify-between mx-auto will-change-transform"
        >
          {/* Imagen Lateral Izquierda con Parallax */}
          <div className="w-full lg:w-1/3 h-56 sm:h-72 lg:h-full relative overflow-hidden shrink-0">
            <div ref={leftImageRef} className="w-full h-[125%] -top-[12%] relative will-change-transform">
              <img
                src="https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/boxes/IMG-20260912-WA0044.jpg"
                alt="Arreglo de autor ROZIER"
                className="w-full h-full object-cover [@media(hover:hover)]:hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40 lg:to-transparent pointer-events-none" />
          </div>

          {/* Bloque Central Editorial */}
          <div className="flex-1 bg-[#120F10] text-white flex flex-col items-center justify-center p-6 sm:p-10 lg:p-14 text-center z-10 space-y-4 lg:border-x border-white/10 h-auto lg:h-full">
            {/* Badge Manifesto */}
            <div className="unfold-stagger-item inline-flex items-center gap-2 bg-[#E5C378]/15 text-[#E5C378] border border-[#E5C378]/30 text-[11px] font-semibold uppercase tracking-[0.25em] px-4 py-1.5 rounded-full shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#E5C378]" />
              <span>Manifesto Floral</span>
            </div>

            {/* Título Principal */}
            <h2 className="unfold-stagger-item font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-[1.12]">
              EL ARTE DE EMOCIONAR
            </h2>

            {/* Párrafo Editorial */}
            <p className="unfold-stagger-item text-xs sm:text-sm md:text-base text-neutral-300 font-light max-w-xl leading-relaxed">
              Cada tallo seleccionado a mano, cada lazo anudado con absoluta precisión. En ROZIER entendemos que no estás enviando simplemente un ramo; estás confiando la entrega de un sentimiento inolvidable.
            </p>

            {/* Botón CTA */}
            <div className="unfold-stagger-item pt-2">
              <button
                type="button"
                onClick={handleCta}
                className="btn-tactile inline-flex items-center gap-2.5 bg-[#B85D6F] hover:bg-[#9B4858] text-white rounded-full px-8 py-3.5 font-bold text-xs sm:text-sm tracking-wider uppercase hover:scale-105 active:scale-95 transition-all shadow-xl border border-rose-300/40 cursor-pointer"
              >
                <span>Descubrir Creaciones</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Imagen Lateral Derecha con Parallax */}
          <div className="w-full lg:w-1/3 h-56 sm:h-72 lg:h-full relative overflow-hidden shrink-0">
            <div ref={rightImageRef} className="w-full h-[125%] -top-[12%] relative will-change-transform">
              <img
                src="https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/ramos/IMG-20260912-WA0045.jpg"
                alt="Taller de alta floristería ROZIER"
                className="w-full h-full object-cover [@media(hover:hover)]:hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-transparent to-black/40 lg:to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
