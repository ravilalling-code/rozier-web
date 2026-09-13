'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Product, Category } from '@/lib/types';
import { getCategories } from '@/lib/categories';
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

  useEffect(() => {
    const fetchCatalogAndCategories = async () => {
      setLoading(true);
      try {
        const [prodsRes, catsData] = await Promise.all([
          supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
          getCategories(),
        ]);

        if (!prodsRes.error && prodsRes.data) {
          setProducts(prodsRes.data as Product[]);
        }
        setCategories(catsData);
      } catch (err) {
        console.error('Error cargando catálogo:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogAndCategories();
  }, []);

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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-200">
              <Flower2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stone-900 leading-none">
                PETALIA
              </h1>
              <p className="text-[10px] text-rose-600 font-semibold tracking-wider uppercase mt-0.5">
                Diseño floral & decoraciones
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                '¡Hola PETALIA! Deseo consultar sobre su catálogo de flores y detalles 🌸'
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <MessageCircle className="w-4 h-4 fill-white/20" />
              <span>Consultar</span>
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

      {/* Botón Flotante Permanente de WhatsApp (Esquina inferior izquierda) */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
          '¡Hola PETALIA! Deseo realizar una consulta sobre un arreglo floral 🌸'
        )}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 left-5 z-40 bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center transition transform hover:scale-105 active:scale-95 group"
        title="Consultar por WhatsApp"
      >
        <MessageCircle className="w-6 h-6 fill-white/20" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-semibold pl-0 group-hover:pl-2">
          WhatsApp Taller
        </span>
      </a>

      {/* Asistente Virtual Inteligente (Chatbot IA - Esquina inferior derecha) */}
      <ChatBot />

      {/* Footer Minimalista */}
      <footer className="mt-16 border-t border-stone-200 bg-white py-8 px-4 text-center text-xs text-stone-500 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <span className="font-bold tracking-tight text-stone-800 text-sm">PETALIA</span>
          <span>•</span>
          <span>Diseño Floral & Decoraciones</span>
        </div>
        <p className="text-[11px] text-stone-400">
          Taller floral en Lima, Perú • Pedidos y delivery coordinados por WhatsApp: +51 924 257 784
        </p>
      </footer>
    </div>
  );
}
