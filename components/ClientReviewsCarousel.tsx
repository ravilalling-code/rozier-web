'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Star, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import { getClientReviews, ClientReview, DEFAULT_CLIENT_REVIEWS } from '@/lib/clientReviews';

export default function ClientReviewsCarousel() {
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReviews() {
      try {
        const data = await getClientReviews();
        if (data && data.length > 0) {
          // Merge with default details if any row is missing district or rating
          const enriched = data.map((item, index) => {
            const fallback = DEFAULT_CLIENT_REVIEWS[index % DEFAULT_CLIENT_REVIEWS.length];
            return {
              ...fallback,
              ...item,
              district: item.district || fallback.district || 'Lima',
              rating: item.rating || 5,
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
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-[#FAF2F4] border-t border-[#E8D5DC] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="h-8 w-64 bg-[#EBD2DA]/60 rounded-full mx-auto animate-pulse mb-3" />
          <div className="h-4 w-96 bg-[#EBD2DA]/40 rounded-full mx-auto animate-pulse" />
        </div>
      </section>
    );
  }

  const displayList = reviews.length > 0 ? reviews : DEFAULT_CLIENT_REVIEWS;
  // Duplicate for seamless infinite marquee loop
  const duplicatedReviews = [...displayList, ...displayList];

  return (
    <section className="py-20 sm:py-24 bg-gradient-to-b from-[#F7E8EC] via-[#FAF2F4] to-[#F7E8EC] border-t border-[#E8D5DC] relative overflow-hidden">
      {/* Decorative ambient subtle glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#E8B8C4]/25 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12 relative z-10">
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

      {/* Marquee Container with fade edge masks */}
      <div className="relative w-full overflow-hidden">
        {/* Left & Right gradient masks for smooth fade in/out */}
        <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-32 bg-gradient-to-r from-[#F7E8EC] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-32 bg-gradient-to-l from-[#F7E8EC] to-transparent z-10 pointer-events-none" />

        {/* Marquee Track */}
        <div className="flex gap-5 sm:gap-6 w-max animate-marquee-infinite py-4 hover:[animation-play-state:paused]">
          {duplicatedReviews.map((item, idx) => {
            const stars = Array.from({ length: item.rating || 5 });

            return (
              <div
                key={`${item.id}-${idx}`}
                className="group relative flex-shrink-0 w-[300px] sm:w-[340px] rounded-2xl bg-white/95 backdrop-blur-md border border-[#E8D5DC] shadow-sm hover:shadow-xl hover:border-[#C67080] transition-all duration-500 p-4 sm:p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Client photo */}
                  <div className="relative w-full h-48 sm:h-52 rounded-xl overflow-hidden mb-4 bg-[#FAF2F4] border border-[#EBD2DA]">
                    <Image
                      src={item.photo_url || item.image_url}
                      alt={item.client_name ? `Cliente ${item.client_name} - ROZIER` : 'Cliente ROZIER'}
                      fill
                      sizes="(max-width: 640px) 300px, 340px"
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />

                    {/* Occasion badge overlay */}
                    {item.occasion && (
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold text-white uppercase tracking-wider">
                        {item.occasion}
                      </div>
                    )}
                  </div>

                  {/* 5 Golden Stars */}
                  <div className="flex items-center gap-1 mb-2.5">
                    {stars.map((_, sIdx) => (
                      <Star
                        key={sIdx}
                        className="w-4 h-4 fill-amber-400 text-amber-400 drop-shadow-2xs"
                      />
                    ))}
                    <span className="text-xs font-bold text-amber-600 ml-1">5.0</span>
                  </div>

                  {/* Testimonial quote */}
                  <p className="text-xs sm:text-sm text-[#3D252E] italic leading-relaxed line-clamp-3 font-light mb-4">
                    &ldquo;{item.testimonial || item.comment}&rdquo;
                  </p>
                </div>

                {/* Footer: Client details & Lima District */}
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
