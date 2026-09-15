'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface OccasionItem {
  id: string;
  name: string;
  categorySlug: string;
  tagline: string;
  badge: string;
  imageUrl: string;
}

const TOP_OCCASIONS: OccasionItem[] = [
  {
    id: 'amor',
    name: 'Amor & Romance',
    categorySlug: 'box',
    tagline: 'Rosas rojas premium y detalles inolvidables',
    badge: 'Más Solicitado',
    imageUrl: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/boxes/IMG-20260912-WA0044.jpg',
  },
  {
    id: 'cumpleanos',
    name: 'Cumpleaños Exclusivos',
    categorySlug: 'girasoles',
    tagline: 'Girasoles radiantes y composiciones alegres',
    badge: 'Tendencia Hoy',
    imageUrl: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/girasoles/IMG-20260912-WA0040.jpg',
  },
  {
    id: 'aniversario',
    name: 'Aniversarios Inolvidables',
    categorySlug: 'ramos',
    tagline: 'Ramos de autor con flores de exportación',
    badge: 'Edición de Lujo',
    imageUrl: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/ramos/IMG-20260912-WA0043.jpg',
  },
  {
    id: 'para_el',
    name: 'Para Él & Distinción',
    categorySlug: 'detalles',
    tagline: 'Arreglos sobrios y combinaciones sofisticadas',
    badge: 'Alta Gama',
    imageUrl: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/detalles/IMG-20260912-WA0039.jpg',
  },
  {
    id: 'agradecimiento',
    name: 'Celebración & Wow',
    categorySlug: 'ramos',
    tagline: 'La máxima expresión floral para sorprender',
    badge: 'Favorito',
    imageUrl: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/ramos/IMG-20260912-WA0047.jpg',
  },
];

interface TopOccasionsProps {
  onSelectOccasion: (categorySlug: string) => void;
}

export default function TopOccasions({ onSelectOccasion }: TopOccasionsProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const amount = direction === 'left' ? -320 : 320;
      carouselRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const handleCardClick = (slug: string) => {
    onSelectOccasion(slug);
    const catSection = document.getElementById('catalogo');
    if (catSection) {
      catSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="ocasiones" className="py-12 md:py-16 max-w-6xl mx-auto px-4 space-y-8 w-full overflow-hidden">
      {/* Encabezado Editorial Centrado flanqueado por Controles Prev/Next */}
      <div className="flex items-center justify-between gap-4">
        {/* Botón Circular Anterior */}
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label="Ocasión anterior"
          className="btn-tactile w-10 h-10 rounded-full bg-white shadow-md border border-warm-100 text-ink-900 hover:bg-rose-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2]" />
        </button>

        {/* Título Editorial Centrado */}
        <div className="text-center space-y-1.5 px-2">
          <div className="inline-flex items-center gap-1.5 text-rose-600 text-[11px] font-bold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Selección en Vivo</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-ink-900 font-normal tracking-tight">
            Ocasiones más solicitadas de las últimas 24 horas
          </h2>
          <p className="text-xs sm:text-sm text-warm-500 max-w-xl mx-auto">
            Descubre los motivos que están inspirando las celebraciones de hoy en Lima Metropolitana.
          </p>
        </div>

        {/* Botón Circular Siguiente */}
        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label="Siguiente ocasión"
          className="btn-tactile w-10 h-10 rounded-full bg-white shadow-md border border-warm-100 text-ink-900 hover:bg-rose-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0 cursor-pointer"
        >
          <ChevronRight className="w-5 h-5 stroke-[2]" />
        </button>
      </div>

      {/* Fila Continua de 5 Tarjetas en Formato Retrato aspect-[3/4] */}
      <div
        ref={carouselRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 pt-1"
      >
        {TOP_OCCASIONS.map((occasion) => (
          <div
            key={occasion.id}
            onClick={() => handleCardClick(occasion.categorySlug)}
            className="snap-start shrink-0 min-w-[240px] sm:min-w-[260px] md:min-w-[280px] lg:w-[calc(20%-16px)] lg:min-w-[210px] group cursor-pointer"
          >
            <div className="aspect-[3/4] rounded-2xl overflow-hidden relative border border-warm-100 card-editorial shadow-xs">
              <img
                src={occasion.imageUrl}
                alt={occasion.name}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                loading="lazy"
              />

              {/* Badge Superior */}
              <div className="absolute top-3.5 left-3.5">
                <span className="bg-rose-600/90 backdrop-blur-xs text-white text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded-full shadow-xs uppercase">
                  {occasion.badge}
                </span>
              </div>

              {/* Gradiente Inferior de Alto Contraste con Título Centrado en la Base */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4 text-center">
                <h3 className="text-white font-bold text-base sm:text-lg tracking-tight drop-shadow-xs group-hover:text-rose-200 transition-colors">
                  {occasion.name}
                </h3>
                <p className="text-[11px] text-white/80 line-clamp-1 mt-0.5 font-light">
                  {occasion.tagline}
                </p>
                <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="inline-block text-[10px] font-semibold text-rose-300 underline tracking-wider uppercase">
                    Ver colección →
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
