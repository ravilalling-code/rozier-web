'use client';

import React, { useState, useEffect } from 'react';
import { DeliveryZone } from '@/lib/types';
import {
  getDeliveryZones,
  createDeliveryZone,
  updateDeliveryZone,
  toggleDeliveryZoneActive,
  deleteDeliveryZone,
} from '@/lib/delivery';
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  DollarSign,
  MapPin,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';

export default function AdminDeliveryPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Modal Agregar / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentZoneId, setCurrentZoneId] = useState<number | string | null>(null);
  const [formDistrict, setFormDistrict] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal Confirmación Eliminar
  const [zoneToDelete, setZoneToDelete] = useState<DeliveryZone | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Cargar datos
  const loadZones = async () => {
    setLoading(true);
    try {
      const data = await getDeliveryZones(true);
      setZones(data);
    } catch (err) {
      console.error(err);
      showToast('Error cargando las tarifas de delivery', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  // Abrir modal crear
  const handleOpenCreate = () => {
    setModalMode('create');
    setCurrentZoneId(null);
    setFormDistrict('');
    setFormCost('');
    setFormActive(true);
    setIsModalOpen(true);
  };

  // Abrir modal editar
  const handleOpenEdit = (zone: DeliveryZone) => {
    setModalMode('edit');
    setCurrentZoneId(zone.id);
    setFormDistrict(zone.district);
    setFormCost(zone.cost.toString());
    setFormActive(zone.active ?? true);
    setIsModalOpen(true);
  };

  // Guardar (crear o editar)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDistrict.trim()) {
      showToast('Por favor ingresa el nombre del distrito', 'error');
      return;
    }
    const costNum = parseFloat(formCost);
    if (isNaN(costNum) || costNum < 0) {
      showToast('Por favor ingresa una tarifa válida en Soles', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const created = await createDeliveryZone({
          district: formDistrict.trim(),
          cost: costNum,
          active: formActive,
        });
        if (created) {
          showToast(`Distrito "${formDistrict}" agregado con éxito`);
          setIsModalOpen(false);
          await loadZones();
        } else {
          showToast('No se pudo guardar el distrito en la base de datos', 'error');
        }
      } else if (modalMode === 'edit' && currentZoneId !== null) {
        const updated = await updateDeliveryZone(currentZoneId, {
          district: formDistrict.trim(),
          cost: costNum,
          active: formActive,
        });
        if (updated) {
          showToast(`Tarifa para "${formDistrict}" actualizada`);
          setIsModalOpen(false);
          await loadZones();
        } else {
          showToast('No se pudo actualizar la tarifa', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Ocurrió un error al procesar el formulario', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Switch rápido Activar / Desactivar
  const handleToggleActive = async (zone: DeliveryZone) => {
    const nextVal = !(zone.active ?? true);
    // Optimistic UI
    setZones((prev) =>
      prev.map((z) => (z.id === zone.id ? { ...z, active: nextVal, is_active: nextVal } : z))
    );

    const ok = await toggleDeliveryZoneActive(zone.id, zone.active ?? true);
    if (ok) {
      showToast(
        `Distrito ${zone.district} ${nextVal ? 'activado para entregas' : 'desactivado'}`
      );
    } else {
      showToast('Error al cambiar el estado del distrito', 'error');
      await loadZones();
    }
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!zoneToDelete) return;
    setDeleting(true);
    try {
      const ok = await deleteDeliveryZone(zoneToDelete.id);
      if (ok) {
        showToast(`Distrito "${zoneToDelete.district}" eliminado`);
        setZoneToDelete(null);
        await loadZones();
      } else {
        showToast('No se pudo eliminar el distrito', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error al eliminar', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Filtrar zonas
  const filteredZones = zones.filter((zone) => {
    const matchesSearch = zone.district.toLowerCase().includes(searchQuery.toLowerCase());
    const isActive = zone.active ?? true;
    if (statusFilter === 'activos') return matchesSearch && isActive;
    if (statusFilter === 'inactivos') return matchesSearch && !isActive;
    return matchesSearch;
  });

  // Estadísticas
  const totalCount = zones.length;
  const activeCount = zones.filter((z) => z.active ?? true).length;
  const avgCost = totalCount > 0
    ? (zones.reduce((acc, z) => acc + Number(z.cost), 0) / totalCount).toFixed(2)
    : '0.00';
  const minCost = zones.length > 0 ? Math.min(...zones.map((z) => Number(z.cost))).toFixed(2) : '0.00';
  const maxCost = zones.length > 0 ? Math.max(...zones.map((z) => Number(z.cost))).toFixed(2) : '0.00';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-200 text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-neutral-900 border-emerald-500/50 text-emerald-400'
              : 'bg-neutral-900 border-rose-500/50 text-rose-400'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100 font-serif">
                Tarifas de Delivery por Distrito
              </h1>
              <p className="text-xs text-neutral-400">
                Administra los distritos de Lima Metropolitana, costos de envío oficial y cobertura activa
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={loadZones}
            disabled={loading}
            className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 transition-colors"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-rose-950/20 transition-all transform active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Distrito</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-400">Total Distritos</span>
            <MapPin className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-100 mt-2 tabular-nums">{totalCount}</p>
          <span className="text-[10px] text-neutral-400">En base de datos</span>
        </div>

        <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-400">Distritos Activos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2 tabular-nums">{activeCount}</p>
          <span className="text-[10px] text-neutral-400">Disponibles en tienda</span>
        </div>

        <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-400">Tarifa Promedio</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-100 mt-2 tabular-nums">S/ {avgCost}</p>
          <span className="text-[10px] text-neutral-400">Costo medio de envío</span>
        </div>

        <div className="bg-neutral-900/70 border border-neutral-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neutral-400">Rango de Precios</span>
            <TrendingUp className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-100 mt-2 tabular-nums">
            S/ {minCost} - {maxCost}
          </p>
          <span className="text-[10px] text-neutral-400">Tarifa mín / máx</span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre de distrito (ej: Miraflores, Surco)..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-rose-500/60 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'todos'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('activos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'activos'
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Activos ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactivos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'inactivos'
                ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Inactivos ({totalCount - activeCount})
          </button>
        </div>
      </div>

      {/* Tabla de Tarifas */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3.5">Distrito</th>
                <th className="px-5 py-3.5">Tarifa Delivery (S/)</th>
                <th className="px-5 py-3.5">Estado en Tienda</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/70">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                      <span>Cargando tarifas de delivery...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredZones.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <MapPin className="w-8 h-8 text-neutral-600" />
                      <p className="font-semibold text-neutral-300">No se encontraron distritos</p>
                      <p className="text-[11px] text-neutral-500">
                        {searchQuery
                          ? 'Prueba con otro término de búsqueda'
                          : 'Agrega tu primer distrito haciendo clic en "Agregar Distrito"'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredZones.map((zone) => {
                  const isActive = zone.active ?? true;
                  return (
                    <tr
                      key={zone.id}
                      className="hover:bg-neutral-800/40 transition-colors group"
                    >
                      <td className="px-5 py-3.5 font-medium text-neutral-100 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-semibold">{zone.district}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-mono text-sm font-bold text-amber-400 tabular-nums">
                          S/ {Number(zone.cost).toFixed(2)}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(zone)}
                          className="flex items-center gap-2 group/switch cursor-pointer focus:outline-none"
                          title={isActive ? 'Hacer clic para desactivar' : 'Hacer clic para activar'}
                        >
                          <div
                            className={`w-10 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
                              isActive ? 'bg-emerald-600' : 'bg-neutral-700'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                isActive ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </div>
                          <span
                            className={`text-xs font-medium ${
                              isActive ? 'text-emerald-400' : 'text-neutral-500'
                            }`}
                          >
                            {isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </button>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(zone)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 transition"
                            title="Editar distrito / precio"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setZoneToDelete(zone)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 transition"
                            title="Eliminar distrito"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Crear / Editar Distrito */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-neutral-100 font-serif">
                  {modalMode === 'create' ? 'Agregar Nuevo Distrito' : 'Editar Tarifa de Delivery'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Nombre del Distrito *
                </label>
                <input
                  type="text"
                  required
                  value={formDistrict}
                  onChange={(e) => setFormDistrict(e.target.value)}
                  placeholder="ej: Santiago de Surco"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Tarifa de Delivery en Soles (S/) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-500">
                    S/
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    placeholder="15.00"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-100 font-mono placeholder:text-neutral-600 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">
                  Este monto se sumará automáticamente al subtotal cuando el cliente elija este distrito.
                </p>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2.5 text-xs font-medium text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded-md border-neutral-700 bg-neutral-950 text-rose-600 focus:ring-rose-500 accent-rose-600"
                  />
                  <span>Distrito activo para compras en la tienda</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{modalMode === 'create' ? 'Crear Distrito' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación de Eliminación */}
      {zoneToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-neutral-100 text-base font-serif">
                ¿Eliminar {zoneToDelete.district}?
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Esta acción eliminará el distrito de la lista oficial de fletes. Los pedidos históricos no se verán afectados.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setZoneToDelete(null)}
                disabled={deleting}
                className="w-full py-2.5 rounded-xl text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-md flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
