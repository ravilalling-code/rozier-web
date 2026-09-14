'use client';

import { useState, useEffect } from 'react';
import { Campaign } from '@/lib/types';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

interface CampaignSectionProps {
  campaign: Campaign;
  onCtaClick: (ctaLink?: string) => void;
}

export default function CampaignSection({ campaign, onCtaClick }: CampaignSectionProps) {
  // Extraer imágenes válidas (hasta 3)
  const images = (campaign.banner_images && campaign.banner_images.length > 0)
    ? campaign.banner_images.slice(0, 3)
    : ((campaign.images && campaign.images.length > 0)
      ? campaign.images.slice(0, 3)
      : (campaign.banner_url ? [campaign.banner_url] : []));

  const isCarousel = (typeof campaign.is_carousel === 'boolean'
    ? campaign.is_carousel
    : (campaign.layout_type === 'carousel')) && images.length > 1;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Transición automática cada 4.5 segundos con pausa en hover
  useEffect(() => {
    if (!isCarousel || isHovered || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [isCarousel, isHovered, images.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const mainImage = images[0] || campaign.banner_url || '/images/logo.jpg';

  return (
    <section className="bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-transparent rounded-3xl p-5 sm:p-8 border border-amber-200/70 shadow-xs space-y-6">
      {/* Header Exterior de la Campaña */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{campaign.badge_text || 'Campaña Especial'}</span>
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-ink-900 tracking-tight">
            {campaign.title}
          </h3>
          {campaign.subtitle && (
            <p className="text-xs sm:text-sm text-warm-500 max-w-xl">
              {campaign.subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Controles de navegación en header si es carrusel */}
          {isCarousel && (
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrev}
                className="w-9 h-9 rounded-full bg-white shadow-xs border border-warm-100 text-ink-900 hover:bg-rose-100 flex items-center justify-center transition active:scale-95 cursor-pointer"
                aria-label="Anterior foto"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-9 h-9 rounded-full bg-white shadow-xs border border-warm-100 text-ink-900 hover:bg-rose-100 flex items-center justify-center transition active:scale-95 cursor-pointer"
                aria-label="Siguiente foto"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Botón CTA Superior */}
          <button
            type="button"
            onClick={() => onCtaClick(campaign.cta_link)}
            className="btn-tactile inline-flex items-center gap-2 bg-ink-900 hover:bg-rose-600 text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-xs transition"
          >
            <span>{campaign.cta_text || 'Explorar Colección'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Contenedor Visual (Carrusel Fluido vs Banner Estático de Alta Resolución) */}
      {isCarousel ? (
        /* Modo Carrusel: Slider fluido de 1 a 3 fotos con auto-transición e indicadores */
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-[16/10] sm:aspect-[21/9] min-h-[260px] sm:min-h-[320px] border border-amber-200/80 shadow-md group select-none"
        >
          {/* Imágenes con transición cross-fade suave */}
          {images.map((imgUrl, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={imgUrl}
                alt={`${campaign.title} - Imagen ${idx + 1}`}
                className="w-full h-full object-cover"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            </div>
          ))}

          {/* Overlay gradiente editorial */}
          <div className="absolute inset-0 z-20 bg-gradient-to-t sm:bg-gradient-to-r from-ink-950/85 via-ink-950/40 to-transparent flex flex-col justify-between p-6 sm:p-10 pointer-events-none">
            {/* Top Info */}
            <div className="flex items-center justify-between pointer-events-auto">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-300 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-amber-400/30">
                {campaign.badge_text || 'COLECCIÓN TEMPORADA'}
              </span>

              {/* Indicador de foto actual */}
              <span className="text-[10px] font-semibold text-white/90 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full">
                {currentIndex + 1} / {images.length}
              </span>
            </div>

            {/* Bottom Info & CTA */}
            <div className="max-w-lg text-white space-y-2 pointer-events-auto">
              <h4 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal leading-tight text-white drop-shadow-sm">
                {campaign.title}
              </h4>
              {campaign.subtitle && (
                <p className="text-xs sm:text-sm text-neutral-200 line-clamp-2 drop-shadow-xs">
                  {campaign.subtitle}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onCtaClick(campaign.cta_link)}
                  className="btn-tactile inline-flex items-center gap-2 bg-white hover:bg-amber-400 text-ink-900 px-5 py-2.5 rounded-full text-xs font-bold shadow-md transition"
                >
                  <span>{campaign.cta_text || 'Ver Colección'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Flechas de Navegación Flotantes (Visibles al pasar el mouse o en móvil) */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Foto anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-ink-900 shadow-md backdrop-blur-xs flex items-center justify-center transition sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Foto siguiente"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-ink-900 shadow-md backdrop-blur-xs flex items-center justify-center transition sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Indicadores de Puntos (Dots) */}
          <div className="absolute bottom-4 right-6 z-30 flex items-center gap-2">
            {images.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setCurrentIndex(dotIdx)}
                aria-label={`Ir a foto ${dotIdx + 1}`}
                className={`transition-all duration-300 cursor-pointer ${
                  dotIdx === currentIndex
                    ? 'w-7 h-2 bg-amber-400 rounded-full shadow-xs'
                    : 'w-2 h-2 bg-white/60 hover:bg-white rounded-full'
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Modo Banner Único: Editorial estático de alta resolución */
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-[16/10] sm:aspect-[21/9] min-h-[260px] sm:min-h-[320px] border border-amber-200/80 shadow-md card-editorial group">
          <img
            src={mainImage}
            alt={campaign.title}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700 ease-out"
          />

          <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-ink-950/85 via-ink-950/45 to-transparent flex flex-col justify-between p-6 sm:p-10">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-amber-300 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-amber-400/30 self-start">
              {campaign.badge_text || 'COLECCIÓN TEMPORADA'}
            </span>

            <div className="max-w-lg text-white space-y-2">
              <h4 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal leading-tight text-white drop-shadow-sm">
                {campaign.title}
              </h4>
              {campaign.subtitle && (
                <p className="text-xs sm:text-sm text-neutral-200 line-clamp-2 drop-shadow-xs">
                  {campaign.subtitle}
                </p>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onCtaClick(campaign.cta_link)}
                  className="btn-tactile inline-flex items-center gap-2 bg-white hover:bg-amber-400 text-ink-900 px-5 py-2.5 rounded-full text-xs font-bold shadow-md transition"
                >
                  <span>{campaign.cta_text || 'Ver Colección'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
