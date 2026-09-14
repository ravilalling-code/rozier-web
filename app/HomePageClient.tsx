'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Product, Category, Order, OrderStatus, StoreSettings, CartItem, DeliveryZone, AddOnItem, CategoryBanner, Campaign, HeroSlide, SpecialAddon } from '@/lib/types';
import { getCategories } from '@/lib/categories';
import { getStoreSettings } from '@/lib/settings';
import { getCategoryBanners, DEFAULT_CATEGORY_BANNERS } from '@/lib/banners';
import { getActiveCampaign, DEFAULT_CAMPAIGN } from '@/lib/campaigns';
import { getHeroSlides, DEFAULT_HERO_SLIDES } from '@/lib/heroSlides';
import { getSpecialAddons, DEFAULT_SPECIAL_ADDONS } from '@/lib/addons';
import StoreHeader from '@/components/StoreHeader';
import HeroSlider from '@/components/HeroSlider';
import TrustBar from '@/components/TrustBar';
import TopOccasions from '@/components/TopOccasions';
import PinnedScrollUnfold from '@/components/PinnedScrollUnfold';
import Footer from '@/components/Footer';
import {
  MessageCircle,
  Heart,
  Calendar,
  Send,
  Sparkles,
  X,
  Store,
  ChevronRight,
  ChevronLeft,
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
  Gift,
  ArrowUpRight,
  Headphones,
} from 'lucide-react';
import { formatLocalDate } from '@/lib/format';
import ChatBot from '@/components/ChatBot';

const WHATSAPP_NUMBER = '51924257784';

// Toques especiales gestionados dinámicamente desde public.special_addons

