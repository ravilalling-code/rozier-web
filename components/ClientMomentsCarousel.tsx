'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { getClientReviews, ClientReview } from '@/lib/clientReviews';

export default function ClientMomentsCarousel() {
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReviews() {
      try {
        const data = await getClientReviews();
        setReviews(data);
      } catch (err) {
        console.error('Error loading client reviews:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReviews();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-[#FAF7F5] border-t border-[#F0EAE6] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="h-8 w-64 bg-warm-200/50 rounded-full mx-auto animate-pulse mb-3" />
          <div className="h-4 w-96 bg-warm-200/40 rounded-full mx-auto animate-pulse" />
        </div>
      </section>
    );
  }

  if (reviews.length === 0) return null;

  // Duplicate list to achieve continuous seamless loop
  const duplicatedReviews = [...reviews, ...reviews];

  return (
    <section className="py-20 sm:py-24 bg-gradient-to-b from-[#FAF7F5] via-white to-[#FAF7F5] border-t border-[#F0EAE6] relative overflow-hidden">
      {/* Decorative ambient subtle glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-rose-200/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12 relative z-10">
        <span className="inline-block px-3.5 py-1 text-[11px] font-semibold tracking-[0.2em] text-[#A66E7A] bg-rose-50 border border-rose-200/60 rounded-full uppercase mb-3.5 shadow-sm">
          Historias & Emoción
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#1C1917] tracking-tight mb-4">
          Momentos que Dejan Huella
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-neutral-600 max-w-2xl mx-auto font-light leading-relaxed">
          Sé parte de la emoción. Cada arreglo cuenta una historia real de amor, complicidad y celebración que perdura para siempre.
        </p>
      </div>

      {/* Marquee Container with fade edge masks */}
      <div className="relative w-full overflow-hidden">
        {/* Left & Right gradient masks for smooth fade in/out */}
        <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-28 bg-gradient-to-r from-[#FAF7F5] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-28 bg-gradient-to-l from-[#FAF7F5] to-transparent z-10 pointer-events-none" />

        {/* Marquee Track */}
        <div className="flex gap-4 sm:gap-6 w-max animate-marquee-infinite py-4 hover:[animation-play-state:paused]">
          {duplicatedReviews.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="group relative flex-shrink-0 w-56 sm:w-64 md:w-72 aspect-[3/4] rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 bg-warm-100 border border-warm-200/60"
            >
              <Image
                src={item.photo_url || item.image_url}
                alt={item.client_name ? `Cliente ${item.client_name} - ROZIER` : 'Cliente feliz ROZIER'}
                fill
                sizes="(max-width: 640px) 224px, (max-width: 768px) 256px, 288px"
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />

              {/* Gradient overlay on hover / active */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 sm:p-5">
                {item.client_name && (
                  <p className="text-white font-serif text-base sm:text-lg font-medium tracking-wide drop-shadow-sm">
                    {item.client_name}
                  </p>
                )}
                {item.occasion && (
                  <p className="text-white/80 text-xs tracking-wider uppercase font-light drop-shadow-sm">
                    {item.occasion}
                  </p>
                )}
                {(item.testimonial || item.comment) && (
                  <p className="text-white/90 text-xs italic mt-1 line-clamp-2 drop-shadow-sm">
                    &ldquo;{item.testimonial || item.comment}&rdquo;
                  </p>
                )}
              </div>

              {/* Subtle top badge for ROZIER stamp */}
              <div className="absolute top-3 right-3 opacity-80 group-hover:opacity-100 transition-opacity">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/80 backdrop-blur-md text-[10px] font-serif text-neutral-800 shadow-sm border border-white/50">
                  R
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
