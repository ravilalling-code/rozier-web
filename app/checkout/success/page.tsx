'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getStoreSettings } from '@/lib/settings';
import {
  DEFAULT_WHATSAPP_NUMBER,
  createWhatsAppLink,
  generateOrderWhatsAppMessage,
} from '@/lib/whatsapp';
import { Order } from '@/lib/types';
import {
  CheckCircle2,
  Copy,
  MessageCircle,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Calendar,
  MapPin,
  Heart,
  Loader2,
} from 'lucide-react';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code');
  const orderIdParam = searchParams.get('order_id');

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_WHATSAPP_NUMBER);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadOrderAndSettings() {
      try {
        // Cargar store_settings con fallback oficial a 51924257784
        const settings = await getStoreSettings();
        if (settings?.whatsapp_number) {
          setWhatsappNumber(settings.whatsapp_number);
        }

        // Buscar orden si se proporcionó código o id
        if (codeParam || orderIdParam) {
          let query = supabase.from('orders').select('*');
          if (codeParam) {
            query = query.eq('tracking_code', codeParam);
          } else if (orderIdParam) {
            query = query.eq('id', orderIdParam);
          }
          const { data, error } = await query.maybeSingle();
          if (!error && data) {
            setOrder(data as Order);
          }
        }
      } catch (err) {
        console.error('Error cargando confirmación de pedido:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOrderAndSettings();
  }, [codeParam, orderIdParam]);

  const trackingCode = order?.tracking_code || codeParam || 'ROZ-ORDEN';
  const recipient = order?.recipient_name || 'Destinatario Registrado';
  const address = order?.delivery_address || 'Dirección de Entrega Registrada';
  const district = order?.delivery_district || '';
  const totalAmount = order?.total_amount ? Number(order.total_amount) : 0;
  const paymentMethod = order?.payment_method || 'Yape / Plin';
  const dedication = order?.dedication_message || 'Sin dedicatoria';
  const deliveryDate = order?.delivery_date || undefined;

  // Extraer toques especiales y productos florales si existen
  const extraItems = order?.extra_items && Array.isArray(order.extra_items)
    ? order.extra_items
    : undefined;

  // Extraer nombre del producto si fue registrado en dedicatoria compuesta o campo
  let productName = 'Diseño Floral Exclusivo ROZIER';
  if (order?.dedication_message && order.dedication_message.includes('[Arreglos:')) {
    const match = order.dedication_message.match(/\[Arreglos:\s*([^\]]+)\]/);
    if (match && match[1]) {
      productName = match[1];
    }
  }

  // Generar mensaje oficial con los 5 puntos solicitados
  const whatsappMessage = generateOrderWhatsAppMessage({
    trackingCode,
    customerName: order?.customer_name || undefined,
    customerPhone: order?.customer_phone || undefined,
    productName,
    recipientName: recipient,
    deliveryAddress: address,
    deliveryDistrict: district,
    deliveryDate,
    totalAmount,
    paymentMethod,
    dedicationMessage: dedication,
    extraItems,
    trackingUrl: typeof window !== 'undefined' ? `${window.location.origin}/?track=${trackingCode}` : undefined,
  });

  const whatsappUrl = createWhatsAppLink(whatsappNumber, whatsappMessage);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-warm-600">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
        <p className="text-sm">Cargando detalles de tu pedido...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 animate-in fade-in zoom-in-95 duration-300">
      {/* Tarjeta Principal de Confirmación */}
      <div className="bg-white rounded-3xl border border-warm-100 p-6 sm:p-8 shadow-xl shadow-rose-950/5 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto ring-8 ring-rose-50 border border-rose-200">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-rose-600 tracking-wider uppercase bg-rose-50 px-3 py-1 rounded-full border border-rose-200/60">
            Reserva Registrada Exitosamente
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-ink-900 tracking-tight">
            ¡Gracias por tu compra en ROZIER!
          </h1>
          <p className="text-xs sm:text-sm text-warm-600 max-w-md mx-auto">
            Tus flores frescas de autor están reservadas. Para validar el comprobante y programar la preparación de inmediato, por favor contacta a nuestro WhatsApp oficial.
          </p>
        </div>

        {/* Bloque Destacado de Código de Orden */}
        <div className="bg-rose-50/70 border border-warm-100 rounded-2xl p-5 space-y-3">
          <span className="text-[11px] font-semibold text-warm-500 uppercase tracking-wider block">
            Código Único de Orden
          </span>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl sm:text-3xl font-bold tabular-nums text-ink-900 tracking-wide font-mono">
              {trackingCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-xl bg-white border border-warm-200 hover:bg-rose-100 text-warm-600 hover:text-ink-900 transition-all shadow-xs"
              title="Copiar código de orden"
              aria-label="Copiar código"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {copied && (
            <span className="text-[11px] font-semibold text-emerald-600 block animate-in fade-in">
              ¡Código copiado al portapapeles!
            </span>
          )}
          {totalAmount > 0 && (
            <p className="text-xs text-warm-600 pt-1 border-t border-rose-100">
              Monto Total: <strong className="text-ink-900 font-bold tabular-nums">S/ {totalAmount.toFixed(2)}</strong> ({paymentMethod.toUpperCase()})
            </p>
          )}
        </div>

        {/* Resumen Compacto del Pedido */}
        <div className="text-left bg-warm-50/60 rounded-2xl p-4 sm:p-5 border border-warm-100 space-y-3 text-xs text-warm-700">
          <h3 className="font-semibold text-ink-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            Detalles Registrados
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="flex items-start gap-2">
              <Heart className="w-3.5 h-3.5 text-warm-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-warm-500 block text-[10px] uppercase">Destinatario</span>
                <span className="font-medium text-ink-900">{recipient}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-warm-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-warm-500 block text-[10px] uppercase">Dirección / Distrito</span>
                <span className="font-medium text-ink-900">
                  {address} {district ? `(${district})` : ''}
                </span>
              </div>
            </div>
            {deliveryDate && (
              <div className="flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 text-warm-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-warm-500 block text-[10px] uppercase">Fecha de Entrega</span>
                  <span className="font-medium text-ink-900">{deliveryDate}</span>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <ShoppingBag className="w-3.5 h-3.5 text-warm-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-warm-500 block text-[10px] uppercase">Diseño & Toques</span>
                <span className="font-medium text-ink-900 truncate block max-w-[200px]" title={productName}>
                  {productName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTÓN PRINCIPAL: Enviar Comprobante a WhatsApp */}
        <div className="space-y-3 pt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2.5 text-sm sm:text-base transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.99] border border-emerald-400/30 group"
          >
            <MessageCircle className="w-5 h-5 fill-current opacity-90 transition-transform group-hover:rotate-6" />
            <span>Enviar Comprobante a WhatsApp</span>
          </a>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/?track=${trackingCode}`}
              className="w-full sm:w-auto text-xs font-semibold py-2.5 px-4 rounded-xl border border-warm-200 bg-white hover:bg-rose-50 text-ink-900 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Ver Rastreo en Vivo</span>
              <ArrowRight className="w-3.5 h-3.5 text-rose-600" />
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto text-xs font-medium py-2.5 px-4 rounded-xl text-warm-600 hover:text-ink-900 transition-colors"
            >
              Volver a la Floristería
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-rose-50 flex items-center justify-center py-12 px-4 sm:px-6">
      <Suspense
        fallback={
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-warm-600">
            <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
            <p className="text-sm">Cargando...</p>
          </div>
        }
      >
        <CheckoutSuccessContent />
      </Suspense>
    </main>
  );
}
