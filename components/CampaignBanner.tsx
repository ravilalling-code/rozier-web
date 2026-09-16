'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types';
import { getActiveCampaign } from '@/lib/campaigns';
import {
  Sparkles,
  ArrowRight,
  ShoppingCart,
  Clock,
  Flame,
  Check,
} from 'lucide-react';

interface CampaignBannerProps {
  onCtaClick?: (link?: string) => void;
  onProductClick?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  allProducts?: Product[];
}

interface BannerActiveData {
  is_active: boolean;
  title: string;
  subtitle?: string;
  description?: string;
  badge_text?: string;
  button_text?: string;
  target_date?: string;
  selected_product_ids?: string[];
}

export default function CampaignBanner({
  onCtaClick,
  onProductClick,
  onAddToCart,
  allProducts = [],
}: CampaignBannerProps) {
  const [settings, setSettings] = useState<BannerActiveData | null>(null);
  const [loadedProducts, setLoadedProducts] = useState<Product[]>(allProducts);
  const [loading, setLoading] = useState(true);

  // Contador regresivo
  const [timeLeft, setTimeLeft] = useState<{
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
    isExpired: boolean;
  }>({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
    isExpired: false,
  });

  // 1. Cargar configuración de campaña y productos si no fueron pasados
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        // Consultar public.campaigns
        const activeCamp = await getActiveCampaign();
        if (isMounted) {
          if (activeCamp && activeCamp.is_active) {
            setSettings({
              is_active: true,
              title: activeCamp.title || activeCamp.name || '',
              subtitle: activeCamp.subtitle || '',
              description: activeCamp.description || '',
              badge_text: activeCamp.badge_text || 'Campaña Especial',
              button_text: activeCamp.button_text || activeCamp.cta_text || 'Ver colección',
              target_date: activeCamp.target_date || activeCamp.end_date || '',
              selected_product_ids: activeCamp.selected_product_ids || [],
            });
          } else {
            setSettings(null);
          }
        }

        if (allProducts.length === 0) {
          const { data: prods } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true);
          if (isMounted && prods) {
            setLoadedProducts(prods as Product[]);
          }
        }
      } catch (err) {
        console.warn('Error cargando datos de CampaignBanner:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();

    // Escuchar eventos en vivo desde el CRM en la misma ventana o tabs
    const handleSettingsUpdate = () => {
      init();
    };
    window.addEventListener('rozier:campaign-settings-updated', handleSettingsUpdate);
    window.addEventListener('rozier:campaigns-updated', handleSettingsUpdate);

    // Canal en tiempo real de Supabase exclusivamente para public.campaigns
    const campChannel = supabase
      .channel('campaigns_realtime_banner')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns' },
        () => {
          init();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener('rozier:campaign-settings-updated', handleSettingsUpdate);
      window.removeEventListener('rozier:campaigns-updated', handleSettingsUpdate);
      supabase.removeChannel(campChannel);
    };
  }, [allProducts.length]);

  // Actualizar productos cuando cambien desde props
  useEffect(() => {
    if (allProducts.length > 0) {
      setLoadedProducts(allProducts);
    }
  }, [allProducts]);

  // 2. Contador en vivo que se actualiza cada segundo
  useEffect(() => {
    if (!settings?.target_date) return;

    const updateTimer = () => {
      const targetTime = new Date(settings.target_date!).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (isNaN(targetTime) || diff <= 0) {
        setTimeLeft({
          days: '00',
          hours: '00',
          minutes: '00',
          seconds: '00',
          isExpired: true,
        });
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft({
        days: String(d).padStart(2, '0'),
        hours: String(h).padStart(2, '0'),
        minutes: String(m).padStart(2, '0'),
        seconds: String(s).padStart(2, '0'),
        isExpired: false,
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [settings?.target_date]);

  // 3. Obtener los productos seleccionados para la columna derecha
  const featuredProducts = useMemo(() => {
    const list: Product[] = [];
    const ids = settings?.selected_product_ids || [];

    // Priorizar los seleccionados en el CRM
    ids.forEach((id) => {
      const matched = loadedProducts.find((p) => String(p.id) === String(id));
      if (matched && !list.some((item) => item.id === matched.id)) {
        list.push(matched);
      }
    });

    // Si hay menos de 3, completar con productos activos (preferencia flores amarillas / destacados)
    if (list.length < 3 && loadedProducts.length > 0) {
      const remaining = loadedProducts.filter(
        (p) => !list.some((item) => item.id === p.id)
      );

      // Intentar buscar productos con "amarill" o "girasol" si existen
      const themed = remaining.filter(
        (p) =>
          p.name.toLowerCase().includes('amarill') ||
          p.name.toLowerCase().includes('girasol') ||
          (p.category || '').toLowerCase().includes('amarill')
      );

      themed.forEach((p) => {
        if (list.length < 4 && !list.some((item) => item.id === p.id)) {
          list.push(p);
        }
      });

      // Completar hasta tener al menos 3 si aún faltan
      for (const p of remaining) {
        if (list.length >= 4) break;
        if (!list.some((item) => item.id === p.id)) {
          list.push(p);
        }
      }
    }

    return list.slice(0, 4);
  }, [settings?.selected_product_ids, loadedProducts]);

  // Si no hay campaña o está desactivada (is_active === false), ocultar por completo
  if (!settings || !settings.is_active) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1718] via-[#2A1D20] to-[#181314] text-white p-6 sm:p-8 md:p-10 border border-amber-500/20 shadow-xl animate-fade-in-up">
      {/* Resplandor ambiental de lujo */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-amber-500/15 blur-[90px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-rose-500/15 blur-[90px] rounded-full pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* COLUMNA IZQUIERDA: Textos, Contador Regresivo y Botón CTA (~58% en desktop) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Badge & Slogan */}
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-400/15 border border-amber-400/40 rounded-full text-[11px] font-semibold tracking-wider text-amber-300 uppercase shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{settings.badge_text || 'Campaña Especial'}</span>
            </div>
            {settings.subtitle && (
              <p className="text-xs sm:text-sm font-medium text-amber-200/90 tracking-wide uppercase">
                {settings.subtitle}
              </p>
            )}
          </div>

          {/* Título Principal y Descripción */}
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal text-white tracking-tight leading-[1.15]">
              {settings.title}
            </h2>
            {settings.description && (
              <p className="text-sm sm:text-base text-neutral-300 font-light leading-relaxed max-w-xl">
                {settings.description}
              </p>
            )}
          </div>

          {/* CONTADOR REGRESIVO EN VIVO */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-300 uppercase tracking-widest">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {timeLeft.isExpired ? 'Campaña Finalizada' : 'La oferta finaliza en:'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5 sm:gap-4 max-w-md">
              {/* DÍAS */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 sm:p-4 text-center shadow-inner hover:border-amber-400/40 transition">
                <span
                  key={timeLeft.days}
                  className="block text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-white tabular-nums animate-digit-pulse"
                >
                  {timeLeft.days}
                </span>
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Días
                </span>
              </div>

              {/* HORAS */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 sm:p-4 text-center shadow-inner hover:border-amber-400/40 transition">
                <span
                  key={timeLeft.hours}
                  className="block text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-white tabular-nums animate-digit-pulse"
                >
                  {timeLeft.hours}
                </span>
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Horas
                </span>
              </div>

              {/* MINUTOS */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 sm:p-4 text-center shadow-inner hover:border-amber-400/40 transition">
                <span
                  key={timeLeft.minutes}
                  className="block text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-white tabular-nums animate-digit-pulse"
                >
                  {timeLeft.minutes}
                </span>
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Min
                </span>
              </div>

              {/* SEGUNDOS */}
              <div className="bg-amber-400/10 backdrop-blur-md border border-amber-400/30 rounded-2xl p-3 sm:p-4 text-center shadow-inner">
                <span
                  key={timeLeft.seconds}
                  className="block text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-amber-300 tabular-nums animate-digit-pulse"
                >
                  {timeLeft.seconds}
                </span>
                <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-amber-200/80">
                  Seg
                </span>
              </div>
            </div>
          </div>

          {/* BOTÓN CTA */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (onCtaClick) {
                  onCtaClick('#catalogo');
                } else {
                  const el = document.getElementById('catalogo');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="btn-tactile inline-flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 rounded-full text-xs sm:text-sm font-semibold tracking-wide shadow-md hover:shadow-xl transition-all active:scale-[0.98]"
            >
              <span>{settings.button_text || 'Ver colección'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* COLUMNA DERECHA: Tarjetas Horizontales de Arreglos Destacados (~42% en desktop) */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="flex items-center justify-between pb-1 border-b border-white/10">
            <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
              Selección Especial
            </span>
            <span className="text-[11px] text-amber-400 font-medium">
              {featuredProducts.length} diseños destacados
            </span>
          </div>

          <div className="space-y-3">
            {featuredProducts.map((prod) => {
              const finalPrice = prod.promotional_price || prod.price;
              const hasPromo = !!prod.promotional_price && prod.promotional_price < prod.price;

              return (
                <div
                  key={prod.id}
                  onClick={() => onProductClick && onProductClick(prod)}
                  className="group relative flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 hover:border-amber-400/40 transition-all duration-300 backdrop-blur-md cursor-pointer shadow-sm hover:shadow-md"
                >
                  {/* Foto del arreglo */}
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-neutral-800 shrink-0 border border-white/15">
                    <Image
                      src={prod.image_url}
                      alt={prod.name}
                      fill
                      sizes="80px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Datos del producto */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-amber-300 transition truncate">
                      {prod.name}
                    </h4>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                      {prod.description || 'Detalle floral exclusivo'}
                    </p>

                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-sm sm:text-base font-bold text-white tabular-nums">
                        S/ {finalPrice.toFixed(2)}
                      </span>
                      {hasPromo && (
                        <span className="text-xs text-neutral-500 line-through tabular-nums">
                          S/ {prod.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botón rápido Añadir */}
                  {onAddToCart && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(prod);
                      }}
                      className="w-9 h-9 rounded-xl bg-white/10 hover:bg-amber-400 hover:text-neutral-950 text-white flex items-center justify-center transition shrink-0 border border-white/15"
                      title="Añadir al carrito"
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
