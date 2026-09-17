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
import CampaignSection from '@/components/CampaignSection';
import CampaignBanner from '@/components/CampaignBanner';
import ClientReviewsCarousel from '@/components/ClientReviewsCarousel';
import EditorialProductImage from '@/components/EditorialProductImage';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}
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
import {
  DEFAULT_WHATSAPP_NUMBER,
  createWhatsAppLink,
  generateOrderWhatsAppMessage,
} from '@/lib/whatsapp';
import { getDeliveryZones } from '@/lib/delivery';
import ChatBot from '@/components/ChatBot';
import OrderTrackingModal from '@/components/OrderTrackingModal';

const WHATSAPP_NUMBER = DEFAULT_WHATSAPP_NUMBER;

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

  useEffect(() => {
    const isAnyCartModalOpen = isCartOpen || isCheckoutModalOpen;
    if (typeof window !== 'undefined') {
      if (isAnyCartModalOpen) {
        document.body.classList.add('cart-drawer-open');
      } else {
        document.body.classList.remove('cart-drawer-open');
      }
      window.dispatchEvent(
        new CustomEvent('rozier:cart-toggle', { detail: { isOpen: isAnyCartModalOpen } })
      );
    }
    return () => {
      if (typeof window !== 'undefined') {
        document.body.classList.remove('cart-drawer-open');
      }
    };
  }, [isCartOpen, isCheckoutModalOpen]);

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
  const categoriesNavRef = useRef<HTMLDivElement>(null);
  const catalogSectionRef = useRef<HTMLElement>(null);
  const isInitialScrollTriggerDone = useRef(false);

  const scrollCelebration = (direction: 'left' | 'right') => {
    if (celebrationCarouselRef.current) {
      const amount = direction === 'left' ? -320 : 320;
      celebrationCarouselRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const scrollCategoriesNav = (direction: 'left' | 'right') => {
    if (categoriesNavRef.current) {
      const amount = direction === 'left' ? -260 : 260;
      categoriesNavRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Campaña promocional activa
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);

  // Expansión de límite de filas (Ver catálogo completo / Mostrar menos)
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);

  useEffect(() => {
    setIsCategoryExpanded(false);
  }, [category]);

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
        const results = await Promise.allSettled([
          supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
          getCategories(),
          getStoreSettings(),
          getDeliveryZones(false),
          getCategoryBanners(),
          getActiveCampaign(),
          getHeroSlides(),
        ]);

        const prodsRes = results[0].status === 'fulfilled' ? results[0].value : null;
        const catsData = results[1].status === 'fulfilled' ? results[1].value : [];
        const settingsData = results[2].status === 'fulfilled' ? results[2].value : null;
        const zonesData = results[3].status === 'fulfilled' ? results[3].value : [];
        const bannersData = results[4].status === 'fulfilled' ? results[4].value : [];
        const campaignData = results[5].status === 'fulfilled' ? results[5].value : null;
        const slidesData = results[6].status === 'fulfilled' ? results[6].value : [];

        if (prodsRes && !prodsRes.error && prodsRes.data) {
          setProducts(prodsRes.data as Product[]);
        }
        if (catsData && catsData.length > 0) {
          setCategories(catsData);
        }
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
        try {
          const addonsData = await getSpecialAddons();
          if (addonsData && addonsData.length > 0) {
            setSpecialAddons(addonsData);
          }
        } catch (addonsErr) {
          console.warn('Error cargando special addons:', addonsErr);
        }
        if (zonesData && zonesData.length > 0) {
          setDeliveryZones(zonesData);
          const defaultZone = zonesData.find(
            (z: any) => z.district?.toLowerCase() === 'miraflores'
          ) || zonesData[0];
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
      const savedCart = localStorage.getItem('rozier_cart') || localStorage.getItem('petalia_cart');
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
      .channel('rozier-store-realtime')
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
      localStorage.setItem('rozier_cart', JSON.stringify(newCart));
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

  // Función de coincidencia inteligente de categorías con soporte para alias y variaciones
  const isMatchCategory = (prodCat: string, targetSlug: string, prodName?: string) => {
    const cleanProd = (prodCat || '').toLowerCase().trim();
    const cleanTarget = (targetSlug || '').toLowerCase().trim();
    if (!cleanTarget || cleanTarget === 'todos') return true;
    if (cleanProd === cleanTarget) return true;

    // Normalización de tildes y caracteres
    const normProd = cleanProd.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normTarget = cleanTarget.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normProd === normTarget) return true;

    // Aliases frecuentes en floristería de lujo
    if (normTarget === 'detalles') {
      if (['box', 'cajas', 'peluche', 'peluches', 'adicionales', 'globos', 'chocolates', 'detalles'].includes(normProd)) return true;
      if (prodName && /detalle|box|caja|peluche|globo|chocolate|vino|licor/i.test(prodName)) return true;
    }
    if (normTarget === 'box' || normTarget === 'cajas') {
      if (['box', 'cajas', 'caja'].includes(normProd)) return true;
    }
    if (normTarget === 'ramos' || normTarget === 'bouquets') {
      if (['ramos', 'bouquets', 'bouquet', 'ramo'].includes(normProd)) return true;
    }
    if (normTarget === 'rosas') {
      if (normProd.includes('rosa')) return true;
      if (prodName && /rosa/i.test(prodName)) return true;
    }
    if (normTarget === 'tulipanes') {
      if (normProd.includes('tulipan')) return true;
      if (prodName && /tulip/i.test(prodName)) return true;
    }
    if (normTarget === 'girasoles') {
      if (normProd.includes('girasol')) return true;
      if (prodName && /girasol/i.test(prodName)) return true;
    }
    if (normTarget === 'orquideas') {
      if (normProd.includes('orquid')) return true;
      if (prodName && /orquid/i.test(prodName)) return true;
    }
    if (normTarget === 'canastas') {
      if (normProd.includes('canasta')) return true;
      if (prodName && /canasta/i.test(prodName)) return true;
    }

    return false;
  };

  // Píldoras de categorías dinámicas: sólo aquellas con productos activos en Supabase
  const activeCategories = categories.filter((cat) =>
    products.some((p) => isMatchCategory(p.category || '', cat.slug, p.name))
  );

  const filteredProducts =
    category === 'todos'
      ? products
      : products.filter((p) => isMatchCategory(p.category || '', category, p.name));

  // Agrupación de productos por categoría desde public.categories para carruseles de 1 sola fila en "Todos"
  const categoryGroups = (
    activeCategories.length > 0
      ? activeCategories
      : categories
  )
    .map((cat) => ({
      ...cat,
      products: products.filter((p) => isMatchCategory(p.category || '', cat.slug, p.name)),
    }))
    .filter((g) => g.products.length > 0);

  // Incluir productos con slug no mapeado en otras creaciones si existen
  const unmappedProducts = products.filter(
    (p) =>
      !categoryGroups.some((g) => isMatchCategory(p.category || '', g.slug, p.name))
  );
  if (unmappedProducts.length > 0) {
    categoryGroups.push({
      id: 'otros',
      name: 'Otras Creaciones',
      slug: 'otros',
      products: unmappedProducts,
    });
  }

  // Arreglos representativos para "Todas" (al menos 2 de cada categoría activa para garantizar variedad visual)
  const representativeProducts: Product[] = [];
  const repSeenIds = new Set<string>();

  categoryGroups.forEach((group) => {
    let count = 0;
    for (const p of group.products) {
      if (!repSeenIds.has(p.id) && count < 2) {
        representativeProducts.push(p);
        repSeenIds.add(p.id);
        count++;
      }
    }
  });

  // Completar con el resto de productos de la tienda
  for (const p of products) {
    if (!repSeenIds.has(p.id)) {
      representativeProducts.push(p);
      repSeenIds.add(p.id);
    }
  }

  // Entrada escalonada con GSAP ScrollTrigger para las tarjetas de productos
  useEffect(() => {
    if (typeof window === 'undefined' || loading) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sectionEl = catalogSectionRef.current;
    if (!sectionEl) return;

    const cards = sectionEl.querySelectorAll('.product-grid-card');
    if (cards.length === 0) return;

    if (prefersReducedMotion) {
      gsap.set(cards, { opacity: 1, y: 0 });
      return;
    }

    if (!isInitialScrollTriggerDone.current) {
      // Entrada inicial con ScrollTrigger al entrar al viewport (stagger ~0.06s, duración ~0.38s)
      const st = ScrollTrigger.create({
        trigger: sectionEl,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          isInitialScrollTriggerDone.current = true;
          gsap.fromTo(
            cards,
            { opacity: 0, y: 16 },
            {
              opacity: 1,
              y: 0,
              duration: 0.38,
              stagger: 0.06,
              ease: 'power1.out',
              clearProps: 'transform',
            }
          );
        },
      });

      return () => {
        st.kill();
      };
    } else {
      // Transición sutil al cambiar de categoría (sin re-disparar ScrollTrigger brusco)
      gsap.fromTo(
        cards,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.25,
          stagger: 0.03,
          ease: 'power1.out',
          clearProps: 'transform',
        }
      );
    }
  }, [category, isCatalogExpanded, isCategoryExpanded, loading, representativeProducts.length, filteredProducts.length]);

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

      // 4. Construir mensaje oficial preformateado de WhatsApp
      const trackingLink =
        typeof window !== 'undefined'
          ? `${window.location.origin}/?track=${trackingCode}`
          : `https://petalia-web.vercel.app/?track=${trackingCode}`;

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
        deliveryDate: checkoutDeliveryDate,
        deliveryTimeSlot: selectedTimeSlot,
        totalAmount: finalTotalAmount,
        paymentMethod,
        dedicationMessage: checkoutDedication.trim(),
        extraItems: extraItemsList,
        trackingUrl: trackingLink,
      });

      const targetWhatsappNumber = storeSettings?.whatsapp_number || DEFAULT_WHATSAPP_NUMBER;
      const whatsappUrl = createWhatsAppLink(targetWhatsappNumber, waMessage);

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
        className={`product-grid-card group bg-white/95 rounded-2xl border border-[#E8D5DC] card-editorial p-3 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:border-[#B85D6F] hover:shadow-lg h-full ${
          inCarousel
            ? 'snap-start shrink-0 min-w-[220px] md:min-w-[260px] w-[220px] md:w-[260px]'
            : 'w-full'
        }`}
      >
        {/* Contenedor de Imagen Editorial con Shimmer y Ken Burns */}
        <EditorialProductImage
          src={product.image_url}
          alt={product.name}
          aspect="aspect-[4/5]"
          rounded="rounded-xl"
          className="border border-[#F0E0E6]"
          loading="lazy"
          onClick={() => {
            setSelectedProduct(product);
            setModalQuantity(1);
            setDeliveryDate('');
            setDedication('');
          }}
        >
          {/* Insignia Oferta */}
          {hasPromo && (
            <span className="absolute top-2 left-2 bg-[#FDE8EC] text-[#9B324D] border border-[#F0B8C6] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs">
              OFERTA
            </span>
          )}

          {/* Insignia Categoría */}
          <span className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-md text-white text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-md uppercase">
            {catBadgeName}
          </span>
        </EditorialProductImage>

        {/* Detalle del Arreglo Floral */}
        <div className="pt-3 flex-1 flex flex-col justify-between space-y-2.5">
          <div
            onClick={() => {
              setSelectedProduct(product);
              setModalQuantity(1);
              setDeliveryDate('');
              setDedication('');
            }}
            className="cursor-pointer"
          >
            <h3 className="font-bold text-xs sm:text-sm text-[#2D1B22] line-clamp-1 group-hover:text-[#B85D6F] transition tracking-tight">
              {product.name}
            </h3>
            <p className="text-[11px] text-[#7A4B58] line-clamp-1 mt-0.5">
              {product.description || 'Detalle floral exclusivo'}
            </p>
          </div>

          {/* Jerarquía de Precios (tabular-nums & WCAG AA) */}
          <div className="flex items-baseline justify-between pt-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-bold text-[#2D1B22] tabular-nums">
                S/ {finalPrice.toFixed(2)}
              </span>
              {hasPromo && (
                <span className="text-xs text-[#8B6B75] line-through tabular-nums">
                  S/ {product.price.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* BOTÓN PRINCIPAL Y SELECTOR DE CANTIDAD */}
          <div className="pt-2 border-t border-[#F0E0E6]">
            {cartItem ? (
              <div className="flex items-center justify-between bg-[#F5E5EA] border border-[#DFC0CB] rounded-xl p-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateCartQuantity(product.id, -1);
                  }}
                  className="btn-tactile w-7 h-7 rounded-lg bg-white text-[#3B1E26] hover:bg-rose-50 flex items-center justify-center shadow-2xs border border-[#DFC0CB]"
                  title="Disminuir"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold text-[#2D1B22] tabular-nums px-2">
                  {cartItem.quantity} en carrito
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateCartQuantity(product.id, 1);
                  }}
                  className="btn-tactile w-7 h-7 rounded-lg bg-[#B85D6F] text-white hover:bg-[#9B4858] flex items-center justify-center shadow-2xs"
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
                className="btn-tactile w-full flex items-center justify-center gap-2 bg-[#B85D6F] hover:bg-[#9B4858] text-white py-2.5 px-3 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98]"
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
    <div className="min-h-screen bg-rose-50 text-ink-900 font-sans pb-28 selection:bg-rose-500 selection:text-ink-900 overflow-x-hidden w-full relative max-w-full">
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

      {/* 1. FILTROS Y SEGMENTACIÓN DE CATEGORÍAS (Pestañas de Navegación Palo Rosa con Flechas) */}
      <nav id="catalogo" aria-label="Categorías" className="sticky top-[57px] sm:top-[61px] z-20 bg-[#F7E8EC]/95 backdrop-blur-md border-y border-[#E8D5DC] py-3 shadow-2xs">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 flex items-center gap-2">
          {/* Flecha Izquierda */}
          <button
            type="button"
            onClick={() => scrollCategoriesNav('left')}
            className="btn-tactile shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FAF2F4] hover:bg-[#B85D6F] text-[#8B3B4D] hover:text-white border border-[#DFC0CB] shadow-2xs flex items-center justify-center transition-all cursor-pointer"
            title="Desplazar categorías a la izquierda"
            aria-label="Desplazar categorías a la izquierda"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </button>

          {/* Contenedor de Píldoras con scroll suave */}
          <div
            ref={categoriesNavRef}
            className="flex-1 flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1"
          >
            {/* Pestaña "Todas" */}
            <button
              onClick={() => setCategory('todos')}
              className={`btn-tactile px-5 py-2.5 rounded-full whitespace-nowrap text-sm md:text-base font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                category === 'todos'
                  ? 'bg-[#B85D6F] text-white shadow-md scale-105'
                  : 'bg-[#EBD2DA] text-[#3B1E26] hover:scale-105 hover:bg-[#DFC0CB]'
              }`}
            >
              TODAS
            </button>

            {/* Pestañas Dinámicas conectadas a public.categories */}
            {activeCategories.map((tab) => {
              const isActive = category.toLowerCase() === tab.slug.toLowerCase();
              return (
                <button
                  key={tab.id}
                  onClick={() => setCategory(tab.slug)}
                  className={`btn-tactile px-5 py-2.5 rounded-full whitespace-nowrap text-sm md:text-base font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#B85D6F] text-white shadow-md scale-105'
                      : 'bg-[#EBD2DA] text-[#3B1E26] hover:scale-105 hover:bg-[#DFC0CB]'
                  }`}
                >
                  {tab.name.toUpperCase()}
                </button>
              );
            })}
          </div>

          {/* Flecha Derecha */}
          <button
            type="button"
            onClick={() => scrollCategoriesNav('right')}
            className="btn-tactile shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FAF2F4] hover:bg-[#B85D6F] text-[#8B3B4D] hover:text-white border border-[#DFC0CB] shadow-2xs flex items-center justify-center transition-all cursor-pointer"
            title="Desplazar categorías a la derecha"
            aria-label="Desplazar categorías a la derecha"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </button>
        </div>
      </nav>

      {/* 2. SELECCIÓN EN VIVO (Catálogo de Arreglos Florales con Límite de 2 Filas y Expansión) */}
      <main id="seleccion-en-vivo" ref={catalogSectionRef} className="max-w-6xl mx-auto px-3 sm:px-4 py-8 sm:py-10 space-y-8">
        {/* Encabezado Editorial */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[#E8D5DC] pb-3">
          <div>
            <span className="text-[11px] uppercase tracking-widest font-semibold text-[#8B3B4D]">
              Selección en Vivo
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#2D1B22] font-normal tracking-tight">
              {category === 'todos'
                ? 'Todas las Colecciones'
                : activeCategories.find((c) => c.slug.toLowerCase() === category.toLowerCase())?.name || category}
            </h2>
            <p className="text-xs sm:text-sm text-[#5A3844] mt-1">
              Diseños florales de autor elaborados artesanalmente con flores frescas de exportación.
            </p>
          </div>
          <span className="text-xs text-[#7A4B58] font-mono mt-1 sm:mt-0 font-medium">
            {category === 'todos' ? representativeProducts.length : filteredProducts.length}{' '}
            {(category === 'todos' ? representativeProducts.length : filteredProducts.length) === 1 ? 'diseño' : 'diseños'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#E8D5DC] card-editorial p-2.5 sm:p-3 flex flex-col space-y-3 overflow-hidden"
              >
                <div className="aspect-[4/5] w-full rounded-lg skeleton-brand shrink-0" />
                <div className="space-y-2 flex-1 pt-1">
                  <div className="h-4 w-3/4 rounded-md skeleton-brand" />
                  <div className="h-3 w-1/2 rounded-md skeleton-brand" />
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-[#E8D5DC]">
                  <div className="h-5 w-16 rounded-md skeleton-brand" />
                  <div className="h-8 w-24 rounded-md skeleton-brand" />
                </div>
              </div>
            ))}
          </div>
        ) : category === 'todos' ? (
          /* Vista "Todas": Límite de 2 Filas (8 items en desktop / 4 en móvil) con Representatividad */
          representativeProducts.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border border-[#E8D5DC] card-editorial p-8 space-y-3 shadow-xs">
              <Flower2 className="w-12 h-12 text-[#B85D6F] mx-auto stroke-1" />
              <p className="text-sm font-bold text-[#2D1B22]">
                No hay arreglos disponibles en este momento.
              </p>
              <p className="text-xs text-[#7A4B58]">
                Estamos preparando nuevos diseños florales. Consúltanos directamente por WhatsApp.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Grilla de productos: 2 filas compactas (8 items) o catálogo completo */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch animate-in fade-in duration-300">
                {(isCatalogExpanded ? representativeProducts : representativeProducts.slice(0, 8)).map(
                  (product) => renderProductCard(product, false)
                )}
              </div>

              {/* Botón Central de Expansión / Contracción */}
              {representativeProducts.length > 8 && (
                <div className="text-center pt-4 pb-2">
                  {isCatalogExpanded ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCatalogExpanded(false);
                        const catNav = document.getElementById('catalogo');
                        if (catNav) catNav.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="btn-tactile inline-flex items-center gap-2 px-8 py-3 rounded-full border border-[#B85D6F] text-[#8B3B4D] hover:bg-[#F5E5EA] text-xs sm:text-sm font-bold shadow-2xs transition-all active:scale-[0.98]"
                    >
                      <span>Mostrar menos ↑</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCatalogExpanded(true)}
                      className="btn-tactile inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#B85D6F] hover:bg-[#9B4858] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                    >
                      <span>Ver catálogo completo ({representativeProducts.length} diseños) ↓</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        ) : (
          /* Vista de Categoría Específica Seleccionada */
          <div className="space-y-8">
            {filteredProducts.length === 0 ? (
              <div className="space-y-6">
                <div className="text-center py-14 bg-white rounded-2xl border border-[#E8D5DC] card-editorial p-8 space-y-3 shadow-xs">
                  <Flower2 className="w-12 h-12 text-[#B85D6F] mx-auto stroke-1" />
                  <p className="text-sm font-bold text-[#2D1B22]">
                    No encontramos arreglos específicos para esta selección.
                  </p>
                  <p className="text-xs text-[#7A4B58]">
                    Explora otras colecciones o revisa algunos de nuestros diseños más solicitados:
                  </p>
                  <button
                    onClick={() => setCategory('todos')}
                    className="btn-tactile px-5 py-2.5 rounded-full bg-[#B85D6F] hover:bg-[#9B4858] text-white text-xs font-bold shadow-xs transition-all inline-block mt-2"
                  >
                    Ver catálogo completo
                  </button>
                </div>
                {representativeProducts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-[#8B3B4D] font-bold">
                      Diseños sugeridos para ti
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch">
                      {representativeProducts.slice(0, 4).map((product) => renderProductCard(product, false))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Grilla de productos: 2 filas compactas (8 items) o categoría completa */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-stretch animate-in fade-in duration-300">
                  {(isCategoryExpanded ? filteredProducts : filteredProducts.slice(0, 8)).map(
                    (product) => renderProductCard(product, false)
                  )}
                </div>

                {/* Botón Central de Expansión por Categoría */}
                {filteredProducts.length > 8 && (
                  <div className="text-center pt-4 pb-2">
                    {isCategoryExpanded ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCategoryExpanded(false);
                          const catNav = document.getElementById('catalogo');
                          if (catNav) catNav.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="btn-tactile inline-flex items-center gap-2 px-8 py-3 rounded-full border border-[#B85D6F] text-[#8B3B4D] hover:bg-[#F5E5EA] text-xs sm:text-sm font-bold shadow-2xs transition-all active:scale-[0.98]"
                      >
                        <span>Mostrar menos ↑</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsCategoryExpanded(true)}
                        className="btn-tactile inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#B85D6F] hover:bg-[#9B4858] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                      >
                        <span>
                          Ver más arreglos de esta colección ({filteredProducts.length - 8} más) ↓
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. COLECCIONES EXCLUSIVAS / CELEBRACIONES */}
      {/* Ocasiones Más Solicitadas (Cards con Overlay) */}
      <TopOccasions
        onSelectOccasion={(slug) => {
          setCategory(slug);
          const catNav = document.getElementById('catalogo');
          if (catNav) catNav.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Sección "¿Qué quieres celebrar?" (Carrusel Editorial con Flechas de Navegación) */}
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
              El detalle floral exclusivo con el sello de lujo de ROZIER.
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
                  <div className="min-w-[260px] md:min-w-[300px]">
                    <EditorialProductImage
                      src={banner.image_url}
                      alt={banner.title}
                      aspect="aspect-[3/4]"
                      rounded="rounded-2xl"
                      className="border border-[#E8D5DC] card-editorial shadow-xs"
                      loading="lazy"
                    >
                      {/* Badge flotante en la foto */}
                      <div className="absolute top-4 left-4">
                        <span className="bg-[#B85D6F]/90 backdrop-blur-sm text-white text-xs font-medium px-3.5 py-1.5 rounded-full shadow-xs">
                          {banner.badge_text}
                        </span>
                      </div>
                    </EditorialProductImage>
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

      {/* Campaña Activa con Contador Regresivo en Vivo */}
      <CampaignBanner
        allProducts={products}
        onCtaClick={() => {
          const el = document.getElementById('catalogo');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onProductClick={(product) => {
          setSelectedProduct(product);
          setModalQuantity(1);
        }}
        onAddToCart={(product) => {
          addToCart(product, 1);
        }}
      />

      {/* 4. Hero Secundario — Efecto "Pinned Scroll Unfold" */}
      <PinnedScrollUnfold
        onExploreClick={() => {
          const el = document.getElementById('catalogo');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 5. Sección Momentos Reales — Carrusel Continuo de Clientes Felices */}
      <ClientReviewsCarousel />

      {/* MODAL: Vista Previa y Personalización de Producto */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-[#FAF2F4] w-full sm:max-w-md rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto border border-[#DFC0CB] card-editorial animate-spring-modal">
            <div className="flex justify-between items-center border-b border-[#DFC0CB] pb-3">
              <div>
                <h3 className="font-bold text-base text-ink-900 tracking-tight">{selectedProduct.name}</h3>
                <p className="text-xs text-warm-500">
                  {selectedProduct.category ? `Colección: ${selectedProduct.category}` : 'Alta Floristería ROZIER'}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="btn-tactile p-1.5 rounded-lg text-[#8B3B4D] hover:text-[#2D1B22] hover:bg-[#F5E5EA] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Arreglo Preview Editorial */}
            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-[#DFC0CB] shadow-xs">
              <EditorialProductImage
                src={selectedProduct.image_url}
                alt={selectedProduct.name}
                aspect="aspect-[16/10]"
                rounded="rounded-lg"
                loading="eager"
                className="shadow-2xs border border-[#DFC0CB]"
              >
                {selectedProduct.promotional_price && (
                  <span className="absolute top-2.5 left-2.5 bg-[#FDE8EC] text-[#9B324D] border border-[#F0B8C6] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs">
                    OFERTA ESPECIAL
                  </span>
                )}
                <span className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-semibold tracking-wider px-2.5 py-0.5 rounded-md uppercase">
                  {selectedProduct.category || 'Colección ROZIER'}
                </span>
              </EditorialProductImage>

              <div className="flex items-start justify-between gap-3 pt-1">
                <p className="text-xs text-warm-500 leading-relaxed flex-1">
                  {selectedProduct.description || 'Diseño floral artesanal con flores frescas de exportación seleccionadas a mano.'}
                </p>
                <div className="text-right shrink-0">
                  <div className="flex items-baseline gap-1.5 justify-end">
                    <span className="text-[#8B3B4D] font-bold text-xl tabular-nums">
                      S/ {(selectedProduct.promotional_price || selectedProduct.price).toFixed(2)}
                    </span>
                  </div>
                  {selectedProduct.promotional_price && (
                    <span className="text-xs text-warm-500 line-through tabular-nums block">
                      S/ {selectedProduct.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Selector de Cantidad */}
            <div className="bg-white p-3.5 rounded-xl border border-[#DFC0CB] shadow-xs flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">Cantidad deseada:</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalQuantity((prev) => Math.max(1, prev - 1))}
                  className="btn-tactile w-8 h-8 rounded-lg bg-[#FAF2F4] border border-[#DFC0CB] text-[#3D1E26] hover:bg-[#F5E5EA] flex items-center justify-center font-bold transition"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-bold tabular-nums text-ink-900 w-6 text-center">
                  {modalQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setModalQuantity((prev) => prev + 1)}
                  className="btn-tactile w-8 h-8 rounded-lg bg-[#B85D6F] text-white hover:bg-[#9B4858] flex items-center justify-center font-bold transition shadow-xs"
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
                className="btn-tactile w-full bg-[#B85D6F] hover:bg-[#9B4858] text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs border border-[#A85062] transition-all"
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
                className="btn-tactile w-full bg-[#8B3B4D] hover:bg-[#732F3E] text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs border border-[#7A3242] transition-all"
              >
                <ArrowRight className="w-4 h-4 text-white" />
                <span>Comprar Ahora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER LATERAL: Carrito de Compras */}
      {isCartOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCartOpen(false);
          }}
          className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex justify-end overflow-hidden animate-in fade-in duration-200"
        >
          <div className="bg-[#FAF2F4] w-full max-w-md h-full shadow-2xl flex flex-col animate-spring-drawer border-l border-[#DFC0CB] overflow-hidden relative z-[1000]">
            {/* Header del Carrito */}
            <div className="p-4 sm:p-5 border-b border-[#DFC0CB] flex items-center justify-between bg-[#F5E5EA]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white text-[#B85D6F] flex items-center justify-center border border-[#DFC0CB] shadow-xs">
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
                className="btn-tactile p-2 text-[#8B3B4D] hover:text-[#2D1B22] hover:bg-[#FAF2F4] rounded-lg transition"
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
                    className="btn-tactile px-5 py-2.5 rounded-xl bg-[#B85D6F] hover:bg-[#9B4858] text-white text-xs font-bold shadow-md transition"
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
                      className="bg-white border border-[#DFC0CB] rounded-xl p-3 flex gap-3 items-center hover:border-[#B85D6F] transition shadow-xs"
                    >
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-16 h-16 rounded-lg object-cover border border-[#DFC0CB] shadow-2xs shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-ink-900 truncate tracking-tight">
                          {item.product.name}
                        </h4>
                        <p className="text-[11px] text-[#8B3B4D] font-semibold tabular-nums mt-0.5">
                          S/ {finalPrice.toFixed(2)} c/u
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center border border-[#DFC0CB] bg-[#FAF2F4] rounded-lg">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.product.id, -1)}
                              className="btn-tactile p-1 hover:bg-[#F5E5EA] text-[#3D1E26] rounded-l-lg transition"
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
                              className="btn-tactile p-1 hover:bg-[#F5E5EA] text-[#3D1E26] rounded-r-lg transition"
                              title="Aumentar"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="btn-tactile text-warm-500 hover:text-accent-carmine p-1 transition"
                            title="Eliminar del carrito"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold tabular-nums text-sm text-[#8B3B4D] block">
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
              <div className="px-4 sm:px-5 py-3 border-t border-[#DFC0CB] bg-[#F5E5EA]/70">
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
                                  className="btn-tactile w-5 h-5 rounded-md bg-[#B85D6F] text-white flex items-center justify-center hover:bg-[#9B4858] text-xs font-bold shadow-2xs"
                                  title="Añadir más"
                                >
                                  +
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleAddOn(addon.id)}
                                className="btn-tactile w-6 h-6 rounded-md bg-[#B85D6F] hover:bg-[#9B4858] text-white flex items-center justify-center shadow-xs"
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
              <div className="p-4 sm:p-5 border-t border-[#DFC0CB] bg-[#F5E5EA] space-y-3 shrink-0 relative z-20">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-warm-500">
                    <span>Subtotal arreglos:</span>
                    <span className="tabular-nums font-semibold text-ink-900">
                      S/ {cartSubtotal.toFixed(2)}
                    </span>
                  </div>
                  {totalAddonsCount > 0 && (
                    <div className="flex justify-between items-center text-xs text-[#8B3B4D] font-medium">
                      <span>Complementos ({totalAddonsCount}):</span>
                      <span className="tabular-nums font-semibold">
                        + S/ {addOnsSubtotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="pt-1.5 pb-0.5 space-y-1.5">
                    <div className="flex justify-between items-center text-xs text-warm-500">
                      <span className="flex items-center gap-1 font-medium text-ink-900">
                        <Truck className="w-3.5 h-3.5 text-[#B85D6F]" />
                        <span>Flete de envío:</span>
                      </span>
                      <span className="text-ink-900 font-bold tabular-nums">
                        S/ {deliveryFee.toFixed(2)}
                      </span>
                    </div>
                    <select
                      value={selectedDistrict}
                      onChange={(e) => {
                        const dist = e.target.value;
                        setSelectedDistrict(dist);
                        const zone = deliveryZones.find((z) => z.district === dist);
                        if (zone) setDeliveryFee(zone.cost);
                      }}
                      className="w-full bg-white border border-[#DFC0CB] rounded-xl px-2.5 py-1.5 text-xs text-ink-900 font-medium focus:outline-none focus:border-[#B85D6F] cursor-pointer"
                    >
                      {deliveryZones
                        .filter((z) => z.active !== false && z.is_active !== false)
                        .map((z) => (
                          <option key={z.id} value={z.district}>
                            {z.district} — S/ {z.cost.toFixed(2)}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-[#DFC0CB] text-sm">
                    <span className="font-bold text-ink-900">Total a pagar:</span>
                    <span className="font-bold tabular-nums text-lg text-[#9B324D]">
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
                    className="btn-tactile w-full bg-[#B85D6F] hover:bg-[#9B4858] text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm border border-[#A85062] transition-all"
                  >
                    <span>Continuar compra</span>
                    <ArrowRight className="w-4 h-4 text-white" />
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
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-[#FAF2F4] border border-[#DFC0CB] max-w-xl w-full rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto animate-spring-modal card-editorial">
            {orderSuccessData ? (
              /* PANTALLA DE ÉXITO DE COMPRA */
              <div className="text-center space-y-4 py-4 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-white text-[#B85D6F] flex items-center justify-center mx-auto shadow-xs border border-[#DFC0CB]">
                  <CheckCircle2 className="w-8 h-8 text-[#B85D6F]" />
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
                <div className="bg-white border border-[#DFC0CB] rounded-xl p-4 max-w-sm mx-auto space-y-2 shadow-xs">
                  <span className="text-[11px] font-semibold text-warm-500 uppercase tracking-wider block">
                    Tu Código de Rastreo en Vivo
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-bold tabular-nums text-[#8B3B4D]">
                      {orderSuccessData.trackingCode}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(orderSuccessData.trackingCode);
                        alert('¡Código de rastreo copiado!');
                      }}
                      className="btn-tactile p-1.5 rounded-md bg-[#FAF2F4] border border-[#DFC0CB] hover:bg-[#F5E5EA] text-[#3D1E26] transition"
                      title="Copiar código"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-warm-500">
                    Guarda este código para consultar el estado de elaboración y entrega de tus flores.
                  </p>
                </div>

                {/* Botón Acción Directa WhatsApp */}
                <div className="space-y-2 pt-2 max-w-md mx-auto">
                  <a
                    href={orderSuccessData.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-tactile w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm border border-emerald-400/30 transition"
                  >
                    <MessageCircle className="w-5 h-5 fill-current opacity-90" />
                    <span>Enviar Comprobante a WhatsApp</span>
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
                    className="btn-tactile w-full py-2.5 rounded-xl border border-[#DFC0CB] bg-white hover:bg-[#F5E5EA] text-[#3D1E26] text-xs font-semibold transition"
                  >
                    Ver Rastreo en Vivo
                  </button>
                </div>
              </div>
            ) : (
              /* FORMULARIO DE FINALIZACIÓN DE COMPRA */
              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#DFC0CB] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#2D1B22] text-[#E5C378] flex items-center justify-center shadow-xs border border-[#E5C378]/30">
                      <CreditCard className="w-4 h-4 text-[#E5C378]" />
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
                    className="btn-tactile p-1.5 text-[#8B3B4D] hover:text-[#2D1B22] rounded-lg hover:bg-[#F5E5EA] transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Resumen Compacto y Desglose Económico */}
                <div className="bg-white rounded-xl p-3.5 border border-[#DFC0CB] space-y-2.5 shadow-xs">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-ink-900">Desglose del Pedido:</span>
                    <span className="tabular-nums font-bold text-[#8B3B4D] text-sm">
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
                      {deliveryZones
                        .filter((z) => z.active !== false && z.is_active !== false)
                        .map((z) => (
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
                          alt="QR Yape ROZIER"
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
                            Número: <span className="tabular-nums font-bold text-ink-900">924 257 784</span> (ROZIER)
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
                      <p className="font-bold">Cuentas bancarias oficiales de ROZIER:</p>
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
                    className="btn-tactile w-full bg-gradient-to-r from-[#B85D6F] to-[#9B4858] hover:from-[#9B4858] hover:to-[#8B3B4D] text-white font-bold py-3.5 rounded-xl shadow-lg border border-[#A85062] flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50 transition-all"
                  >
                    {isSubmittingOrder ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Procesando tu pedido...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Confirmar Pedido (<span className="tabular-nums font-mono">S/ {grandTotal.toFixed(2)}</span>)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}



      {/* BOTÓN FLOTANTE DEL CARRITO EN MÓVIL/DESKTOP CUANDO TIENE PRODUCTOS */}
      {totalCartItems > 0 && !isCartOpen && !isCheckoutModalOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="btn-tactile floating-cart-btn fixed bottom-4 left-4 md:bottom-6 md:left-6 z-40 bg-[#2D1B22] hover:bg-[#B85D6F] text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-[#E5C378]/60 transition-all duration-300"
          title="Abrir Carrito de Compras"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 text-[#E5C378]" />
            <span className="tabular-nums absolute -top-2.5 -right-2.5 bg-[#B85D6F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white/40 shadow-sm">
              {totalCartItems}
            </span>
          </div>
          <span className="text-xs font-bold tracking-wide">
            Ver Carrito • <span className="text-[#E5C378] font-bold tabular-nums">S/ {cartSubtotal.toFixed(2)}</span>
          </span>
        </button>
      )}

      {/* Asistente Virtual Inteligente (Chatbot IA) */}
      <ChatBot />

      {/* MODAL MODERNO GLASSMORPHISM: Rastreo de Pedido en Tiempo Real */}
      <OrderTrackingModal
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        initialCode={trackingInput}
        whatsappNumber={storeSettings?.whatsapp_number || WHATSAPP_NUMBER}
      />

      {/* Footer Editorial de Alta Gama */}
      <Footer
        onOpenTracking={() => {
          setTrackingError(null);
          setIsTrackingModalOpen(true);
        }}
        whatsappNumber={storeSettings?.whatsapp_number || WHATSAPP_NUMBER}
        instagramUrl={storeSettings?.instagram_url || 'https://instagram.com/rozier.pe'}
        facebookUrl={storeSettings?.facebook_url || 'https://facebook.com/rozier.pe'}
        tiktokUrl={storeSettings?.tiktok_url || 'https://tiktok.com/@rozier.pe'}
        logoUrl={storeSettings?.logo_url}
      />
    </div>
  );
}
