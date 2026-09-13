'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Expense, ExpenseCategory } from '@/lib/types';
import {
  Plus,
  Search,
  Upload,
  Trash2,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Percent,
  Calendar,
  Tag,
  FileText,
  AlertCircle,
  Sparkles,
  X,
  Loader2,
  RefreshCw,
  ExternalLink,
  Receipt,
  Flower2,
  PackageCheck,
  Truck,
  Building2,
  Megaphone,
} from 'lucide-react';

const CATEGORY_LABELS: Record<
  ExpenseCategory,
  { label: string; bg: string; text: string; icon: any }
> = {
  flores_frescas: {
    label: 'Flores Frescas & Follaje',
    bg: 'bg-rose-950/60 border-rose-800/60',
    text: 'text-rose-400',
    icon: Flower2,
  },
  empaques_bases: {
    label: 'Empaques, Cajas & Lazos',
    bg: 'bg-amber-950/60 border-amber-800/60',
    text: 'text-amber-400',
    icon: PackageCheck,
  },
  logistica_delivery: {
    label: 'Logística & Delivery',
    bg: 'bg-sky-950/60 border-sky-800/60',
    text: 'text-sky-400',
    icon: Truck,
  },
  fijos: {
    label: 'Costos Fijos & Taller',
    bg: 'bg-neutral-800 border-neutral-700',
    text: 'text-neutral-300',
    icon: Building2,
  },
  publicidad: {
    label: 'Publicidad & Redes',
    bg: 'bg-purple-950/60 border-purple-800/60',
    text: 'text-purple-400',
    icon: Megaphone,
  },
};

