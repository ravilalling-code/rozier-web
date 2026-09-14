'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Campaign } from '@/lib/types';
import {
  getAllCampaigns,
  createCampaign,
  updateCampaign,
  toggleCampaignStatus,
  deleteCampaign,
  uploadCampaignImage,
  DEFAULT_CAMPAIGN,
} from '@/lib/campaigns';
import {
  Sparkles,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Calendar,
  Layers,
  Sliders,
  ExternalLink,
  Store,
  Upload,
  Image as ImageIcon,
  ArrowRight,
  Eye,
  Clock,
} from 'lucide-react';

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Notificaciones Toast
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Modal Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);

  // Campos de Formulario
  const [formName, setFormName] = useState('');
  const [formBadgeText, setFormBadgeText] = useState('EDICIÓN LIMITADA');
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formLayoutType, setFormLayoutType] = useState<'carousel' | 'banner'>('carousel');
  const [formCtaText, setFormCtaText] = useState('Explorar Colección');
  const [formCtaLink, setFormCtaLink] = useState('#catalogo');
  const [formIsActive, setFormIsActive] = useState(true);

  // Subida de imagen
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Confirmación Eliminar
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Cargar campañas desde Supabase
  const loadCampaigns = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      let data = await getAllCampaigns();
      if (!data || data.length === 0) {
        // Sembrar campaña por defecto si la tabla está completamente vacía
        try {
          const seeded = await createCampaign(DEFAULT_CAMPAIGN);
          data = [seeded];
        } catch {
          data = [DEFAULT_CAMPAIGN];
        }
      }
      setCampaigns(data);
    } catch (err: any) {
      console.error('Error al cargar campañas:', err);
      showToast('Error al cargar campañas estacionales', 'error');
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();

    // Suscripción Realtime a public.campaigns
    const channel = supabase
      .channel('admin-campaigns-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns' },
        () => {
          loadCampaigns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCampaigns]);

  // Manejador del Toggle directo de estado (Activar / Pausar)
  const handleToggleActive = async (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !campaign.is_active;

    // Actualización optimista inmediata
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === campaign.id) {
          return { ...c, is_active: newStatus };
        }
        // Si se activa esta campaña, se pausan las otras para evitar conflicto en la landing
        if (newStatus && c.id !== campaign.id) {
          return { ...c, is_active: false };
        }
        return c;
      })
    );

    try {
      await toggleCampaignStatus(campaign.id, newStatus);
      showToast(
        newStatus
          ? `Campaña "${campaign.name || campaign.title}" activada en la tienda`
          : `Campaña "${campaign.name || campaign.title}" pausada`,
        'success'
      );
    } catch (err: any) {
      console.error('Error al cambiar estado:', err);
      showToast('Error al actualizar estado en Supabase', 'error');
      loadCampaigns();
    }
  };

  // Abrir modal en modo Crear
  const openCreateModal = () => {
    setModalMode('create');
    setCurrentCampaignId(null);
    setFormName('');
    setFormBadgeText('EDICIÓN LIMITADA');
    setFormTitle('');
    setFormSubtitle('');
    setFormBannerUrl('');
    setFormStartDate('');
    setFormEndDate('');
    setFormLayoutType('carousel');
    setFormCtaText('Explorar Colección');
    setFormCtaLink('#catalogo');
    setFormIsActive(true);
    setSelectedFile(null);
    setImagePreview(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Abrir modal en modo Editar
  const openEditModal = (campaign: Campaign) => {
    setModalMode('edit');
    setCurrentCampaignId(campaign.id);
    setFormName(campaign.name || campaign.title || '');
    setFormBadgeText(campaign.badge_text || 'EDICIÓN LIMITADA');
    setFormTitle(campaign.title || '');
    setFormSubtitle(campaign.subtitle || '');
    const currentImg = campaign.banner_url || campaign.images?.[0] || '';
    setFormBannerUrl(currentImg);
    setImagePreview(currentImg || null);
    setFormStartDate(campaign.start_date || '');
    setFormEndDate(campaign.end_date || '');
    setFormLayoutType(campaign.layout_type || 'carousel');
    setFormCtaText(campaign.cta_text || 'Explorar Colección');
    setFormCtaLink(campaign.cta_link || '#catalogo');
    setFormIsActive(Boolean(campaign.is_active));
    setSelectedFile(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Carga y preview de imagen local
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setFormBannerUrl('');
    }
  };

  // Guardar Campaña (Crear o Editar)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanTitle = formTitle.trim();
    const cleanName = formName.trim() || cleanTitle;

    if (!cleanTitle) {
      setFormError('El título promocional de la campaña es obligatorio.');
      return;
    }

    setFormLoading(true);

    try {
      let finalImageUrl = formBannerUrl.trim();

      // Subir archivo a Supabase Storage si se seleccionó uno
      if (selectedFile) {
        setUploadingImage(true);
        try {
          finalImageUrl = await uploadCampaignImage(selectedFile);
        } catch (uploadErr: any) {
          throw new Error('Fallo al subir la imagen: ' + uploadErr.message);
        } finally {
          setUploadingImage(false);
        }
      }

      if (!finalImageUrl) {
        finalImageUrl = 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=900&q=80';
      }

      const campaignPayload: Partial<Campaign> = {
        name: cleanName,
        title: cleanTitle,
        subtitle: formSubtitle.trim(),
        badge_text: formBadgeText.trim() || 'EDICIÓN ESPECIAL',
        banner_url: finalImageUrl,
        images: [finalImageUrl],
        start_date: formStartDate || null,
        end_date: formEndDate || null,
        layout_type: formLayoutType,
        cta_text: formCtaText.trim() || 'Explorar Colección',
        cta_link: formCtaLink.trim() || '#catalogo',
        is_active: formIsActive,
      };

      if (modalMode === 'create') {
        const newCamp = await createCampaign(campaignPayload as any);
        showToast(`Campaña "${cleanName}" creada exitosamente.`);
        setCampaigns((prev) => [newCamp, ...prev.filter((c) => c.id !== newCamp.id)]);
      } else if (currentCampaignId) {
        const updatedCamp = await updateCampaign(currentCampaignId, campaignPayload);
        showToast(`Campaña "${cleanName}" actualizada exitosamente.`);
        setCampaigns((prev) =>
          prev.map((c) => (c.id === currentCampaignId ? updatedCamp : c))
        );
      }

      setIsModalOpen(false);
      loadCampaigns();
    } catch (err: any) {
      console.error('Error al guardar campaña:', err);
      setFormError(err.message || 'Error al guardar en la base de datos.');
    } finally {
      setFormLoading(false);
    }
  };

  // Confirmar y Ejecutar Eliminación
  const handleDeleteConfirm = async () => {
    if (!deletingCampaign) return;
    setDeleteLoading(true);
    try {
      await deleteCampaign(deletingCampaign.id);
      showToast(`Campaña "${deletingCampaign.name || deletingCampaign.title}" eliminada.`);
      setCampaigns((prev) => prev.filter((c) => c.id !== deletingCampaign.id));
      setDeletingCampaign(null);
    } catch (err: any) {
      console.error('Error al eliminar campaña:', err);
      showToast('Error al eliminar la campaña: ' + (err.message || err), 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtrar campañas
  const filteredCampaigns = campaigns.filter((c) => {
    const nameMatch = (c.name || '').toLowerCase();
    const titleMatch = (c.title || '').toLowerCase();
    const subtitleMatch = (c.subtitle || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      !query ||
      nameMatch.includes(query) ||
      titleMatch.includes(query) ||
      subtitleMatch.includes(query);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && c.is_active) ||
      (filterStatus === 'inactive' && !c.is_active);

    return matchesSearch && matchesStatus;
  });

  const activeCount = campaigns.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Campañas Estacionales
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-950/70 border border-rose-800/60 text-rose-300">
              {campaigns.length} Registradas
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Gestiona el histórico de campañas promocionales (Flores Amarillas, San Valentín, Día de la Madre) y controla su visibilidad en vivo en la tienda web.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Ver Tienda</span>
            <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
          </Link>

          <button
            onClick={() => loadCampaigns(true)}
            disabled={loading || isRefreshing}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium"
            title="Recargar campañas"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-rose-400' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-rose-950/50 transition active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Campaña</span>
          </button>
        </div>
      </div>

      {/* BANNER INFORMATIVO RESUMEN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-neutral-400 font-medium">Estado en Tienda Web</span>
            <p className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
              {activeCount > 0 ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-400">{activeCount} Campaña Activa</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-neutral-500" />
                  <span className="text-neutral-400">Sin Campaña (Limpia)</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-neutral-400 font-medium">Historial Guardado</span>
            <p className="text-sm font-bold text-white mt-0.5">
              {campaigns.length} {campaigns.length === 1 ? 'campaña registrada' : 'campañas registradas'}
            </p>
          </div>
        </div>

        <div className="bg-neutral-900/90 border border-neutral-800/80 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-neutral-400 font-medium">Sincronización en Vivo</span>
            <p className="text-sm font-bold text-sky-300 mt-0.5">
              Realtime conectado a Supabase
            </p>
          </div>
        </div>
      </div>

      {/* BUSCADOR Y FILTROS */}
      <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800/80 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar campaña por nombre, título o descripción..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                filterStatus === 'all'
                  ? 'bg-rose-500 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              Todas ({campaigns.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                filterStatus === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              Activas ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                filterStatus === 'inactive'
                  ? 'bg-neutral-700 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              En Pausa ({campaigns.length - activeCount})
            </button>
          </div>
        </div>
      </div>

      {/* LISTADO DE CAMPAÑAS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-sm">Cargando campañas estacionales...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No se encontraron campañas</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {searchQuery || filterStatus !== 'all'
              ? 'Prueba modificando los filtros de búsqueda.'
              : 'Empieza registrando tu primera campaña temática con el botón "+ Nueva Campaña".'}
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2 rounded-xl text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Campaña</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((camp) => {
            const bannerImg =
              camp.banner_url ||
              (camp.images && camp.images[0]) ||
              'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=900&q=80';

            const displayName = camp.name || camp.title || 'Campaña sin nombre';
            const hasDateRange = camp.start_date || camp.end_date;

            return (
              <div
                key={camp.id}
                className={`bg-neutral-900 border rounded-2xl p-4 sm:p-5 transition space-y-4 shadow-lg shadow-black/20 ${
                  camp.is_active
                    ? 'border-emerald-500/50 bg-neutral-900/95 ring-1 ring-emerald-500/20'
                    : 'border-neutral-800/80 hover:border-neutral-700'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Thumbnail + Datos de la campaña */}
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="relative w-24 h-20 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 flex-shrink-0 group">
                      <img
                        src={bannerImg}
                        alt={displayName}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=900&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                      <span className="absolute bottom-1 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/80 text-white/90 uppercase tracking-wider">
                        {camp.layout_type === 'banner' ? 'Banner' : 'Carrusel'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-300 font-bold uppercase tracking-wider">
                          {camp.badge_text || 'ESPECIAL'}
                        </span>
                        <h2 className="text-base sm:text-lg font-bold text-white">
                          {displayName}
                        </h2>
                      </div>

                      <p className="text-xs font-medium text-neutral-300">
                        {camp.title}
                      </p>

                      {camp.subtitle && (
                        <p className="text-xs text-neutral-400 line-clamp-1 max-w-xl">
                          {camp.subtitle}
                        </p>
                      )}

                      <div className="flex items-center gap-3 pt-0.5 text-[11px] text-neutral-500">
                        {hasDateRange ? (
                          <span className="flex items-center gap-1 text-neutral-400 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-rose-400" />
                            <span>
                              {camp.start_date ? camp.start_date : 'Inicio libre'} →{' '}
                              {camp.end_date ? camp.end_date : 'Sin cierre'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-neutral-500">
                            Sin límite de fechas
                          </span>
                        )}
                        <span>•</span>
                        <span>CTA: &ldquo;{camp.cta_text || 'Explorar'}&rdquo;</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Switch Toggle + Acciones */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-800">
                    {/* Switch Toggle Activo / Pausado */}
                    <div
                      onClick={(e) => handleToggleActive(camp, e)}
                      className="flex items-center gap-2.5 bg-neutral-950/90 px-3.5 py-2 rounded-xl border border-neutral-800 cursor-pointer hover:border-neutral-700 transition"
                      title={camp.is_active ? 'Clic para pausar campaña' : 'Clic para activar en la tienda'}
                    >
                      <span
                        className={`text-xs font-semibold ${
                          camp.is_active ? 'text-emerald-400' : 'text-neutral-400'
                        }`}
                      >
                        {camp.is_active ? 'Activa en tienda' : 'En pausa'}
                      </span>
                      <button
                        type="button"
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                          camp.is_active ? 'bg-emerald-500 justify-end' : 'bg-neutral-700 justify-start'
                        }`}
                        aria-label="Toggle campaña activa"
                      >
                        <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
                      </button>
                    </div>

                    {/* Botón Editar */}
                    <button
                      onClick={() => openEditModal(camp)}
                      className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition flex items-center gap-1.5 text-xs font-medium"
                      title="Editar campaña"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>

                    {/* Botón Eliminar */}
                    <button
                      onClick={() => setDeletingCampaign(camp)}
                      className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition flex items-center gap-1.5 text-xs font-medium"
                      title="Eliminar campaña"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span className="hidden sm:inline">Eliminar</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {modalMode === 'create' ? 'Nueva Campaña Estacional' : 'Editar Campaña Estacional'}
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Define la identidad, textos y banner de la temporada.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs p-3.5 rounded-2xl flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre de la Campaña */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Nombre Interno de la Campaña *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej: San Valentín 2027, Flores Amarillas"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>

                {/* Badge Superior */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Badge Superior *
                  </label>
                  <input
                    type="text"
                    value={formBadgeText}
                    onChange={(e) => setFormBadgeText(e.target.value)}
                    placeholder="Ej: EDICIÓN LIMITADA, TENDENCIA"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>

                {/* Título Principal */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Título Promocional en Tienda *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ej: Día de las Flores Amarillas"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>

                {/* Subtítulo Descriptivo */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Subtítulo / Bajada Descriptiva
                  </label>
                  <textarea
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="Ej: Arreglos florales radiantes en tonos dorados y girasoles seleccionados."
                    rows={2}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Rango de Fechas */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Fecha de Inicio (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Fecha de Fin (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Modo de Presentación */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Modo de Presentación Visual
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setFormLayoutType('carousel')}
                      className={`cursor-pointer rounded-xl p-3 border transition flex items-center gap-3 ${
                        formLayoutType === 'carousel'
                          ? 'bg-rose-950/20 border-rose-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <Sliders className="w-4 h-4 text-rose-400" />
                      <div>
                        <span className="text-xs font-bold block">Carrusel de Fotos</span>
                        <span className="text-[10px] text-neutral-400 block">Scroll táctil con snap</span>
                      </div>
                    </div>

                    <div
                      onClick={() => setFormLayoutType('banner')}
                      className={`cursor-pointer rounded-xl p-3 border transition flex items-center gap-3 ${
                        formLayoutType === 'banner'
                          ? 'bg-rose-950/20 border-rose-500 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <Layers className="w-4 h-4 text-rose-400" />
                      <div>
                        <span className="text-xs font-bold block">Banner Panorámico</span>
                        <span className="text-[10px] text-neutral-400 block">Editorial de alto impacto</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner / Imagen Promocional */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Banner Promocional de la Campaña
                  </label>

                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    {/* Preview */}
                    <div className="w-28 h-20 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 flex items-center justify-center flex-shrink-0">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-neutral-600" />
                      )}
                    </div>

                    {/* Controles de Subida & URL */}
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex gap-2">
                        <label className="btn-tactile inline-flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-3.5 py-2 rounded-xl text-xs cursor-pointer border border-neutral-700 transition">
                          <Upload className="w-3.5 h-3.5 text-rose-400" />
                          <span>{uploadingImage ? 'Subiendo...' : 'Subir Imagen'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={uploadingImage || formLoading}
                            className="hidden"
                          />
                        </label>
                        {selectedFile && (
                          <span className="text-xs text-emerald-400 self-center">
                            Archivo listo ({selectedFile.name.slice(0, 20)}...)
                          </span>
                        )}
                      </div>

                      <input
                        type="url"
                        value={formBannerUrl}
                        onChange={(e) => {
                          setFormBannerUrl(e.target.value);
                          setImagePreview(e.target.value || null);
                          setSelectedFile(null);
                        }}
                        placeholder="O pega una URL directa de imagen (https://...)"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Botón CTA y Enlace */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Texto del Botón (CTA)
                  </label>
                  <input
                    type="text"
                    value={formCtaText}
                    onChange={(e) => setFormCtaText(e.target.value)}
                    placeholder="Ej: Explorar Colección, Ver Flores"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Enlace o Slug de Categoría
                  </label>
                  <input
                    type="text"
                    value={formCtaLink}
                    onChange={(e) => setFormCtaLink(e.target.value)}
                    placeholder="Ej: girasoles, ramos o #catalogo"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Toggle Inicial Activar en la Tienda */}
                <div className="sm:col-span-2 pt-2 border-t border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      ¿Activar de inmediato en la tienda web?
                    </span>
                    <span className="text-[11px] text-neutral-400 block">
                      Si se activa, se mostrará en la landing page de PETALIA en tiempo real.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormIsActive(!formIsActive)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      formIsActive ? 'bg-emerald-500 justify-end' : 'bg-neutral-700 justify-start'
                    }`}
                    aria-label="Toggle activar campaña"
                  >
                    <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
                  </button>
                </div>
              </div>

              {/* Botones de Acción Modal */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formLoading}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-xs font-medium transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-rose-950/50 transition disabled:opacity-50"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{modalMode === 'create' ? 'Crear Campaña' : 'Guardar Cambios'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {deletingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">¿Eliminar campaña?</h3>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente la campaña &ldquo;
              <strong className="text-white">
                {deletingCampaign.name || deletingCampaign.title}
              </strong>
              &rdquo;? Esta acción no se puede deshacer.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingCampaign(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST FLOTANTE */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
              toastMessage.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/80 text-rose-200'
                : 'bg-emerald-950/95 border-emerald-500/80 text-emerald-200'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            )}
            <span className="text-xs font-medium">{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
