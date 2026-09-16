'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Camera,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ClientReview,
  getAllClientReviews,
  addClientReview,
  toggleClientReviewActive,
  deleteClientReview,
  uploadClientPhoto,
} from '@/lib/clientReviews';

export default function AdminClientesPage() {
  const [reviews, setReviews] = useState<ClientReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formOccasion, setFormOccasion] = useState('');
  const [formTestimonial, setFormTestimonial] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formOrderIndex, setFormOrderIndex] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await getAllClientReviews();
      setReviews(data);
    } catch (err: any) {
      setErrorMsg('Error al cargar fotos de clientes: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleOpenModal = () => {
    setFormName('');
    setFormOccasion('');
    setFormTestimonial('');
    setFormPhotoUrl('');
    setFormOrderIndex(reviews.length + 1);
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await toggleClientReviewActive(id, !currentStatus);
      setReviews(reviews.map((r) => (r.id === id ? { ...r, is_active: !currentStatus } : r)));
      setSuccessMsg(`Estado actualizado correctamente.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg('Error al cambiar estado: ' + (err.message || err));
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta fotografía de clientes?')) return;
    try {
      await deleteClientReview(id);
      setReviews(reviews.filter((r) => r.id !== id));
      setSuccessMsg('Fotografía eliminada con éxito.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg('Error al eliminar: ' + (err.message || err));
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !formPhotoUrl.trim()) {
      alert('Debes seleccionar una imagen o ingresar un enlace de foto.');
      return;
    }

    setSaving(true);
    setUploading(true);
    try {
      let finalPhotoUrl = formPhotoUrl.trim();

      if (selectedFile) {
        finalPhotoUrl = await uploadClientPhoto(selectedFile);
      }

      const created = await addClientReview({
        client_name: formName.trim() || undefined,
        occasion: formOccasion.trim() || undefined,
        testimonial: formTestimonial.trim() || undefined,
        comment: formTestimonial.trim() || undefined,
        image_url: finalPhotoUrl,
        photo_url: finalPhotoUrl,
        order_index: Number(formOrderIndex) || reviews.length + 1,
        is_active: true,
      });

      setReviews([...reviews, created]);
      setSuccessMsg('¡Foto añadida con éxito a Momentos Reales!');
      setTimeout(() => setSuccessMsg(null), 3500);
      handleCloseModal();
    } catch (err: any) {
      setErrorMsg('Error al añadir foto: ' + (err.message || err));
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-[#FAF2F4] min-h-screen text-[#3D1E26] rounded-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4CAD2] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F4D9E1] flex items-center justify-center text-[#B85D6F]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-[#2D161C] tracking-tight">
                Fotos de Clientes
              </h1>
              <p className="text-xs sm:text-sm text-[#7D535E]">
                Administra las fotografías del carrusel continuo &ldquo;Momentos que Dejan Huella&rdquo; en la tienda.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#B85D6F] hover:bg-[#9B4858] text-white rounded-xl text-sm font-semibold transition shadow-sm hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Foto</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-[#2D161C] border border-[#B85D6F] text-white rounded-xl text-sm animate-fadeIn shadow-md">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-rose-950 border border-rose-600 text-white rounded-xl text-sm animate-fadeIn shadow-md">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Summary Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E4CAD2] shadow-xs">
          <span className="text-xs font-bold text-[#7D535E] uppercase tracking-wider">Total Fotografías</span>
          <p className="text-2xl font-serif font-bold text-[#2D161C] mt-1">{reviews.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E4CAD2] shadow-xs">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Visibles en Tienda</span>
          <p className="text-2xl font-serif font-bold text-emerald-800 mt-1">
            {reviews.filter((r) => r.is_active).length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E4CAD2] shadow-xs">
          <span className="text-xs font-bold text-[#7D535E] uppercase tracking-wider">Ocultas</span>
          <p className="text-2xl font-serif font-bold text-[#7D535E] mt-1">
            {reviews.filter((r) => !r.is_active).length}
          </p>
        </div>
      </div>

      {/* Grid of Photos */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-ink-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
          <p className="text-sm">Cargando fotografías de clientes...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-warm-300 p-8">
          <Camera className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <h3 className="text-base font-serif font-semibold text-ink-800">No hay fotos de clientes registradas</h3>
          <p className="text-xs text-ink-500 max-w-sm mx-auto mt-1 mb-4">
            Comienza subiendo fotos de clientes felices recibiendo sus arreglos florales ROZIER.
          </p>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Subir primera fotografía
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {reviews.map((item, index) => (
            <div
              key={item.id}
              className={`group relative bg-white rounded-3xl border overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md flex flex-col ${
                item.is_active ? 'border-[#E4CAD2]' : 'border-[#E4CAD2]/60 opacity-60 bg-[#FAF2F4]'
              }`}
            >
              {/* Image Container */}
              <div className="relative aspect-[3/4] w-full bg-[#FAF0F3] overflow-hidden">
                <Image
                  src={item.photo_url || item.image_url}
                  alt={item.client_name || `Cliente #${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Status Badge */}
                <div className="absolute top-2.5 left-2.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md shadow-xs ${
                      item.is_active
                        ? 'bg-emerald-600/90 text-white'
                        : 'bg-neutral-800/80 text-white/80'
                    }`}
                  >
                    {item.is_active ? 'Activa' : 'Oculta'}
                  </span>
                </div>

                {/* Index Pill */}
                <div className="absolute top-2.5 right-2.5">
                  <span className="w-5 h-5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-mono flex items-center justify-center">
                    #{item.order_index ?? index + 1}
                  </span>
                </div>
              </div>

              {/* Info & Actions */}
              <div className="p-4 flex flex-col flex-grow justify-between gap-3">
                <div>
                  <h4 className="font-serif font-bold text-xs sm:text-sm text-[#2D161C] truncate">
                    {item.client_name || 'Sin nombre especificado'}
                  </h4>
                  {item.occasion && (
                    <p className="text-[11px] text-[#7D535E] truncate mt-0.5 font-medium">{item.occasion}</p>
                  )}
                  {item.testimonial && (
                    <p className="text-[10px] text-[#5E3640] italic line-clamp-2 mt-1">
                      &ldquo;{item.testimonial}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#E4CAD2] gap-1.5">
                  {/* Toggle Active Button */}
                  <button
                    onClick={() => handleToggleActive(item.id, item.is_active)}
                    title={item.is_active ? 'Ocultar de la tienda' : 'Mostrar en la tienda'}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      item.is_active
                        ? 'text-[#5E3640] hover:bg-[#FAF2F4]'
                        : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {item.is_active ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-[#7D535E]" />
                        <span className="text-[11px]">Ocultar</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[11px]">Mostrar</span>
                      </>
                    )}
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Eliminar foto"
                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Añadir Foto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-warm-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-warm-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-600" />
                <h3 className="font-serif font-bold text-lg text-ink-900">Añadir Foto de Cliente</h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-warm-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitNew} className="p-5 space-y-4">
              {/* Image Upload Area */}
              <div>
                <label className="block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-2">
                  Fotografía del Cliente *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-warm-300 hover:border-rose-400 rounded-xl p-4 text-center cursor-pointer transition bg-warm-50/50 flex flex-col items-center justify-center gap-2 relative overflow-hidden group min-h-[160px]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {previewUrl ? (
                    <div className="relative w-full h-36">
                      <Image
                        src={previewUrl}
                        alt="Vista previa"
                        fill
                        className="object-contain"
                      />
                      <span className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/70 text-white rounded text-[10px]">
                        Cambiar
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-ink-700 font-medium">
                        Haz clic para subir un archivo (JPG, PNG, WebP)
                      </p>
                      <p className="text-[11px] text-ink-400">
                        O pega un enlace directo abajo
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* URL alternativa */}
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">
                  O URL directa de imagen:
                </label>
                <input
                  type="url"
                  value={formPhotoUrl}
                  onChange={(e) => {
                    setFormPhotoUrl(e.target.value);
                    if (e.target.value.startsWith('http')) {
                      setPreviewUrl(e.target.value);
                    }
                  }}
                  placeholder="https://... o /images/clientes/20.jpg"
                  className="w-full px-3 py-2 border border-warm-300 rounded-xl text-xs text-ink-800 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Cliente y Ocasión */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Nombre del Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej. Valeria & Carlos"
                    className="w-full px-3 py-2 border border-warm-300 rounded-xl text-xs text-ink-800 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Ocasión (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formOccasion}
                    onChange={(e) => setFormOccasion(e.target.value)}
                    placeholder="Ej. Aniversario de Bodas"
                    className="w-full px-3 py-2 border border-warm-300 rounded-xl text-xs text-ink-800 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Testimonio y Orden */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    Testimonio corto (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formTestimonial}
                    onChange={(e) => setFormTestimonial(e.target.value)}
                    placeholder="Ej. ¡Le encantó el detalle, flores súper frescas!"
                    className="w-full px-3 py-2 border border-warm-300 rounded-xl text-xs text-ink-800 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-700 mb-1">
                    N° Orden
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formOrderIndex}
                    onChange={(e) => setFormOrderIndex(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-warm-300 rounded-xl text-xs text-ink-800 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-warm-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-medium text-ink-600 hover:bg-warm-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-medium transition disabled:opacity-50 shadow-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{uploading ? 'Subiendo imagen...' : 'Guardando...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Publicar Foto</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