const SUGGESTIONS = [
  'Compra de paquetes de rosas rojas en mercado',
  'Papel coreano, cintas y lazos',
  'Bases de madera y cajas corazón',
  'Pago de delivery motorizado',
  'Publicidad en Instagram / TikTok',
  'Toppers acrílicos y chocolates Ferrero',
];

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalSales, setTotalSales] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('todos');

  // Modal Registrar Gasto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('flores_frescas');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Deleting state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Cargar datos financieros
  const loadFinancialData = async () => {
    setLoading(true);
    try {
      // 1. Cargar Gastos
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (expensesError) throw expensesError;
      if (expensesData) setExpenses(expensesData as Expense[]);

      // 2. Cargar Ventas Cobradas (pedidos confirmados, en taller o entregados)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, status');

      if (!ordersError && ordersData) {
        const sumSales = ordersData
          .filter((o) => o.status !== 'pendiente')
          .reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
        setTotalSales(sumSales);
      }
    } catch (err: any) {
      console.error('Error cargando finanzas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  // Manejo de archivo de recibo/boleta
  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptFile(file);
      const url = URL.createObjectURL(file);
      setReceiptPreview(url);
    }
  };

  // Registrar Gasto
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!concept.trim()) {
      setModalError('Ingresa el concepto o detalle del gasto.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setModalError('Ingresa un monto en Soles válido.');
      return;
    }

    setCreateLoading(true);

    try {
      let receiptStorageUrl: string | null = null;

      // Subir comprobante opcional a Supabase Storage
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop() || 'jpg';
        const cleanFileName = `receipts/${Date.now()}-${Math.random().toString(36).substring(5)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(cleanFileName, receiptFile, { cacheControl: '3600', upsert: false });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('products')
            .getPublicUrl(cleanFileName);
          receiptStorageUrl = publicUrlData.publicUrl;
        }
      }

      // Guardar en Supabase
      const { data: newExp, error: insertError } = await supabase
        .from('expenses')
        .insert([
          {
            concept: concept.trim(),
            amount: parseFloat(amount),
            category,
            expense_date: expenseDate,
            receipt_url: receiptStorageUrl,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      if (newExp) {
        setExpenses((prev) => [newExp as Expense, ...prev]);
      }

      // Reset
      setIsModalOpen(false);
      setConcept('');
      setAmount('');
      setCategory('flores_frescas');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setReceiptFile(null);
      setReceiptPreview(null);
    } catch (err: any) {
      console.error('Error registrando gasto:', err);
      setModalError(err.message || 'Error al guardar el gasto.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Eliminar Gasto
  const handleDeleteExpense = async (id: string, itemConcept: string) => {
    const confirm = window.confirm(`¿Deseas eliminar el registro de gasto "${itemConcept}"?`);
    if (!confirm) return;

    setDeletingId(id);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert('Error al eliminar gasto: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Cálculos Financieros
  const totalExpenses = expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const netProfit = totalSales - totalExpenses;
  const operatingMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  // Filtrado de gastos
  const filteredExpenses = expenses.filter((exp) => {
    const matchesCategory = filterCategory === 'todos' || exp.category === filterCategory;
    const matchesQuery = exp.concept.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Control de Gastos & Flujo de Caja
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-800 text-rose-400 border border-neutral-700">
              {expenses.length} egresos
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Métricas financieras del taller floral, compras de insumos y ganancia neta real.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadFinancialData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition disabled:opacity-50"
            title="Recargar balance"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-rose-950/40 transition active:scale-98 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* Tarjetas Resumen Financiero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingresos Cobrados */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 shadow-lg shadow-black/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Ventas Cobradas
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            S/ {totalSales.toFixed(2)}
          </div>
          <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <span>●</span> Pedidos con pago verificado
          </p>
        </div>

        {/* Total Egresos */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 shadow-lg shadow-black/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Gastos del Taller
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            S/ {totalExpenses.toFixed(2)}
          </div>
          <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
            <span>●</span> Flores, bases, empaques y envíos
          </p>
        </div>

        {/* Ganancia Neta Real */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 shadow-lg shadow-black/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Ganancia Neta Real
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                netProfit >= 0
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-bold ${
              netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            S/ {netProfit.toFixed(2)}
          </div>
          <p className="text-[11px] text-neutral-400 font-medium">
            Ingresos menos egresos registrados
          </p>
        </div>

        {/* Margen Operativo */}
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 shadow-lg shadow-black/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Margen Operativo
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {operatingMargin.toFixed(1)}%
          </div>
          <p className="text-[11px] text-purple-400 font-medium">
            Rentabilidad sobre ventas
          </p>
        </div>
      </div>

      {/* Filtros & Buscador */}
      <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800/80 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por concepto o detalle del egreso..."
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
                  ? 'bg-rose-500 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              Todos ({expenses.length})
            </button>
            {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((catKey) => {
              const count = expenses.filter((e) => e.category === catKey).length;
              return (
                <button
                  key={catKey}
                  onClick={() => setFilterCategory(catKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                    filterCategory === catKey
                      ? 'bg-rose-500 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                  }`}
                >
                  {CATEGORY_LABELS[catKey].label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabla Cronológica de Gastos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-sm">Calculando balance de taller...</p>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No hay egresos registrados</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {searchQuery || filterCategory !== 'todos'
              ? 'Prueba modificando la categoría o término de búsqueda.'
              : 'Registra los gastos del taller floral para tener control exacto del margen de ganancia.'}
          </p>
        </div>
      ) : (
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800/80 overflow-hidden shadow-xl shadow-black/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Concepto / Insumo</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-right">Monto (S/)</th>
                  <th className="py-3 px-4 text-center">Comprobante</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredExpenses.map((expense) => {
                  const catConfig =
                    CATEGORY_LABELS[expense.category as ExpenseCategory] ||
                    CATEGORY_LABELS.flores_frescas;
                  const CatIcon = catConfig.icon;

                  return (
                    <tr
                      key={expense.id}
                      className="hover:bg-neutral-850/50 transition duration-150"
                    >
                      <td className="py-3.5 px-4 text-neutral-400 whitespace-nowrap font-mono">
                        {expense.expense_date}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white max-w-xs">
                        {expense.concept}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${catConfig.bg} ${catConfig.text}`}
                        >
                          <CatIcon className="w-3 h-3" />
                          <span>{catConfig.label}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white whitespace-nowrap font-mono text-sm">
                        S/ {Number(expense.amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {expense.receipt_url ? (
                          <a
                            href={expense.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-medium hover:underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Ver Boleta</span>
                          </a>
                        ) : (
                          <span className="text-neutral-600">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteExpense(expense.id, expense.concept)}
                          disabled={deletingId === expense.id}
                          className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition disabled:opacity-50"
                          title="Eliminar registro"
                        >
                          {deletingId === expense.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-neutral-950 border-t border-neutral-800 font-bold text-white text-xs">
                  <td colSpan={3} className="py-3.5 px-4 text-neutral-300">
                    Total Acumulado ({filteredExpenses.length} registros)
                  </td>
                  <td className="py-3.5 px-4 text-right text-rose-400 font-mono text-sm">
                    S/{' '}
                    {filteredExpenses
                      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
                      .toFixed(2)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Registrar Gasto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white">Registrar Gasto del Taller</h2>
                <p className="text-xs text-neutral-400">
                  Añade compras de flores, bases, lazos, delivery o costos del negocio.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="bg-rose-950/50 border border-rose-800/80 rounded-xl p-3 flex items-center gap-2.5 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-4">
              {/* Sugerencias Rápidas */}
              <div>
                <span className="block text-[11px] font-semibold text-neutral-400 mb-1.5">
                  Sugerencias rápidas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setConcept(sug)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Concepto del Egreso *
                </label>
                <input
                  type="text"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej: Compra de 6 paquetes de rosas rojas en mercado de flores"
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Categoría del Gasto *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition"
                >
                  <option value="flores_frescas">Flores Frescas & Follaje</option>
                  <option value="empaques_bases">Empaques, Cajas & Lazos</option>
                  <option value="logistica_delivery">Logística & Delivery</option>
                  <option value="fijos">Costos Fijos & Taller</option>
                  <option value="publicidad">Publicidad & Redes</option>
                </select>
              </div>

              {/* Monto & Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Monto en Soles (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="120.00"
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Fecha del Gasto *
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition"
                  />
                </div>
              </div>

              {/* Foto de boleta / recibo opcional */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Boleta / Comprobante de Compra (Opcional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition">
                    <Upload className="w-3.5 h-3.5 text-rose-400" />
                    <span>{receiptFile ? 'Cambiar Comprobante' : 'Subir Foto de Boleta'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptChange}
                      className="hidden"
                    />
                  </label>
                  {receiptPreview && (
                    <img
                      src={receiptPreview}
                      alt="Recibo"
                      className="w-9 h-9 rounded-lg object-cover border border-neutral-700"
                    />
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={createLoading}
                  className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 text-sm font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-rose-950 transition active:scale-98 text-sm disabled:opacity-50"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Registrar Gasto</span>
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
