'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Product, Category, Order, OrderStatus, StoreSettings, CartItem } from '@/lib/types';
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
  Check,
  MapPin,
  Loader2,
  DollarSign,
  Copy,
  Download,
  QrCode,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  CreditCard,
  ShoppingBag,
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
  const [modalQuantity, setModalQuantity] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [dedication, setDedication] = useState('');

  // Carrito de compras Multi-producto
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Formulario de Checkout Unificado
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [checkoutDeliveryDate, setCheckoutDeliveryDate] = useState('');
  const [checkoutDedication, setCheckoutDedication] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'yape' | 'plin' | 'transferencia' | 'efectivo'>('yape');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderSuccessData, setOrderSuccessData] = useState<{
    trackingCode: string;
    total: number;
    itemsSummary: string;
    whatsappUrl: string;
  } | null>(null);

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

  // 1. Cargar catálogo y recuperar carrito de LocalStorage al montar
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

    // Recuperar carrito persistente
    try {
      const savedCart = localStorage.getItem('petalia_cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      }
    } catch (e) {
      console.warn('Error al cargar carrito persistente:', e);
    }

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

  // 2. Persistir carrito en LocalStorage al cambiar
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      localStorage.setItem('petalia_cart', JSON.stringify(newCart));
    } catch (e) {
      console.warn('Error guardando carrito en localStorage:', e);
    }
  };

  // Funciones del Carrito
  const addToCart = (product: Product, quantity: number = 1) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    let updated: CartItem[];
    if (existingIndex > -1) {
      updated = [...cart];
      updated[existingIndex].quantity += quantity;
    } else {
      updated = [...cart, { product, quantity }];
    }
    saveCart(updated);
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    const updated = cart
      .map((item) => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];
    saveCart(updated);
  };

  const removeFromCart = (productId: string) => {
    const updated = cart.filter((item) => item.product.id !== productId);
    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  // Totales calculados del carrito
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => {
    const price = item.product.promotional_price || item.product.price;
    return sum + price * item.quantity;
  }, 0);

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

  // Enviar pedido consolidado a Supabase y generar comprobante WhatsApp
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!buyerName.trim() || !buyerPhone.trim()) {
      alert('Por favor ingresa tu nombre y número de teléfono o WhatsApp.');
      return;
    }
    if (!recipientName.trim() || !deliveryAddress.trim() || !checkoutDeliveryDate) {
      alert('Por favor completa los datos de entrega (destinatario, dirección y fecha).');
      return;
    }

    setIsSubmittingOrder(true);

    try {
      const cleanPhone = buyerPhone.replace(/\D/g, '');
      const trackingCode = `PET-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Crear o asociar cliente en Supabase
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
                notes: 'Cliente registrado desde tienda web (Carrito)',
              },
            ])
            .select()
            .single();
          if (newCust) customerId = newCust.id;
        }
      } catch (cErr) {
        console.warn('Advertencia vinculando cliente:', cErr);
      }

      // 2. Resumen consolidado de productos
      const itemsSummary = cart
        .map((i) => `${i.product.name} (x${i.quantity})`)
        .join(', ');

      const formattedDedication = `[Arreglos: ${itemsSummary}] [Comprador: ${buyerName.trim()} | Cel: ${cleanPhone}] ${
        checkoutDedication.trim() || 'Sin dedicatoria'
      }`;

      // 3. Insertar orden consolidada en public.orders
      const orderPayload: Record<string, any> = {
        customer_id: customerId,
        total_amount: cartSubtotal,
        payment_method: paymentMethod.toLowerCase(),
        status: 'en_preparacion' as OrderStatus,
        delivery_date: checkoutDeliveryDate,
        recipient_name: recipientName.trim(),
        delivery_address: deliveryAddress.trim(),
        dedication_message: formattedDedication,
        tracking_code: trackingCode,
      };

      // Intentar insertar con columnas enriquecidas si existen
      let { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            ...orderPayload,
            customer_name: buyerName.trim(),
            customer_phone: cleanPhone,
          },
        ])
        .select()
        .single();

      if (orderError && orderError.code === 'PGRST204') {
        // Fallback a columnas base de la tabla orders
        const retry = await supabase.from('orders').insert([orderPayload]).select().single();
        orderData = retry.data;
        orderError = retry.error;
      }

      if (orderError) throw orderError;

      // 4. Construir mensaje preformateado de WhatsApp
      const trackingLink = `https://petalia-web.vercel.app/?track=${trackingCode}`;
      const waLines = [
        `¡Hola *PETALIA*! 🌸 Acabo de registrar mi pedido en la tienda:`,
        ``,
        `🏷️ *Código de Pedido:* ${trackingCode}`,
        `📦 *Arreglos seleccionados:*`,
        ...cart.map(
          (i) =>
            `  • ${i.product.name} x${i.quantity} - S/ ${(
              (i.product.promotional_price || i.product.price) * i.quantity
            ).toFixed(2)}`
        ),
        ``,
        `💰 *Total a pagar:* S/ ${cartSubtotal.toFixed(2)}`,
        `💳 *Método de pago:* ${paymentMethod.toUpperCase()}`,
        `👤 *Destinatario:* ${recipientName.trim()}`,
        `📍 *Dirección de entrega:* ${deliveryAddress.trim()}`,
        `📅 *Fecha de entrega:* ${formatLocalDate(checkoutDeliveryDate)}`,
        checkoutDedication.trim()
          ? `✍️ *Dedicatoria:* "${checkoutDedication.trim()}"`
          : `✍️ *Dedicatoria:* Sin dedicatoria por ahora`,
        ``,
        `🔍 *Rastreo en vivo:* ${trackingLink}`,
        ``,
        paymentMethod === 'yape' || paymentMethod === 'plin'
          ? `Adjunto por este medio mi comprobante de pago para que inicien la preparación. ¡Muchas gracias! ✨`
          : `Por favor confírmenme la recepción del pedido para coordinar. ¡Muchas gracias! ✨`,
      ];

      const whatsappUrl = `https://wa.me/${storeSettings?.whatsapp_number || WHATSAPP_NUMBER}?text=${encodeURIComponent(
        waLines.join('\n')
      )}`;

      // 5. Guardar datos de éxito y limpiar carrito
      setOrderSuccessData({
        trackingCode,
        total: cartSubtotal,
        itemsSummary,
        whatsappUrl,
      });

      clearCart();
    } catch (err: any) {
      console.error('Error al registrar pedido consolidado:', err);
      alert('Ocurrió un error al procesar tu pedido: ' + (err.message || err));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-50 text-ink-900 font-sans pb-28 selection:bg-rose-500 selection:text-ink-900">
      {/* Top Banner de Confianza - Alta Gama */}
      <div className="bg-ink-950 text-rose-100 text-[11px] py-2 px-4 text-center tracking-wide font-medium flex items-center justify-center gap-2 border-b border-ink-900">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-rose-pulse" />
        <span>Diseño Floral de Alta Gama • Envíos a Domicilio Exclusivos en Lima y Callao</span>
      </div>

      {/* Header Fijo con Identidad PETALIA & Palo Rosa */}
      <header className="sticky top-0 z-30 bg-rose-50/95 backdrop-blur-md border-b border-warm-100 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src={storeSettings?.logo_url || '/images/logo.jpg'}
              alt="PETALIA Diseño Floral"
              className="h-11 sm:h-12 w-auto object-contain rounded-xl transition transform group-hover:scale-102 shadow-2xs border border-warm-100"
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
              className="flex items-center gap-1.5 bg-rose-100 hover:bg-rose-50 text-warm-500 hover:text-ink-900 px-3.5 py-1.5 rounded-full text-xs font-semibold transition active:scale-[0.98] border border-warm-100"
              title="Rastrear estado de pedido en vivo"
            >
              <Truck className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Rastrea tu pedido</span>
              <span className="sm:hidden">Rastrear</span>
            </button>

            {/* BOTÓN DEL CARRITO DE COMPRAS CON BADGE DINÁMICO */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1.5 bg-rose-100 hover:bg-rose-50 text-ink-900 px-3.5 py-1.5 rounded-full text-xs font-semibold transition active:scale-[0.98] border border-rose-500/60 shadow-2xs"
              title="Ver carrito de compras"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Carrito</span>
              {totalCartItems > 0 && (
                <span className="bg-accent-carmine text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                  {totalCartItems}
                </span>
              )}
            </button>

            {/* Botón WhatsApp de Atención Directa */}
            <a
              href={`https://wa.me/${storeSettings?.whatsapp_number || WHATSAPP_NUMBER}?text=${encodeURIComponent(
                '¡Hola PETALIA! Deseo realizar una consulta sobre flores y pedidos 🌸'
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 px-4 py-1.5 rounded-full text-xs font-semibold shadow-xs border border-ink-900 hover:border-rose-600 transition active:scale-[0.98]"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current opacity-80" />
              <span>WhatsApp</span>
            </a>

            {/* Acceso Administrativo Elegante */}
            <Link
              href="/admin/login"
              className="p-2 text-warm-500 hover:text-ink-900 hover:bg-rose-100 rounded-full transition"
              title="Panel Administrativo"
              aria-label="Acceso al Panel Administrativo"
            >
              <Lock className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Pestañas de Categoría (Pills de Navegación Palo Rosa) */}
        <div className="border-t border-warm-100">
          <div className="max-w-6xl mx-auto px-4 py-2.5 flex gap-2 overflow-x-auto no-scrollbar text-xs">
            {/* Pestaña "Todos" */}
            <button
              onClick={() => setCategory('todos')}
              className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-all ${
                category === 'todos'
                  ? 'bg-rose-500 text-ink-900 font-semibold shadow-xs border border-rose-600'
                  : 'bg-rose-100 text-warm-500 border border-warm-100 hover:bg-rose-50 hover:text-ink-900 font-medium'
              }`}
            >
              Todos los Diseños
            </button>

            {/* Pestañas Dinámicas conectadas a public.categories */}
            {activeCategories.map((tab) => {
              const isActive = category.toLowerCase() === tab.slug.toLowerCase();
              return (
                <button
                  key={tab.id}
                  onClick={() => setCategory(tab.slug)}
                  className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-rose-500 text-ink-900 font-semibold shadow-xs border border-rose-600'
                      : 'bg-rose-100 text-warm-500 border border-warm-100 hover:bg-rose-50 hover:text-ink-900 font-medium'
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Catálogo de Productos - Grilla 2 Cols Móvil & 4 Cols Desktop */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-warm-500 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
            <p className="text-xs font-medium">Cargando la colección floral exclusiva de PETALIA...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-warm-100 p-8 space-y-3 shadow-xs">
            <Flower2 className="w-12 h-12 text-rose-600 mx-auto stroke-1" />
            <p className="text-sm font-bold text-ink-900">
              No hay arreglos disponibles en esta categoría.
            </p>
            <p className="text-xs text-warm-500">
              Explora otras colecciones o consúltanos directamente por WhatsApp.
            </p>
            <button
              onClick={() => setCategory('todos')}
              className="text-xs text-rose-600 font-semibold hover:underline pt-1 inline-block"
            >
              Ver todos los arreglos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
            {filteredProducts.map((product) => {
              const hasPromo =
                product.promotional_price !== null && product.promotional_price > 0;
              const finalPrice = hasPromo ? product.promotional_price! : product.price;

              // Obtener el nombre legible de la categoría para el badge
              const catObj = categories.find(
                (c) => c.slug.toLowerCase() === (product.category || '').toLowerCase()
              );
              const catBadgeName = catObj ? catObj.name : product.category;

              // Comprobar si el producto ya está en el carrito
              const cartItem = cart.find((i) => i.product.id === product.id);

              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl border border-warm-100 shadow-xs hover:shadow-rose overflow-hidden flex flex-col transition hover:border-rose-600/60"
                >
                  {/* Foto Cuadrada en Alta Definición con Zoom Suave */}
                  <div
                    onClick={() => {
                      setSelectedProduct(product);
                      setModalQuantity(1);
                      setDeliveryDate('');
                      setDedication('');
                    }}
                    className="relative aspect-square w-full bg-rose-100 overflow-hidden cursor-pointer rounded-t-2xl"
                  >
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      loading="lazy"
                    />

                    {/* Insignia Oferta */}
                    {hasPromo && (
                      <span className="absolute top-2.5 left-2.5 bg-rose-100 text-accent-carmine border border-accent-carmine/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                        OFERTA
                      </span>
                    )}

                    {/* Insignia Categoría */}
                    <span className="absolute bottom-2.5 right-2.5 bg-ink-900/80 backdrop-blur-md text-rose-50 text-[10px] font-semibold tracking-wider px-2.5 py-0.5 rounded-full uppercase">
                      {catBadgeName}
                    </span>
                  </div>

                  {/* Detalle del Arreglo Floral */}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5">
                    <div
                      onClick={() => {
                        setSelectedProduct(product);
                        setModalQuantity(1);
                        setDeliveryDate('');
                        setDedication('');
                      }}
                      className="cursor-pointer"
                    >
                      <h3 className="font-bold text-xs sm:text-sm text-ink-900 line-clamp-1 group-hover:text-rose-600 transition tracking-tight">
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-warm-500 line-clamp-1 mt-0.5">
                        {product.description || 'Detalle floral exclusivo'}
                      </p>
                    </div>

                    {/* Jerarquía de Precios */}
                    <div className="flex items-baseline justify-between pt-0.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm sm:text-base font-bold text-ink-900 font-mono">
                          S/ {finalPrice.toFixed(2)}
                        </span>
                        {hasPromo && (
                          <span className="text-xs text-warm-300 line-through font-mono">
                            S/ {product.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* BOTÓN PRINCIPAL Y SELECTOR DE CANTIDAD */}
                    <div className="pt-1 border-t border-warm-100">
                      {cartItem ? (
                        <div className="flex items-center justify-between bg-rose-100 border border-rose-500 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCartQuantity(product.id, -1);
                            }}
                            className="w-7 h-7 rounded-lg bg-white text-ink-900 hover:bg-rose-50 flex items-center justify-center transition shadow-2xs border border-warm-100"
                            title="Disminuir"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-ink-900 font-mono px-2">
                            {cartItem.quantity} en carrito
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCartQuantity(product.id, 1);
                            }}
                            className="w-7 h-7 rounded-lg bg-ink-900 text-white hover:bg-rose-600 flex items-center justify-center transition shadow-2xs"
                            title="Aumentar"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product, 1);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 py-2 px-3 rounded-xl text-xs font-semibold shadow-xs border border-ink-900 hover:border-rose-600 transition active:scale-[0.98]"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Agregar al carrito</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL: Vista Previa y Personalización de Producto */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto border border-warm-100">
            <div className="flex justify-between items-center border-b border-warm-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-ink-900 tracking-tight">{selectedProduct.name}</h3>
                <p className="text-xs text-warm-500">
                  {selectedProduct.category ? `Colección: ${selectedProduct.category}` : 'Florería Petalia'}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 rounded-full text-warm-500 hover:text-ink-900 hover:bg-rose-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Arreglo Preview */}
            <div className="flex gap-3.5 items-center bg-rose-50 p-3 rounded-2xl border border-warm-100">
              <img
                src={selectedProduct.image_url}
                alt={selectedProduct.name}
                className="w-20 h-20 rounded-2xl object-cover border border-warm-100 shadow-2xs"
              />
              <div className="flex-1">
                <p className="text-xs text-warm-500">
                  {selectedProduct.description || 'Diseño floral artesanal con flores frescas de primera calidad'}
                </p>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-ink-900 font-bold text-lg font-mono">
                    S/{' '}
                    {(selectedProduct.promotional_price || selectedProduct.price).toFixed(2)}
                  </span>
                  {selectedProduct.promotional_price && (
                    <span className="text-xs text-warm-300 line-through font-mono">
                      S/ {selectedProduct.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Selector de Cantidad */}
            <div className="bg-rose-100 p-3.5 rounded-2xl border border-warm-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">Cantidad deseada:</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalQuantity((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-xl bg-white border border-warm-100 text-ink-900 hover:bg-rose-50 flex items-center justify-center font-bold"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold font-mono text-ink-900 w-6 text-center">
                  {modalQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setModalQuantity((prev) => prev + 1)}
                  className="w-8 h-8 rounded-xl bg-ink-900 text-white hover:bg-rose-600 flex items-center justify-center font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  addToCart(selectedProduct, modalQuantity);
                  setSelectedProduct(null);
                  setIsCartOpen(true);
                }}
                className="w-full bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 font-semibold py-3.5 rounded-xl shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 text-xs border border-ink-900 hover:border-rose-600"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>
                  Agregar al Carrito • S/{' '}
                  {(
                    (selectedProduct.promotional_price || selectedProduct.price) * modalQuantity
                  ).toFixed(2)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  addToCart(selectedProduct, modalQuantity);
                  setSelectedProduct(null);
                  setIsCheckoutModalOpen(true);
                }}
                className="w-full bg-rose-500 hover:bg-rose-600 text-ink-900 font-bold py-3.5 rounded-xl shadow-xs transition active:scale-[0.98] flex items-center justify-center gap-2 text-xs border border-rose-600"
              >
                <ArrowRight className="w-4 h-4 text-ink-900" />
                <span>Comprar Ahora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER LATERAL: Carrito de Compras */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-warm-100">
            {/* Header del Carrito */}
            <div className="p-4 sm:p-5 border-b border-warm-100 flex items-center justify-between bg-rose-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center border border-warm-100">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-ink-900 tracking-tight">Tu Carrito Floral</h3>
                  <p className="text-[11px] text-warm-500">
                    {totalCartItems} {totalCartItems === 1 ? 'producto seleccionado' : 'productos seleccionados'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-warm-500 hover:text-ink-900 hover:bg-rose-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Carrito (Scroll) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 border border-warm-100">
                    <Flower2 className="w-8 h-8 stroke-1" />
                  </div>
                  <div>
                    <p className="font-bold text-ink-900 text-sm">Tu carrito está vacío</p>
                    <p className="text-xs text-warm-500 mt-1 max-w-xs">
                      Explora nuestros ramos, boxes y detalles florales para sorprender a quien más quieres.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-ink-900 hover:bg-rose-600 text-white text-xs font-semibold shadow hover:text-ink-900 transition active:scale-[0.98]"
                  >
                    Ver Colección Floral
                  </button>
                </div>
              ) : (
                cart.map((item) => {
                  const finalPrice = item.product.promotional_price || item.product.price;
                  const itemTotal = finalPrice * item.quantity;
                  return (
                    <div
                      key={item.product.id}
                      className="bg-rose-50 border border-warm-100 rounded-2xl p-3 flex gap-3 items-center hover:border-rose-500/60 transition"
                    >
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-16 h-16 rounded-xl object-cover border border-warm-100 shadow-2xs shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-ink-900 truncate tracking-tight">
                          {item.product.name}
                        </h4>
                        <p className="text-[11px] text-warm-500 font-mono mt-0.5">
                          S/ {finalPrice.toFixed(2)} c/u
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center border border-warm-100 bg-white rounded-lg">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, -1)}
                              className="p-1 hover:bg-rose-100 text-ink-900 rounded-l-lg"
                              title="Disminuir"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold font-mono px-2 text-ink-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, 1)}
                              className="p-1 hover:bg-rose-100 text-ink-900 rounded-r-lg"
                              title="Aumentar"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-warm-500 hover:text-accent-carmine p-1 transition"
                            title="Eliminar del carrito"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold font-mono text-sm text-ink-900 block">
                          S/ {itemTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer con Subtotal y Checkout */}
            {cart.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-warm-100 bg-rose-50 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-warm-500">
                    <span>Subtotal de arreglos:</span>
                    <span className="font-mono font-semibold text-ink-900">
                      S/ {cartSubtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-warm-500">
                    <span>Envío:</span>
                    <span className="text-ink-900 font-semibold">Coordinado por WhatsApp</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-warm-100 text-sm">
                    <span className="font-bold text-ink-900">Total a pagar:</span>
                    <span className="font-bold font-mono text-lg text-ink-900">
                      S/ {cartSubtotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutModalOpen(true);
                    }}
                    className="w-full bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 font-semibold py-3.5 rounded-xl shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2 text-xs sm:text-sm border border-ink-900 hover:border-rose-600"
                  >
                    <span>Continuar compra</span>
                    <ArrowRight className="w-4 h-4 text-rose-500" />
                  </button>

                  <button
                    onClick={clearCart}
                    className="w-full text-center text-[11px] text-warm-500 hover:text-ink-900 py-1 transition"
                  >
                    Vaciar carrito
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Checkout Unificado Multi-producto */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-warm-100 max-w-xl w-full rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto">
            {orderSuccessData ? (
              /* PANTALLA DE ÉXITO DE COMPRA */
              <div className="text-center space-y-4 py-4 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs border border-rose-500">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-ink-900 tracking-tight">
                    ¡Tu Pedido ha sido Registrado con Éxito! 🌸
                  </h3>
                  <p className="text-xs text-warm-500 mt-1">
                    Hemos reservado tus arreglos florales frescos en nuestro sistema.
                  </p>
                </div>

                {/* Tarjeta de Código de Rastreo */}
                <div className="bg-rose-50 border border-warm-100 rounded-2xl p-4 max-w-sm mx-auto space-y-2">
                  <span className="text-[11px] font-semibold text-warm-500 uppercase tracking-wider block">
                    Tu Código de Rastreo en Vivo
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-bold font-mono text-ink-900">
                      {orderSuccessData.trackingCode}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(orderSuccessData.trackingCode);
                        alert('¡Código de rastreo copiado!');
                      }}
                      className="p-1.5 rounded-lg bg-white border border-warm-100 hover:bg-rose-100 text-warm-500 transition"
                      title="Copiar código"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-warm-500">
                    Total del pedido: S/ {orderSuccessData.total.toFixed(2)}
                  </p>
                </div>

                {/* Botón WhatsApp para confirmación y envío de voucher */}
                <div className="space-y-2 pt-2 max-w-md mx-auto">
                  <a
                    href={orderSuccessData.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 font-semibold py-3.5 rounded-xl shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-2 text-xs sm:text-sm border border-ink-900 hover:border-rose-600"
                  >
                    <MessageCircle className="w-5 h-5 fill-current opacity-80" />
                    <span>Enviar Detalles y Comprobante por WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const code = orderSuccessData.trackingCode;
                      setOrderSuccessData(null);
                      setIsCheckoutModalOpen(false);
                      setTrackingInput(code);
                      setIsTrackingModalOpen(true);
                      lookupTrackingOrder(code);
                    }}
                    className="w-full py-2.5 rounded-xl border border-warm-100 bg-rose-100 hover:bg-rose-50 text-ink-900 text-xs font-semibold transition"
                  >
                    Ver Rastreo en Vivo
                  </button>
                </div>
              </div>
            ) : (
              /* FORMULARIO DE FINALIZACIÓN DE COMPRA */
              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-warm-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-ink-900 text-white flex items-center justify-center shadow-xs">
                      <CreditCard className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ink-900 tracking-tight">Finalizar Compra</h3>
                      <p className="text-xs text-warm-500">
                        {cart.length} {cart.length === 1 ? 'arreglo floral' : 'arreglos florales'} en tu pedido
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCheckoutModalOpen(false)}
                    className="p-1.5 text-warm-500 hover:text-ink-900 rounded-xl hover:bg-rose-100 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Resumen Compacto de Productos */}
                <div className="bg-rose-50 rounded-2xl p-3 border border-warm-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-ink-900">Resumen del Pedido:</span>
                    <span className="font-mono font-bold text-ink-900 text-sm">
                      Total: S/ {cartSubtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-[11px] text-warm-500 divide-y divide-warm-100">
                    {cart.map((item) => (
                      <div key={item.product.id} className="pt-1 first:pt-0 flex justify-between">
                        <span className="truncate max-w-[240px]">
                          • {item.product.name} (x{item.quantity})
                        </span>
                        <span className="font-mono font-medium text-ink-900">
                          S/{' '}
                          {(
                            (item.product.promotional_price || item.product.price) * item.quantity
                          ).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 1. Datos del Comprador */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                    1. Datos de Quien Compra
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-ink-900 mb-1">
                        Tu Nombre Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Ej. Carlos Mendoza"
                        className="w-full border border-warm-100 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-white text-ink-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-900 mb-1">
                        Tu WhatsApp / Celular *
                      </label>
                      <input
                        type="tel"
                        required
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="Ej. 987654321"
                        className="w-full border border-warm-100 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-white text-ink-900 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Datos de Entrega */}
                <div className="space-y-2 pt-1 border-t border-warm-100">
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                    2. Datos del Destinatario y Entrega
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-ink-900 mb-1">
                        Nombre de Quien Recibe *
                      </label>
                      <input
                        type="text"
                        required
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Ej. María López"
                        className="w-full border border-warm-100 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-white text-ink-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-900 mb-1">
                        Fecha de Entrega *
                      </label>
                      <input
                        type="date"
                        required
                        value={checkoutDeliveryDate}
                        onChange={(e) => setCheckoutDeliveryDate(e.target.value)}
                        className="w-full border border-warm-100 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-white text-ink-900"
                      />
                      <div className="flex gap-1.5 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date().toISOString().split('T')[0];
                            setCheckoutDeliveryDate(today);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 hover:bg-rose-50 text-ink-900 font-medium border border-warm-100 transition"
                        >
                          Hoy mismo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const tom = new Date();
                            tom.setDate(tom.getDate() + 1);
                            setCheckoutDeliveryDate(tom.toISOString().split('T')[0]);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 hover:bg-rose-50 text-ink-900 font-medium border border-warm-100 transition"
                        >
                          Mañana
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Dirección y Distrito de Entrega *
                    </label>
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Ej. Av. Larco 450, Miraflores (Dpto 402)"
                      className="w-full border border-warm-100 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-white text-ink-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Dedicatoria para la Tarjeta (Opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={checkoutDedication}
                      onChange={(e) => setCheckoutDedication(e.target.value)}
                      placeholder="Mensaje de amor, felicitación o cariño para adjuntar en la tarjeta..."
                      className="w-full border border-warm-100 rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 resize-none bg-white text-ink-900 placeholder-warm-300"
                    />
                    <p className="text-[10px] text-warm-500">
                      Incluye tarjeta de dedicatoria impresa de alta calidad de cortesía.
                    </p>
                  </div>
                </div>

                {/* 3. Selección de Método de Pago con QR de Yape integrado */}
                <div className="space-y-2 pt-1 border-t border-warm-100">
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                    3. Método de Pago
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'yape' as const, label: 'Yape / Plin', desc: 'Pago instantáneo' },
                      { id: 'transferencia' as const, label: 'Transferencia', desc: 'BCP / BBVA' },
                      { id: 'efectivo' as const, label: 'Efectivo', desc: 'Contra entrega' },
                    ].map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id)}
                        className={`p-2.5 rounded-2xl border text-left transition ${
                          paymentMethod === m.id
                            ? 'border-rose-600 bg-rose-100 ring-2 ring-rose-500/40'
                            : 'border-warm-100 hover:bg-rose-50'
                        }`}
                      >
                        <p className="font-bold text-xs text-ink-900">{m.label}</p>
                        <p className="text-[10px] text-warm-500">{m.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* QR de Yape interactivo si el cliente selecciona Yape / Plin */}
                  {(paymentMethod === 'yape' || paymentMethod === 'plin') && (
                    <div className="bg-rose-100 border border-rose-500 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in duration-200">
                      <div className="flex items-center gap-3">
                        <img
                          src={storeSettings?.yape_qr_url || '/images/qr-yape.png'}
                          alt="QR Yape Petalia"
                          className="w-20 h-20 rounded-xl object-contain bg-white p-1 border border-warm-100 shadow-2xs shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/qr-yape.png';
                          }}
                        />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-ink-900">
                            Paga S/ {cartSubtotal.toFixed(2)} escaneando el QR
                          </p>
                          <p className="text-[11px] text-warm-500">
                            Número: <span className="font-mono font-bold text-ink-900">924 257 784</span> (PETALIA)
                          </p>
                          <button
                            type="button"
                            onClick={handleCopyYapePhone}
                            className="inline-flex items-center gap-1 bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition active:scale-[0.98]"
                          >
                            {copiedYapePhone ? (
                              <>
                                <Check className="w-3 h-3 text-rose-500" />
                                <span>¡Número Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar número</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-warm-500">
                        Al confirmar tu orden, se abrirá WhatsApp con el resumen de tu compra para adjuntar la constancia de pago.
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'transferencia' && (
                    <div className="bg-rose-100 border border-warm-100 rounded-2xl p-3 text-xs text-ink-900 space-y-1">
                      <p className="font-bold">Cuentas bancarias oficiales de PETALIA:</p>
                      <p className="text-[11px] text-warm-500">
                        • BCP / BBVA / Interbank (coordinación inmediata de cuenta al confirmar por WhatsApp).
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'efectivo' && (
                    <div className="bg-rose-100 border border-warm-100 rounded-2xl p-3 text-xs text-ink-900 space-y-1">
                      <p className="font-bold">Pago en Efectivo:</p>
                      <p className="text-[11px] text-warm-500">
                        Se abona al momento de la entrega previa confirmación telefónica con nuestro chofer.
                      </p>
                    </div>
                  )}
                </div>

                {/* Botón Confirmar Compra */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="w-full bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 font-semibold py-3.5 rounded-xl shadow-lg border border-ink-900 hover:border-rose-600 transition active:scale-[0.98] flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
                  >
                    {isSubmittingOrder ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Procesando tu pedido...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-rose-500" />
                        <span>Confirmar Pedido (S/ {cartSubtotal.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE PERMANENTE DE WHATSAPP */}
      <a
        href={`https://wa.me/${storeSettings?.whatsapp_number || WHATSAPP_NUMBER}?text=${encodeURIComponent(
          '¡Hola PETALIA! Deseo realizar una consulta sobre un arreglo floral 🌸'
        )}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-24 right-5 z-40 bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 p-3.5 rounded-full shadow-2xl flex items-center justify-center transition transform hover:scale-105 active:scale-95 group border border-rose-600/60"
        title="Consultar al WhatsApp de PETALIA"
      >
        <MessageCircle className="w-6 h-6 fill-current opacity-90" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-semibold pl-0 group-hover:pl-2">
          WhatsApp Ventas
        </span>
      </a>

      {/* BOTÓN FLOTANTE DEL CARRITO EN MÓVIL/DESKTOP CUANDO TIENE PRODUCTOS */}
      {totalCartItems > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 left-5 z-40 bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 transition transform hover:scale-105 active:scale-95 border border-rose-600/60"
          title="Abrir Carrito de Compras"
        >
          <div className="relative">
            <ShoppingCart className="w-4 h-4 text-rose-500" />
            <span className="absolute -top-2 -right-2 bg-accent-carmine text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
              {totalCartItems}
            </span>
          </div>
          <span className="text-xs font-semibold">
            Ver Carrito • S/ {cartSubtotal.toFixed(2)}
          </span>
        </button>
      )}

      {/* Asistente Virtual Inteligente (Chatbot IA) */}
      <ChatBot />

      {/* MODAL: Rastreo de Pedido en Tiempo Real */}
      {isTrackingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-warm-100 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-warm-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-2xs border border-warm-100">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-900 tracking-tight">Rastrea tu Pedido</h3>
                  <p className="text-xs text-warm-500">
                    Sigue en vivo la preparación y despacho de tus flores
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTrackingModalOpen(false)}
                className="p-1.5 text-warm-500 hover:text-ink-900 rounded-xl hover:bg-rose-100 transition"
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
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-500" />
                <input
                  type="text"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value.toUpperCase())}
                  placeholder="Ingresa tu código (ej: PET-8492)"
                  className="w-full bg-rose-50 border border-warm-100 rounded-xl pl-10 pr-4 py-2.5 text-xs text-ink-900 font-mono uppercase placeholder:font-sans focus:outline-none focus:border-rose-600 focus:bg-white transition"
                />
              </div>
              <button
                type="submit"
                disabled={trackingLoading || !trackingInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 text-xs font-semibold shadow transition disabled:opacity-50 flex items-center gap-1.5 active:scale-[0.98]"
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
              <div className="bg-rose-100 border border-accent-carmine/30 rounded-2xl p-4 text-xs text-accent-carmine space-y-1">
                <p className="font-bold">No se encontró el pedido</p>
                <p className="text-[11px] text-warm-500">{trackingError}</p>
                <div className="pt-2">
                  <a
                    href={`https://wa.me/${storeSettings?.whatsapp_number || WHATSAPP_NUMBER}?text=${encodeURIComponent(
                      `¡Hola PETALIA! Deseo consultar sobre mi código de pedido: ${trackingInput}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-ink-900 hover:underline text-[11px]"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Consultar por WhatsApp con una asesora</span>
                  </a>
                </div>
              </div>
            )}

            {/* Resultados y Línea de Tiempo del Pedido */}
            {trackingOrder && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Código y Estado Destacado */}
                <div className="bg-rose-50 border border-warm-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-warm-500">
                      Código de Seguimiento
                    </span>
                    <p className="text-lg font-bold font-mono text-ink-900">
                      {trackingOrder.tracking_code || 'PET-ORDEN'}
                    </p>
                    <p className="text-xs text-warm-500 mt-0.5">
                      Fecha programada: {formatLocalDate(trackingOrder.delivery_date)}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-100 text-ink-900 border border-rose-500 self-start sm:self-auto">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-rose-pulse" />
                    <span className="capitalize">
                      {trackingOrder.status === 'en_preparacion' ? 'En Preparación' : trackingOrder.status}
                    </span>
                  </div>
                </div>

                {/* LÍNEA DE TIEMPO VISUAL (5 ETAPAS) */}
                <div className="bg-white border border-warm-100 rounded-2xl p-4 space-y-4 shadow-xs">
                  <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wider">
                    Línea de Tiempo del Arreglo
                  </h4>

                  {(() => {
                    const normStatus = (trackingOrder.status || 'pendiente').toLowerCase();
                    const getRank = (st: string) => {
                      if (st === 'pendiente') return 1;
                      if (st === 'confirmado') return 2;
                      if (st === 'en_preparacion') return 3;
                      if (st === 'en_despacho') return 4;
                      if (st === 'entregado') return 5;
                      return 1;
                    };
                    const currentRank = getRank(normStatus);

                    const stages = [
                      { rank: 1, label: 'Recibido', desc: 'Pedido registrado' },
                      { rank: 2, label: 'Confirmado', desc: 'Pago validado' },
                      { rank: 3, label: 'En Preparación', desc: 'Florería' },
                      { rank: 4, label: 'En Despacho', desc: 'Chofer en camino' },
                      { rank: 5, label: 'Entregado', desc: 'Entrega exitosa' },
                    ];

                    return (
                      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-warm-100">
                        {stages.map((st) => {
                          const isCompleted = currentRank > st.rank;
                          const isCurrent = currentRank === st.rank;

                          return (
                            <div key={st.rank} className="relative flex items-start gap-3">
                              <div
                                className={`absolute -left-6 top-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition ${
                                  isCompleted
                                    ? 'bg-ink-900 text-white ring-4 ring-rose-100'
                                    : isCurrent
                                    ? 'bg-rose-600 text-white ring-4 ring-rose-100 animate-rose-pulse'
                                    : 'bg-warm-100 text-warm-500'
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
                                      ? 'text-ink-900'
                                      : 'text-warm-500'
                                  }`}
                                >
                                  {st.label}
                                </p>
                                <p className="text-[11px] text-warm-500 mt-1">{st.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Resumen del Arreglo y Destinatario */}
                <div className="bg-rose-50 rounded-2xl p-4 border border-warm-100 space-y-2 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-warm-500">Destinatario:</span>
                    <span className="font-semibold text-ink-900">
                      {trackingOrder.recipient_name?.split('[Comprador:')[0].split('(Cel:')[0].trim() || 'Cliente'}
                    </span>
                  </div>

                  {trackingOrder.delivery_address && (
                    <div className="flex justify-between items-baseline">
                      <span className="text-warm-500">Destino:</span>
                      <span className="font-medium text-ink-900 text-right truncate max-w-[200px]">
                        {trackingOrder.delivery_address}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline pt-1 border-t border-warm-100">
                    <span className="text-warm-500">Total del pedido:</span>
                    <span className="font-bold text-ink-900 font-mono text-sm">
                      S/ {Number(trackingOrder.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Botón WhatsApp para consultas sobre este pedido */}
                <a
                  href={`https://wa.me/${storeSettings?.whatsapp_number || WHATSAPP_NUMBER}?text=${encodeURIComponent(
                    `¡Hola PETALIA! 🌸 Deseo consultar sobre el estado de mi pedido con código ${trackingOrder.tracking_code || 'PET-ORDEN'}.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 font-semibold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs active:scale-[0.98] border border-ink-900 hover:border-rose-600"
                >
                  <MessageCircle className="w-4 h-4 fill-current opacity-80" />
                  <span>Consultar por WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Minimalista de Alta Gama */}
      <footer className="mt-16 border-t border-warm-100 bg-white py-12 px-4 text-center text-xs text-warm-500 space-y-4">
        {/* Redes Sociales Dinámicas */}
        <div className="flex items-center justify-center gap-4">
          {storeSettings?.instagram_url && (
            <a
              href={storeSettings.instagram_url}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-full bg-rose-100 hover:bg-rose-500 text-warm-500 hover:text-ink-900 border border-warm-100 flex items-center justify-center transition active:scale-[0.98]"
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
              className="w-9 h-9 rounded-full bg-rose-100 hover:bg-rose-500 text-warm-500 hover:text-ink-900 border border-warm-100 flex items-center justify-center transition active:scale-[0.98]"
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
              className="w-9 h-9 rounded-full bg-rose-100 hover:bg-ink-900 text-warm-500 hover:text-white border border-warm-100 flex items-center justify-center transition active:scale-[0.98]"
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
            className="w-9 h-9 rounded-full bg-rose-100 hover:bg-rose-500 text-warm-500 hover:text-ink-900 border border-warm-100 flex items-center justify-center transition active:scale-[0.98]"
            title="WhatsApp de PETALIA"
          >
            <MessageCircle className="w-4 h-4 fill-currentColor" />
          </a>
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="font-bold tracking-tight text-ink-900 text-sm">PETALIA</span>
          <span>•</span>
          <span className="text-warm-500">Diseño Floral & Decoraciones</span>
        </div>
        <p className="text-[11px] text-warm-500">
          Florería en Lima, Perú • Pedidos y delivery coordinados por WhatsApp: +{storeSettings?.whatsapp_number || WHATSAPP_NUMBER}
        </p>
      </footer>
    </div>
  );
}
