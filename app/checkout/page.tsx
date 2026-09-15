'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CartItem, DeliveryZone, OrderStatus, SpecialAddon } from '@/lib/types';
import { getDeliveryZones, DEFAULT_DELIVERY_ZONES } from '@/lib/delivery';
import { getStoreSettings } from '@/lib/settings';
import { getSpecialAddons } from '@/lib/addons';
import {
  DEFAULT_WHATSAPP_NUMBER,
  createWhatsAppLink,
  generateOrderWhatsAppMessage,
} from '@/lib/whatsapp';
import { formatLocalDate } from '@/lib/format';
import {
  ShoppingBag,
  Truck,
  Calendar,
  CreditCard,
  MessageCircle,
  ArrowLeft,
  CheckCircle2,
  Gift,
  ShieldCheck,
  Heart,
  Loader2,
  Trash2,
} from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();

  // Carrito
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);

  // Delivery Zones
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(DEFAULT_DELIVERY_ZONES);
  const [selectedDistrict, setSelectedDistrict] = useState('Miraflores');
  const [deliveryFee, setDeliveryFee] = useState(12);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('Tarde (2:00 PM - 6:00 PM)');

  // Formulario
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [dedicationMessage, setDedicationMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'yape' | 'plin' | 'transferencia' | 'efectivo'>('yape');
  const [whatsappNumber, setWhatsappNumber] = useState(DEFAULT_WHATSAPP_NUMBER);

  const [submitting, setSubmitting] = useState(false);

  // Cargar carrito y zonas
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('rozier_cart') || localStorage.getItem('petalia_cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCart(false);
    }

    // Cargar tarifas activas y configuración
    Promise.all([getDeliveryZones(false), getStoreSettings()]).then(([zones, settings]) => {
      if (zones && zones.length > 0) {
        setDeliveryZones(zones);
        const defaultZone =
          zones.find((z) => z.district.toLowerCase() === 'miraflores') || zones[0];
        setSelectedDistrict(defaultZone.district);
        setDeliveryFee(defaultZone.cost);
      }
      if (settings?.whatsapp_number) {
        setWhatsappNumber(settings.whatsapp_number);
      }
    });

    // Fecha sugerida por defecto: hoy
    const today = new Date().toISOString().split('T')[0];
    setDeliveryDate(today);
  }, []);

  // Totales
  const cartSubtotal = cart.reduce((acc, item) => {
    const price = item.product.promotional_price || item.product.price;
    return acc + price * item.quantity;
  }, 0);

  const totalToPay = cartSubtotal + deliveryFee;

  // Manejar cambio de distrito
  const handleDistrictChange = (dist: string) => {
    setSelectedDistrict(dist);
    const found = deliveryZones.find((z) => z.district === dist);
    if (found) {
      setDeliveryFee(found.cost);
    }
  };

  // Registrar pedido
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Tu carrito de compras está vacío.');
      return;
    }
    if (!buyerName.trim() || !buyerPhone.trim()) {
      alert('Por favor ingresa tu nombre y número de WhatsApp.');
      return;
    }
    if (!recipientName.trim() || !deliveryAddress.trim() || !deliveryDate) {
      alert('Por favor completa los datos de entrega (destinatario, dirección y fecha).');
      return;
    }

    setSubmitting(true);
    try {
      const cleanPhone = buyerPhone.replace(/\D/g, '');
      const trackingCode = `PET-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Vincular o crear cliente
      let customerId: string | null = null;
      try {
        const { data: existingCust } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (existingCust) {
          customerId = existingCust.id;
        } else {
          const { data: newCust } = await supabase
            .from('customers')
            .insert([
              {
                full_name: buyerName.trim(),
                phone: cleanPhone,
                notes: 'Registrado desde página de Checkout',
              },
            ])
            .select('id')
            .single();
          if (newCust) customerId = newCust.id;
        }
      } catch (cErr) {
        console.warn('Error cliente:', cErr);
      }

      // 2. Resumen de items
      const itemsSummary = cart.map((i) => `${i.product.name} (x${i.quantity})`).join(', ');

      const formattedDedication = `[Arreglos: ${itemsSummary}] [Comprador: ${buyerName.trim()} | Cel: ${cleanPhone}] ${
        dedicationMessage.trim() || 'Sin dedicatoria'
      }`;

      // 3. Insertar orden en Supabase
      const orderPayload: Record<string, any> = {
        customer_id: customerId,
        customer_name: buyerName.trim(),
        customer_phone: cleanPhone,
        total_amount: totalToPay,
        payment_method: paymentMethod.toLowerCase(),
        status: 'en_preparacion' as OrderStatus,
        delivery_date: deliveryDate,
        recipient_name: recipientName.trim(),
        delivery_address: `${deliveryAddress.trim()}, ${selectedDistrict}`,
        delivery_district: selectedDistrict,
        delivery_cost: deliveryFee,
        delivery_time_slot: selectedTimeSlot,
        dedication_message: formattedDedication,
        tracking_code: trackingCode,
      };

      let { error: insertErr } = await supabase.from('orders').insert([orderPayload]);

      if (insertErr && insertErr.code === 'PGRST204') {
        delete orderPayload.customer_name;
        delete orderPayload.customer_phone;
        await supabase.from('orders').insert([orderPayload]);
      }

      // 4. Mensaje estructurado oficial para WhatsApp
      const trackingUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/?track=${trackingCode}`
        : `https://rozier-web.vercel.app/?track=${trackingCode}`;

      const waMessage = generateOrderWhatsAppMessage({
        trackingCode,
        customerName: buyerName.trim(),
        customerPhone: cleanPhone,
        products: cart.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          price: i.product.promotional_price || i.product.price,
        })),
        recipientName: recipientName.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryDistrict: selectedDistrict,
        deliveryDate: deliveryDate,
        deliveryTimeSlot: selectedTimeSlot,
        totalAmount: totalToPay,
        paymentMethod,
        dedicationMessage: dedicationMessage.trim(),
        trackingUrl,
      });

      const whatsappUrl = createWhatsAppLink(whatsappNumber, waMessage);

      // Limpiar carrito local
      localStorage.removeItem('rozier_cart');
      localStorage.removeItem('petalia_cart');

      // Redirigir a success con el código
      router.push(`/checkout/success?code=${trackingCode}`);
      // Abrir WhatsApp en nueva pestaña
      window.open(whatsappUrl, '_blank');
    } catch (err: any) {
      console.error('Error registrando pedido:', err);
      alert('Ocurrió un error al registrar el pedido: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCart) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-rose-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-warm-100 p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-ink-900">Tu carrito está vacío</h1>
          <p className="text-xs text-warm-600">
            Explora nuestra colección floral y selecciona el diseño perfecto para iniciar tu compra.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-ink-900 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-xl text-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ver Catálogo Floral</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-rose-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-warm-600 hover:text-ink-900 transition"
          >
            <ArrowLeft className="w-4 h-4 text-rose-600" />
            <span>Volver a la Floristería</span>
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 bg-rose-100 px-3 py-1 rounded-full border border-rose-200">
            Checkout Seguro ROZIER
          </span>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Formulario de Entrega y Pago */}
          <div className="lg:col-span-7 space-y-5">
            {/* Paso 1: Datos del Comprador */}
            <div className="bg-white rounded-2xl border border-warm-100 p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs">
                  1
                </span>
                <span>Tus Datos de Contacto</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">Tu Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="ej: Rodrigo Mendoza"
                    className="w-full border border-warm-200 rounded-xl px-3 py-2 text-xs text-ink-900 focus:outline-none focus:border-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">Teléfono o WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="ej: 924 257 784"
                    className="w-full border border-warm-200 rounded-xl px-3 py-2 text-xs text-ink-900 focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>
            </div>

            {/* Paso 2: Datos del Destinatario y Entrega */}
            <div className="bg-white rounded-2xl border border-warm-100 p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs">
                  2
                </span>
                <span>Destinatario y Lugar de Entrega</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">Nombre de quien recibe *</label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="ej: María Elena Torres (o para mí)"
                    className="w-full border border-warm-200 rounded-xl px-3 py-2 text-xs text-ink-900 focus:outline-none focus:border-rose-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Distrito de Entrega (Lima) *
                    </label>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      className="w-full border border-warm-200 rounded-xl px-3 py-2 text-xs text-ink-900 font-medium focus:outline-none focus:border-rose-600 bg-white"
                    >
                      {deliveryZones.map((z) => (
                        <option key={z.id} value={z.district}>
                          {z.district} — S/ {Number(z.cost).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">Fecha de Entrega *</label>
                    <input
                      type="date"
                      required
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full border border-warm-200 rounded-xl px-3 py-2 text-xs text-ink-900 focus:outline-none focus:border-rose-600 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Dirección exacta y referencia *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="ej: Av. Larco 743, Dpto 502 (frente al parque)"
                    className="w-full border border-warm-200 rounded-xl px-3 py-2 text-xs text-ink-900 focus:outline-none focus:border-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">Franja Horaria *</label>
                  <select
                    value={selectedTimeSlot}
                    onChange={(e) => setSelectedTimeSlot(e.target.value)}
                    className="w-full border border-warm-200 rounded-xl px-3 py-2 text-xs text-ink-900 font-medium focus:outline-none focus:border-rose-600 bg-white"
                  >
                    <option value="Mañana (9:00 AM - 1:00 PM)">Mañana (9:00 AM - 1:00 PM)</option>
                    <option value="Tarde (2:00 PM - 6:00 PM)">Tarde (2:00 PM - 6:00 PM)</option>
                    <option value="Noche (6:00 PM - 9:00 PM)">Noche (6:00 PM - 9:00 PM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1">
                    Dedicatoria para la Tarjeta de Cortesía (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={dedicationMessage}
                    onChange={(e) => setDedicationMessage(e.target.value)}
                    placeholder="Escribe el mensaje que imprimiremos en la tarjeta de alta floristería..."
                    className="w-full border border-warm-200 rounded-xl p-3 text-xs text-ink-900 focus:outline-none focus:border-rose-600 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Paso 3: Método de Pago */}
            <div className="bg-white rounded-2xl border border-warm-100 p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-ink-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs">
                  3
                </span>
                <span>Método de Pago</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'yape', label: 'Yape' },
                  { id: 'plin', label: 'Plin' },
                  { id: 'transferencia', label: 'Transferencia' },
                  { id: 'efectivo', label: 'Contraentrega' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition ${
                      paymentMethod === m.id
                        ? 'border-rose-600 bg-rose-50 text-rose-700 ring-1 ring-rose-500'
                        : 'border-warm-200 bg-white text-ink-900 hover:bg-warm-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Resumen de Compra Dinámico */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-3xl border border-warm-100 p-5 sm:p-6 shadow-lg space-y-4 sticky top-6">
              <h3 className="text-base font-serif font-bold text-ink-900 border-b border-warm-100 pb-3">
                Resumen de tu Pedido
              </h3>

              {/* Lista de arreglos */}
              <div className="divide-y divide-warm-100 max-h-60 overflow-y-auto pr-1">
                {cart.map((item) => {
                  const price = item.product.promotional_price || item.product.price;
                  return (
                    <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={item.product.image_url || '/images/logo web.jpg'}
                          alt={item.product.name}
                          className="w-12 h-12 rounded-xl object-cover border border-warm-100 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/logo web.jpg';
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink-900 truncate">{item.product.name}</p>
                          <p className="text-[11px] text-warm-500">Cantidad: {item.quantity}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-ink-900 shrink-0 tabular-nums">
                        S/ {(price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Cálculos Dinámicos */}
              <div className="space-y-2 pt-2 border-t border-warm-100 text-xs">
                <div className="flex justify-between items-center text-warm-600">
                  <span>Subtotal arreglos:</span>
                  <span className="font-semibold text-ink-900 tabular-nums">
                    S/ {cartSubtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-warm-600">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-rose-600" />
                    Flete de envío ({selectedDistrict}):
                  </span>
                  <span className="font-bold text-ink-900 tabular-nums">
                    S/ {deliveryFee.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-warm-200 text-base">
                  <span className="font-bold text-ink-900">Total a pagar:</span>
                  <span className="font-bold text-xl text-rose-600 font-mono tabular-nums">
                    S/ {totalToPay.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Botón de Confirmación y Derivación a WhatsApp */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold py-4 px-4 rounded-2xl shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 text-sm sm:text-base transition-all transform hover:scale-[1.01] active:scale-[0.99] border border-emerald-400/30 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Procesando reserva...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5 fill-current opacity-90" />
                    <span>Enviar Comprobante a WhatsApp</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-warm-500 text-center leading-relaxed">
                Al confirmar tu pedido, serás derivado al chat oficial de ROZIER (<strong>51924257784</strong>) para validar el comprobante e iniciar la preparación inmediata.
              </p>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
