'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/types';
import {
  CampaignSettings,
  getCampaignSettings,
  updateCampaignSettings,
} from '@/lib/campaignSettings';
import {
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  Store,
  ExternalLink,
  Loader2,
  Search,
  Check,
  Eye,
  EyeOff,
  Flame,
  Tag,
} from 'lucide-react';

export default function AdminCampaignPage() {
  const [settings, setSettings] = useState<CampaignSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Notificaciones Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Campos de formulario
  const [isActive, setIsActive] = useState(true);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [buttonText, setButtonText] = useState('Ver colección');
  const [badgeText, setBadgeText] = useState('Campaña Especial');
  const [targetDateInput, setTargetDateInput] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Tiempo restante para el preview en vivo
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Convertir ISO string a formato para input datetime-local (YYYY-MM-DDTHH:mm)
  const formatForDateTimeInput = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  // Cargar configuración de campaña y catálogo de productos
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [campData, prodsRes] = await Promise.all([
          getCampaignSettings(),
          supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true }),
        ]);

        setSettings(campData);
        setIsActive(campData.is_active);
        setTitle(campData.title || '');
        setSubtitle(campData.subtitle || '');
        setDescription(campData.description || '');
        setButtonText(campData.button_text || 'Ver colección');
        setBadgeText(campData.badge_text || 'Campaña Especial');
        setTargetDateInput(formatForDateTimeInput(campData.target_date));
        setSelectedProductIds(campData.selected_product_ids || []);

        if (!prodsRes.error && prodsRes.data) {
          setProducts(prodsRes.data as Product[]);
        }
      } catch (err: any) {
        showToast('Error al cargar datos de campaña: ' + (err.message || err), 'error');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Timer en vivo para la previsualización del contador
  useEffect(() => {
    if (!targetDateInput) return;

    const calculateTime = () => {
      const targetTime = new Date(targetDateInput).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (isNaN(targetTime) || diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDateInput]);

  // Alternar selección de producto destacado (límite recomendado de 3 a 5)
  const toggleProductSelection = (id: string) => {
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter((pId) => pId !== id));
    } else {
      if (selectedProductIds.length >= 5) {
        showToast('Puedes destacar un máximo de 5 productos en el banner de campaña.', 'error');
        return;
      }
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  // Guardar Cambios
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Ingresa un título para la campaña.', 'error');
      return;
    }
    if (!targetDateInput) {
      showToast('Selecciona la fecha y hora de finalización de la campaña.', 'error');
      return;
    }

    setSaving(true);
    try {
      const isoTargetDate = new Date(targetDateInput).toISOString();
      const updated = await updateCampaignSettings({
        is_active: isActive,
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: description.trim(),
        button_text: buttonText.trim() || 'Ver colección',
        badge_text: badgeText.trim() || 'Campaña Especial',
        target_date: isoTargetDate,
        selected_product_ids: selectedProductIds,
      });

      setSettings(updated);
      showToast('¡Campaña guardada y sincronizada con éxito!', 'success');
    } catch (err: any) {
      showToast('Error al guardar: ' + (err.message || err), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filtrar productos para la lista
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-ink-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        <p className="text-sm font-medium">Cargando panel de Campañas...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Toast Notificación */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 text-white border-emerald-500/40'
              : 'bg-rose-900/90 text-white border-rose-500/40'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-ink-900 tracking-tight">
                Gestión de Campaña Activa
              </h1>
              <p className="text-xs sm:text-sm text-ink-500">
                Configura la fecha límite, contador regresivo y arreglos destacados en el banner principal.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-warm-100 text-ink-700 rounded-xl text-xs font-medium transition border border-warm-200 shadow-2xs"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Ver Tienda</span>
            <ExternalLink className="w-3 h-3 text-ink-400" />
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-medium transition shadow-sm hover:shadow-md disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. Switch de Visibilidad y Estado General */}
        <div className="bg-white rounded-2xl border border-warm-200/80 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-base text-ink-900">
                Visibilidad en la Tienda Web
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
                }`}
              >
                {isActive ? 'Activa y Visible' : 'Oculta / Desactivada'}
              </span>
            </div>
            <p className="text-xs text-ink-500">
              Si desactivas la campaña, el banner y el contador regresivo desaparecerán por completo de la página de inicio.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>

        {/* 2. Temporizador y Fecha Límite */}
        <div className="bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-white rounded-2xl border border-amber-300/60 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif font-bold text-base text-ink-900">
                  Fecha y Hora Límite de la Campaña (Target Date)
                </h3>
              </div>
              <p className="text-xs text-ink-500 mt-0.5">
                Define el momento exacto en que termina la cuenta regresiva.
              </p>
            </div>

            {/* Input de Fecha y Hora */}
            <div className="w-full sm:w-auto">
              <input
                type="datetime-local"
                value={targetDateInput}
                onChange={(e) => setTargetDateInput(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-xs sm:text-sm font-medium text-ink-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Previsualización en Vivo del Contador */}
          <div className="bg-neutral-900 text-white rounded-xl p-5 border border-neutral-800 shadow-md">
            <div className="flex items-center justify-between mb-3 border-b border-neutral-800 pb-2.5">
              <span className="text-xs text-amber-400 uppercase tracking-widest font-mono font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Previsualización en tiempo real del contador
              </span>
              {timeLeft.isExpired && (
                <span className="text-[11px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                  ¡Campaña Expirada!
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
              <div className="bg-neutral-800/80 rounded-xl p-3 border border-neutral-700/60">
                <span className="block text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums">
                  {String(timeLeft.days).padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
                  Días
                </span>
              </div>
              <div className="bg-neutral-800/80 rounded-xl p-3 border border-neutral-700/60">
                <span className="block text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
                  Horas
                </span>
              </div>
              <div className="bg-neutral-800/80 rounded-xl p-3 border border-neutral-700/60">
                <span className="block text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
                  Minutos
                </span>
              </div>
              <div className="bg-neutral-800/80 rounded-xl p-3 border border-neutral-700/60">
                <span className="block text-2xl sm:text-3xl font-mono font-bold text-amber-400 tabular-nums">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
                  Segundos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Textos Editoriales del Banner */}
        <div className="bg-white rounded-2xl border border-warm-200/80 p-6 shadow-sm space-y-5">
          <div className="border-b border-warm-100 pb-3">
            <h3 className="font-serif font-bold text-base text-ink-900">
              Contenido y Textos del Banner
            </h3>
            <p className="text-xs text-ink-500">
              Personaliza los encabezados que acompañarán al contador en la columna izquierda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5 uppercase tracking-wider">
                Subtítulo Superior (Slogan)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="El regalo perfecto que genera Wooow."
                className="w-full px-3.5 py-2.5 border border-warm-300 rounded-xl text-xs sm:text-sm text-ink-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5 uppercase tracking-wider">
                Badge / Etiqueta Flotante
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="Edición Limitada o Campaña Especial"
                className="w-full px-3.5 py-2.5 border border-warm-300 rounded-xl text-xs sm:text-sm text-ink-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5 uppercase tracking-wider">
              Título Principal de la Campaña *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Los Top premium de Flores Amarillas"
              required
              className="w-full px-3.5 py-2.5 border border-warm-300 rounded-xl text-xs sm:text-sm font-serif font-medium text-ink-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-ink-700 mb-1.5 uppercase tracking-wider">
                Descripción Breve
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Edición artesanal con flores frescas de exportación..."
                className="w-full px-3.5 py-2.5 border border-warm-300 rounded-xl text-xs text-ink-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5 uppercase tracking-wider">
                Texto del Botón CTA
              </label>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Ver colección"
                className="w-full px-3.5 py-2.5 border border-warm-300 rounded-xl text-xs sm:text-sm text-ink-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* 4. Selección de Arreglos Destacados */}
        <div className="bg-white rounded-2xl border border-warm-200/80 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-warm-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-600" />
                <h3 className="font-serif font-bold text-base text-ink-900">
                  Arreglos Destacados en la Columna Derecha
                </h3>
              </div>
              <p className="text-xs text-ink-500">
                Selecciona entre 3 y 5 productos del catálogo. Se mostrarán como tarjetas interactivas junto al temporizador.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedProductIds.length >= 3 && selectedProductIds.length <= 5
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {selectedProductIds.length} de 5 seleccionados
              </span>
            </div>
          </div>

          {/* Buscador de Productos */}
          <div className="relative">
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Buscar arreglo por nombre o categoría..."
              className="w-full pl-9 pr-4 py-2 border border-warm-200 rounded-xl text-xs text-ink-800 focus:outline-none focus:border-amber-500"
            />
            <Search className="w-4 h-4 text-warm-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Cuadrícula de Selección con Checkbox */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredProducts.map((prod) => {
              const isSelected = selectedProductIds.includes(prod.id);
              const price = prod.promotional_price || prod.price;

              return (
                <div
                  key={prod.id}
                  onClick={() => toggleProductSelection(prod.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-amber-50/70 border-amber-400 shadow-xs'
                      : 'bg-white border-warm-200/80 hover:bg-warm-50/60'
                  }`}
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-warm-100 shrink-0 border border-warm-100">
                    <Image
                      src={prod.image_url}
                      alt={prod.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-ink-900 truncate">
                      {prod.name}
                    </h4>
                    <p className="text-[11px] text-warm-500 truncate">
                      {prod.category || 'Sin categoría'}
                    </p>
                    <span className="text-xs font-bold text-ink-900 tabular-nums">
                      S/ {price.toFixed(2)}
                    </span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-amber-600 border-amber-600 text-white'
                        : 'border-warm-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Botón inferior Guardar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-200">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-medium transition shadow-sm hover:shadow-md disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando configuración...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Campaña</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
