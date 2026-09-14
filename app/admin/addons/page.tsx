'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SpecialAddon } from '@/lib/types';
import {
  ADDON_CATEGORIES,
  DEFAULT_SPECIAL_ADDONS,
  getSpecialAddons,
  toggleSpecialAddonActive,
  deleteSpecialAddon,
} from '@/lib/addons';
import {
  Gift,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  AlertCircle,
  Loader2,
  RefreshCw,
  Camera,
  Image as ImageIcon,
  Sliders,
  DollarSign,
  Layers,
} from 'lucide-react';

export default function AdminAddonsPage() {
  const [addons, setAddons] = useState<SpecialAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('todos');

  // Toast notification
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
  const [currentAddonId, setCurrentAddonId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Chocolates');
  const [formPrice, setFormPrice] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('1');
  const [formIsActive, setFormIsActive] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Confirmación Eliminar
  const [deletingAddon, setDeletingAddon] = useState<SpecialAddon | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Cargar datos
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getSpecialAddons(true);
      setAddons(data);
    } catch (err: any) {
      console.error('Error cargando toques especiales:', err);
      showToast('Error al cargar complementos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Suscripción en tiempo real
    const channel = supabase
      .channel('admin_special_addons_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'special_addons' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Abrir Modal de Creación
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setCurrentAddonId(null);
    setFormName('');
    setFormCategory('Chocolates');
    setFormPrice('');
    setFormImageUrl('');
    setFormSortOrder(String(addons.length + 1));
    setFormIsActive(true);
    setSelectedFile(null);
    setImagePreview(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEditModal = (addon: SpecialAddon) => {
    setModalMode('edit');
    setCurrentAddonId(addon.id);
    setFormName(addon.name);
    setFormCategory(addon.category);
    setFormPrice(String(addon.price));
    setFormImageUrl(addon.image_url);
    setFormSortOrder(String(addon.sort_order || 1));
    setFormIsActive(addon.is_active);
    setSelectedFile(null);
    setImagePreview(addon.image_url);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Manejar cambio de archivo de imagen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Guardar (Crear o Actualizar)
  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('El nombre del complemento es obligatorio.');
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Ingresa un precio válido mayor a cero en Soles.');
      return;
    }

    if (!formImageUrl.trim() && !selectedFile && !imagePreview) {
      setFormError('Debes ingresar una URL de imagen o subir una foto.');
      return;
    }

    setFormLoading(true);

    try {
      let finalImageUrl = formImageUrl.trim();

      // Subir archivo a Supabase Storage si se seleccionó uno
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop() || 'jpg';
        const cleanFileName = `addons/${Date.now()}-${Math.random().toString(36).substring(5)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(cleanFileName, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.warn('Aviso al subir imagen a Storage:', uploadError);
          // Si falla storage, se mantiene la URL previa o una fallback
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('products')
            .getPublicUrl(cleanFileName);
          finalImageUrl = publicUrlData.publicUrl;
        }
      }

      if (!finalImageUrl) {
        finalImageUrl =
          'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=400&q=80';
      }

      const sortOrderNum = parseInt(formSortOrder, 10) || 1;

      if (modalMode === 'create') {
        const { error: insertError } = await supabase
          .from('special_addons')
          .insert([
            {
              name: formName.trim(),
              category: formCategory.trim() || 'General',
              price: priceNum,
              image_url: finalImageUrl,
              is_active: formIsActive,
              sort_order: sortOrderNum,
            },
          ]);

        if (insertError) throw insertError;
        showToast('Toque especial creado exitosamente', 'success');
      } else if (modalMode === 'edit' && currentAddonId) {
        const { error: updateError } = await supabase
          .from('special_addons')
          .update({
            name: formName.trim(),
            category: formCategory.trim() || 'General',
            price: priceNum,
            image_url: finalImageUrl,
            is_active: formIsActive,
            sort_order: sortOrderNum,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentAddonId);

        if (updateError) throw updateError;
        showToast('Toque especial actualizado exitosamente', 'success');
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error('Error guardando toque especial:', err);
      setFormError(err.message || 'Error al guardar en la base de datos.');
    } finally {
      setFormLoading(false);
    }
  };

  // Toggle rápido Activo / Pausado
  const handleToggleActive = async (addon: SpecialAddon) => {
    const newStatus = !addon.is_active;

    // Actualización optimista
    setAddons((prev) =>
      prev.map((item) => (item.id === addon.id ? { ...item, is_active: newStatus } : item))
    );

    try {
      await toggleSpecialAddonActive(addon.id, newStatus);
      showToast(
        `Complemento ${newStatus ? 'activado' : 'pausado'} en la tienda`,
        'success'
      );
    } catch (err) {
      // Revertir
      setAddons((prev) =>
        prev.map((item) => (item.id === addon.id ? { ...item, is_active: addon.is_active } : item))
      );
      showToast('Error al actualizar estado', 'error');
    }
  };

  // Confirmar y Ejecutar Eliminación
  const handleConfirmDelete = async () => {
    if (!deletingAddon) return;
    setDeleteLoading(true);

    try {
      await deleteSpecialAddon(deletingAddon.id);
      setAddons((prev) => prev.filter((a) => a.id !== deletingAddon.id));
      showToast('Toque especial eliminado correctamente', 'success');
      setDeletingAddon(null);
    } catch (err) {
      console.error('Error al eliminar:', err);
      showToast('No se pudo eliminar el complemento', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtrado
  const filteredAddons = addons.filter((addon) => {
    const matchesSearch =
      addon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addon.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === 'todos' ||
      addon.category.toLowerCase() === filterCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const totalActive = addons.filter((a) => a.is_active).length;
  const uniqueCategories = Array.from(new Set(addons.map((a) => a.category)));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border animate-spring-modal ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-100 border-emerald-800'
              : 'bg-rose-950/90 text-rose-100 border-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-warm-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-widest">
            <Gift className="w-4 h-4" />
            <span>Cross-Selling & Experiencia</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-ink-900 font-normal mt-1">
            Toques Especiales
          </h1>
          <p className="text-xs text-warm-500 mt-1 max-w-xl">
            Gestiona los complementos sugeridos en el carrito de compras (Chocolates, Peluches,
            Vinos, Globos y Tarjetas). Los cambios se reflejan al instante en la tienda web.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={loadData}
            title="Refrescar catálogo"
            className="btn-tactile p-2.5 rounded-xl border border-warm-100 text-warm-500 hover:text-ink-900 hover:bg-rose-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="btn-tactile flex items-center gap-2 bg-ink-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Toque Especial</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-warm-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-warm-500">Total Complementos</span>
            <p className="text-lg font-bold text-ink-900 tabular-nums">{addons.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-warm-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-warm-500">Activos en Tienda</span>
            <p className="text-lg font-bold text-ink-900 tabular-nums">{totalActive}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-warm-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-warm-500">Categorías Disponibles</span>
            <p className="text-lg font-bold text-ink-900 tabular-nums">{uniqueCategories.length}</p>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtro de Categoría */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-warm-100 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-warm-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o categoría..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-rose-50/50 border border-warm-100 rounded-lg outline-none focus:border-rose-500 text-ink-900"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="text-xs px-3 py-2 bg-rose-50/50 border border-warm-100 rounded-lg outline-none focus:border-rose-500 text-ink-900 font-medium sm:w-56"
        >
          <option value="todos">Todas las categorías</option>
          {ADDON_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla / Listado de Toques Especiales */}
      <div className="bg-white rounded-2xl border border-warm-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-warm-500">
            <Loader2 className="w-7 h-7 animate-spin text-rose-500" />
            <span className="text-xs font-medium">Cargando toques especiales...</span>
          </div>
        ) : filteredAddons.length === 0 ? (
          <div className="py-16 text-center text-warm-500 space-y-2">
            <Gift className="w-10 h-10 mx-auto text-rose-300 stroke-[1.5]" />
            <h4 className="text-sm font-semibold text-ink-900">No se encontraron complementos</h4>
            <p className="text-xs max-w-sm mx-auto">
              {searchQuery || filterCategory !== 'todos'
                ? 'Prueba modificando tus filtros de búsqueda.'
                : 'Añade el primer toque especial para cross-selling haciendo clic en el botón superior.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink-900">
              <thead className="bg-rose-50/70 border-b border-warm-100 text-[11px] font-bold text-warm-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Complemento</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4 text-right">Precio</th>
                  <th className="py-3.5 px-4 text-center">Orden</th>
                  <th className="py-3.5 px-4 text-center">Estado Tienda</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100/60 font-sans">
                {filteredAddons.map((addon) => (
                  <tr
                    key={addon.id}
                    className="hover:bg-rose-50/30 transition-colors duration-150 group"
                  >
                    {/* Foto y Nombre */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-rose-100 shrink-0 border border-warm-100 relative">
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
                        <div>
                          <p className="font-bold text-sm text-ink-900">{addon.name}</p>
                          <span className="text-[10px] text-warm-500">ID: {addon.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100/80 text-rose-700 border border-rose-200/50">
                        {addon.category}
                      </span>
                    </td>

                    {/* Precio */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-sm text-ink-900 tabular-nums">
                        S/ {Number(addon.price).toFixed(2)}
                      </span>
                    </td>

                    {/* Orden */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-warm-100 text-warm-500 font-bold tabular-nums text-[11px]">
                        #{addon.sort_order || 1}
                      </span>
                    </td>

                    {/* Estado & Switch Toggle */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(addon)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          addon.is_active ? 'bg-emerald-600' : 'bg-warm-300'
                        }`}
                        title={addon.is_active ? 'Pausar en tienda' : 'Activar en tienda'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            addon.is_active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(addon)}
                          title="Editar complemento"
                          className="btn-tactile p-2 rounded-lg text-warm-500 hover:text-ink-900 hover:bg-rose-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingAddon(addon)}
                          title="Eliminar complemento"
                          className="btn-tactile p-2 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR COMPLEMENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-rose-100 animate-spring-modal text-ink-900">
            {/* Header Modal Fijo */}
            <div className="p-5 border-b border-rose-100 bg-white sticky top-0 z-10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Gift className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-ink-900">
                  {modalMode === 'create' ? 'Nuevo Toque Especial' : 'Editar Toque Especial'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-warm-500 hover:text-ink-900 hover:bg-rose-50 transition"
              >
                ✕
              </button>
            </div>

            {/* Formulario y Cuerpo con Scroll Fino */}
            <form onSubmit={handleSaveAddon} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto p-6 space-y-4 flex-1 scrollbar-thin scrollbar-thumb-rose-200 scrollbar-track-transparent text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Nombre */}
                <div>
                  <label className="block font-semibold text-ink-900 mb-1">
                    Nombre del Complemento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Chocolates Ferrero Rocher x8"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-rose-50/40 border border-warm-100 rounded-lg outline-none focus:border-rose-500 font-medium text-ink-900"
                  />
                </div>

                {/* Categoría y Precio */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink-900 mb-1">
                      Categoría *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-rose-50/40 border border-warm-100 rounded-lg outline-none focus:border-rose-500 font-medium text-ink-900"
                    >
                      {ADDON_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-ink-900 mb-1">
                      Precio en Soles (S/) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-warm-500">
                        S/
                      </span>
                      <input
                        type="number"
                        step="0.50"
                        min="1"
                        required
                        placeholder="35.00"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-rose-50/40 border border-warm-100 rounded-lg outline-none focus:border-rose-500 font-bold tabular-nums text-ink-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Imagen y Preview */}
                <div>
                  <label className="block font-semibold text-ink-900 mb-1">
                    Fotografía del Complemento
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="https://... o sube un archivo abajo"
                        value={formImageUrl}
                        onChange={(e) => {
                          setFormImageUrl(e.target.value);
                          setImagePreview(e.target.value);
                        }}
                        className="flex-1 px-3 py-2 bg-rose-50/40 border border-warm-100 rounded-lg outline-none focus:border-rose-500 font-medium text-ink-900"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-rose-100 hover:bg-rose-200/80 text-rose-700 rounded-lg font-semibold transition">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Subir archivo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      {selectedFile && (
                        <span className="text-[11px] text-warm-500 truncate max-w-[200px]">
                          {selectedFile.name}
                        </span>
                      )}
                    </div>

                    {imagePreview && (
                      <div className="mt-2 p-2 bg-rose-50 rounded-xl border border-warm-100 flex items-center gap-3">
                        <img
                          src={imagePreview}
                          alt="Previsualización"
                          className="w-14 h-14 rounded-lg object-cover border border-warm-100 shrink-0"
                        />
                        <div className="text-[11px] text-warm-500">
                          <span className="font-semibold text-ink-900 block">Vista previa</span>
                          <span>Se mostrará en miniatura en el carrito de compras</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Orden y Estado Activo */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-semibold text-ink-900 mb-1">
                      Orden de Visualización
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formSortOrder}
                      onChange={(e) => setFormSortOrder(e.target.value)}
                      className="w-full px-3 py-2 bg-rose-50/40 border border-warm-100 rounded-lg outline-none focus:border-rose-500 font-medium text-ink-900"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 p-2 bg-rose-50/60 rounded-lg border border-warm-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsActive}
                        onChange={(e) => setFormIsActive(e.target.checked)}
                        className="rounded-sm text-rose-600 focus:ring-rose-500 w-4 h-4"
                      />
                      <span className="font-semibold text-ink-900">Activo en la tienda</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Pie Fijo Modal */}
              <div className="p-4 border-t border-rose-100 bg-white sticky bottom-0 z-10 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-tactile px-4 py-2 rounded-xl border border-rose-200 text-warm-500 hover:text-ink-900 hover:bg-rose-50 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-tactile flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-xl font-semibold shadow-xs disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{modalMode === 'create' ? 'Crear Complemento' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {deletingAddon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-warm-100 p-6 text-center space-y-4 animate-spring-modal">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-ink-900">¿Eliminar complemento?</h3>
              <p className="text-xs text-warm-500 mt-1">
                Estás a punto de eliminar <strong>"{deletingAddon.name}"</strong> de la base de datos.
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAddon(null)}
                className="btn-tactile px-4 py-2 rounded-xl border border-warm-100 text-warm-500 hover:text-ink-900 font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="btn-tactile flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-semibold text-xs shadow-xs disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Eliminar Definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