// Distritos estándar de Lima con tarifas de flete
const DEFAULT_ZONES: DeliveryZone[] = [
  { id: 1, district: 'Miraflores', cost: 12 },
  { id: 2, district: 'San Isidro', cost: 12 },
  { id: 3, district: 'Barranco', cost: 15 },
  { id: 4, district: 'Surco', cost: 15 },
  { id: 5, district: 'San Borja', cost: 15 },
  { id: 6, district: 'La Molina', cost: 18 },
  { id: 7, district: 'Jesús María', cost: 12 },
  { id: 8, district: 'Lince', cost: 12 },
  { id: 9, district: 'Magdalena', cost: 12 },
  { id: 10, district: 'Pueblo Libre', cost: 12 },
  { id: 11, district: 'San Miguel', cost: 14 },
  { id: 12, district: 'Surquillo', cost: 12 },
  { id: 13, district: 'Lima Cercado', cost: 15 },
  { id: 14, district: 'Los Olivos', cost: 22 },
  { id: 15, district: 'San Martín de Porres', cost: 22 },
  { id: 16, district: 'Chorrillos', cost: 18 },
  { id: 17, district: 'Ate', cost: 20 },
  { id: 18, district: 'Callao', cost: 25 },
];

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

  // Cross-selling: Complementos añadidos al carrito { [addonId]: quantity }
  const [selectedAddOns, setSelectedAddOns] = useState<{ [id: string]: number }>({});

  // Logística: Tarifas por Distrito y Franja Horaria
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(DEFAULT_ZONES);
  const [selectedDistrict, setSelectedDistrict] = useState('Miraflores');
  const [deliveryFee, setDeliveryFee] = useState(12);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('Tarde (2:00 PM - 6:00 PM)');

  // Fidelización: Ocasión y Fechas Especiales a Recordar
  const [celebrationReason, setCelebrationReason] = useState('');
  const [specialDateToRemember, setSpecialDateToRemember] = useState('');

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

  // Banners editoriales de "¿Qué quieres celebrar?"
  const [celebrationBanners, setCelebrationBanners] = useState<CategoryBanner[]>(DEFAULT_CATEGORY_BANNERS);
  const celebrationCarouselRef = useRef<HTMLDivElement>(null);

  const scrollCelebration = (direction: 'left' | 'right') => {
    if (celebrationCarouselRef.current) {
      const amount = direction === 'left' ? -320 : 320;
      celebrationCarouselRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Campaña promocional activa
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const campaignCarouselRef = useRef<HTMLDivElement>(null);

  const scrollCampaign = (direction: 'left' | 'right') => {
    if (campaignCarouselRef.current) {
      const amount = direction === 'left' ? -340 : 340;
      campaignCarouselRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Expansión de categorías en vista compacta (Todos)
  const [expandedCategories, setExpandedCategories] = useState<{ [slug: string]: boolean }>({});

  const toggleCategoryExpand = (slug: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  // Slides dinámicos del Hero Principal
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);

  // Toques Especiales (Complementos y cross-selling) dinámicos desde public.special_addons
  const [specialAddons, setSpecialAddons] = useState<SpecialAddon[]>(DEFAULT_SPECIAL_ADDONS);

  // Ajustes de la tienda (Redes sociales y WhatsApp)
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  // Estado dinámico del Header (Top transparente vs Scrolled glassmorphism)
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById('hero-sentinel');
    let observer: IntersectionObserver | null = null;

    if (sentinel) {
      observer = new IntersectionObserver(
        ([entry]) => {
          setIsScrolled(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        },
        { threshold: 0 }
      );
      observer.observe(sentinel);
    }

    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else if (window.scrollY <= 15) {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 1. Cargar catálogo, zonas de delivery y recuperar carrito de LocalStorage al montar
  useEffect(() => {
    const fetchCatalogAndCategories = async () => {
      setLoading(true);
      try {
        const [prodsRes, catsData, settingsData, zonesRes, bannersData, campaignData, slidesData] = await Promise.all([
          supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
          getCategories(),
          getStoreSettings(),
          supabase
            .from('delivery_zones')
            .select('*')
            .order('district', { ascending: true }),
          getCategoryBanners(),
          getActiveCampaign(),
          getHeroSlides(),
        ]);

        if (!prodsRes.error && prodsRes.data) {
          setProducts(prodsRes.data as Product[]);
        }
        setCategories(catsData);
        if (settingsData) {
          setStoreSettings(settingsData);
        }
        if (bannersData && bannersData.length > 0) {
          setCelebrationBanners(bannersData);
        }
        if (campaignData && campaignData.is_active) {
          setActiveCampaign(campaignData);
        } else {
          setActiveCampaign(null);
        }
        if (slidesData && slidesData.length > 0) {
          setHeroSlides(slidesData);
        }
        const addonsData = await getSpecialAddons();
        if (addonsData && addonsData.length > 0) {
          setSpecialAddons(addonsData);
        }
        if (!zonesRes.error && zonesRes.data && zonesRes.data.length > 0) {
          setDeliveryZones(zonesRes.data as DeliveryZone[]);
          const defaultZone = zonesRes.data.find(
            (z: any) => z.district?.toLowerCase() === 'miraflores'
          ) || zonesRes.data[0];
          setSelectedDistrict(defaultZone.district);
          setDeliveryFee(defaultZone.cost);
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

    // Sincronización en tiempo real con Supabase ante cambios en el CRM Admin
    const realtimeChannel = supabase
      .channel('petalia-store-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'category_banners' },
        async () => {
          const freshBanners = await getCategoryBanners();
          if (freshBanners && freshBanners.length > 0) {
            setCelebrationBanners(freshBanners);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns' },
        async () => {
          const freshCampaign = await getActiveCampaign();
          setActiveCampaign(freshCampaign && freshCampaign.is_active ? freshCampaign : null);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        async () => {
          const { data } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
          if (data) {
            setProducts(data as Product[]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        async () => {
          const freshCategories = await getCategories();
          if (freshCategories) {
            setCategories(freshCategories);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_settings' },
        async () => {
          const freshSettings = await getStoreSettings();
          if (freshSettings) {
            setStoreSettings(freshSettings);
          }
        }
      )
      .subscribe();

    // Canal dedicado para sincronización en tiempo real de Hero Slides
    const heroSlidesChannel = supabase
      .channel('hero_slides_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hero_slides' },
        async () => {
          const freshSlides = await getHeroSlides();
          if (freshSlides && freshSlides.length > 0) {
            setHeroSlides(freshSlides);
          }
        }
      )
      .subscribe();

    // Canal dedicado para sincronización en tiempo real de Toques Especiales (Special Addons)
    const specialAddonsChannel = supabase
      .channel('special_addons_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'special_addons' },
        async () => {
          const freshAddons = await getSpecialAddons();
          if (freshAddons && freshAddons.length > 0) {
            setSpecialAddons(freshAddons);
          }
        }
      )
      .subscribe();

    // Canal dedicado para sincronización en tiempo real de Campañas Estacionales
    const campaignsChannel = supabase
      .channel('campaigns_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns' },
        async () => {
          const fresh = await getActiveCampaign();
          setActiveCampaign(fresh && fresh.is_active ? fresh : null);
        }
      )
      .subscribe();

    // Canal dedicado para sincronización en tiempo real de Categorías (categories_realtime)
    const categoriesChannel = supabase
      .channel('categories_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        async (payload: any) => {
          console.log('⚡ Categorías en tiempo real (categories_realtime):', payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            const newCat = payload.new as Category;
            setCategories((prev) => {
              if (prev.some((c) => c.id === newCat.id)) return prev;
              return [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name));
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedCat = payload.new as Category;
            setCategories((prev) =>
              prev
                .map((c) => (c.id === updatedCat.id ? updatedCat : c))
                .sort((a, b) => a.name.localeCompare(b.name))
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedId = payload.old.id;
            setCategories((prev) => prev.filter((c) => c.id !== deletedId));
          } else {
            const fresh = await getCategories();
            if (fresh) setCategories(fresh);
          }
        }
      )
      .subscribe();

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

    return () => {
      supabase.removeChannel(realtimeChannel);
      supabase.removeChannel(heroSlidesChannel);
      supabase.removeChannel(specialAddonsChannel);
      supabase.removeChannel(campaignsChannel);
      supabase.removeChannel(categoriesChannel);
    };
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
    setSelectedAddOns({});
  };

  // Manejo reactivo de complementos (Cross-Selling)
  const toggleAddOn = (addonId: string) => {
    setSelectedAddOns((prev) => {
      const current = prev[addonId] || 0;
      if (current > 0) {
        const next = { ...prev };
        delete next[addonId];
        return next;
      }
      return { ...prev, [addonId]: 1 };
    });
  };

  const updateAddOnQty = (addonId: string, delta: number) => {
    setSelectedAddOns((prev) => {
      const current = prev[addonId] || 0;
      const nextVal = current + delta;
      if (nextVal <= 0) {
        const next = { ...prev };
        delete next[addonId];
        return next;
      }
      return { ...prev, [addonId]: nextVal };
    });
  };

  // Totales calculados del carrito y complementos
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => {
    const price = item.product.promotional_price || item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const addOnsSubtotal = Object.entries(selectedAddOns).reduce((sum, [id, qty]) => {
    const item = specialAddons.find((a) => a.id === id);
    return sum + (item ? Number(item.price) * qty : 0);
  }, 0);
  const totalAddonsCount = Object.values(selectedAddOns).reduce((sum, q) => sum + q, 0);

  const cartTotalWithAddons = cartSubtotal + addOnsSubtotal;
  const grandTotal = cartTotalWithAddons + deliveryFee;

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

  // Agrupación de productos por categoría desde public.categories para carruseles de 1 sola fila en "Todos"
  const categoryGroups = (
    activeCategories.length > 0
      ? activeCategories
      : categories
  )
    .map((cat) => ({
      ...cat,
      products: products.filter(
        (p) => (p.category || '').toLowerCase().trim() === cat.slug.toLowerCase().trim()
      ),
    }))
    .filter((g) => g.products.length > 0);

  // Incluir productos con slug no mapeado en otras creaciones si existen
  const unmappedProducts = products.filter(
    (p) =>
      !categoryGroups.some(
        (g) => g.slug.toLowerCase().trim() === (p.category || '').toLowerCase().trim()
      )
  );
  if (unmappedProducts.length > 0) {
    categoryGroups.push({
      id: 'otros',
      name: 'Otras Creaciones',
      slug: 'otros',
      products: unmappedProducts,
    });
  }

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

      // 2. Resumen consolidado de productos y complementos
      const extraItemsList = Object.entries(selectedAddOns)
        .map(([id, qty]) => {
          const item = specialAddons.find((a) => a.id === id);
          return item ? { name: item.name, price: Number(item.price), quantity: qty } : null;
        })
        .filter(Boolean) as Array<{ name: string; price: number; quantity: number }>;

      const itemsSummary = [
        ...cart.map((i) => `${i.product.name} (x${i.quantity})`),
        ...extraItemsList.map((e) => `${e.name} (x${e.quantity})`),
      ].join(', ');

      const formattedDedication = `[Arreglos: ${itemsSummary}] [Comprador: ${buyerName.trim()} | Cel: ${cleanPhone}] ${
        checkoutDedication.trim() || 'Sin dedicatoria'
      }`;

      // 3. Insertar orden consolidada en public.orders
      const finalTotalAmount = cartSubtotal + addOnsSubtotal + deliveryFee;

      const orderPayload: Record<string, any> = {
        customer_id: customerId,
        total_amount: finalTotalAmount,
        payment_method: paymentMethod.toLowerCase(),
        status: 'en_preparacion' as OrderStatus,
        delivery_date: checkoutDeliveryDate,
        recipient_name: recipientName.trim(),
        delivery_address: `${deliveryAddress.trim()}, ${selectedDistrict}`,
        delivery_district: selectedDistrict,
        delivery_cost: deliveryFee,
        delivery_time_slot: selectedTimeSlot,
        occasion: celebrationReason || null,
        special_date: specialDateToRemember || null,
        extra_items: extraItemsList,
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
        ...(extraItemsList.length > 0
          ? [
              `🎁 *Complementos añadidos:*`,
              ...extraItemsList.map(
                (e) => `  • ${e.name} x${e.quantity} - S/ ${(e.price * e.quantity).toFixed(2)}`
              ),
            ]
          : []),
        ``,
        `💵 *Subtotal Arreglos & Extras:* S/ ${(cartSubtotal + addOnsSubtotal).toFixed(2)}`,
        `🚚 *Envío a ${selectedDistrict}:* S/ ${deliveryFee.toFixed(2)}`,
        `💰 *Total a pagar:* S/ ${finalTotalAmount.toFixed(2)}`,
        `💳 *Método de pago:* ${paymentMethod.toUpperCase()}`,
        `🕒 *Franja Horaria:* ${selectedTimeSlot}`,
        ...(celebrationReason ? [`🎉 *Motivo / Ocasión:* ${celebrationReason}`] : []),
        `👤 *Destinatario:* ${recipientName.trim()}`,
        `📍 *Dirección de entrega:* ${deliveryAddress.trim()} (${selectedDistrict})`,
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
        total: finalTotalAmount,
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

  const renderProductCard = (product: Product, inCarousel: boolean = false) => {
    const hasPromo = product.promotional_price !== null && product.promotional_price > 0;
    const finalPrice = hasPromo ? product.promotional_price! : product.price;

    const catObj = categories.find(
      (c) => c.slug.toLowerCase() === (product.category || '').toLowerCase()
    );
    const catBadgeName = catObj ? catObj.name : product.category;
    const cartItem = cart.find((i) => i.product.id === product.id);

    return (
      <div
        key={product.id}
        className={`group bg-white rounded-2xl border border-warm-100 card-editorial card-editorial-hover p-2.5 sm:p-3 flex flex-col overflow-hidden transition-all duration-300 hover:border-rose-600/60 ${
          inCarousel
            ? 'snap-start shrink-0 min-w-[220px] md:min-w-[260px] w-[220px] md:w-[260px]'
            : ''
        }`}
      >
        {/* Contenedor de Imagen Hijo Directo: aspect-[4/5], rounded-lg */}
        <div
          onClick={() => {
            setSelectedProduct(product);
            setModalQuantity(1);
            setDeliveryDate('');
            setDedication('');
          }}
          className="relative aspect-[4/5] w-full bg-rose-100 overflow-hidden cursor-pointer rounded-lg shrink-0"
        >
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover [@media(hover:hover)]:group-hover:scale-[1.03] transition-transform duration-500 ease-out"
            loading="lazy"
          />

          {/* Insignia Oferta (Nieto: rounded-md) */}
          {hasPromo && (
            <span className="absolute top-2 left-2 bg-rose-100 text-accent-carmine border border-accent-carmine/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs">
              OFERTA
            </span>
          )}

          {/* Insignia Categoría (Nieto: rounded-md) */}
          <span className="absolute bottom-2 right-2 bg-ink-900/80 backdrop-blur-md text-rose-50 text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-md uppercase">
            {catBadgeName}
          </span>
        </div>

        {/* Detalle del Arreglo Floral */}
        <div className="pt-2.5 sm:pt-3 flex-1 flex flex-col justify-between space-y-2">
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

          {/* Jerarquía de Precios (tabular-nums & WCAG AA) */}
          <div className="flex items-baseline justify-between pt-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-bold text-ink-900 tabular-nums">
                S/ {finalPrice.toFixed(2)}
              </span>
              {hasPromo && (
                <span className="text-xs text-warm-500 line-through tabular-nums">
                  S/ {product.price.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* BOTÓN PRINCIPAL Y SELECTOR DE CANTIDAD (Feedback táctil inmediato 100ms) */}
          <div className="pt-1.5 border-t border-warm-100">
            {cartItem ? (
              <div className="flex items-center justify-between bg-rose-100 border border-rose-500/60 rounded-lg p-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateCartQuantity(product.id, -1);
                  }}
                  className="btn-tactile w-7 h-7 rounded-md bg-white text-ink-900 hover:bg-rose-50 flex items-center justify-center shadow-2xs border border-warm-100"
                  title="Disminuir"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-ink-900 tabular-nums px-2">
                  {cartItem.quantity} en carrito
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateCartQuantity(product.id, 1);
                  }}
                  className="btn-tactile w-7 h-7 rounded-md bg-ink-900 text-white hover:bg-rose-600 flex items-center justify-center shadow-2xs"
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
                className="btn-tactile w-full flex items-center justify-center gap-1.5 bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 py-2 px-3 rounded-lg text-xs font-semibold shadow-xs border border-ink-900 hover:border-rose-600"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>+ Añadir</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-rose-50 text-ink-900 font-sans pb-28 selection:bg-rose-500 selection:text-ink-900">
      {/* 1. Header con Transparencia Dinámica y Transición Suave */}
      <StoreHeader
        isScrolled={isScrolled}
        cartCount={totalCartItems}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => {
          setTrackingError(null);
          setIsTrackingModalOpen(true);
        }}
        onSelectCategory={(slug) => setCategory(slug)}
        categories={categories}
        logoUrl={storeSettings?.logo_url}
      />

      {/* 2. Hero Principal — Slider Full-Bleed con Transición "Wipe Horizontal" */}
      <HeroSlider
        slides={heroSlides}
        onCtaClick={(target) => {
          const el = document.getElementById(target.replace('#', ''));
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Centinela para el IntersectionObserver del Header */}
      <div id="hero-sentinel" className="h-1 w-full -mt-1 pointer-events-none" />

      {/* 3. Trust Bar Concéntrica */}
      <TrustBar />

      {/* 4. Sección "Ocasiones Más Solicitadas" (Cards con Overlay) */}
      <TopOccasions onSelectOccasion={(slug) => setCategory(slug)} />

      {/* 2. Sección "¿Qué quieres celebrar?" (Carrusel Editorial con Flechas de Navegación) */}
      <section className="py-12 md:py-16 max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Columna izquierda (~28% en desktop) */}
          <div className="lg:col-span-4 space-y-4 md:pr-4">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-rose-600">
              Colecciones Exclusivas
            </span>
            <h2 className="font-serif text-4xl lg:text-5xl font-normal tracking-tight text-ink-900 leading-[1.12]">
              ¿QUÉ QUIERES CELEBRAR?
            </h2>
            <p className="text-sm sm:text-base text-[#686161] leading-relaxed">
              El detalle floral exclusivo con el sello de lujo de PETALIA.
            </p>

            {/* Flechas de navegación integradas */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollCelebration('left')}
                className="w-10 h-10 rounded-full bg-white/95 shadow-md border border-warm-100 text-ink-900 hover:bg-rose-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                title="Categoría anterior"
                aria-label="Desplazar a la izquierda"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2]" />
              </button>
              <button
                type="button"
                onClick={() => scrollCelebration('right')}
                className="w-10 h-10 rounded-full bg-white/95 shadow-md border border-warm-100 text-ink-900 hover:bg-rose-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                title="Siguiente categoría"
                aria-label="Desplazar a la derecha"
              >
                <ChevronRight className="w-5 h-5 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Columna derecha (~72% en desktop, carrusel horizontal fluido con snap y flechas flotantes) */}
          <div className="lg:col-span-8 relative group/celebration">
            {/* Botón flotante izquierdo en desktop */}
            <button
              type="button"
              onClick={() => scrollCelebration('left')}
              className="hidden lg:flex absolute -left-5 top-[38%] -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 shadow-md border border-warm-100 text-ink-900 hover:bg-rose-100 hover:scale-105 active:scale-95 transition-all items-center justify-center cursor-pointer"
              title="Anterior"
              aria-label="Desplazar carrusel a la izquierda"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2]" />
            </button>

            {/* Botón flotante derecho en desktop */}
            <button
              type="button"
              onClick={() => scrollCelebration('right')}
              className="hidden lg:flex absolute -right-5 top-[38%] -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 shadow-md border border-warm-100 text-ink-900 hover:bg-rose-100 hover:scale-105 active:scale-95 transition-all items-center justify-center cursor-pointer"
              title="Siguiente"
              aria-label="Desplazar carrusel a la derecha"
            >
              <ChevronRight className="w-5 h-5 stroke-[2]" />
            </button>

            <div
              ref={celebrationCarouselRef}
              className="flex gap-5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-3 pt-1"
            >
              {celebrationBanners.map((banner) => (
                <div
                  key={banner.id}
                  onClick={() => {
                    const target = banner.category_slug || banner.link_category || 'todos';
                    const matched = categories.find(
                      (c) =>
                        c.slug.toLowerCase() === target.toLowerCase() ||
                        c.name.toLowerCase() === target.toLowerCase()
                    );
                    if (matched) {
                      setCategory(matched.slug);
                    } else {
                      const lower = target.toLowerCase();
                      if (lower.includes('box') || lower.includes('amor')) {
                        const bCat = categories.find((c) => c.slug.toLowerCase().includes('box'));
                        setCategory(bCat ? bCat.slug : target);
                      } else if (lower.includes('cumple') || lower.includes('girasol')) {
                        const gCat = categories.find((c) => c.slug.toLowerCase().includes('girasol'));
                        setCategory(gCat ? gCat.slug : target);
                      } else if (lower.includes('aniversario') || lower.includes('ramo')) {
                        const rCat = categories.find((c) => c.slug.toLowerCase().includes('ramo'));
                        setCategory(rCat ? rCat.slug : target);
                      } else if (lower.includes('el') || lower.includes('detalle')) {
                        const dCat = categories.find((c) => c.slug.toLowerCase().includes('detalle'));
                        setCategory(dCat ? dCat.slug : target);
                      } else {
                        setCategory(target);
                      }
                    }
                    const catElem = document.getElementById('catalogo');
                    if (catElem) {
                      catElem.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="snap-start shrink-0 min-w-[260px] md:min-w-[300px] w-[260px] md:w-[300px] group cursor-pointer"
                >
                  {/* Tarjeta con imagen aspect-[3/4] */}
                  <div className="aspect-[3/4] min-w-[260px] md:min-w-[300px] rounded-2xl overflow-hidden relative border border-warm-100 card-editorial shadow-xs">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      loading="lazy"
                    />
                    {/* Badge flotante en la foto */}
                    <div className="absolute top-4 left-4">
                      <span className="bg-rose-600/90 backdrop-blur-sm text-white text-xs font-medium px-3.5 py-1.5 rounded-full shadow-xs">
                        {banner.badge_text}
                      </span>
                    </div>
                  </div>

                  {/* Zona externa inferior */}
                  <div className="pt-3.5 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-2xl text-ink-900 tracking-tight uppercase group-hover:text-rose-600 transition">
                        {banner.title}
                      </h3>
                      <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-100 hover:bg-rose-500 hover:text-ink-900 px-3 py-1 rounded-full border border-warm-100 transition">
                        <span>Ver colección</span>
                      </div>
                    </div>

                    {/* Botón circular con flecha diagonal (↗) */}
                    <div className="w-10 h-10 rounded-full bg-white border border-warm-100 text-ink-900 flex items-center justify-center group-hover:bg-ink-900 group-hover:text-white group-hover:border-ink-900 transition-all shadow-2xs shrink-0">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pestañas de Categoría (Pills de Navegación Palo Rosa) */}
      <nav id="catalogo" aria-label="Categorías" className="sticky top-[57px] sm:top-[61px] z-20 bg-rose-50/95 backdrop-blur-md border-y border-warm-100 py-2.5">
        <div className="max-w-6xl mx-auto px-4 flex gap-2 overflow-x-auto no-scrollbar text-xs">
          {/* Pestaña "Todos" */}
          <button
            onClick={() => setCategory('todos')}
            className={`btn-tactile px-4 py-1.5 rounded-full whitespace-nowrap ${
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
                className={`btn-tactile px-4 py-1.5 rounded-full whitespace-nowrap transition-all duration-300 ease-out ${
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
      </nav>

      {/* 3. Catálogo de Productos - Carruseles de 1 sola fila por Categoría o Grilla Completa */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-12">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-warm-100 card-editorial p-2.5 sm:p-3 flex flex-col space-y-3 overflow-hidden"
              >
                {/* Contenedor de Imagen Hijo Directo (máximo rounded-lg, aspect 4/5) */}
                <div className="aspect-[4/5] w-full rounded-lg skeleton-brand shrink-0" />
                {/* Placeholders Nietos (máximo rounded-md) */}
                <div className="space-y-2 flex-1 pt-1">
                  <div className="h-4 w-3/4 rounded-md skeleton-brand" />
                  <div className="h-3 w-1/2 rounded-md skeleton-brand" />
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-warm-100">
                  <div className="h-5 w-16 rounded-md skeleton-brand" />
                  <div className="h-8 w-24 rounded-md skeleton-brand" />
                </div>
              </div>
            ))}
          </div>
        ) : category === 'todos' ? (
          /* Vista "Todos": Fila 1 (Categorías representativas) + Fila 2 (Campaña Activa) + Diseños */
          categoryGroups.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-warm-100 card-editorial p-8 space-y-3 shadow-xs">
              <Flower2 className="w-12 h-12 text-rose-600 mx-auto stroke-1" />
              <p className="text-sm font-bold text-ink-900">
                No hay arreglos disponibles en este momento.
              </p>
              <p className="text-xs text-warm-500">
                Estamos preparando nuevos diseños florales. Consúltanos directamente por WhatsApp.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* FILA 1: Colección por Categorías (Exactamente una foto representativa por categoría) */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-warm-100 pb-2">
                  <div>
                    <span className="text-[11px] uppercase tracking-widest font-semibold text-rose-600">
                      Exploración Rápida
                    </span>
                    <h3 className="font-serif text-2xl sm:text-3xl text-ink-900 font-normal tracking-tight">
                      Colección por Categorías
                    </h3>
                    <p className="text-xs text-warm-500 mt-0.5">
                      Explora cada una de nuestras líneas florales exclusivas. Haz clic para ver toda la colección.
                    </p>
                  </div>
                  <span className="text-xs text-warm-500 font-mono mt-1 sm:mt-0">
                    {categoryGroups.length} {categoryGroups.length === 1 ? 'colección' : 'colecciones'}
                  </span>
                </div>

                <div className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-3 pt-1">
                  {categoryGroups.map((group) => {
                    const repProduct = group.products[0];
                    const repImage = repProduct?.image_url || '/images/logo.jpg';

                    return (
                      <div
                        key={group.id || group.slug}
                        onClick={() => {
                          setCategory(group.slug);
                          const catNav = document.getElementById('catalogo');
                          if (catNav) catNav.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="snap-start shrink-0 min-w-[220px] sm:min-w-[260px] md:min-w-[280px] w-[220px] sm:w-[260px] md:w-[280px] group cursor-pointer"
                      >
                        <div className="aspect-[4/5] rounded-2xl overflow-hidden relative border border-warm-100 card-editorial shadow-xs">
                          <img
                            src={repImage}
                            alt={group.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/25 to-transparent pointer-events-none" />

                          {/* Badge de cantidad */}
                          <div className="absolute top-3.5 right-3.5">
                            <span className="bg-white/95 backdrop-blur-md text-ink-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-2xs">
                              {group.products.length} {group.products.length === 1 ? 'diseño' : 'diseños'}
                            </span>
                          </div>

                          {/* Info en base de tarjeta */}
                          <div className="absolute bottom-4 left-4 right-4 text-white space-y-0.5">
                            <span className="text-[10px] uppercase font-semibold text-rose-300 tracking-wider">
                              Línea Floral
                            </span>
                            <h4 className="font-bold text-xl text-white tracking-tight leading-snug drop-shadow-xs group-hover:text-rose-200 transition">
                              {group.name}
                            </h4>
                            <p className="text-[11px] text-neutral-200 line-clamp-1">
                              {repProduct?.description || 'Flores frescas de corte de exportación'}
                            </p>
                          </div>
                        </div>

                        {/* Botón inferior Ver Colección */}
                        <div className="pt-2.5 flex items-center justify-between text-xs font-semibold text-ink-900 group-hover:text-rose-600 transition">
                          <span>Ver todos los diseños</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* FILA 2: Campaña Activa (Promocional / Flores Amarillas) */}
              {activeCampaign && activeCampaign.is_active && (() => {
                const campaignImages = (activeCampaign.images && activeCampaign.images.length > 0)
                  ? activeCampaign.images
                  : (activeCampaign.banner_url ? [activeCampaign.banner_url] : []);
                const mainBanner = activeCampaign.banner_url || campaignImages[0] || '/images/logo.jpg';

                return (
                  <section className="bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-transparent rounded-3xl p-6 sm:p-8 border border-amber-200/70 shadow-xs space-y-6">
                    {/* Header de la Campaña */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>{activeCampaign.badge_text || 'Campaña Especial'}</span>
                        </div>
                        <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal text-ink-900 tracking-tight">
                          {activeCampaign.title}
                        </h3>
                        {activeCampaign.subtitle && (
                          <p className="text-xs sm:text-sm text-warm-500 max-w-xl">
                            {activeCampaign.subtitle}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Botones de navegación si es carrusel */}
                        {activeCampaign.layout_type === 'carousel' && campaignImages.length > 1 && (
                          <div className="hidden sm:flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => scrollCampaign('left')}
                              className="w-9 h-9 rounded-full bg-white shadow-xs border border-warm-100 text-ink-900 hover:bg-rose-100 flex items-center justify-center transition active:scale-95"
                              aria-label="Anterior foto de campaña"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => scrollCampaign('right')}
                              className="w-9 h-9 rounded-full bg-white shadow-xs border border-warm-100 text-ink-900 hover:bg-rose-100 flex items-center justify-center transition active:scale-95"
                              aria-label="Siguiente foto de campaña"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* Botón CTA */}
                        <button
                          type="button"
                          onClick={() => {
                            const link = activeCampaign.cta_link?.toLowerCase().trim();
                            if (link && activeCategories.some((c) => c.slug.toLowerCase() === link)) {
                              setCategory(link);
                            } else {
                              const el = document.getElementById('catalogo');
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="btn-tactile inline-flex items-center gap-2 bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 px-5 py-2.5 rounded-full text-xs font-semibold shadow-xs transition"
                        >
                          <span>{activeCampaign.cta_text || 'Explorar Flores Amarillas'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Contenido Visual según layout_type */}
                    {activeCampaign.layout_type === 'banner' ? (
                      /* Modo Banner Grande Panorámico */
                      <div className="relative rounded-2xl overflow-hidden aspect-[21/9] min-h-[220px] sm:min-h-[280px] border border-warm-100 card-editorial shadow-xs">
                        <img
                          src={mainBanner}
                          alt={activeCampaign.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/45 to-transparent flex items-center p-6 sm:p-10">
                          <div className="max-w-md text-white space-y-2">
                            <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                              {activeCampaign.badge_text}
                            </span>
                            <h4 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal leading-tight">
                              {activeCampaign.title}
                            </h4>
                            <p className="text-xs sm:text-sm text-neutral-200 line-clamp-2">
                              {activeCampaign.subtitle}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Modo Carrusel de Fotos con snap */
                      <div
                        ref={campaignCarouselRef}
                        className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2"
                      >
                        {campaignImages.map((imgUrl, i) => (
                          <div
                            key={i}
                            className="snap-start shrink-0 aspect-[4/3] sm:aspect-[16/10] min-w-[260px] sm:min-w-[320px] md:min-w-[360px] rounded-2xl overflow-hidden relative border border-warm-100 card-editorial shadow-xs group"
                          >
                            <img
                              src={imgUrl}
                              alt={`${activeCampaign.title} ${i + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })()}

              {/* SECCIONES DE PRODUCTOS POR CATEGORÍA */}
              <div className="space-y-12 pt-4">
                <div className="border-b border-warm-100 pb-2">
                  <span className="text-[11px] uppercase tracking-widest font-semibold text-rose-600">
                    Catálogo Completo
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl text-ink-900 font-normal tracking-tight">
                    Todos los Diseños Florales
                  </h3>
                </div>

                {categoryGroups.map((group) => {
                  const isExpanded = !!expandedCategories[group.slug];
                  return (
                    <section key={group.id || group.slug} className="space-y-4">
                      {/* Encabezado elegante de categoría con descripción sutil */}
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-warm-100 pb-2">
                        <div>
                          <h3 className="font-serif text-2xl sm:text-3xl text-ink-900 font-normal tracking-tight">
                            {group.name}
                          </h3>
                          <p className="text-xs text-warm-500 mt-0.5">
                            Selección floral artesanal de alta gama con flores de corte fresco.
                          </p>
                        </div>
                        <span className="text-xs text-warm-500 font-mono mt-1 sm:mt-0">
                          {group.products.length} {group.products.length === 1 ? 'diseño' : 'diseños'}
                        </span>
                      </div>

                      {/* Fila Horizontal Continua o Grilla Expandida */}
                      {isExpanded ? (
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6 animate-in fade-in duration-300">
                          {group.products.map((product) => renderProductCard(product, false))}
                        </div>
                      ) : (
                        <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 pt-1">
                          {group.products.map((product) => renderProductCard(product, true))}
                        </div>
                      )}

                      {/* Botón Editorial para Alternar Vista (Ver todos los diseños ↓ / Mostrar menos ↑) */}
                      {group.products.length > 2 && (
                        <div className="text-center pt-2 pb-4">
                          <button
                            type="button"
                            onClick={() => toggleCategoryExpand(group.slug)}
                            className="btn-tactile inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-ink-900 text-ink-900 hover:bg-rose-100 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
                          >
                            <span>
                              {isExpanded
                                ? 'Mostrar menos ↑'
                                : `Ver todos los diseños de ${group.name} ↓`}
                            </span>
                          </button>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          /* Vista de Categoría Específica Seleccionada */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-warm-100 pb-2">
              <div>
                <h3 className="font-serif text-2xl sm:text-3xl text-ink-900 font-normal tracking-tight">
                  {activeCategories.find((c) => c.slug.toLowerCase() === category.toLowerCase())?.name || category}
                </h3>
                <p className="text-xs text-warm-500 mt-0.5">
                  Arreglos y complementos exclusivos preparados al momento.
                </p>
              </div>
              <span className="text-xs text-warm-500 font-mono mt-1 sm:mt-0">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'diseño' : 'diseños'}
              </span>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-2xl border border-warm-100 card-editorial p-8 space-y-3 shadow-xs">
                <Flower2 className="w-12 h-12 text-rose-600 mx-auto stroke-1" />
                <p className="text-sm font-bold text-ink-900">
                  No hay arreglos disponibles en esta categoría.
                </p>
                <p className="text-xs text-warm-500">
                  Explora otras colecciones o consúltanos directamente por WhatsApp.
                </p>
                <button
                  onClick={() => setCategory('todos')}
                  className="btn-tactile text-xs text-rose-600 font-semibold hover:underline pt-1 inline-block"
                >
                  Ver todos los arreglos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-6">
                {filteredProducts.map((product) => renderProductCard(product, false))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 5. Hero Secundario — Efecto "Pinned Scroll Unfold" */}
      <PinnedScrollUnfold
        onExploreClick={() => {
          const el = document.getElementById('catalogo');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* MODAL: Vista Previa y Personalización de Producto */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-md rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto border border-warm-100 card-editorial animate-spring-modal">
            <div className="flex justify-between items-center border-b border-warm-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-ink-900 tracking-tight">{selectedProduct.name}</h3>
                <p className="text-xs text-warm-500">
                  {selectedProduct.category ? `Colección: ${selectedProduct.category}` : 'Florería Petalia'}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="btn-tactile p-1.5 rounded-lg text-warm-500 hover:text-ink-900 hover:bg-rose-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Arreglo Preview (Hijo directo: rounded-lg, Nietos: rounded-md) */}
            <div className="flex gap-3.5 items-center bg-rose-50 p-3 rounded-lg border border-warm-100">
              <img
                src={selectedProduct.image_url}
                alt={selectedProduct.name}
                className="w-20 h-20 rounded-md object-cover border border-warm-100 shadow-2xs shrink-0"
              />
              <div className="flex-1">
                <p className="text-xs text-warm-500">
                  {selectedProduct.description || 'Diseño floral artesanal con flores frescas de primera calidad'}
                </p>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-ink-900 font-bold text-lg tabular-nums">
                    S/{' '}
                    {(selectedProduct.promotional_price || selectedProduct.price).toFixed(2)}
                  </span>
                  {selectedProduct.promotional_price && (
                    <span className="text-xs text-warm-500 line-through tabular-nums">
                      S/ {selectedProduct.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Selector de Cantidad (Hijo: rounded-lg, Botones: rounded-md) */}
            <div className="bg-rose-100 p-3.5 rounded-lg border border-warm-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">Cantidad deseada:</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalQuantity((prev) => Math.max(1, prev - 1))}
                  className="btn-tactile w-8 h-8 rounded-md bg-white border border-warm-100 text-ink-900 hover:bg-rose-50 flex items-center justify-center font-bold"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold tabular-nums text-ink-900 w-6 text-center">
                  {modalQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setModalQuantity((prev) => prev + 1)}
                  className="btn-tactile w-8 h-8 rounded-md bg-ink-900 text-white hover:bg-rose-600 flex items-center justify-center font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Toques Especiales dentro del Modal de Arreglo */}
            {specialAddons.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                    <span>Añade un toque especial:</span>
                  </span>
                  <span className="text-[10px] text-warm-500">Cross-selling</span>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                  {specialAddons.map((addon) => {
                    const qty = selectedAddOns[addon.id] || 0;
                    const isSelected = qty > 0;
                    return (
                      <div
                        key={addon.id}
                        onClick={() => toggleAddOn(addon.id)}
                        className={`shrink-0 w-32 p-2 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-rose-100 border-rose-500 shadow-xs ring-1 ring-rose-500/40'
                            : 'bg-rose-50/60 border-warm-100 hover:border-rose-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 border border-warm-100">
                            <img
                              src={addon.image_url}
                              alt={addon.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=200&q=80';
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-[11px] text-ink-900 leading-tight truncate">
                              {addon.name}
                            </p>
                            <span className="text-[10px] font-bold text-ink-900 tabular-nums">
                              +S/ {Number(addon.price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="mt-1.5 text-[9px] font-bold text-center bg-rose-600 text-white rounded-md py-0.5">
                            Seleccionado (x{qty})
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  addToCart(selectedProduct, modalQuantity);
                  setSelectedProduct(null);
                  setIsCartOpen(true);
                }}
                className="btn-tactile w-full bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 font-semibold py-3.5 rounded-lg shadow-md flex items-center justify-center gap-2 text-xs border border-ink-900 hover:border-rose-600"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>
                  Agregar al Carrito • S/{' '}
                  <span className="tabular-nums">
                    {(
                      (selectedProduct.promotional_price || selectedProduct.price) * modalQuantity
                    ).toFixed(2)}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  addToCart(selectedProduct, modalQuantity);
                  setSelectedProduct(null);
                  setIsCheckoutModalOpen(true);
                }}
                className="btn-tactile w-full bg-rose-500 hover:bg-rose-600 text-ink-900 font-bold py-3.5 rounded-lg shadow-xs flex items-center justify-center gap-2 text-xs border border-rose-600"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex justify-end overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-spring-drawer border-l border-warm-100 overflow-hidden">
            {/* Header del Carrito */}
            <div className="p-4 sm:p-5 border-b border-warm-100 flex items-center justify-between bg-rose-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center border border-warm-100">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-ink-900 tracking-tight">Tu Carrito Floral</h3>
                  <p className="text-[11px] text-warm-500">
                    <span className="tabular-nums">{totalCartItems}</span> {totalCartItems === 1 ? 'arreglo seleccionado' : 'arreglos seleccionados'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="btn-tactile p-2 text-warm-500 hover:text-ink-900 hover:bg-rose-100 rounded-lg transition"
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
                    className="btn-tactile px-5 py-2.5 rounded-lg bg-ink-900 hover:bg-rose-600 text-white text-xs font-semibold shadow hover:text-ink-900"
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
                      className="bg-rose-50 border border-warm-100 rounded-xl p-3 flex gap-3 items-center hover:border-rose-500/60 transition card-editorial"
                    >
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-16 h-16 rounded-lg object-cover border border-warm-100 shadow-2xs shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-ink-900 truncate tracking-tight">
                          {item.product.name}
                        </h4>
                        <p className="text-[11px] text-warm-500 tabular-nums mt-0.5">
                          S/ {finalPrice.toFixed(2)} c/u
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center border border-warm-100 bg-white rounded-md">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, -1)}
                              className="btn-tactile p-1 hover:bg-rose-100 text-ink-900 rounded-l-md"
                              title="Disminuir"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold tabular-nums px-2 text-ink-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, 1)}
                              className="btn-tactile p-1 hover:bg-rose-100 text-ink-900 rounded-r-md"
                              title="Aumentar"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="btn-tactile text-warm-500 hover:text-accent-carmine p-1"
                            title="Eliminar del carrito"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold tabular-nums text-sm text-ink-900 block">
                          S/ {itemTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cross-Selling en el Carrito (Add-ons rápidos: feedback táctil inmediato, tabular-nums) */}
            {cart.length > 0 && (
              <div className="px-4 sm:px-5 py-3 border-t border-warm-100 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-ink-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                    <span>Añade un toque especial</span>
                  </span>
                  <span className="text-[10px] text-warm-500 font-medium">Add-ons rápidos</span>
                </div>
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                  {specialAddons.map((addon) => {
                    const qty = selectedAddOns[addon.id] || 0;
                    const isSelected = qty > 0;
                    return (
                      <div
                        key={addon.id}
                        className={`shrink-0 w-38 sm:w-44 p-2.5 rounded-xl border card-editorial transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? 'bg-rose-100 border-rose-500 shadow-xs ring-1 ring-rose-500/40'
                            : 'bg-rose-50 border-warm-100 hover:border-rose-400'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white shrink-0 border border-warm-100 shadow-2xs">
                              <img
                                src={addon.image_url}
                                alt={addon.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=200&q=80';
                                }}
                              />
                            </div>
                            {isSelected && (
                              <span className="text-[10px] font-bold tabular-nums bg-ink-900 text-white px-1.5 py-0.5 rounded-md">
                                x{qty}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-xs text-ink-900 mt-1.5 leading-tight line-clamp-1">
                            {addon.name}
                          </p>
                          <p className="text-[10px] text-rose-600 font-semibold line-clamp-1 mt-0.5">
                            {addon.category}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-warm-100/60">
                          <span className="tabular-nums font-bold text-xs text-ink-900">
                            S/ {Number(addon.price).toFixed(2)}
                          </span>
                          <div className="flex items-center gap-1">
                            {isSelected ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => updateAddOnQty(addon.id, -1)}
                                  className="btn-tactile w-5 h-5 rounded-md bg-white border border-warm-100 text-ink-900 flex items-center justify-center hover:bg-rose-100 text-xs font-bold shadow-2xs"
                                  title="Reducir"
                                >
                                  -
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateAddOnQty(addon.id, 1)}
                                  className="btn-tactile w-5 h-5 rounded-md bg-ink-900 text-white flex items-center justify-center hover:bg-rose-600 text-xs font-bold shadow-2xs"
                                  title="Añadir más"
                                >
                                  +
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleAddOn(addon.id)}
                                className="btn-tactile w-6 h-6 rounded-md bg-ink-900 hover:bg-rose-600 text-white flex items-center justify-center shadow-xs"
                                title="Añadir al pedido"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer con Subtotal y Checkout */}
            {cart.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-warm-100 bg-rose-50 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-warm-500">
                    <span>Subtotal arreglos:</span>
                    <span className="tabular-nums font-semibold text-ink-900">
                      S/ {cartSubtotal.toFixed(2)}
                    </span>
                  </div>
                  {totalAddonsCount > 0 && (
                    <div className="flex justify-between items-center text-xs text-rose-600 font-medium">
                      <span>Complementos ({totalAddonsCount}):</span>
                      <span className="tabular-nums font-semibold">
                        + S/ {addOnsSubtotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs text-warm-500">
                    <span>Flete de envío:</span>
                    <span className="text-ink-900 font-semibold tabular-nums">S/ {deliveryFee.toFixed(2)} ({selectedDistrict})</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-warm-100 text-sm">
                    <span className="font-bold text-ink-900">Total a pagar:</span>
                    <span className="font-bold tabular-nums text-lg text-ink-900">
                      S/ {grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutModalOpen(true);
                    }}
                    className="btn-tactile w-full bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 font-semibold py-3.5 rounded-lg shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm border border-ink-900 hover:border-rose-600"
                  >
                    <span>Continuar compra</span>
                    <ArrowRight className="w-4 h-4 text-rose-500" />
                  </button>

                  <button
                    onClick={clearCart}
                    className="btn-tactile w-full text-center text-[11px] text-warm-500 hover:text-ink-900 py-1 transition"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white border border-warm-100 max-w-xl w-full rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto animate-spring-modal card-editorial">
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
                <div className="bg-rose-50 border border-warm-100 rounded-lg p-4 max-w-sm mx-auto space-y-2">
                  <span className="text-[11px] font-semibold text-warm-500 uppercase tracking-wider block">
                    Tu Código de Rastreo en Vivo
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-bold tabular-nums text-ink-900">
                      {orderSuccessData.trackingCode}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(orderSuccessData.trackingCode);
                        alert('¡Código de rastreo copiado!');
                      }}
                      className="btn-tactile p-1.5 rounded-md bg-white border border-warm-100 hover:bg-rose-100 text-warm-500"
                      title="Copiar código"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-warm-500">
                    Total del pedido: <span className="tabular-nums font-semibold">S/ {orderSuccessData.total.toFixed(2)}</span>
                  </p>
                </div>

                {/* Botón WhatsApp para confirmación y envío de voucher */}
                <div className="space-y-2 pt-2 max-w-md mx-auto">
                  <a
                    href={orderSuccessData.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-tactile w-full bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 font-semibold py-3.5 rounded-lg shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm border border-ink-900 hover:border-rose-600"
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
                    className="btn-tactile w-full py-2.5 rounded-lg border border-warm-100 bg-rose-100 hover:bg-rose-50 text-ink-900 text-xs font-semibold"
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
                    <div className="w-9 h-9 rounded-lg bg-ink-900 text-white flex items-center justify-center shadow-xs">
                      <CreditCard className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ink-900 tracking-tight">Finalizar Compra</h3>
                      <p className="text-xs text-warm-500">
                        {cart.length} {cart.length === 1 ? 'arreglo floral' : 'arreglos florales'}{' '}
                        {totalAddonsCount > 0 ? `+ ${totalAddonsCount} complementos` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCheckoutModalOpen(false)}
                    className="btn-tactile p-1.5 text-warm-500 hover:text-ink-900 rounded-lg hover:bg-rose-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Resumen Compacto y Desglose Económico (Hijo: rounded-lg) */}
                <div className="bg-rose-50 rounded-lg p-3.5 border border-warm-100 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-ink-900">Desglose del Pedido:</span>
                    <span className="tabular-nums font-bold text-ink-900 text-sm">
                      Total: S/ {grandTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-[11px] text-warm-500 divide-y divide-warm-100/70">
                    {cart.map((item) => (
                      <div key={item.product.id} className="pt-1 first:pt-0 flex justify-between">
                        <span className="truncate max-w-[240px]">
                          • {item.product.name} (x{item.quantity})
                        </span>
                        <span className="tabular-nums font-medium text-ink-900">
                          S/{' '}
                          {(
                            (item.product.promotional_price || item.product.price) * item.quantity
                          ).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {Object.entries(selectedAddOns).map(([id, qty]) => {
                      const item = specialAddons.find((a) => a.id === id);
                      if (!item) return null;
                      return (
                        <div key={id} className="pt-1 flex justify-between text-rose-600 font-medium">
                          <span className="truncate max-w-[240px]">
                            • {item.name} (x{qty})
                          </span>
                          <span className="tabular-nums">
                            S/ {(Number(item.price) * qty).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Flete & Total Desglosado */}
                  <div className="pt-2 border-t border-warm-100 text-xs space-y-1">
                    <div className="flex justify-between text-warm-500">
                      <span>Subtotal Arreglos & Extras:</span>
                      <span className="tabular-nums text-ink-900 font-medium">
                        S/ {cartTotalWithAddons.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-warm-500">
                      <span>Envío ({selectedDistrict}):</span>
                      <span className="tabular-nums text-ink-900 font-medium">
                        + S/ {deliveryFee.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-1 font-bold text-sm text-ink-900">
                      <span>Total con Delivery:</span>
                      <span className="tabular-nums text-base text-ink-900">
                        S/ {grandTotal.toFixed(2)}
                      </span>
                    </div>
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
                        className="w-full border border-warm-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-white text-ink-900 placeholder:text-warm-500/60"
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
                        className="w-full border border-warm-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-white text-ink-900 tabular-nums placeholder:text-warm-500/60"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Datos de Entrega y Logística */}
                <div className="space-y-2.5 pt-1 border-t border-warm-100">
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
                        className="w-full border border-warm-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-white text-ink-900 placeholder:text-warm-500/60"
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
                        className="w-full border border-warm-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-white text-ink-900"
                      />
                      <div className="flex gap-1.5 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date().toISOString().split('T')[0];
                            setCheckoutDeliveryDate(today);
                          }}
                          className="btn-tactile text-[10px] px-2 py-0.5 rounded-full bg-rose-100 hover:bg-rose-50 text-ink-900 font-medium border border-warm-100"
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
                          className="btn-tactile text-[10px] px-2 py-0.5 rounded-full bg-rose-100 hover:bg-rose-50 text-ink-900 font-medium border border-warm-100"
                        >
                          Mañana
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Selector de Distrito con Tarifas de Delivery */}
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Distrito de Entrega (Lima Metropolitana) *
                    </label>
                    <select
                      required
                      value={selectedDistrict}
                      onChange={(e) => {
                        const dist = e.target.value;
                        setSelectedDistrict(dist);
                        const zone = deliveryZones.find((z) => z.district === dist);
                        if (zone) setDeliveryFee(zone.cost);
                      }}
                      className="w-full border border-warm-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-white text-ink-900 font-medium"
                    >
                      {deliveryZones.map((z) => (
                        <option key={z.id} value={z.district}>
                          {z.district} — S/ {z.cost.toFixed(2)} (Delivery oficial)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dirección Detallada */}
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Dirección Específica (Calle, Av., Nro, Dpto/Referencia) *
                    </label>
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Ej. Av. Larco 450, Dpto 402 (Ref: a media cuadra del parque)"
                      className="w-full border border-warm-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-white text-ink-900 placeholder:text-warm-500/60"
                    />
                  </div>

                  {/* Franja Horaria de Entrega */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-semibold text-ink-900">
                      Franja Horaria Preferida *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'Mañana (9:00 AM - 1:00 PM)', label: 'Mañana', time: '9:00 AM - 1:00 PM', icon: '🌅' },
                        { id: 'Tarde (2:00 PM - 6:00 PM)', label: 'Tarde', time: '2:00 PM - 6:00 PM', icon: '☀️' },
                        { id: 'Noche / Rango Especial (6:00 PM - 8:30 PM)', label: 'Noche', time: '6:00 PM - 8:30 PM', icon: '🌙' },
                      ].map((slot) => (
                        <button
                          type="button"
                          key={slot.id}
                          onClick={() => setSelectedTimeSlot(slot.id)}
                          className={`btn-tactile p-2 rounded-lg border text-left flex items-center gap-2 ${
                            selectedTimeSlot === slot.id
                              ? 'border-rose-600 bg-rose-100 ring-2 ring-rose-500/30 shadow-xs'
                              : 'border-warm-100 hover:bg-rose-50 bg-white'
                          }`}
                        >
                          <span className="text-base shrink-0">{slot.icon}</span>
                          <div>
                            <p className="font-bold text-[11px] text-ink-900 leading-tight">{slot.label}</p>
                            <p className="text-[9px] text-warm-500">{slot.time}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dedicatoria */}
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1">
                      Dedicatoria para la Tarjeta (Opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={checkoutDedication}
                      onChange={(e) => setCheckoutDedication(e.target.value)}
                      placeholder="Mensaje de amor, felicitación o cariño para adjuntar en la tarjeta de cortesía..."
                      className="w-full border border-warm-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 resize-none bg-white text-ink-900 placeholder:text-warm-500/60"
                    />
                    <p className="text-[10px] text-warm-500">
                      Incluye tarjeta de dedicatoria impresa de alta calidad de cortesía.
                    </p>
                  </div>
                </div>

                {/* 3. Fidelización y Fechas Especiales */}
                <div className="space-y-2 pt-1 border-t border-warm-100">
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                    3. Fidelización & Ocasión Especial
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-ink-900 mb-1">
                        ¿Qué celebramos hoy? (Opcional)
                      </label>
                      <select
                        value={celebrationReason}
                        onChange={(e) => setCelebrationReason(e.target.value)}
                        className="w-full border border-warm-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-white text-ink-900"
                      >
                        <option value="">Selecciona motivo...</option>
                        <option value="Cumpleaños">🎂 Cumpleaños</option>
                        <option value="Aniversario">💍 Aniversario</option>
                        <option value="Amor / Detalle">❤️ Amor / Detalle</option>
                        <option value="Agradecimiento">🙏 Agradecimiento</option>
                        <option value="Condolencias">🕊️ Condolencias / Respeto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink-900 mb-1">
                        Fecha especial a recordar (Opcional)
                      </label>
                      <input
                        type="date"
                        value={specialDateToRemember}
                        onChange={(e) => setSpecialDateToRemember(e.target.value)}
                        className="w-full border border-warm-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-500 bg-white text-ink-900"
                      />
                      <p className="text-[9px] text-warm-500 mt-0.5">
                        Te recordaremos cada año con días de anticipación.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Método de Pago con QR de Yape */}
                <div className="space-y-2 pt-1 border-t border-warm-100">
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                    4. Método de Pago
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
                        className={`btn-tactile p-2.5 rounded-lg border text-left ${
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
                    <div className="bg-rose-100 border border-rose-500 rounded-lg p-3.5 space-y-2.5 animate-in fade-in duration-200">
                      <div className="flex items-center gap-3">
                        <img
                          src={storeSettings?.yape_qr_url || '/images/qr-yape.png'}
                          alt="QR Yape Petalia"
                          className="w-20 h-20 rounded-md object-contain bg-white p-1 border border-warm-100 shadow-2xs shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/qr-yape.png';
                          }}
                        />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-ink-900">
                            Paga <span className="tabular-nums">S/ {grandTotal.toFixed(2)}</span> escaneando el QR
                          </p>
                          <p className="text-[11px] text-warm-500">
                            Número: <span className="tabular-nums font-bold text-ink-900">924 257 784</span> (PETALIA)
                          </p>
                          <button
                            type="button"
                            onClick={handleCopyYapePhone}
                            className="btn-tactile inline-flex items-center gap-1 bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 px-2.5 py-1 rounded-md text-[10px] font-semibold"
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
                    <div className="bg-rose-100 border border-warm-100 rounded-lg p-3 text-xs text-ink-900 space-y-1">
                      <p className="font-bold">Cuentas bancarias oficiales de PETALIA:</p>
                      <p className="text-[11px] text-warm-500">
                        • BCP / BBVA / Interbank (coordinación inmediata de cuenta al confirmar por WhatsApp).
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'efectivo' && (
                    <div className="bg-rose-100 border border-warm-100 rounded-lg p-3 text-xs text-ink-900 space-y-1">
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
                    className="btn-tactile w-full bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 font-semibold py-3.5 rounded-lg shadow-lg border border-ink-900 hover:border-rose-600 flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
                  >
                    {isSubmittingOrder ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Procesando tu pedido...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-rose-500" />
                        <span>Confirmar Pedido (<span className="tabular-nums">S/ {grandTotal.toFixed(2)}</span>)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE PERMANENTE DE WHATSAPP (Logo Oficial & Verde de Marca) */}
      <a
        href={`https://wa.me/${storeSettings?.whatsapp_number || WHATSAPP_NUMBER}?text=${encodeURIComponent(
          '¡Hola PETALIA! Deseo realizar una consulta sobre un arreglo floral 🌸'
        )}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-24 right-5 z-40 bg-[#25D366] hover:bg-[#20ba59] text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center transition transform hover:scale-105 active:scale-95 group border border-emerald-400/40"
        title="Consultar al WhatsApp de PETALIA"
      >
        <svg className="w-6 h-6 fill-white shrink-0" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-semibold pl-0 group-hover:pl-2">
          WhatsApp Ventas
        </span>
      </a>

      {/* BOTÓN FLOTANTE DEL CARRITO EN MÓVIL/DESKTOP CUANDO TIENE PRODUCTOS */}
      {totalCartItems > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="btn-tactile fixed bottom-6 left-5 z-40 bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 border border-rose-600/60"
          title="Abrir Carrito de Compras"
        >
          <div className="relative">
            <ShoppingCart className="w-4 h-4 text-rose-500" />
            <span className="tabular-nums absolute -top-2 -right-2 bg-accent-carmine text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
              {totalCartItems}
            </span>
          </div>
          <span className="text-xs font-semibold">
            Ver Carrito • S/ <span className="tabular-nums">{cartSubtotal.toFixed(2)}</span>
          </span>
        </button>
      )}

      {/* Asistente Virtual Inteligente (Chatbot IA) */}
      <ChatBot />

      {/* MODAL: Rastreo de Pedido en Tiempo Real */}
      {isTrackingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white border border-warm-100 max-w-lg w-full rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto animate-spring-modal card-editorial">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-warm-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shadow-2xs border border-warm-100">
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
                className="btn-tactile p-1.5 text-warm-500 hover:text-ink-900 rounded-lg hover:bg-rose-100"
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
                  className="w-full bg-rose-50 border border-warm-100 rounded-lg pl-10 pr-4 py-2.5 text-xs text-ink-900 font-mono uppercase placeholder:font-sans placeholder:text-warm-500/60 focus:outline-none focus:border-rose-600 focus:bg-white transition"
                />
              </div>
              <button
                type="submit"
                disabled={trackingLoading || !trackingInput.trim()}
                className="btn-tactile px-4 py-2.5 rounded-lg bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 text-xs font-semibold shadow disabled:opacity-50 flex items-center gap-1.5"
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
              <div className="bg-rose-100 border border-accent-carmine/30 rounded-lg p-4 text-xs text-accent-carmine space-y-1">
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
                <div className="bg-rose-50 border border-warm-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-warm-500">
                      Código de Seguimiento
                    </span>
                    <p className="text-lg font-bold tabular-nums text-ink-900">
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

                {/* LÍNEA DE TIEMPO VISUAL ESTRICTAMENTE HORIZONTAL (5 ETAPAS) */}
                <div className="bg-white border border-warm-100 rounded-lg p-4 sm:p-5 space-y-4 shadow-xs overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-rose-600" />
                      <span>Línea de Tiempo del Arreglo</span>
                    </h4>
                    <span className="text-[11px] text-warm-500 font-mono">
                      Seguimiento en vivo
                    </span>
                  </div>

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
                      { rank: 1, label: 'Recibido', desc: 'Registrado', icon: Sparkles },
                      { rank: 2, label: 'Confirmado', desc: 'Validado', icon: ShieldCheck },
                      { rank: 3, label: 'En Preparación', desc: 'Taller floral', icon: Flower2 },
                      { rank: 4, label: 'En Despacho', desc: 'Chofer en ruta', icon: Truck },
                      { rank: 5, label: 'Entregado', desc: 'Completado', icon: Heart },
                    ];

                    const progressPercent =
                      currentRank === 1 ? 0 : Math.min(100, ((currentRank - 1) / 4) * 100);

                    return (
                      <div className="relative py-3 px-1 overflow-hidden">
                        {/* Línea conectora base horizontal continua */}
                        <div className="absolute top-7 sm:top-8 left-6 right-6 h-1 bg-warm-100 -translate-y-1/2 z-0 rounded-full" />
                        
                        {/* Línea conectora activa iluminada con gradiente rose-500 a rose-600 */}
                        <div
                          className="absolute top-7 sm:top-8 left-6 h-1 bg-gradient-to-r from-rose-500 to-rose-600 -translate-y-1/2 z-0 rounded-full transition-all duration-500 ease-spring shadow-xs"
                          style={{
                            width: `calc(${progressPercent}% - ${progressPercent > 0 ? '16px' : '0px'})`,
                          }}
                        />

                        {/* 5 Pasos distribuidos uniformemente en una sola fila continua sin scrollbar */}
                        <div className="relative z-10 flex items-start justify-between w-full">
                          {stages.map((st) => {
                            const isCompleted = currentRank > st.rank;
                            const isCurrent = currentRank === st.rank;
                            const IconComp = st.icon;

                            return (
                              <div
                                key={st.rank}
                                className="flex flex-col items-center text-center flex-1 min-w-0 px-0.5"
                              >
                                <div
                                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-spring ${
                                    isCompleted
                                      ? 'bg-ink-900 text-white shadow-xs'
                                      : isCurrent
                                      ? 'bg-rose-500 text-ink-900 ring-4 ring-rose-100 shadow-md scale-110 font-bold animate-rose-pulse'
                                      : 'bg-warm-100 text-warm-500'
                                  }`}
                                >
                                  {isCompleted ? (
                                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                                  ) : (
                                    <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  )}
                                </div>
                                <span
                                  className={`mt-2 text-[10px] sm:text-xs font-semibold leading-tight line-clamp-1 ${
                                    isCurrent
                                      ? 'text-rose-600 font-bold'
                                      : isCompleted
                                      ? 'text-ink-900'
                                      : 'text-warm-500'
                                  }`}
                                >
                                  {st.label}
                                </span>
                                <span className="hidden sm:block text-[9px] text-warm-500 mt-0.5 truncate max-w-full">
                                  {st.desc}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Resumen del Arreglo y Destinatario */}
                <div className="bg-rose-50 rounded-lg p-4 border border-warm-100 space-y-2 text-xs">
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
                    <span className="font-bold text-ink-900 tabular-nums text-sm">
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
                  className="btn-tactile w-full bg-ink-900 hover:bg-rose-600 text-white hover:text-ink-900 font-semibold py-3 rounded-lg shadow-md flex items-center justify-center gap-2 text-xs border border-ink-900 hover:border-rose-600"
                >
                  <MessageCircle className="w-4 h-4 fill-current opacity-80" />
                  <span>Consultar por WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Editorial de Alta Gama */}
      <Footer
        onOpenTracking={() => {
          setTrackingError(null);
          setIsTrackingModalOpen(true);
        }}
        whatsappNumber={storeSettings?.whatsapp_number || WHATSAPP_NUMBER}
        instagramUrl={storeSettings?.instagram_url || 'https://instagram.com/petalia.pe'}
        facebookUrl={storeSettings?.facebook_url || 'https://facebook.com/petalia.pe'}
        tiktokUrl={storeSettings?.tiktok_url || 'https://tiktok.com/@petalia.pe'}
        logoUrl={storeSettings?.logo_url}
      />
    </div>
  );
}
