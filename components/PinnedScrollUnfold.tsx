'use client';

import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface PinnedScrollUnfoldProps {
  onExploreClick?: () => void;
}

export default function PinnedScrollUnfold({ onExploreClick }: PinnedScrollUnfoldProps) {
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
      className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full transition-colors"
    >
      {/* Cuadrante Oscuro Compacto Reservado Únicamente a "El Arte de Emocionar" */}
      <div className="relative bg-[#0B0B0C] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col lg:flex-row items-center justify-between">
        {/* Imagen Lateral Izquierda */}
        <div className="w-full lg:w-1/3 h-64 lg:h-auto min-h-[280px] lg:min-h-[420px] relative overflow-hidden shrink-0">
          <img
            src="https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/boxes/IMG-20260912-WA0044.jpg"
            alt="Arreglo de lujo ROZIER"
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40 lg:to-transparent pointer-events-none" />
        </div>

        {/* Bloque Central Editorial de Alto Impacto */}
        <div className="flex-1 bg-[#0E0C0D] text-white flex flex-col items-center justify-center p-8 sm:p-10 lg:p-14 text-center z-10 space-y-4 lg:border-x border-white/10">
          <div className="inline-flex items-center gap-2 bg-[#E5C378]/10 text-[#E5C378] border border-[#E5C378]/30 text-[11px] font-semibold uppercase tracking-[0.25em] px-4 py-1.5 rounded-full shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#E5C378]" />
            <span>Manifesto Floral</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-white leading-[1.12]">
            EL ARTE DE EMOCIONAR
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-neutral-300 font-light max-w-xl leading-relaxed">
            Cada tallo seleccionado a mano, cada lazo anudado con absoluta precisión. En ROZIER entendemos que no estás enviando simplemente un ramo; estás confiando la entrega de un sentimiento inolvidable.
          </p>

          <div className="pt-2">
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

        {/* Imagen Lateral Derecha */}
        <div className="w-full lg:w-1/3 h-64 lg:h-auto min-h-[280px] lg:min-h-[420px] relative overflow-hidden shrink-0">
          <img
            src="https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/ramos/IMG-20260912-WA0045.jpg"
            alt="Taller floral ROZIER"
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-transparent to-black/40 lg:to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
