'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Product, Campaign } from '@/lib/types';
import {
  getAllCampaigns,
  createCampaign,
  updateCampaign,
  toggleCampaignStatus,
  deleteCampaign,
} from '@/lib/campaigns';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
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
  X,
  RefreshCw,
} from 'lucide-react';

export default function AdminCampaignPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formButtonText, setFormButtonText] = useState('Ver colección');
  const [formBadgeText, setFormBadgeText] = useState('Campaña Especial');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formSelectedProductIds, setFormSelectedProductIds] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);

  // Modal Delete State
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Search in product picker
  const [productSearch, setProductSearch] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const formatForDateTimeInput = (isoString?: string | null) => {
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [campsData, prodsRes] = await Promise.all([
        getAllCampaigns(),
        supabase.from('products').select('*').eq('is_active', true).order('name', { ascending: true }),
      ]);
      setCampaigns(campsData);
      if (!prodsRes.error && prodsRes.data) {
        setProducts(prodsRes.data as Product[]);
      }
    } catch (err: any) {
      showToast('Error al cargar datos: ' + (err.message || err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Abrir Modal de Creación
  const handleOpenCreate = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    defaultDate.setHours(23, 59, 0, 0);

    setModalMode('create');
    setEditingCampaignId(null);
    setFormTitle('');
    setFormSubtitle('El regalo perfecto que genera Wooow.');
    setFormDescription('Arreglos florales radiantes seleccionados artesanalmente.');
    setFormButtonText('Ver colección');
    setFormBadgeText('Campaña Especial');
    setFormTargetDate(formatForDateTimeInput(defaultDate.toISOString()));
    setFormSelectedProductIds([]);
    setFormIsActive(campaigns.length === 0);
    setIsModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (camp: Campaign) => {
    setModalMode('edit');
    setEditingCampaignId(camp.id);
    setFormTitle(camp.title || '');
    setFormSubtitle(camp.subtitle || '');
    setFormDescription(camp.description || '');
    setFormButtonText(camp.button_text || camp.cta_text || 'Ver colección');
    setFormBadgeText(camp.badge_text || 'Campaña Especial');
    setFormTargetDate(formatForDateTimeInput(camp.target_date || camp.end_date));
    setFormSelectedProductIds(camp.selected_product_ids || []);
    setFormIsActive(camp.is_active);
    setIsModalOpen(true);
  };

  // Switch de activación exclusiva
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const newActiveState = !currentActive;
    try {
      await toggleCampaignStatus(id, newActiveState);
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            return { ...c, is_active: newActiveState };
          }
          if (newActiveState) {
            return { ...c, is_active: false };
          }
          return c;
        })
      );
      showToast(
        newActiveState
          ? '¡Campaña activada exclusivamente en la tienda web!'
          : 'Campaña pausada.',
        'success'
      );
    } catch (err: any) {
      showToast('Error al cambiar estado: ' + (err.message || err), 'error');
    }
  };

  // Guardar (Crear o Editar)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Por favor ingresa un título para la campaña.', 'error');
      return;
    }
    if (!formTargetDate) {
      showToast('Selecciona la fecha y hora de finalización.', 'error');
      return;
    }

    const targetTimestamp = new Date(formTargetDate).getTime();
    if (isNaN(targetTimestamp) || targetTimestamp <= Date.now()) {
      showToast('La fecha límite debe ser posterior a la fecha y hora actual.', 'error');
      return;
    }

    setSaving(true);
    try {
      const isoTargetDate = new Date(formTargetDate).toISOString();
      const payload: any = {
        title: formTitle.trim(),
        name: formTitle.trim(),
        subtitle: formSubtitle.trim(),
        description: formDescription.trim(),
        button_text: formButtonText.trim() || 'Ver colección',
        cta_text: formButtonText.trim() || 'Ver colección',
        badge_text: formBadgeText.trim() || 'Campaña Especial',
        target_date: isoTargetDate,
        end_date: isoTargetDate,
        selected_product_ids: formSelectedProductIds,
        is_active: formIsActive,
      };

      if (modalMode === 'create') {
        const created = await createCampaign(payload);
        if (formIsActive) {
          setCampaigns([created, ...campaigns.map((c) => ({ ...c, is_active: false }))]);
        } else {
          setCampaigns([created, ...campaigns]);
        }
        showToast('¡Nueva campaña creada con éxito!', 'success');
      } else if (editingCampaignId) {
        const updated = await updateCampaign(editingCampaignId, payload);
        if (formIsActive) {
          setCampaigns(
            campaigns.map((c) =>
              c.id === editingCampaignId ? updated : { ...c, is_active: false }
            )
          );
        } else {
          setCampaigns(campaigns.map((c) => (c.id === editingCampaignId ? updated : c)));
        }
        showToast('¡Campaña actualizada con éxito!', 'success');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      showToast('Error al guardar: ' + (err.message || err), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Confirmar y Eliminar
  const handleConfirmDelete = async () => {
    if (!deletingCampaign) return;
    setDeleteLoading(true);
    try {
      await deleteCampaign(deletingCampaign.id);
      setCampaigns(campaigns.filter((c) => c.id !== deletingCampaign.id));
      showToast('Campaña eliminada correctamente.', 'success');
      setDeletingCampaign(null);
    } catch (err: any) {
      showToast('Error al eliminar campaña: ' + (err.message || err), 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Alternar selección de producto destacado (3 a 5)
  const toggleProductSelection = (id: string) => {
    if (formSelectedProductIds.includes(id)) {
      setFormSelectedProductIds(formSelectedProductIds.filter((pId) => pId !== id));
    } else {
      if (formSelectedProductIds.length >= 5) {
        showToast('Máximo 5 arreglos destacados permitidos.', 'error');
        return;
      }
      setFormSelectedProductIds([...formSelectedProductIds, id]);
    }
  };

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  // Formato de countdown legible para las tarjetas
  const getReadableCountdown = (targetDateStr?: string | null) => {
    if (!targetDateStr) return 'Sin fecha límite';
    const diff = new Date(targetDateStr).getTime() - Date.now();
    if (isNaN(diff)) return 'Fecha inválida';
    if (diff <= 0) return 'Finalizada';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    if (days > 0) return `${days}d ${hours}h restantes`;
    return `${hours}h ${minutes}m restantes`;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-[#FAF2F4] min-h-screen text-[#3D1E26]">
      {/* Toast Notificación */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-[#2D161C] text-white border-[#B85D6F]'
              : 'bg-rose-950 text-white border-rose-600'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4CAD2] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F4D9E1] flex items-center justify-center text-[#B85D6F]">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-[#2D161C] tracking-tight">
                Gestión de Campañas & Promociones
              </h1>
              <p className="text-xs sm:text-sm text-[#7D535E]">
                Crea y administra múltiples campañas con cuenta regresiva para el banner principal.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-[#F7E8EC] text-[#3D1E26] rounded-xl text-xs font-semibold transition border border-[#D9B5C0] shadow-xs"
          >
            <Store className="w-4 h-4 text-[#B85D6F]" />
            <span>Ver Tienda</span>
            <ExternalLink className="w-3 h-3 text-[#7D535E]" />
          </Link>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#B85D6F] hover:bg-[#9B4858] text-white rounded-xl text-sm font-semibold transition shadow-sm hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Campaña</span>
          </button>
        </div>
      </div>

      {/* Resumen de Campañas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E4CAD2] shadow-xs">
          <span className="text-xs font-bold text-[#7D535E] uppercase tracking-wider">
            Total Campañas
          </span>
          <p className="text-2xl font-serif font-bold text-[#2D161C] mt-1">{campaigns.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E4CAD2] shadow-xs">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
            Campaña Activa en Tienda
          </span>
          <p className="text-lg font-serif font-bold text-emerald-800 mt-1 truncate">
            {campaigns.find((c) => c.is_active)?.title || 'Ninguna activa'}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E4CAD2] shadow-xs">
          <span className="text-xs font-bold text-[#7D535E] uppercase tracking-wider">
            En Pausa
          </span>
          <p className="text-2xl font-serif font-bold text-[#7D535E] mt-1">
            {campaigns.filter((c) => !c.is_active).length}
          </p>
        </div>
      </div>

      {/* Listado de Campañas */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#7D535E]">
          <Loader2 className="w-8 h-8 animate-spin text-[#B85D6F]" />
          <p className="text-sm font-medium">Cargando campañas registradas...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-[#D9B5C0] p-8 space-y-4">
          <Flame className="w-12 h-12 text-[#B85D6F]/60 mx-auto" />
          <h3 className="text-lg font-serif font-bold text-[#2D161C]">No hay campañas creadas</h3>
          <p className="text-xs text-[#7D535E] max-w-md mx-auto">
            Crea tu primera campaña con cuenta regresiva y arreglos destacados para la portada de ROZIER.
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B85D6F] text-white rounded-xl text-xs font-semibold hover:bg-[#9B4858] transition"
          >
            <Plus className="w-4 h-4" />
            Crear Campaña
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((camp) => {
            const isFinished =
              camp.target_date && new Date(camp.target_date).getTime() <= Date.now();

            return (
              <div
                key={camp.id}
                className={`bg-white rounded-3xl border transition-all duration-300 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  camp.is_active
                    ? 'border-[#B85D6F] ring-2 ring-[#B85D6F]/20'
                    : 'border-[#E4CAD2]'
                }`}
              >
                {/* Header de la tarjeta */}
                <div className="p-5 sm:p-6 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        camp.is_active
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-[#F4D9E1] text-[#7D535E] border border-[#E4CAD2]'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          camp.is_active ? 'bg-emerald-600 animate-pulse' : 'bg-[#7D535E]'
                        }`}
                      />
                      {camp.is_active ? 'Activa en Tienda' : 'En Pausa'}
                    </span>

                    <span className="text-[11px] font-semibold text-[#7D535E] bg-[#FAF2F4] px-2.5 py-1 rounded-lg border border-[#E4CAD2]">
                      {camp.badge_text || 'Campaña Especial'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#2D161C] leading-snug line-clamp-2">
                      {camp.title}
                    </h3>
                    {camp.subtitle && (
                      <p className="text-xs text-[#7D535E] font-medium mt-1 line-clamp-1">
                        {camp.subtitle}
                      </p>
                    )}
                  </div>

                  {camp.description && (
                    <p className="text-xs text-[#5E3640] line-clamp-2 font-light leading-relaxed">
                      {camp.description}
                    </p>
                  )}

                  {/* Contador / Fecha límite */}
                  <div className="p-3 bg-[#FAF2F4] rounded-xl border border-[#E4CAD2] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-[#7D535E]">
                      <Clock className="w-4 h-4 text-[#B85D6F]" />
                      <span className="font-medium">Fecha Límite:</span>
                    </div>
                    <span
                      className={`font-mono font-bold inline-flex items-center gap-1.5 ${
                        isFinished
                          ? 'text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md text-[11px]'
                          : 'text-[#2D161C]'
                      }`}
                    >
                      {isFinished && <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />}
                      {getReadableCountdown(camp.target_date || camp.end_date)}
                    </span>
                  </div>

                  {/* Arreglos destacados */}
                  <div className="flex items-center justify-between text-xs text-[#7D535E] pt-1">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#B85D6F]" />
                      Arreglos destacados:
                    </span>
                    <span className="font-bold text-[#2D161C]">
                      {camp.selected_product_ids?.length || 0} productos
                    </span>
                  </div>
                </div>

                {/* Footer con Switch de Activación Exclusiva y Acciones */}
                <div className="p-4 bg-[#FAF2F4] border-t border-[#E4CAD2] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={camp.is_active}
                        onChange={() => handleToggleActive(camp.id, camp.is_active)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#B85D6F]"></div>
                    </label>
                    <span className="text-[11px] font-bold text-[#5E3640]">
                      {camp.is_active ? 'Activa' : 'Pausada'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(camp)}
                      title="Editar campaña"
                      className="p-2 text-[#5E3640] hover:text-[#B85D6F] hover:bg-white rounded-lg transition border border-transparent hover:border-[#D9B5C0]"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingCampaign(camp)}
                      title="Eliminar campaña"
                      className="p-2 text-[#7D535E] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CREAR / EDITAR CAMPAÑA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FAF0F3] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#DFC0CB] shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[#DFC0CB] sticky top-0 bg-[#F5E5EA] z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F4D9E1] text-[#B85D6F] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-lg text-[#2D161C]">
                  {modalMode === 'create' ? 'Crear Nueva Campaña' : 'Editar Campaña'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#7D535E] hover:text-[#2D161C] hover:bg-[#FAF2F4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-5">
              {/* Título & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#3D1E26] uppercase tracking-wider mb-1.5">
                    Título Principal de Campaña *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ej. Día de las Flores Amarillas"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F7E8EC] border border-[#D9B5C0] text-[#3D1E26] rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#B85D6F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#3D1E26] uppercase tracking-wider mb-1.5">
                    Badge Flotante
                  </label>
                  <input
                    type="text"
                    value={formBadgeText}
                    onChange={(e) => setFormBadgeText(e.target.value)}
                    placeholder="Ej. EDICIÓN LIMITADA"
                    className="w-full px-3.5 py-2.5 bg-[#F7E8EC] border border-[#D9B5C0] text-[#3D1E26] rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#B85D6F]"
                  />
                </div>
              </div>

              {/* Subtítulo & Botón CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#3D1E26] uppercase tracking-wider mb-1.5">
                    Subtítulo / Slogan
                  </label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="El regalo perfecto que genera Wooow."
                    className="w-full px-3.5 py-2.5 bg-[#F7E8EC] border border-[#D9B5C0] text-[#3D1E26] rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#B85D6F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#3D1E26] uppercase tracking-wider mb-1.5">
                    Texto del Botón CTA
                  </label>
                  <input
                    type="text"
                    value={formButtonText}
                    onChange={(e) => setFormButtonText(e.target.value)}
                    placeholder="Ver colección"
                    className="w-full px-3.5 py-2.5 bg-[#F7E8EC] border border-[#D9B5C0] text-[#3D1E26] rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#B85D6F]"
                  />
                </div>
              </div>

              {/* Descripción Breve */}
              <div>
                <label className="block text-xs font-bold text-[#3D1E26] uppercase tracking-wider mb-1.5">
                  Descripción Breve
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Arreglos florales radiantes en tonos dorados y girasoles seleccionados."
                  className="w-full px-3.5 py-2.5 bg-[#F7E8EC] border border-[#D9B5C0] text-[#3D1E26] rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#B85D6F]"
                />
              </div>

              {/* Fecha y Hora Límite */}
              <div className="p-4 bg-[#FAF2F4] rounded-2xl border border-[#E4CAD2] space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#B85D6F]" />
                  <label className="text-xs font-bold text-[#3D1E26] uppercase tracking-wider">
                    Fecha y Hora Límite del Contador (Target Date) *
                  </label>
                </div>
                <input
                  type="datetime-local"
                  value={formTargetDate}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D9B5C0] text-[#3D1E26] rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#B85D6F]"
                />
                {formTargetDate && new Date(formTargetDate).getTime() <= Date.now() && (
                  <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    La fecha debe ser posterior a la fecha y hora actual para activar la cuenta regresiva.
                  </p>
                )}
              </div>

              {/* Selector de Arreglos Destacados (3 a 5) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#3D1E26] uppercase tracking-wider">
                    Arreglos Destacados para la Columna Derecha (3 a 5)
                  </label>
                  <span className="text-xs font-bold text-[#B85D6F] bg-[#F4D9E1] px-2.5 py-0.5 rounded-full">
                    {formSelectedProductIds.length} seleccionados
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar producto por nombre..."
                    className="w-full pl-9 pr-3.5 py-2 bg-[#F7E8EC] border border-[#D9B5C0] text-[#3D1E26] rounded-xl text-xs focus:outline-none focus:border-[#B85D6F]"
                  />
                  <Search className="w-4 h-4 text-[#7D535E] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {filteredProducts.map((prod) => {
                    const isSelected = formSelectedProductIds.includes(prod.id);
                    const price = prod.promotional_price || prod.price;

                    return (
                      <div
                        key={prod.id}
                        onClick={() => toggleProductSelection(prod.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#F4D9E1] border-[#B85D6F]'
                            : 'bg-white border-[#E4CAD2] hover:bg-[#FAF2F4]'
                        }`}
                      >
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 shrink-0 border border-[#E4CAD2]">
                          <Image
                            src={prod.image_url}
                            alt={prod.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#2D161C] truncate">{prod.name}</p>
                          <p className="text-[11px] text-[#7D535E]">S/ {price.toFixed(2)}</p>
                        </div>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'bg-[#B85D6F] border-[#B85D6F] text-white'
                              : 'border-[#D9B5C0] bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Switch de activación al guardar */}
              <div className="pt-2 flex items-center justify-between border-t border-[#E4CAD2]">
                <span className="text-xs font-bold text-[#3D1E26]">
                  Activar como campaña principal en la tienda al guardar
                </span>
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#B85D6F] rounded border-[#D9B5C0] focus:ring-[#B85D6F]"
                />
              </div>

              {/* Botones de acción del Modal */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4CAD2]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-[#7D535E] hover:bg-[#FAF2F4] rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#B85D6F] hover:bg-[#9B4858] text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{modalMode === 'create' ? 'Crear Campaña' : 'Guardar Cambios'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {deletingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FAF0F3] rounded-3xl max-w-md w-full p-6 border border-[#DFC0CB] shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-serif font-bold text-lg text-[#2D161C]">¿Eliminar campaña?</h3>
              <p className="text-xs text-[#7D535E]">
                Estás por eliminar &ldquo;{deletingCampaign.title}&rdquo;. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCampaign(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-semibold text-[#7D535E] hover:bg-[#FAF2F4] rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Sí, Eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
