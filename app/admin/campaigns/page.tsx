'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getActiveCampaign, updateCampaign, uploadCampaignImage, DEFAULT_CAMPAIGN } from '@/lib/campaigns';
import { Campaign } from '@/lib/types';
import {
  Sparkles,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  Image as ImageIcon,
  LayoutTemplate,
  Sliders,
  ExternalLink,
  Store,
  Layers,
} from 'lucide-react';

export default function AdminCampaignsPage() {
  const [campaign, setCampaign] = useState<Campaign>(DEFAULT_CAMPAIGN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getActiveCampaign();
        if (data) {
          setCampaign(data);
        }
      } catch (err) {
        setErrorMsg('Error al cargar la campaña activa.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      if (!campaign.title.trim()) {
        throw new Error('El título de la campaña es obligatorio.');
      }
      if (campaign.images.length === 0) {
        throw new Error('Debes incluir al menos una imagen en la campaña.');
      }

      const updated = await updateCampaign(campaign);
      setCampaign(updated);
      setSuccessMsg('¡Campaña guardada y publicada con éxito en la tienda pública!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la campaña.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setErrorMsg(null);

    try {
      const publicUrl = await uploadCampaignImage(file);
      setCampaign((prev) => ({
        ...prev,
        images: [...prev.images, publicUrl],
      }));
      setSuccessMsg('¡Imagen subida y añadida a la campaña!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al subir la imagen.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const cleanUrl = newImageUrl.trim();
    if (!cleanUrl) return;

    setCampaign((prev) => ({
      ...prev,
      images: [...prev.images, cleanUrl],
    }));
    setNewImageUrl('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setCampaign((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    setCampaign((prev) => {
      const newImages = [...prev.images];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newImages.length) return prev;

      const temp = newImages[index];
      newImages[index] = newImages[targetIndex];
      newImages[targetIndex] = temp;

      return {
        ...prev,
        images: newImages,
      };
    });
  };

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Gestión de Campañas & Promociones
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-800 text-rose-400 border border-neutral-700">
              Especial
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Configura la campaña destacada en la página principal (ej. Flores Amarillas, San Valentín, Día de la Madre).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-200 text-xs font-medium px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Ver en tienda</span>
            <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
          </Link>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || loading}
            className="btn-tactile inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-medium px-4 py-2.5 rounded-xl text-xs shadow-md shadow-rose-950 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Campaña</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="bg-emerald-950/70 border border-emerald-800/80 rounded-2xl p-4 flex items-center gap-3 text-emerald-300 text-xs shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-950/70 border border-rose-800/80 rounded-2xl p-4 flex items-center gap-3 text-rose-300 text-xs shadow-lg animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-neutral-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-sm">Cargando campaña activa...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: Estado y Textos Principales */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Estado & Información Editorial</h2>
                  <p className="text-xs text-neutral-400">
                    Controla la visibilidad y el mensaje de llamada de atención de la campaña.
                  </p>
                </div>
              </div>

              {/* Toggle Activo / Inactivo */}
              <div className="flex items-center gap-3 bg-neutral-950 px-3.5 py-2 rounded-xl border border-neutral-800">
                <span className="text-xs font-medium text-neutral-300">
                  {campaign.is_active ? 'Campaña Activa' : 'Campaña en Pausa'}
                </span>
                <button
                  type="button"
                  onClick={() => setCampaign({ ...campaign, is_active: !campaign.is_active })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                    campaign.is_active ? 'bg-emerald-500 justify-end' : 'bg-neutral-700 justify-start'
                  }`}
                  aria-label="Toggle campaña activa"
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Título Principal de la Campaña *
                </label>
                <input
                  type="text"
                  value={campaign.title}
                  onChange={(e) => setCampaign({ ...campaign, title: e.target.value })}
                  placeholder="Ej: Día de las Flores Amarillas"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Bajada / Subtítulo Descriptivo
                </label>
                <textarea
                  value={campaign.subtitle}
                  onChange={(e) => setCampaign({ ...campaign, subtitle: e.target.value })}
                  placeholder="Ej: Arreglos florales radiantes en tonos dorados y girasoles seleccionados."
                  rows={2}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Texto del Badge Flotante
                </label>
                <input
                  type="text"
                  value={campaign.badge_text}
                  onChange={(e) => setCampaign({ ...campaign, badge_text: e.target.value })}
                  placeholder="Ej: Campaña Especial, Edición Limitada"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Texto del Botón (CTA)
                </label>
                <input
                  type="text"
                  value={campaign.cta_text}
                  onChange={(e) => setCampaign({ ...campaign, cta_text: e.target.value })}
                  placeholder="Ej: Explorar Flores Amarillas, Ver Colección"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Categoría o Enlace Destino del Botón
                </label>
                <input
                  type="text"
                  value={campaign.cta_link || ''}
                  onChange={(e) => setCampaign({ ...campaign, cta_link: e.target.value })}
                  placeholder="Ej: girasoles, ramos, boxes o #catalogo"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  Si escribes el slug de una categoría (ej. <code>girasoles</code>), al hacer clic filtrará automáticamente esa categoría.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Selector de Modo Visual */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-4 border-b border-neutral-800">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <LayoutTemplate className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Modo de Presentación Visual</h2>
                <p className="text-xs text-neutral-400">
                  Elige cómo deseas que se exhiban las fotografías en la página principal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Opción 1: Modo Carrusel */}
              <div
                onClick={() => setCampaign({ ...campaign, layout_type: 'carousel' })}
                className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                  campaign.layout_type === 'carousel'
                    ? 'bg-rose-950/20 border-rose-500 ring-1 ring-rose-500/40'
                    : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-rose-400" />
                    <span className="text-sm font-bold text-white">Modo Carrusel</span>
                  </div>
                  {campaign.layout_type === 'carousel' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  )}
                </div>
                <p className="text-xs text-neutral-400">
                  Despliega varias tarjetas de fotos en fila horizontal con navegación continua y scroll fluido con snap.
                </p>
              </div>

              {/* Opción 2: Modo Banner Grande */}
              <div
                onClick={() => setCampaign({ ...campaign, layout_type: 'banner' })}
                className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                  campaign.layout_type === 'banner'
                    ? 'bg-rose-950/20 border-rose-500 ring-1 ring-rose-500/40'
                    : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-rose-400" />
                    <span className="text-sm font-bold text-white">Modo Banner Grande</span>
                  </div>
                  {campaign.layout_type === 'banner' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  )}
                </div>
                <p className="text-xs text-neutral-400">
                  Presenta una imagen panorámica de alto impacto editorial con tipografía integrada y llamada a la acción.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Administrador de Fotos */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Fotografías de la Campaña</h2>
                  <p className="text-xs text-neutral-400">
                    Sube fotos a Supabase Storage o ingresa URLs directas. ({campaign.images.length} fotos)
                  </p>
                </div>
              </div>

              <label className="btn-tactile inline-flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-4 py-2 rounded-xl text-xs cursor-pointer self-start sm:self-auto border border-neutral-700">
                {uploadingImage ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span>{uploadingImage ? 'Subiendo...' : 'Subir Foto'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            </div>

            {/* Añadir por URL */}
            <div className="flex gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="O pega aquí una URL de imagen (https://...)"
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                disabled={!newImageUrl.trim()}
                className="btn-tactile inline-flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 border border-neutral-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir</span>
              </button>
            </div>

            {/* Grid de Fotos de Campaña */}
            {campaign.images.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-neutral-800 rounded-2xl p-6 text-neutral-400 space-y-2">
                <ImageIcon className="w-8 h-8 text-neutral-600 mx-auto" />
                <p className="text-xs">No hay fotos en la campaña todavía. Sube o añade una imagen arriba.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {campaign.images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-sm flex flex-col justify-between p-2"
                  >
                    <img
                      src={imgUrl}
                      alt={`Foto ${idx + 1}`}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    {/* Badge de Orden */}
                    <div className="relative z-10 flex items-center justify-between">
                      <span className="bg-black/70 backdrop-blur-sm text-[10px] font-bold text-white px-2 py-0.5 rounded-md">
                        #{idx + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="p-1 rounded-md bg-rose-950/80 text-rose-400 hover:bg-rose-900 transition"
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Botones de Reordenar */}
                    <div className="relative z-10 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveImage(idx, 'up')}
                        className="p-1 rounded-md bg-black/70 text-neutral-300 hover:text-white disabled:opacity-30 transition"
                        title="Mover antes"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === campaign.images.length - 1}
                        onClick={() => handleMoveImage(idx, 'down')}
                        className="p-1 rounded-md bg-black/70 text-neutral-300 hover:text-white disabled:opacity-30 transition"
                        title="Mover después"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botón Guardar Inferior */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-tactile inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold px-6 py-3 rounded-xl text-xs shadow-lg shadow-rose-950 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando cambios...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar y Publicar Campaña</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
