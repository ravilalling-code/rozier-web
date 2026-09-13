'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Product, Category, Order, OrderStatus, StoreSettings } from '@/lib/types';
import { getCategories } from '@/lib/categories';
import { getStoreSettings } from '@/lib/settings';
import {
  MessageCircle,
  Heart,
  Calendar,
  Send,
  Sparkles,
  X,
  Store,
  ChevronRight,
  ShieldCheck,
  Truck,
  Flower2,
  Clock,
  ExternalLink,
  Lock,
  Search,
  Package,
  CheckCircle2,
  Hammer,
  Check,
  MapPin,
  Loader2,
  DollarSign,
  Copy,
  Download,
  QrCode,
} from 'lucide-react';
import { formatLocalDate } from '@/lib/format';
import ChatBot from '@/components/ChatBot';

const WHATSAPP_NUMBER = '51924257784';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('todos');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [dedication, setDedication] = useState('');

  // Estados de Rastreo de Pedido (Tracking)
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Modal QR de Pago Yape / Plin
  const [isYapeModalOpen, setIsYapeModalOpen] = useState(false);
  const [copiedYapePhone, setCopiedYapePhone] = useState(false);

  const handleCopyYapePhone = () => {
    navigator.clipboard.writeText('924257784');
    setCopiedYapePhone(true);
    setTimeout(() => setCopiedYapePhone(false), 2000);
  };

  // Ajustes de la tienda (Redes sociales y WhatsApp)
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    const fetchCatalogAndCategories = async () => {
      setLoading(true);
      try {
        const [prodsRes, catsData, settingsData] = await Promise.all([
          supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
          getCategories(),
          getStoreSettings(),
        ]);

        if (!prodsRes.error && prodsRes.data) {
          setProducts(prodsRes.data as Product[]);
        }
        setCategories(catsData);
        if (settingsData) {
          setStoreSettings(settingsData);
        }
      } catch (err) {
        console.error('Error cargando catálogo:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogAndCategories();

    // Soportar lectura directa por URL (?track=CODIGO)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const trackParam = params.get('track');
      if (trackParam) {
        const cleanTrack = trackParam.trim().toUpperCase();
        setTrackingInput(cleanTrack);
        setIsTrackingModalOpen(true);
        lookupTrackingOrder(cleanTrack);
      }
    }
  }, []);

  // Función para consultar estado del pedido en tiempo real
  const lookupTrackingOrder = async (codeToSearch: string) => {
    const clean = codeToSearch.trim().toUpperCase();
    if (!clean) return;

    setTrackingLoading(true);
    setTrackingError(null);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customers(*)')
        .ilike('tracking_code', clean)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setTrackingOrder(null);
        setTrackingError(
          `No encontramos ningún pedido registrado con el código "${clean}". Por favor verifica el número o escríbenos por WhatsApp.`
        );
      } else {
        setTrackingOrder(data as Order);
      }
    } catch (err: any) {
      console.error('Error consultando pedido por tracking:', err);
      setTrackingError('Ocurrió un error al consultar el pedido. Intenta nuevamente.');
    } finally {
      setTrackingLoading(false);
    }
  };

  // Píldoras de categorías dinámicas: sólo aquellas con productos activos en Supabase
  const activeCategories = categories.filter((cat) =>
    products.some(
      (p) => (p.category || '').toLowerCase().trim() === cat.slug.toLowerCase().trim()
    )
  );

  const filteredProducts =
    category === 'todos'
      ? products
      : products.filter(
          (p) => (p.category || '').toLowerCase().trim() === category.toLowerCase().trim()
        );

  const handleSendWhatsApp = () => {
    if (!selectedProduct) return;

    const finalPrice = selectedProduct.promotional_price || selectedProduct.price;
    const lines = [
      `¡Hola *PETALIA*! 🌸 Deseo realizar este pedido:`,
      ``,
      `📦 *Arreglo:* ${selectedProduct.name}`,
      `💰 *Precio:* S/ ${finalPrice.toFixed(2)}`,
      deliveryDate
        ? `📅 *Fecha de entrega:* ${formatLocalDate(deliveryDate)}`
        : `📅 *Fecha de entrega:* Lo antes posible / Hoy`,
      dedication.trim()
        ? `✍️ *Dedicatoria:* "${dedication.trim()}"`
        : `✍️ *Dedicatoria:* Sin dedicatoria por ahora`,
      ``,
      `¿Tienen disponibilidad y número de Yape/Plin para confirmar? ✨`,
    ];

    const message = encodeURIComponent(lines.join('\n'));
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-stone-50/70 text-stone-800 font-sans pb-24 selection:bg-rose-100 selection:text-rose-900">
      {/* Top Banner de Confianza */}
      <div className="bg-neutral-900 text-neutral-300 text-[11px] py-1.5 px-4 text-center tracking-wide font-medium flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Atención directa por WhatsApp • Envíos a domicilio en Lima y Callao</span>
      </div>

      {/* Header Fijo con Identidad PETALIA */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src={storeSettings?.logo_url || '/images/logo.jpg'}
              alt="PETALIA Diseño Floral"
              className="h-11 sm:h-12 w-auto object-contain rounded-xl transition transform group-hover:scale-102 shadow-xs"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/logo.jpg';
              }}
            />
          </Link>

          <div className="flex items-center gap-2">
            {/* Botón de Rastreo de Pedido */}
            <button
              onClick={() => {
                setTrackingError(null);
                setIsTrackingModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 border border-stone-200"
              title="Rastrear estado de pedido en vivo"
            >
              <Truck className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Rastrea tu pedido</span>
              <span className="sm:hidden">Rastrear</span>
            </button>

            {/* Botón Ver QR Yape / Plin */}
            <button
              onClick={() => setIsYapeModalOpen(true)}
              className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 border border-purple-200"
              title="Ver QR y datos para pagar con Yape o Plin"
            >
              <QrCode className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">Pagar con Yape</span>
              <span className="sm:hidden">Yape</span>
            </button>

            {/* Botón WhatsApp de Atención Directa */}
            <a
              href={`https://wa.me/${storeSettings?.whatsapp_number || WHATSAPP_NUMBER}?text=${encodeURIComponent(
                '¡Hola PETALIA! Deseo realizar una consulta sobre flores y pedidos 🌸'
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <MessageCircle className="w-4 h-4 fill-white/20" />
              <span>WhatsApp</span>
            </a>

            {/* Acceso Administrativo Elegante */}
            <Link
              href="/admin/login"
              className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-full transition"
              title="Panel Administrativo"
              aria-label="Acceso al Panel Administrativo"
            >
              <Lock className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Pestañas Dinámicas de Categoría desde Supabase con productos activos */}
        <div className="border-t border-stone-100">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex gap-2 overflow-x-auto no-scrollbar text-xs">
            {/* Pestaña "Todos" */}
            <button
              onClick={() => setCategory('todos')}
              className={`px-4 py-1.5 rounded-full whitespace-nowrap font-medium transition-all ${
                category === 'todos'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Todos
            </button>

            {/* Pestañas Dinámicas conectadas a public.categories con productos activos */}
            {activeCategories.map((tab) => {
              const isActive = category.toLowerCase() === tab.slug.toLowerCase();
              return (
                <button
                  key={tab.id}
                  onClick={() => setCategory(tab.slug)}
                  className={`px-4 py-1.5 rounded-full whitespace-nowrap font-medium transition-all ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Hero / Promesa de Valor */}
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-2">
        <div className="bg-gradient-to-r from-rose-50 to-stone-100 border border-rose-100/80 rounded-3xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-rose-600 font-semibold text-xs tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Flores frescas & acabados premium</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900">
              Sorprende con momentos inolvidables
            </h2>
            <p className="text-xs text-stone-600">
              Elige tu arreglo favorito y personaliza tu dedicatoria en un clic por WhatsApp.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1 text-right text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-stone-700" /> Envíos puntuales
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Yape / Plin 100% seguro
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Productos Mobile-First */}
      <main className="max-w-5xl mx-auto px-4 pt-3">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium text-stone-500">Cargando catálogo floral...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-stone-200/80 p-8 shadow-xs">
            <Flower2 className="w-10 h-10 text-stone-300 mx-auto" />
            <h3 className="text-sm font-semibold text-stone-800">No hay arreglos en esta categoría</h3>
            <p className="text-xs text-stone-500">
              Explora otras categorías o consúltanos directamente por WhatsApp.
            </p>
            <button
              onClick={() => setCategory('todos')}
              className="text-xs text-rose-600 font-medium hover:underline pt-1 inline-block"
            >
              Ver todos los arreglos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((product) => {
              const hasPromo =
                product.promotional_price !== null && product.promotional_price > 0;
              const finalPrice = hasPromo ? product.promotional_price! : product.price;

              // Obtener el nombre legible de la categoría para el badge
              const catObj = categories.find(
                (c) => c.slug.toLowerCase() === (product.category || '').toLowerCase()
              );
              const catBadgeName = catObj ? catObj.name : product.category;

              return (
                <div
                  key={product.id}
                  onClick={() => {
                    setSelectedProduct(product);
                    setDeliveryDate('');
                    setDedication('');
                  }}
                  className="group bg-white rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden flex flex-col cursor-pointer transition transform active:scale-98 hover:shadow-md hover:border-stone-300"
                >
                  {/* Foto Cuadrada en Alta Definición */}
                  <div className="relative aspect-square w-full bg-stone-100 overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      loading="lazy"
                    />

                    {hasPromo && (
                      <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm tracking-wide">
                        OFERTA
                      </span>
                    )}

                    <span className="absolute bottom-2 right-2 bg-stone-900/70 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-full capitalize">
                      {catBadgeName}
                    </span>
                  </div>

                  {/* Detalle del Arreglo */}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h3 className="font-semibold text-xs sm:text-sm text-stone-900 line-clamp-1 group-hover:text-rose-600 transition">
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                        {product.description || 'Detalle floral exclusivo'}
                      </p>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm sm:text-base font-bold text-stone-900 font-mono">
                          S/ {finalPrice.toFixed(2)}
                        </span>
                        {hasPromo && (
                          <span className="text-[11px] text-stone-400 line-through font-mono">
                            S/ {product.price.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 flex items-center">
                        Pedir <ChevronRight className="w-3 h-3 ml-0.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Interactivo "Ordenar Detalle" */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-stone-900">Personaliza tu Pedido</h3>
                <p className="text-xs text-stone-500">
                  Listo para enviar a nuestro WhatsApp oficial
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Arreglo Preview */}
            <div className="flex gap-3.5 items-center bg-stone-50 p-3 rounded-2xl border border-stone-100">
              <img
                src={selectedProduct.image_url}
                alt={selectedProduct.name}
                className="w-16 h-16 rounded-xl object-cover border border-stone-200"
              />
              <div className="flex-1">
                <h4 className="font-bold text-sm text-stone-900 line-clamp-1">
                  {selectedProduct.name}
                </h4>
                <p className="text-[11px] text-stone-500 line-clamp-1">
                  {selectedProduct.description || 'Diseño floral artesanal'}
                </p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-rose-600 font-bold text-base font-mono">
                    S/{' '}
                    {(selectedProduct.promotional_price || selectedProduct.price).toFixed(2)}
                  </span>
                  {selectedProduct.promotional_price && (
                    <span className="text-xs text-stone-400 line-through font-mono">
                      S/ {selectedProduct.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Formulario de Pedido */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  📅 Fecha de entrega deseada
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl p-2.5 text-sm outline-none focus:border-stone-900 transition bg-white"
                />
                <div className="flex gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setDeliveryDate(today);
                    }}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition"
                  >
                    Hoy mismo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      setDeliveryDate(tomorrow.toISOString().split('T')[0]);
                    }}
                    className="text-[11px] px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition"
                  >
                    Mañana
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  ✍️ Dedicatoria personalizada para la tarjeta
                </label>
                <textarea
                  rows={3}
                  value={dedication}
                  onChange={(e) => setDedication(e.target.value)}
                  placeholder="Ej: Para el amor de mi vida, feliz aniversario. ¡Te amo con todo mi corazón!"
                  className="w-full border border-stone-300 rounded-xl p-2.5 text-sm outline-none focus:border-stone-900 transition resize-none bg-white placeholder-stone-400"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Incluye tarjeta impresa de alta calidad sin costo adicional.
                </p>
              </div>
              {/* Sección Métodos de Pago: Yape / Plin */}
              <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    Y
                  </div>
                  <div>
                    <p className="text-xs font-bold text-purple-950">Pago 100% Seguro con Yape / Plin</p>
                    <p className="text-[11px] text-purple-700">Aceptamos transferencias y billeteras digitales</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsYapeModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Ver QR</span>
                </button>
              </div>
            </div>

            {/* Botón WhatsApp Prominente */}
            <button
              onClick={handleSendWhatsApp}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold py-3.5 rounded-2xl shadow-lg shadow-emerald-700/20 transition active:scale-98 flex items-center justify-center gap-2.5 text-sm"
            >
              <MessageCircle className="w-5 h-5 fill-white/20" />
              <span>Pedir por WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* Botón Flotante Permanente de WhatsApp (Ubicado ARRIBA de la burbuja de la Asesora Virtual para no taparse) */}
      <a
        href={`https://wa.me/${storeSettings?.whatsapp_number || WHATSAPP_NUMBER}?text=${encodeURIComponent(
          '¡Hola PETALIA! Deseo realizar una consulta sobre un arreglo floral 🌸'
        )}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-24 right-5 z-40 bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center transition transform hover:scale-105 active:scale-95 group shadow-emerald-950/20 border border-emerald-500/40"
        title="Consultar al WhatsApp de PETALIA"
      >
        <MessageCircle className="w-6 h-6 fill-white/20" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-semibold pl-0 group-hover:pl-2">
          WhatsApp Taller
        </span>
      </a>

      {/* Asistente Virtual Inteligente (Chatbot IA - Esquina inferior derecha) */}
      <ChatBot />

      {/* MODAL: Rastreo de Pedido en Tiempo Real */}
      {isTrackingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Rastrea tu Pedido</h3>
                  <p className="text-xs text-stone-500">
                    Sigue en vivo la preparación y despacho de tus flores
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTrackingModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-800 rounded-xl hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Buscador de Código */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                lookupTrackingOrder(trackingInput);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
                  placeholder="Ingresa tu código (ej: PET-8492)"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 font-mono uppercase placeholder:font-sans focus:outline-none focus:border-stone-800 focus:bg-white transition"
                />
              </div>
              <button
                type="submit"
                disabled={trackingLoading || !trackingInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {trackingLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Buscar</span>
                )}
              </button>
            </form>

            {/* Mensaje de Error */}
            {trackingError && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-700 space-y-1">
                <p className="font-semibold">No se encontró el pedido</p>
                <p className="text-[11px]">{trackingError}</p>
                <div className="pt-2">
                  <a
                    href={`https://wa.me/${storeSettings?.whatsapp_number || WHATSAPP_NUMBER}?text=${encodeURIComponent(
                      `¡Hola PETALIA! Deseo consultar sobre mi código de pedido: ${trackingInput}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline text-[11px]"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Consultar por WhatsApp con una asesora</span>
                  </a>
                </div>
              </div>
            )}

            {/* Resultados y Línea de Tiempo del Pedido */}
            {trackingOrder && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Código y Estado Destacado */}
                <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">
                      Código de Seguimiento
                    </span>
                    <p className="text-lg font-bold font-mono text-stone-900">
                      {trackingOrder.tracking_code || 'PET-TALLER'}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Fecha programada: {formatLocalDate(trackingOrder.delivery_date)}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100/80 text-rose-800 border border-rose-200 self-start sm:self-auto">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                    <span className="capitalize">
                      {trackingOrder.status === 'en_taller' ? 'En Preparación' : trackingOrder.status}
                    </span>
                  </div>
                </div>

                {/* LÍNEA DE TIEMPO VISUAL (5 ETAPAS) */}
                <div className="bg-white border border-stone-200/80 rounded-2xl p-4 space-y-4 shadow-xs">
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Línea de Tiempo del Arreglo
                  </h4>

                  {(() => {
                    const normStatus = (trackingOrder.status || 'pendiente').toLowerCase();
                    const getRank = (st: string) => {
                      if (st === 'pendiente') return 1;
                      if (st === 'confirmado') return 2;
                      if (st === 'en_preparacion' || st === 'en_taller') return 3;
                      if (st === 'en_despacho') return 4;
                      if (st === 'entregado') return 5;
                      return 1;
                    };
                    const currentRank = getRank(normStatus);

                    const stages = [
                      { rank: 1, label: 'Recibido', desc: 'Pedido registrado' },
                      { rank: 2, label: 'Confirmado', desc: 'Pago validado' },
                      { rank: 3, label: 'En Preparación', desc: 'Taller floral' },
                      { rank: 4, label: 'En Despacho', desc: 'Chofer en camino' },
                      { rank: 5, label: 'Entregado', desc: 'Entrega exitosa' },
                    ];

                    return (
                      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-stone-200">
                        {stages.map((st) => {
                          const isCompleted = currentRank > st.rank;
                          const isCurrent = currentRank === st.rank;
                          const isPending = currentRank < st.rank;

                          return (
                            <div key={st.rank} className="relative flex items-start gap-3">
                              {/* Icono de Etapa */}
                              <div
                                className={`absolute -left-6 top-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition ${
                                  isCompleted
                                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-50'
                                    : isCurrent
                                    ? 'bg-rose-600 text-white ring-4 ring-rose-100 animate-pulse'
                                    : 'bg-stone-200 text-stone-500'
                                }`}
                              >
                                {isCompleted ? (
                                  <Check className="w-3 h-3 stroke-[3]" />
                                ) : (
                                  <span>{st.rank}</span>
                                )}
                              </div>

                              <div>
                                <p
                                  className={`text-xs font-bold leading-none ${
                                    isCurrent
                                      ? 'text-rose-600'
                                      : isCompleted
                                      ? 'text-stone-900'
                                      : 'text-stone-400'
                                  }`}
                                >
                                  {st.label}
                                </p>
                                <p className="text-[11px] text-stone-500 mt-1">{st.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Resumen del Arreglo y Destinatario */}
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-2 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-stone-500">Destinatario:</span>
                    <span className="font-semibold text-stone-900">
                      {trackingOrder.recipient_name?.split('[Comprador:')[0].split('(Cel:')[0].trim() || 'Cliente'}
                    </span>
                  </div>

                  {trackingOrder.delivery_address && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-stone-500">Destino:</span>
                      <span className="font-medium text-stone-800 text-right truncate max-w-[200px]">
                        {trackingOrder.delivery_address}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline pt-1 border-t border-stone-200/60">
                    <span className="text-stone-500">Total del pedido:</span>
                    <span className="font-bold text-stone-900 font-mono text-sm">
                      S/ {Number(trackingOrder.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Botón WhatsApp para consultas sobre este pedido */}
                <a
                  href={`https://wa.me/${storeSettings?.whatsapp_number || WHATSAPP_NUMBER}?text=${encodeURIComponent(
                    `¡Hola PETALIA! 🌸 Deseo consultar sobre el estado de mi pedido con código ${trackingOrder.tracking_code || 'PET-TALLER'}.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-xs"
                >
                  <MessageCircle className="w-4 h-4 fill-white/20" />
                  <span>Consultar por WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: QR de Pago Oficial Yape / Plin */}
      {isYapeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-stone-800">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg shadow-xs">
                  Y
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">QR Oficial Yape / Plin</h3>
                  <p className="text-xs text-stone-500">PETALIA • Florería y Arreglos</p>
                </div>
              </div>
              <button
                onClick={() => setIsYapeModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-800 rounded-xl hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Imagen del QR Yape */}
            <div className="flex flex-col items-center bg-purple-50/50 p-4 rounded-2xl border border-purple-100 shadow-inner">
              <img
                src={storeSettings?.yape_qr_url || '/images/qr-yape.png'}
                alt="Código QR de Yape PETALIA"
                className="w-56 h-56 object-contain rounded-xl shadow-xs bg-white p-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/qr-yape.png';
                }}
              />
              <p className="text-xs text-purple-900 font-semibold mt-2.5 text-center">
                Escanea desde tu app Yape o Plin sin comisión
              </p>
            </div>

            {/* Número Copiable con 1 Clic */}
            <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-stone-500 block">Número de celular Yape / Plin:</span>
                <span className="font-mono font-bold text-stone-900 text-sm tracking-wider">
                  924 257 784
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyYapePhone}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-xs transition active:scale-95"
                title="Copiar número"
              >
                {copiedYapePhone ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {/* Botón de Descarga Directa del QR */}
            <a
              href={storeSettings?.yape_qr_url || '/images/qr-yape.png'}
              download="qr-yape-petalia.png"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold py-3 rounded-2xl text-xs shadow-md transition active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Descargar QR en mi celular</span>
            </a>

            <p className="text-[11px] text-center text-stone-400">
              Luego de realizar tu pago, envía la captura por WhatsApp para agilizar el despacho 🌸
            </p>
          </div>
        </div>
      )}

      {/* Footer Minimalista con Redes Sociales Conectadas */}
      <footer className="mt-16 border-t border-stone-200 bg-white py-10 px-4 text-center text-xs text-stone-500 space-y-4">
        {/* Redes Sociales Dinámicas */}
        <div className="flex items-center justify-center gap-4 text-stone-600">
          {storeSettings?.instagram_url && (
            <a
              href={storeSettings.instagram_url}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-full bg-stone-100 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center transition"
              title="Instagram de PETALIA"
            >
              <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          )}

          {storeSettings?.facebook_url && (
            <a
              href={storeSettings.facebook_url}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-full bg-stone-100 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition"
              title="Facebook de PETALIA"
            >
              <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.667 5H18V0h-3.808C10.592 0 9 1.583 9 4.615V8z" />
              </svg>
            </a>
          )}

          {storeSettings?.tiktok_url && (
            <a
              href={storeSettings.tiktok_url}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-900 hover:text-white flex items-center justify-center transition"
              title="TikTok de PETALIA"
            >
              <svg className="w-4 h-4 fill-currentColor" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01v8.12c0 1.34-.33 2.69-.99 3.86-.96 1.7-2.6 2.94-4.52 3.44-1.39.37-2.88.33-4.24-.13-2.02-.68-3.69-2.19-4.57-4.14-.88-1.94-.85-4.22.09-6.14.93-1.92 2.62-3.4 4.65-4.08 1.19-.4 2.47-.49 3.71-.3v4.13c-.63-.16-1.3-.17-1.93-.03-.98.21-1.84.82-2.35 1.68-.52.86-.64 1.91-.34 2.88.3 1 .98 1.83 1.89 2.29.91.46 1.98.53 2.94.19.96-.34 1.71-1.12 2.06-2.09.21-.59.3-1.22.3-1.85V.02z" />
              </svg>
            </a>
          )}

          <a
            href={`https://wa.me/${storeSettings?.whatsapp_number || WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noreferrer"
            className="w-9 h-9 rounded-full bg-stone-100 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition"
            title="WhatsApp de PETALIA"
          >
            <MessageCircle className="w-4 h-4 fill-currentColor" />
          </a>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="font-bold tracking-tight text-stone-800 text-sm">PETALIA</span>
          <span>•</span>
          <span>Diseño Floral & Decoraciones</span>
        </div>
        <p className="text-[11px] text-stone-400">
          Taller floral en Lima, Perú • Pedidos y delivery coordinados por WhatsApp: +{storeSettings?.whatsapp_number || WHATSAPP_NUMBER}
        </p>
      </footer>
    </div>
  );
}
