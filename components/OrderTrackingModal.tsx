'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Order } from '@/lib/types';
import { formatLocalDate } from '@/lib/format';
import { DEFAULT_WHATSAPP_NUMBER, createWhatsAppLink } from '@/lib/whatsapp';
import {
  Truck,
  Search,
  X,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  Flower2,
  ShieldCheck,
  MapPin,
  Calendar,
  Heart,
  MessageCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
  whatsappNumber?: string;
}

export default function OrderTrackingModal({
  isOpen,
  onClose,
  initialCode = '',
  whatsappNumber = DEFAULT_WHATSAPP_NUMBER,
}: OrderTrackingModalProps) {
  const [trackingInput, setTrackingInput] = useState(initialCode);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Consultar orden en Supabase por código o ID
  const fetchOrder = async (codeToSearch: string) => {
    const cleanCode = codeToSearch.trim().toUpperCase();
    if (!cleanCode) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Buscar por tracking_code
      let { data, error: err } = await supabase
        .from('orders')
        .select('*')
        .ilike('tracking_code', cleanCode)
        .maybeSingle();

      // 2. Si no se encontró, buscar por ID o código de orden alternativo
      if (!data) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(cleanCode)) {
          const res = await supabase.from('orders').select('*').eq('id', cleanCode).maybeSingle();
          data = res.data;
          err = res.error;
        }
      }

      if (err) throw err;

      if (!data) {
        setError(`No encontramos ningún pedido con el código "${cleanCode}". Verifica el código en tu confirmación o contacta a una asesora.`);
        setOrder(null);
      } else {
        setOrder(data as Order);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error buscando orden:', err);
      setError('Ocurrió un inconveniente al consultar el estado. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialCode) {
        setTrackingInput(initialCode);
        fetchOrder(initialCode);
      }
    } else {
      setError(null);
      setCopied(false);
    }
  }, [isOpen, initialCode]);

  if (!isOpen) return null;

  // Copiar código de seguimiento
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Mapeo del Stepper Visual a las 4 etapas solicitadas:
  // "Confirmado" ➔ "En Taller Floral" ➔ "En Ruta de Entrega" ➔ "Entregado"
  const getStageRank = (status?: string): number => {
    const s = (status || 'pendiente').toLowerCase();
    if (s === 'pendiente' || s === 'confirmado') return 1;
    if (s === 'en_preparacion' || s === 'en_taller') return 2;
    if (s === 'en_despacho' || s === 'en_ruta') return 3;
    if (s === 'entregado') return 4;
    return 1;
  };

  const currentRank = getStageRank(order?.status);

  const stages = [
    { rank: 1, title: 'Confirmado', desc: 'Reserva validada', icon: ShieldCheck },
    { rank: 2, title: 'En Taller Floral', desc: 'Arreglo en preparación', icon: Flower2 },
    { rank: 3, title: 'En Ruta de Entrega', desc: 'Chofer asignado', icon: Truck },
    { rank: 4, title: 'Entregado', desc: 'Recibido con amor', icon: Heart },
  ];

  const currentCode = order?.tracking_code || trackingInput;
  const progressPercent = currentRank === 1 ? 0 : ((currentRank - 1) / 3) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      {/* Toast Notification Flotante */}
      {copied && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-60 bg-ink-900/95 text-amber-300 border border-amber-400/40 px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top-3">
          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
          <span>¡Código de seguimiento copiado al portapapeles!</span>
        </div>
      )}

      {/* Contenedor Modal con Estilo Glassmorphism de Lujo */}
      <div className="relative w-full max-w-lg bg-white/95 sm:bg-white/90 backdrop-blur-xl border border-amber-200/60 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-rose-950/20 text-ink-900 space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Glow dorado sutil de fondo */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-rose-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-warm-200/70 pb-3.5 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400/20 to-rose-400/20 border border-amber-400/40 text-amber-600 flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-amber-700 tracking-wider uppercase block">
                ROZIER Concierge Tracking
              </span>
              <h2 className="text-lg font-serif font-bold text-ink-900 tracking-tight">
                Rastreo de Arreglo Floral
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-warm-500 hover:text-ink-900 hover:bg-rose-100/70 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador de Código */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchOrder(trackingInput);
          }}
          className="flex gap-2 relative"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-500" />
            <input
              type="text"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
              placeholder="Ingresa tu código (ej: PET-8492)"
              className="w-full bg-rose-50/70 border border-warm-200/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-ink-900 font-mono uppercase placeholder:font-sans placeholder:text-warm-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !trackingInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-ink-900 hover:bg-rose-600 text-white font-semibold text-xs transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Buscar</span>}
          </button>
        </form>

        {/* Mensaje de Error */}
        {error && (
          <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-800 space-y-1.5 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-semibold text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Aviso de consulta</span>
            </div>
            <p className="text-[11px] text-warm-600 pl-5">{error}</p>
            <div className="pl-5 pt-1">
              <a
                href={createWhatsAppLink(
                  whatsappNumber,
                  `¡Hola ROZIER! 🌸 Deseo consultar sobre el estado de mi código de pedido: ${trackingInput}`
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-amber-700 hover:text-amber-800 text-[11px] underline"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Consultar por WhatsApp con una asesora</span>
              </a>
            </div>
          </div>
        )}

        {/* Resultados del Pedido */}
        {order && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Tarjeta Glassmorphism de Código con Botón Copiar */}
            <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-amber-500/10 border border-amber-300/40 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 block">
                  Código de Seguimiento Oficial
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xl font-bold font-mono text-ink-900 tracking-wide">
                    {order.tracking_code || trackingInput}
                  </span>
                  <button
                    onClick={() => handleCopyCode(order.tracking_code || trackingInput)}
                    className="p-1.5 rounded-lg bg-white/80 border border-amber-300/60 hover:bg-white text-amber-800 transition shadow-2xs"
                    title="Copiar código de seguimiento"
                    aria-label="Copiar código de seguimiento"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 border border-amber-300/70 text-amber-900 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="capitalize">
                  {stages.find((s) => s.rank === currentRank)?.title || order.status}
                </span>
              </div>
            </div>

            {/* STEPPER VISUAL MODERNO DE 4 ETAPAS */}
            <div className="bg-white/80 border border-warm-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-ink-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Estado Actual del Pedido</span>
                </h3>
                <span className="text-[10px] text-warm-500 font-mono">Actualizado en vivo</span>
              </div>

              {/* Barra y Pasos */}
              <div className="relative py-3 px-1 overflow-hidden">
                {/* Línea conectora base */}
                <div className="absolute top-7 sm:top-8 left-6 right-6 h-1 bg-warm-200/80 -translate-y-1/2 z-0 rounded-full" />

                {/* Línea conectora activa dorada */}
                <div
                  className="absolute top-7 sm:top-8 left-6 h-1 bg-gradient-to-r from-amber-400 to-amber-600 -translate-y-1/2 z-0 rounded-full transition-all duration-500 ease-out shadow-xs"
                  style={{
                    width: `calc(${progressPercent}% - ${progressPercent > 0 ? '12px' : '0px'})`,
                  }}
                />

                {/* 4 Pasos del Stepper */}
                <div className="relative z-10 flex items-start justify-between w-full">
                  {stages.map((st) => {
                    const isCompleted = currentRank > st.rank;
                    const isCurrent = currentRank === st.rank;
                    const IconComp = st.icon;

                    return (
                      <div
                        key={st.rank}
                        className="flex flex-col items-center text-center flex-1 min-w-0 px-1"
                      >
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
                            isCompleted
                              ? 'bg-ink-900 text-white shadow-xs'
                              : isCurrent
                              ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-ink-900 ring-4 ring-amber-100 shadow-md font-bold scale-105'
                              : 'bg-warm-100 text-warm-400'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <IconComp className="w-4 h-4" />
                          )}
                        </div>
                        <span
                          className={`mt-2 text-[10px] sm:text-xs font-semibold leading-tight line-clamp-1 ${
                            isCurrent
                              ? 'text-amber-700 font-bold'
                              : isCompleted
                              ? 'text-ink-900'
                              : 'text-warm-400'
                          }`}
                        >
                          {st.title}
                        </span>
                        <span className="hidden sm:block text-[9px] text-warm-500 mt-0.5 truncate max-w-full">
                          {st.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Resumen de Destinatario, Fecha y Distrito */}
            <div className="bg-rose-50/60 border border-warm-200/80 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-warm-500 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  Destinatario:
                </span>
                <span className="font-semibold text-ink-900 text-right">
                  {order.recipient_name?.split('[Comprador:')[0].split('(Cel:')[0].trim() || 'Cliente Registrado'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-warm-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  Fecha Programada:
                </span>
                <span className="font-semibold text-ink-900">
                  {order.delivery_date ? formatLocalDate(order.delivery_date) : 'Por coordinar'}
                  {order.delivery_time_slot ? ` (${order.delivery_time_slot})` : ''}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-warm-500 flex items-center gap-1.5 shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  Distrito y Destino:
                </span>
                <span className="font-medium text-ink-900 text-right truncate max-w-[230px]">
                  {order.delivery_district ? `${order.delivery_district} — ` : ''}
                  {order.delivery_address || 'Lima Metropolitana'}
                </span>
              </div>

              {order.total_amount && (
                <div className="flex items-center justify-between pt-2 border-t border-warm-200/80">
                  <span className="text-warm-500">Monto Total:</span>
                  <span className="font-bold text-ink-900 tabular-nums">
                    S/ {Number(order.total_amount).toFixed(2)} ({order.payment_method?.toUpperCase() || 'PAGO'})
                  </span>
                </div>
              )}
            </div>

            {/* Botón WhatsApp de Atención para este Pedido */}
            <a
              href={createWhatsAppLink(
                whatsappNumber,
                `¡Hola ROZIER! 🌸 Deseo consultar detalles sobre la entrega de mi pedido con código ${currentCode}.`
              )}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition duration-200"
            >
              <MessageCircle className="w-4 h-4 fill-current opacity-90" />
              <span>Consultar por WhatsApp con una Asesora</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
