'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Store,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { HeroSlide } from '@/lib/types';
import { getAllHeroSlides, updateHeroSlides, uploadHeroSlideImage } from '@/lib/heroSlides';

export default function AdminHeroPage() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchSlides = async () => {
      setLoading(true);
      try {
        const data = await getAllHeroSlides();
        setSlides(data);
      } catch (err: any) {
        setErrorMsg('Error al cargar los slides: ' + (err.message || err));
      } finally {
        setLoading(false);
      }
    };
    fetchSlides();
  }, []);

  const handleAddSlide = () => {
    if (slides.length >= 5) {
      alert('Se permite un máximo de 5 slides en el Hero Slider.');
      return;
    }

    const newSlide: HeroSlide = {
      id: crypto.randomUUID(),
      badge_text: 'NUEVA COLECCIÓN',
      title: 'ARREGLO FLORAL DE ALTA GAMA',
      subtitle: 'Elaborado artesanalmente con flores frescas de corte prémium.',
      image_url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=2000&q=85',
      cta_text: 'Explorar Colección',
      cta_link: '#catalogo',
      watermark_text: 'Petalia',
      sort_order: slides.length + 1,
      is_active: true,
    };

    setSlides([...slides, newSlide]);
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) {
      alert('Debe existir al menos 1 slide en el Hero Slider.');
      return;
    }
    if (!confirm('¿Estás seguro de eliminar este slide?')) return;

    const next = slides
      .filter((_, i) => i !== index)
      .map((slide, i) => ({ ...slide, sort_order: i + 1 }));

    setSlides(next);
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const next = [...slides];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;

    // Actualizar sort_order de cada slide
    const reordered = next.map((slide, i) => ({
      ...slide,
      sort_order: i + 1,
    }));

    setSlides(reordered);
  };

  const handleSlideChange = (index: number, field: keyof HeroSlide, value: any) => {
    const next = [...slides];
    next[index] = { ...next[index], [field]: value };
    setSlides(next);
  };

  const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    setErrorMsg(null);

    try {
      const publicUrl = await uploadHeroSlideImage(file);
      handleSlideChange(index, 'image_url', publicUrl);
      setSuccessMsg('¡Foto subida con éxito a Supabase Storage!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg('Error al subir imagen: ' + (err.message || err));
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const updated = await updateHeroSlides(slides);
      setSlides(updated);
      setSuccessMsg('¡Slides del Hero Principal guardados y sincronizados en tiempo real!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg('Error al guardar slides: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Hero Slider (Fotos de Portada)
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-800 text-rose-400 border border-neutral-700">
              {slides.filter((s) => s.is_active).length} activos
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Gestiona de 1 a 5 fotos de gran impacto editorial con textos coreografiados en el Hero principal de PETALIA.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-200 text-xs font-medium px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Ver Tienda</span>
            <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
          </Link>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-tactile inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-medium px-4 py-2.5 rounded-xl text-xs shadow-md shadow-rose-950 disabled:opacity-50"
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

      {/* Alertas Toast */}
      {successMsg && (
        <div className="bg-emerald-950/70 border border-emerald-800/80 rounded-2xl p-4 flex items-center gap-3 text-emerald-300 text-xs shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-950/70 border border-rose-800/80 rounded-2xl p-4 flex items-center gap-3 text-rose-300 text-xs shadow-lg animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Barra de Resumen y Añadir Slide */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              Configuración de Slides ({slides.length} de 5)
            </h2>
            <p className="text-xs text-neutral-400">
              {slides.length < 5
                ? `Puedes agregar ${5 - slides.length} slide(s) adicional(es).`
                : 'Límite máximo alcanzado (5 slides).'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddSlide}
          disabled={slides.length >= 5}
          className="btn-tactile inline-flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-rose-400" />
          <span>Añadir Slide</span>
        </button>
      </div>

      {/* Lista de Slides */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-neutral-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-sm">Cargando slides del Hero...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {slides.map((slide, index) => {
            const isUploading = uploadingIndex === index;

            return (
              <div
                key={slide.id || index}
                className={`bg-neutral-900/95 border rounded-3xl p-5 sm:p-6 shadow-xl space-y-6 transition-all ${
                  slide.is_active
                    ? 'border-neutral-800 hover:border-neutral-700'
                    : 'border-neutral-800/40 opacity-70 bg-neutral-950/80'
                }`}
              >
                {/* Header de la Tarjeta del Slide */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center justify-center font-mono">
                      #{index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{slide.title || 'Slide sin título'}</span>
                        {!slide.is_active && (
                          <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">
                            Pausado
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-neutral-400 font-mono">
                        ID: {slide.id?.slice(0, 8)}... • Orden: {slide.sort_order}
                      </p>
                    </div>
                  </div>

                  {/* Acciones de Posición, Toggle Activo y Eliminar */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {/* Mover Arriba */}
                    <button
                      type="button"
                      onClick={() => handleMoveSlide(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                      title="Mover hacia arriba"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    {/* Mover Abajo */}
                    <button
                      type="button"
                      onClick={() => handleMoveSlide(index, 'down')}
                      disabled={index === slides.length - 1}
                      className="p-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                      title="Mover hacia abajo"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    {/* Toggle Activo / Pausado */}
                    <button
                      type="button"
                      onClick={() => handleSlideChange(index, 'is_active', !slide.is_active)}
                      className={`btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        slide.is_active
                          ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60'
                          : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      {slide.is_active ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Activo</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Pausado</span>
                        </>
                      )}
                    </button>

                    {/* Eliminar Slide */}
                    <button
                      type="button"
                      onClick={() => handleDeleteSlide(index)}
                      disabled={slides.length <= 1}
                      className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/60 disabled:opacity-30 disabled:cursor-not-allowed transition ml-1"
                      title="Eliminar slide"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Contenido: Vista Previa + Formulario de Campos */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Vista Previa en Miniatura (4 cols en desktop) */}
                  <div className="lg:col-span-4 space-y-2">
                    <label className="text-xs font-semibold text-neutral-300 block">
                      Vista Previa de Encuadre
                    </label>

                    <div className="aspect-[16/10] rounded-2xl overflow-hidden relative bg-neutral-950 border border-neutral-800 shadow-inner group">
                      <img
                        src={slide.image_url || '/images/logo.jpg'}
                        alt={slide.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/logo.jpg';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40" />

                      {/* Marca de agua simulada */}
                      {slide.watermark_text && (
                        <span className="absolute -bottom-2 right-2 text-3xl font-serif italic text-white/20 select-none pointer-events-none">
                          {slide.watermark_text}
                        </span>
                      )}

                      {/* Badge y textos en preview */}
                      <div className="absolute bottom-3 left-3 right-3 text-white space-y-1">
                        <span className="inline-block bg-white/25 backdrop-blur-xs text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {slide.badge_text || 'BADGE'}
                        </span>
                        <p className="font-serif text-xs font-bold line-clamp-1 drop-shadow-xs">
                          {slide.title || 'Título del Slide'}
                        </p>
                        <p className="text-[10px] text-neutral-300 line-clamp-1 font-light">
                          {slide.subtitle || 'Subtítulo del Slide'}
                        </p>
                      </div>
                    </div>

                    {/* Botón para Subir Foto Directa */}
                    <div className="pt-1">
                      <label className="btn-tactile w-full inline-flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium py-2 px-3 rounded-xl border border-neutral-700 cursor-pointer transition">
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                        ) : (
                          <Upload className="w-4 h-4 text-rose-400" />
                        )}
                        <span>{isUploading ? 'Subiendo a Storage...' : 'Subir foto desde PC'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => handleImageUpload(index, e)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Formulario de Campos Editables (8 cols en desktop) */}
                  <div className="lg:col-span-8 space-y-4">
                    {/* URL de Imagen */}
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                        URL de Imagen Directa (Supabase Storage o CDN)
                      </label>
                      <input
                        type="url"
                        value={slide.image_url}
                        onChange={(e) => handleSlideChange(index, 'image_url', e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Eyebrow / Badge Superior & Marca de Agua */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                          Eyebrow / Badge Superior
                        </label>
                        <input
                          type="text"
                          value={slide.badge_text}
                          onChange={(e) => handleSlideChange(index, 'badge_text', e.target.value)}
                          placeholder="MOMENTOS ÚNICOS"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                          Texto Decorativo (Marca de Agua)
                        </label>
                        <input
                          type="text"
                          value={slide.watermark_text || ''}
                          onChange={(e) => handleSlideChange(index, 'watermark_text', e.target.value)}
                          placeholder="Petalia, Romance, etc."
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Título Principal */}
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                        Título Principal (Serif Display)
                      </label>
                      <input
                        type="text"
                        value={slide.title}
                        onChange={(e) => handleSlideChange(index, 'title', e.target.value)}
                        placeholder="ARTE FLORAL DISEÑADO PARA EMOCIONAR"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-serif tracking-wide focus:border-rose-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Subtítulo / Bajada */}
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                        Subtítulo / Bajada Descriptiva
                      </label>
                      <textarea
                        rows={2}
                        value={slide.subtitle}
                        onChange={(e) => handleSlideChange(index, 'subtitle', e.target.value)}
                        placeholder="Ramos de autor y colecciones exclusivas confeccionadas con flores frescas..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-hidden resize-none"
                      />
                    </div>

                    {/* CTA Texto & Link */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                          Texto del Botón CTA
                        </label>
                        <input
                          type="text"
                          value={slide.cta_text || ''}
                          onChange={(e) => handleSlideChange(index, 'cta_text', e.target.value)}
                          placeholder="Explorar Colección"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                          Destino del Botón (#catalogo o link)
                        </label>
                        <input
                          type="text"
                          value={slide.cta_link || ''}
                          onChange={(e) => handleSlideChange(index, 'cta_link', e.target.value)}
                          placeholder="#catalogo"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-hidden font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Botón Flotante Inferior de Guardar */}
      <div className="sticky bottom-6 z-30 bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
        <div className="text-xs text-neutral-400">
          Los cambios se reflejarán instantáneamente en la tienda web vía Supabase Realtime.
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-tactile inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-rose-950 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar Todos los Slides</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
