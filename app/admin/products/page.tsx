'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Category } from '@/lib/types';
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/categories';
import {
  Plus,
  Search,
  Upload,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  Image as ImageIcon,
  Tag,
  Tags,
  AlertCircle,
  Loader2,
  RefreshCw,
  Camera,
  Flower2,
} from 'lucide-react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('todos');

  // Mensaje de notificación / toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // MODAL CREAR PRODUCTO
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<string>('boxes');
  const [formPrice, setFormPrice] = useState('');
  const [formPromoPrice, setFormPromoPrice] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // MODAL EDITAR PRODUCTO COMPLETO (INCLUYENDO FOTO)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPromoPrice, setEditPromoPrice] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // MODAL GESTIÓN DE CATEGORÍAS (SUPABASE TABLE)
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [categoryActionLoading, setCategoryActionLoading] = useState(false);
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null);

  // MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE PRODUCTO
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Cargar productos y categorías directamente de Supabase
  const loadData = async () => {
    setLoading(true);
    try {
      const [prodsRes, catsData] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false }),
        getCategories(),
      ]);

      if (prodsRes.error) throw prodsRes.error;
      if (prodsRes.data) setProducts(prodsRes.data as Product[]);
      setCategories(catsData);

      if (catsData.length > 0 && !formCategory) {
        setFormCategory(catsData[0].slug);
      }
    } catch (err: any) {
      console.error('Error cargando catálogo:', err);
      showToast('Error al cargar datos del catálogo', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Manejador de foto para nuevo producto
  const handleCreateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Manejador de foto para editar producto
  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditFile(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  // 1. CREAR NUEVO PRODUCTO
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!formName.trim()) {
      setCreateError('El nombre del arreglo floral es obligatorio.');
      return;
    }
    if (!formPrice || Number(formPrice) <= 0) {
      setCreateError('Ingresa un precio regular válido mayor a cero.');
      return;
    }
    if (!selectedFile) {
      setCreateError('Debes seleccionar una fotografía para el catálogo.');
      return;
    }

    setCreateLoading(true);

    try {
      // Subir imagen al bucket 'products'
      const fileExt = selectedFile.name.split('.').pop() || 'jpg';
      const cleanFileName = `items/${Date.now()}-${Math.random().toString(36).substring(5)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(cleanFileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw new Error(`Error al subir imagen: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage
        .from('products')
        .getPublicUrl(cleanFileName);

      const publicImageUrl = publicUrlData.publicUrl;

      // Insertar en Supabase
      const regularPriceNum = parseFloat(formPrice);
      const promoPriceNum = formPromoPrice ? parseFloat(formPromoPrice) : null;

      const { data: newProd, error: insertError } = await supabase
        .from('products')
        .insert([
          {
            name: formName.trim(),
            description: formDescription.trim(),
            category: formCategory.toLowerCase().trim(),
            price: regularPriceNum,
            promotional_price: promoPriceNum,
            image_url: publicImageUrl,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      if (newProd) {
        setProducts((prev) => [newProd as Product, ...prev]);
      }

      setIsCreateModalOpen(false);
      setFormName('');
      setFormDescription('');
      setFormPrice('');
      setFormPromoPrice('');
      setSelectedFile(null);
      setImagePreview(null);
      showToast('¡Arreglo floral creado con éxito!');
    } catch (err: any) {
      console.error('Error al crear producto:', err);
      setCreateError(err.message || 'Error inesperado al crear el producto.');
    } finally {
      setCreateLoading(false);
    }
  };

  // 2. ABRIR MODAL EDITAR PRODUCTO (FOTO, NOMBRE, DESCRIPCIÓN, PRECIOS, CATEGORÍA)
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditDescription(product.description || '');
    setEditCategory(product.category);
    setEditPrice(product.price.toString());
    setEditPromoPrice(product.promotional_price ? product.promotional_price.toString() : '');
    setEditFile(null);
    setEditImagePreview(null);
    setEditError(null);
  };

  // GUARDAR EDICIÓN COMPLETA (CON POSIBLE NUEVA FOTO)
  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setEditError(null);

    const newPriceNum = parseFloat(editPrice);
    const newPromoPriceNum = editPromoPrice ? parseFloat(editPromoPrice) : null;

    if (!editName.trim()) {
      setEditError('El nombre del arreglo es obligatorio.');
      return;
    }
    if (isNaN(newPriceNum) || newPriceNum <= 0) {
      setEditError('Ingresa un precio regular válido mayor a 0.');
      return;
    }

    setEditLoading(true);

    try {
      let finalImageUrl = editingProduct.image_url;

      // Si se seleccionó una foto nueva, se sube a Storage
      if (editFile) {
        const fileExt = editFile.name.split('.').pop() || 'jpg';
        const cleanFileName = `items/${Date.now()}-${Math.random().toString(36).substring(5)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(cleanFileName, editFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw new Error(`Error al subir nueva foto: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(cleanFileName);

        finalImageUrl = publicUrlData.publicUrl;
      }

      // Actualizar en tabla products
      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: editName.trim(),
          description: editDescription.trim(),
          category: editCategory.toLowerCase().trim(),
          price: newPriceNum,
          promotional_price: newPromoPriceNum,
          image_url: finalImageUrl,
        })
        .eq('id', editingProduct.id);

      if (updateError) throw updateError;

      // Actualizar estado local
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: editName.trim(),
                description: editDescription.trim(),
                category: editCategory.toLowerCase().trim(),
                price: newPriceNum,
                promotional_price: newPromoPriceNum,
                image_url: finalImageUrl,
              }
            : p
        )
      );

      setEditingProduct(null);
      showToast('¡Arreglo y fotografía actualizados con éxito!');
    } catch (err: any) {
      console.error('Error editando producto:', err);
      setEditError(err.message || 'Error al actualizar el producto.');
    } finally {
      setEditLoading(false);
    }
  };

  // 3. ALTERNAR VISIBILIDAD (ACTIVO / EN PAUSA)
  const handleToggleActive = async (product: Product) => {
    const nextState = !product.is_active;

    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, is_active: nextState } : p))
    );

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: nextState })
        .eq('id', product.id);

      if (error) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, is_active: product.is_active } : p))
        );
        showToast('Error al actualizar visibilidad', 'error');
      } else {
        showToast(nextState ? 'Arreglo activado en tienda' : 'Arreglo pausado en tienda');
      }
    } catch (err: any) {
      console.error('Error toggling active:', err);
    }
  };

  // 4. ELIMINAR PRODUCTO O ARREGLO
  const handleConfirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    setDeleteLoading(true);

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deletingProduct.id);

      if (error) throw error;

      setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
      showToast(`Arreglo "${deletingProduct.name}" eliminado correctamente`);
      setDeletingProduct(null);
    } catch (err: any) {
      console.error('Error al eliminar:', err);
      showToast('Error al eliminar producto: ' + err.message, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 5. AGREGAR CATEGORÍA DIRECTO EN SUPABASE
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryModalError(null);

    const clean = newCategoryName.trim();
    if (!clean) {
      setCategoryModalError('Ingresa un nombre para la categoría.');
      return;
    }

    setCategoryActionLoading(true);
    try {
      const createdCategory = await addCategory(clean);
      setCategories((prev) => [...prev, createdCategory]);
      setNewCategoryName('');
      showToast(`Categoría "${createdCategory.name}" agregada a la base de datos`);
    } catch (err: any) {
      console.error('Error agregando categoría:', err);
      setCategoryModalError(err.message || 'Error al agregar categoría en Supabase.');
    } finally {
      setCategoryActionLoading(false);
    }
  };

  // 6. EDITAR / RENOMBRAR CATEGORÍA DIRECTO EN SUPABASE
  const handleStartEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
    setCategoryModalError(null);
  };

  const handleSaveEditCategory = async (cat: Category) => {
    const clean = editingCategoryName.trim();
    if (!clean) {
      setCategoryModalError('El nombre de la categoría no puede estar vacío.');
      return;
    }
    if (clean === cat.name) {
      setEditingCategoryId(null);
      return;
    }

    setCategoryActionLoading(true);
    setCategoryModalError(null);

    try {
      const updatedCat = await updateCategory(cat.id, clean, undefined, cat.slug);

      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? updatedCat : c))
      );

      // Si el slug cambió, actualizar también los productos en el estado local
      if (updatedCat.slug !== cat.slug) {
        setProducts((prev) =>
          prev.map((p) =>
            (p.category || '').toLowerCase() === cat.slug.toLowerCase()
              ? { ...p, category: updatedCat.slug }
              : p
          )
        );
        if (filterCategory === cat.slug) {
          setFilterCategory(updatedCat.slug);
        }
      }

      setEditingCategoryId(null);
      setEditingCategoryName('');
      showToast(`Categoría renombrada a "${updatedCat.name}"`);
    } catch (err: any) {
      console.error('Error renombrando categoría:', err);
      setCategoryModalError(err.message || 'Error al actualizar categoría en Supabase.');
    } finally {
      setCategoryActionLoading(false);
    }
  };

  // 7. ELIMINAR CATEGORÍA DIRECTO EN SUPABASE CON VALIDACIÓN
  const handleDeleteCategory = async (cat: Category) => {
    const assignedCount = products.filter(
      (p) => (p.category || '').toLowerCase() === cat.slug.toLowerCase()
    ).length;

    const confirmMsg =
      assignedCount > 0
        ? `⚠️ ATENCIÓN: La categoría "${cat.name}" tiene ${assignedCount} arreglo(s) asociado(s).\n\nSi la eliminas, esos arreglos deberán ser trasladados a otra categoría activa. ¿Estás seguro de eliminarla permanentemente de la base de datos?`
        : `¿Eliminar permanentemente la categoría "${cat.name}" de Supabase?`;

    if (!window.confirm(confirmMsg)) return;

    setCategoryActionLoading(true);
    setCategoryModalError(null);
    try {
      await deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));

      if (filterCategory === cat.slug) {
        setFilterCategory('todos');
      }

      showToast(`Categoría "${cat.name}" eliminada de Supabase`);
    } catch (err: any) {
      console.error('Error eliminando categoría:', err);
      setCategoryModalError('Error al eliminar categoría: ' + (err.message || err));
      showToast('Error al eliminar categoría: ' + err.message, 'error');
    } finally {
      setCategoryActionLoading(false);
    }
  };

  // 8. TRASLADAR / MOVER PRODUCTO RÁPIDAMENTE DE CATEGORÍA
  const handleQuickChangeCategory = async (productId: string, newSlug: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product || product.category === newSlug) return;
    const oldSlug = product.category;

    // Actualización optimista inmediata
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, category: newSlug } : p))
    );

    try {
      const { error } = await supabase
        .from('products')
        .update({ category: newSlug })
        .eq('id', productId);

      if (error) throw error;
      const catDisplayName = getCategoryDisplayName(newSlug);
      showToast(`Arreglo movido a "${catDisplayName}"`);
    } catch (err: any) {
      console.error('Error al mover de categoría:', err);
      // Revertir estado local
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, category: oldSlug } : p))
      );
      showToast('Error al mover de categoría: ' + (err.message || err), 'error');
    }
  };

  // Encontrar el nombre legible de una categoría
  const getCategoryDisplayName = (slug: string) => {
    const found = categories.find((c) => c.slug.toLowerCase() === (slug || '').toLowerCase());
    if (found) return found.name;
    return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'General';
  };

  // Filtrado de productos en Admin
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      filterCategory === 'todos' || (p.category || '').toLowerCase() === filterCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md text-sm font-medium flex items-center gap-2.5 transition-all animate-in slide-in-from-top-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/90 border-rose-700 text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Catálogo & Arreglos Florales
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-800 text-rose-400 border border-neutral-700">
              {products.length} {products.length === 1 ? 'ítem' : 'ítems'}
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Gestión completa de arreglos, edición de fotografías y categorías en Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition disabled:opacity-50"
            title="Recargar catálogo y categorías"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Botón Gestión de Categorías */}
          <button
            onClick={() => setIsCategoriesModalOpen(true)}
            className="flex items-center gap-2 bg-neutral-900 border border-neutral-700/80 hover:bg-neutral-800 text-neutral-200 font-medium px-3.5 py-2.5 rounded-xl transition text-sm shadow-sm"
          >
            <Tags className="w-4 h-4 text-rose-400" />
            <span>Categorías ({categories.length})</span>
          </button>

          {/* Botón Simple Nueva Categoría */}
          <button
            onClick={() => {
              setNewCategoryName('');
              setCategoryModalError(null);
              setIsCategoriesModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-neutral-900 border border-rose-800/70 hover:bg-rose-950/40 text-rose-300 font-medium px-3.5 py-2.5 rounded-xl transition text-sm shadow-sm"
          >
            <Plus className="w-4 h-4 text-rose-400" />
            <span>Nueva Categoría</span>
          </button>

          {/* Botón Crear Arreglo */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-rose-950/40 transition active:scale-98 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Arreglo</span>
          </button>
        </div>
      </div>

      {/* Filtros por Categoría & Buscador */}
      <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800/80 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o descripción del arreglo..."
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

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button
              onClick={() => setFilterCategory('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                filterCategory === 'todos'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              Todos ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter(
                (p) => (p.category || '').toLowerCase() === cat.slug.toLowerCase()
              ).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.slug)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                    filterCategory === cat.slug
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid de Productos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-sm">Cargando catálogo de ROZIER...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No se encontraron arreglos</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {searchQuery || filterCategory !== 'todos'
              ? 'Prueba modificando los filtros de búsqueda o categoría.'
              : 'Comienza creando el primer arreglo floral en el botón "Nuevo Arreglo".'}
          </p>
          {(searchQuery || filterCategory !== 'todos') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('todos');
              }}
              className="text-xs text-rose-400 hover:underline pt-2 inline-block"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const hasPromo = product.promotional_price !== null && product.promotional_price > 0;
            const currentPrice = hasPromo ? product.promotional_price! : product.price;

            return (
              <div
                key={product.id}
                className="bg-neutral-900 rounded-2xl border border-neutral-800/80 overflow-hidden flex flex-col shadow-lg shadow-black/40 hover:border-neutral-700/80 transition group"
              >
                {/* Contenedor de Fotografía */}
                <div className="relative aspect-square w-full bg-neutral-950 overflow-hidden">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-60 pointer-events-none" />

                  {/* Badges de estado & oferta */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md ${
                        product.is_active
                          ? 'bg-emerald-500/90 text-white'
                          : 'bg-neutral-800/90 text-neutral-300 border border-neutral-700'
                      }`}
                    >
                      {product.is_active ? 'Activo' : 'En Pausa'}
                    </span>
                    {hasPromo && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/90 text-white backdrop-blur-md">
                        Oferta
                      </span>
                    )}
                  </div>

                  {/* Categoría pill */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className="text-[10px] font-semibold capitalize px-2 py-0.5 rounded-full bg-black/60 text-neutral-300 border border-neutral-700/60 backdrop-blur-md">
                      {getCategoryDisplayName(product.category)}
                    </span>
                  </div>

                  {/* Botón rápido para alternar visibilidad */}
                  <div className="absolute bottom-2.5 right-2.5 z-10">
                    <button
                      onClick={() => handleToggleActive(product)}
                      className={`p-2 rounded-xl backdrop-blur-md transition shadow-md ${
                        product.is_active
                          ? 'bg-neutral-900/85 text-emerald-400 hover:bg-neutral-900 hover:text-emerald-300'
                          : 'bg-neutral-900/85 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                      }`}
                      title={product.is_active ? 'Pausar en tienda' : 'Activar en tienda'}
                    >
                      {product.is_active ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Contenido del Producto */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-semibold text-white text-base line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-2 mt-1">
                      {product.description || 'Sin descripción especificada'}
                    </p>
                  </div>

                  {/* Selector de categoría rápido para mover arreglo */}
                  <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                      <Tag className="w-3 h-3 text-rose-400 flex-shrink-0" />
                      <span>Categoría:</span>
                    </span>
                    <select
                      value={(product.category || '').toLowerCase()}
                      onChange={(e) => handleQuickChangeCategory(product.id, e.target.value)}
                      className="bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:border-rose-500 transition cursor-pointer max-w-[140px] truncate"
                      title="Mover arreglo a otra categoría"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.slug.toLowerCase()}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Precios & Botones de Acción */}
                  <div className="pt-2.5 border-t border-neutral-800/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-bold text-white font-mono">
                          S/ {currentPrice.toFixed(2)}
                        </span>
                        {hasPromo && (
                          <span className="text-xs text-neutral-500 line-through font-mono">
                            S/ {product.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-500">
                        {hasPromo ? 'Precio con descuento' : 'Precio regular'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Botón Editar Producto Completo (incluyendo Foto) */}
                      <button
                        onClick={() => handleOpenEdit(product)}
                        className="p-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition"
                        title="Editar nombre, foto, categoría y precios"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Botón Eliminar Producto */}
                      <button
                        onClick={() => setDeletingProduct(product)}
                        className="p-2 rounded-xl bg-neutral-800 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 transition"
                        title="Eliminar arreglo permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Crear Nuevo Producto */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink-950/70 backdrop-blur-xs">
          <div className="bg-[#FAF0F3] rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-[#DFC0CB] animate-spring-modal text-[#2D1B22]">
            {/* Cabecera Fija */}
            <div className="p-5 border-b border-[#DFC0CB] bg-[#F5E5EA] sticky top-0 z-10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Flower2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-ink-900">Nuevo Arreglo Floral</h2>
                  <p className="text-xs text-warm-500">
                    Sube la fotografía del arreglo y define su categoría y precios.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setImagePreview(null);
                  setSelectedFile(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-warm-500 hover:text-ink-900 hover:bg-rose-50 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto p-6 space-y-4 flex-1 scrollbar-thin scrollbar-thumb-rose-200 scrollbar-track-transparent text-xs sm:text-sm">
                {createError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2.5 text-rose-800 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                {/* Selector de Foto con Preview */}
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1.5">
                    Fotografía del Arreglo *
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-2xl bg-rose-50 border-2 border-dashed border-rose-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Vista previa"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-warm-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="btn-tactile cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition">
                        <Upload className="w-3.5 h-3.5 text-rose-600" />
                        <span>{selectedFile ? 'Cambiar Foto' : 'Subir Fotografía'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCreateFileChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-warm-500 mt-1">
                        {selectedFile
                          ? selectedFile.name
                          : 'Formatos JPG, PNG o WEBP. Se almacena en Supabase Storage.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1.5">
                    Nombre del Arreglo *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej: Box Corazón Rosas Rojas & Ferrero"
                    required
                    className="w-full bg-rose-50/40 border border-warm-100 rounded-xl px-3.5 py-2.5 text-sm text-ink-900 placeholder-warm-300 focus:outline-none focus:border-rose-500 transition"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1.5">
                    Descripción / Qué incluye
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Ej: Incluye 24 rosas importadas, tarjeta personalizada, lazo satinado y topper."
                    className="w-full bg-rose-50/40 border border-warm-100 rounded-xl px-3.5 py-2.5 text-sm text-ink-900 placeholder-warm-300 focus:outline-none focus:border-rose-500 transition resize-none"
                  />
                </div>

                {/* Categoría Dinámica de Supabase */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-ink-900">
                      Categoría *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoriesModalOpen(true)}
                      className="text-[11px] text-rose-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nueva categoría</span>
                    </button>
                  </div>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-rose-50/40 border border-warm-100 rounded-xl px-3.5 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-rose-500 transition"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Precios: Regular y Oferta */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1.5">
                      Precio Regular (S/) *
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="90.00"
                      required
                      className="w-full bg-rose-50/40 border border-warm-100 rounded-xl px-3.5 py-2.5 text-sm text-ink-900 placeholder-warm-300 focus:outline-none focus:border-rose-500 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1.5">
                      Precio Oferta (S/) (Opcional)
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={formPromoPrice}
                      onChange={(e) => setFormPromoPrice(e.target.value)}
                      placeholder="75.00"
                      className="w-full bg-rose-50/40 border border-warm-100 rounded-xl px-3.5 py-2.5 text-sm text-ink-900 placeholder-warm-300 focus:outline-none focus:border-rose-500 transition font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Pie Fijo */}
              <div className="p-4 border-t border-[#DFC0CB] bg-[#F5E5EA] sticky bottom-0 z-10 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={createLoading}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 text-warm-500 hover:text-ink-900 hover:bg-rose-50 text-xs sm:text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="btn-tactile flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm disabled:opacity-50"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Subiendo y guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Guardar Arreglo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Editar Producto Completo (Incluyendo Edición de Foto) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink-950/70 backdrop-blur-xs">
          <div className="bg-[#FAF0F3] rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-[#DFC0CB] animate-spring-modal text-[#2D1B22]">
            {/* Cabecera Fija */}
            <div className="p-5 border-b border-[#DFC0CB] bg-[#F5E5EA] sticky top-0 z-10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-900">Editar Arreglo & Fotografía</h3>
                  <p className="text-xs text-warm-500">Modifica los detalles, categoría o cambia la imagen.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-warm-500 hover:text-ink-900 hover:bg-rose-50 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto p-6 space-y-4 flex-1 scrollbar-thin scrollbar-thumb-rose-200 scrollbar-track-transparent text-xs sm:text-sm">
                {editError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2.5 text-rose-800 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                {/* Sección Edición de Fotografía */}
                <div className="bg-rose-50/40 p-4 rounded-2xl border border-warm-100 space-y-3">
                  <label className="block text-xs font-semibold text-ink-900">
                    Fotografía del Arreglo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded-2xl bg-white border border-rose-200 overflow-hidden flex-shrink-0 shadow-2xs">
                      <img
                        src={editImagePreview || editingProduct.image_url}
                        alt="Foto arreglo"
                        className="w-full h-full object-cover"
                      />
                      {editImagePreview && (
                        <span className="absolute top-1 left-1 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                          NUEVA
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="btn-tactile cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition">
                        <Camera className="w-3.5 h-3.5 text-rose-600" />
                        <span>{editFile ? 'Cambiar por otra foto' : 'Subir Nueva Fotografía'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditFileChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-warm-500">
                        {editFile
                          ? `Seleccionada: ${editFile.name}`
                          : 'Si no seleccionas un archivo, se conservará la foto actual.'}
                      </p>
                      {editFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditFile(null);
                            setEditImagePreview(null);
                          }}
                          className="text-[11px] text-rose-600 hover:underline block font-medium"
                        >
                          Deshacer y mantener foto actual
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1.5">
                    Nombre del Arreglo *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full bg-rose-50/40 border border-warm-100 rounded-xl px-3.5 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-rose-500 transition"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1.5">
                    Descripción / Qué incluye
                  </label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-rose-50/40 border border-warm-100 rounded-xl px-3.5 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-rose-500 transition resize-none"
                  />
                </div>

                {/* Categoría Dinámica */}
                <div>
                  <label className="block text-xs font-semibold text-ink-900 mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-rose-50/40 border border-warm-100 rounded-xl px-3.5 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-rose-500 transition"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Precios */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1.5">
                      Precio Regular (S/) *
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      required
                      className="w-full bg-rose-50/40 border border-warm-100 rounded-xl px-3.5 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-rose-500 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-900 mb-1.5">
                      Precio Oferta (S/)
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={editPromoPrice}
                      onChange={(e) => setEditPromoPrice(e.target.value)}
                      placeholder="Opcional"
                      className="w-full bg-rose-50/40 border border-warm-100 rounded-xl px-3.5 py-2.5 text-sm text-ink-900 focus:outline-none focus:border-rose-500 transition font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Pie Fijo */}
              <div className="p-4 border-t border-[#DFC0CB] bg-[#F5E5EA] sticky bottom-0 z-10 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  disabled={editLoading}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 text-warm-500 hover:text-ink-900 hover:bg-rose-50 text-xs sm:text-sm font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="btn-tactile flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md transition text-xs sm:text-sm disabled:opacity-50"
                >
                  {editLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando cambios...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: GESTIÓN DE CATEGORÍAS (TABLA PUBLIC.CATEGORIES EN SUPABASE) */}
      {isCategoriesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink-950/70 backdrop-blur-xs">
          <div className="bg-[#FAF0F3] rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden border border-[#DFC0CB] animate-spring-modal text-[#2D1B22]">
            {/* Cabecera Fija */}
            <div className="p-5 border-b border-[#DFC0CB] bg-[#F5E5EA] sticky top-0 z-10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Tags className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-900">Gestión de Categorías (Supabase)</h3>
                  <p className="text-xs text-warm-500">
                    Sincronizadas con la tabla public.categories y la tienda web.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoriesModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-warm-500 hover:text-ink-900 hover:bg-rose-50 transition"
              >
                ✕
              </button>
            </div>

            {/* Cuerpo con Scroll Fino */}
            <div className="overflow-y-auto p-6 space-y-4 flex-1 scrollbar-thin scrollbar-thumb-rose-200 scrollbar-track-transparent text-xs sm:text-sm">
              {categoryModalError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2.5 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{categoryModalError}</span>
                </div>
              )}

              {/* Formulario Agregar Categoría */}
              <form onSubmit={handleAddCategory} className="space-y-2">
                <label className="block text-xs font-semibold text-ink-900">
                  Agregar Nueva Categoría
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ej: Tulipanes, Girasoles, Peluches, Chocolates..."
                    className="flex-1 bg-rose-50/40 border border-warm-100 rounded-xl px-3.5 py-2 text-sm text-ink-900 placeholder-warm-300 focus:outline-none focus:border-rose-500 transition"
                  />
                  <button
                    type="submit"
                    disabled={categoryActionLoading || !newCategoryName.trim()}
                    className="btn-tactile flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition disabled:opacity-50"
                  >
                    {categoryActionLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Guardar</span>
                  </button>
                </div>
              </form>

              {/* Lista de Categorías de Supabase */}
              <div className="space-y-2 pt-2 border-t border-rose-100">
                <span className="block text-xs font-semibold text-warm-500 uppercase tracking-wider">
                  Categorías en Base de Datos ({categories.length})
                </span>
                <div className="space-y-2">
                  {categories.map((cat) => {
                    const productCount = products.filter(
                      (p) => (p.category || '').toLowerCase() === cat.slug.toLowerCase()
                    ).length;
                    const isEditingThis = editingCategoryId === cat.id;

                    return (
                      <div
                        key={cat.id}
                        className="p-3 rounded-xl bg-rose-50/30 border border-warm-100 hover:border-rose-300 transition"
                      >
                        {isEditingThis ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEditCategory(cat);
                                } else if (e.key === 'Escape') {
                                  setEditingCategoryId(null);
                                }
                              }}
                              autoFocus
                              placeholder="Nombre de la categoría"
                              className="flex-1 bg-white border border-rose-500 rounded-xl px-3 py-1.5 text-xs text-ink-900 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditCategory(cat)}
                              disabled={categoryActionLoading || !editingCategoryName.trim()}
                              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition disabled:opacity-50"
                              title="Guardar nombre"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryId(null)}
                              disabled={categoryActionLoading}
                              className="p-1.5 bg-warm-100 hover:bg-warm-200 text-warm-500 hover:text-ink-900 rounded-lg transition"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Tag className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                              <div className="truncate">
                                <span className="text-sm font-semibold text-ink-900">{cat.name}</span>
                                <span className="text-[11px] text-warm-500 font-mono ml-2">
                                  ({cat.slug})
                                </span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold flex-shrink-0">
                                {productCount} {productCount === 1 ? 'arreglo' : 'arreglos'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              {/* Botón Renombrar Categoría */}
                              <button
                                type="button"
                                onClick={() => handleStartEditCategory(cat)}
                                disabled={categoryActionLoading}
                                className="p-1.5 text-warm-500 hover:text-ink-900 hover:bg-rose-100 rounded-lg transition"
                                title={`Renombrar categoría ${cat.name}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Botón Eliminar Categoría */}
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat)}
                                disabled={categoryActionLoading}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition disabled:opacity-50"
                                title={`Eliminar categoría ${cat.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pie Fijo */}
            <div className="p-4 border-t border-[#DFC0CB] bg-[#F5E5EA] sticky bottom-0 z-10 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsCategoriesModalOpen(false)}
                className="btn-tactile px-5 py-2.5 rounded-xl bg-ink-900 hover:bg-rose-600 text-white text-xs font-semibold transition shadow-xs"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRMAR ELIMINACIÓN DE PRODUCTO */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Eliminar Arreglo</h3>
                <p className="text-xs text-neutral-400">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800 flex items-center gap-3">
              <img
                src={deletingProduct.image_url}
                alt={deletingProduct.name}
                className="w-12 h-12 rounded-xl object-cover border border-neutral-700"
              />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white line-clamp-1">
                  {deletingProduct.name}
                </h4>
                <p className="text-xs text-rose-400 font-mono font-bold">
                  S/ {deletingProduct.price.toFixed(2)}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-400">
              ¿Estás seguro de que deseas eliminar permanentemente este arreglo del catálogo y de la tienda web?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                disabled={deleteLoading}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2 rounded-xl text-xs transition disabled:opacity-50 shadow-lg shadow-rose-950"
              >
                {deleteLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}