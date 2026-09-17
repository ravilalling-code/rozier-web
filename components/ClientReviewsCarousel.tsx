'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Star, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import { getClientReviews, ClientReview, DEFAULT_CLIENT_REVIEWS } from '@/lib/clientReviews';

export default function ClientReviewsCarousel() {
  const [reviews, setReviews] = useState<ClientReview[]>(DEFAULT_CLIENT_REVIEWS);
  const [isInView, setIsInView] = useState(false);
  const [isMarqueeStarted, setIsMarqueeStarted] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    async function loadReviews() {
      try {
        const data = await getClientReviews();
        if (data && data.length > 0) {
          // Merge con detalles predeterminados para asegurar testimonios completos
          const enriched = data.map((item, index) => {
            const fallback = DEFAULT_CLIENT_REVIEWS[index % DEFAULT_CLIENT_REVIEWS.length];
            return {
              ...fallback,
              ...item,
              district: item.district || fallback.district || 'Lima',
              rating: typeof item.rating === 'number' && item.rating > 0 ? item.rating : fallback.rating || 5,
              testimonial: item.testimonial || item.comment || fallback.testimonial,
              client_name: item.client_name && !item.client_name.includes('Momento ROZIER')
                ? item.client_name
                : fallback.client_name,
            };
          });
          setReviews(enriched);
        } else {
          setReviews(DEFAULT_CLIENT_REVIEWS);
        }
      } catch (err) {
        console.error('Error loading client reviews:', err);
        setReviews(DEFAULT_CLIENT_REVIEWS);
      }
    }
    loadReviews();
  }, []);

  // IntersectionObserver para activar la entrada escalonada cuando entra al viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Iniciar marquee suavemente tras completar el fade-in escalonado (stagger)
  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        setIsMarqueeStarted(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isInView]);

  const displayList = reviews && reviews.length > 0 ? reviews : DEFAULT_CLIENT_REVIEWS;
  
  if (!displayList || displayList.length === 0) {
    return null;
  }

  // Duplicar para carrusel infinito continuo
  const duplicatedReviews = [...displayList, ...displayList];

  return (
    <section
      ref={sectionRef}
      className="py-20 sm:py-24 bg-gradient-to-b from-[#F7E8EC] via-[#FAF2F4] to-[#F7E8EC] border-t border-[#E8D5DC] relative overflow-hidden"
    >
      {/* Resplandor ambiental de fondo */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#E8B8C4]/25 blur-[100px] rounded-full pointer-events-none" />

      <div
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12 relative z-10 transition-all duration-700 ${
          isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-[#8B3B4D] bg-[#F3DDE3] border border-[#DFC0CB] rounded-full uppercase mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#B85D6F]" />
          Historias & Emoción Real
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#2D1B22] tracking-tight mb-4">
          Momentos que Dejan Huella
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-[#5A3844] max-w-2xl mx-auto font-light leading-relaxed">
          Sé parte de la emoción. Cada arreglo cuenta una historia real de amor, complicidad y celebración que perdura para siempre.
        </p>
      </div>

      {/* Contenedor del Marquee con máscaras de desvanecimiento lateral */}
      <div className="relative w-full overflow-hidden">
        {/* Máscaras de degradado lateral */}
        <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-32 bg-gradient-to-r from-[#F7E8EC] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-32 bg-gradient-to-l from-[#F7E8EC] to-transparent z-10 pointer-events-none" />

        {/* Pista del Marquee */}
        <div className={`flex gap-5 sm:gap-6 w-max py-4 hover:[animation-play-state:paused] ${isMarqueeStarted ? 'animate-marquee-infinite' : ''}`}>
          {duplicatedReviews.map((item, idx) => {
            const rawRating = typeof item.rating === 'number' && item.rating > 0 ? item.rating : 5;
            const starCount = Math.min(5, Math.max(1, Math.round(rawRating)));
            const stars = Array.from({ length: starCount });
            const staggerIndex = idx % 8;

            return (
              <div
                key={`${item.id}-${idx}`}
                style={{
                  animationDelay: isInView ? `${staggerIndex * 70}ms` : '0ms',
                }}
                className={`group relative flex-shrink-0 w-[300px] sm:w-[340px] rounded-2xl bg-white/95 backdrop-blur-md border border-[#E8D5DC] shadow-sm hover:shadow-xl hover:border-[#B85D6F] transition-all duration-500 p-4 sm:p-5 flex flex-col justify-between ${
                  isInView ? 'animate-fade-in-up' : 'opacity-0'
                }`}
              >
                <div>
                  {/* Foto del cliente */}
                  <div className="relative w-full h-48 sm:h-52 rounded-xl overflow-hidden mb-4 bg-[#FAF2F4] border border-[#EBD2DA]">
                    <Image
                      src={item.photo_url || item.image_url}
                      alt={item.client_name ? `Cliente ${item.client_name} - ROZIER` : 'Cliente ROZIER'}
                      fill
                      sizes="(max-width: 640px) 300px, 340px"
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />

                    {/* Badge de ocasión sobre la foto */}
                    {item.occasion && (
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold text-white uppercase tracking-wider">
                        {item.occasion}
                      </div>
                    )}
                  </div>

                  {/* Estrellas doradas dinámicas según rating real */}
                  <div className="flex items-center gap-1 mb-2.5">
                    {stars.map((_, sIdx) => (
                      <Star
                        key={sIdx}
                        className="w-4 h-4 fill-amber-400 text-amber-400 drop-shadow-2xs"
                      />
                    ))}
                    <span className="text-xs font-bold text-amber-600 ml-1">
                      {(item.rating || 5).toFixed(1)}
                    </span>
                  </div>

                  {/* Testimonio individualizado */}
                  <p className="text-xs sm:text-sm text-[#3D252E] italic leading-relaxed line-clamp-3 font-light mb-4">
                    &ldquo;{item.testimonial || item.comment}&rdquo;
                  </p>
                </div>

                {/* Footer: Datos del cliente y distrito de Lima */}
                <div className="pt-3 border-t border-[#F0E0E6] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-serif font-bold text-[#2D1B22] truncate">
                      {item.client_name}
                    </h4>
                    <p className="text-[11px] text-[#7A4B58] flex items-center gap-1 font-medium truncate mt-0.5">
                      <MapPin className="w-3 h-3 text-[#B85D6F] shrink-0" />
                      <span>{item.district || 'Lima'}</span>
                    </p>
                  </div>

                  <span className="shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-[#8B3B4D] bg-[#F5E5EA] border border-[#DFC0CB] px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-[#2E7D32]" />
                    Verificado
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
