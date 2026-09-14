'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Customer, Order } from '@/lib/types';
import { formatLocalDate } from '@/lib/format';
import {
  Users,
  Calendar,
  Heart,
  MessageCircle,
  Search,
  RefreshCw,
  Gift,
  Cake,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Clock,
  Phone,
} from 'lucide-react';

interface AnniversaryReminder {
  id: string;
  customerName: string;
  customerPhone: string;
  recipientName: string;
  occasion: string;
  specialDate: string; // YYYY-MM-DD
  daysRemaining: number;
  formattedDate: string;
  lastOrderCode?: string;
  lastOrderAmount?: number;
}

interface CustomerSummary {
  phone: string;
  name: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  occasions: string[];
  recipients: string[];
  isVip: boolean;
}

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'aniversarios' | 'clientes'>('aniversarios');

  const [anniversaries, setAnniversaries] = useState<AnniversaryReminder[]>([]);
  const [customersList, setCustomersList] = useState<CustomerSummary[]>([]);

  // Cargar pedidos y clientes para fidelización
  const loadData = async (refresh: boolean = false) => {
    if (refresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      // 1. Cargar todas las órdenes
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;

      // 2. Cargar clientes
      const { data: custData } = await supabase.from('customers').select('*');

      const orders: Order[] = (ordersData as any) || [];
      const customers: Customer[] = (custData as any) || [];

      // Procesar Clientes Recurrentes
      const customerMap = new Map<string, CustomerSummary>();

      orders.forEach((o) => {
        const phone = (
          (o as any).customer_phone ||
          o.customer?.phone ||
          o.recipient_name?.match(/\b9\d{8}\b/)?.[0] ||
          ''
        ).replace(/\D/g, '');

        if (!phone) return;

        const name =
          (o as any).customer_name ||
          o.customer?.full_name ||
          o.recipient_name?.split('[Comprador:')[0].split('(Cel:')[0].trim() ||
          'Cliente';

        const recipient =
          (o.recipient_name || '')
            .split('[Comprador:')[0]
            .split('(Cel:')[0]
            .trim() || 'Destinatario';

        const occasion = (o as any).occasion || '';
        const orderDate = o.delivery_date || o.created_at || '';
        const amount = Number(o.total_amount || 0);

        if (!customerMap.has(phone)) {
          customerMap.set(phone, {
            phone,
            name,
            totalOrders: 1,
            totalSpent: amount,
            lastOrderDate: orderDate,
            occasions: occasion ? [occasion] : [],
            recipients: recipient ? [recipient] : [],
            isVip: false,
          });
        } else {
          const existing = customerMap.get(phone)!;
          existing.totalOrders += 1;
          existing.totalSpent += amount;
          if (new Date(orderDate) > new Date(existing.lastOrderDate)) {
            existing.lastOrderDate = orderDate;
          }
          if (occasion && !existing.occasions.includes(occasion)) {
            existing.occasions.push(occasion);
          }
          if (recipient && !existing.recipients.includes(recipient)) {
            existing.recipients.push(recipient);
          }
          if (existing.totalOrders >= 2) {
            existing.isVip = true;
          }
        }
      });

      // Añadir clientes de la tabla customers que no hayan tenido órdenes
      customers.forEach((c) => {
        const clean = (c.phone || '').replace(/\D/g, '');
        if (clean && !customerMap.has(clean)) {
          customerMap.set(clean, {
            phone: clean,
            name: c.full_name,
            totalOrders: 0,
            totalSpent: 0,
            lastOrderDate: c.created_at || '',
            occasions: [],
            recipients: [],
            isVip: false,
          });
        }
      });

      const processedCustomers = Array.from(customerMap.values()).sort(
        (a, b) => b.totalOrders - a.totalOrders || b.totalSpent - a.totalSpent
      );
      setCustomersList(processedCustomers);

      // Procesar Calendario de Aniversarios & Fechas Próximas
      const reminders: AnniversaryReminder[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      orders.forEach((o) => {
        const special = (o as any).special_date || (o as any).anniversary_date;
        const occasion = (o as any).occasion || 'Aniversario / Fecha Especial';
        const phone = (
          (o as any).customer_phone ||
          o.customer?.phone ||
          ''
        ).replace(/\D/g, '');

        if (!phone) return;

        const name = (o as any).customer_name || 'Cliente';
        const recipient =
          (o.recipient_name || '')
            .split('[Comprador:')[0]
            .split('(Cel:')[0]
            .trim() || 'tu persona especial';

        // Fecha de referencia: fecha especial explícita o fecha de entrega de pedido
        const targetDateStr = special || o.delivery_date;
        if (!targetDateStr) return;

        const targetPart = targetDateStr.split('T')[0];
        const [year, month, day] = targetPart.split('-').map(Number);
        if (!month || !day) return;

        // Calcular próxima fecha en el año actual o próximo
        let nextOccurrence = new Date(today.getFullYear(), month - 1, day);
        if (nextOccurrence < today) {
          nextOccurrence = new Date(today.getFullYear() + 1, month - 1, day);
        }

        const diffTime = nextOccurrence.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        reminders.push({
          id: `${o.id}-${targetPart}`,
          customerName: name,
          customerPhone: phone,
          recipientName: recipient,
          occasion,
          specialDate: targetPart,
          daysRemaining,
          formattedDate: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
          lastOrderCode: o.tracking_code || o.id.slice(0, 8),
          lastOrderAmount: Number(o.total_amount || 0),
        });
      });

      // Ordenar por días restantes más próximos
      reminders.sort((a, b) => a.daysRemaining - b.daysRemaining);

      // Descartar duplicados exactos de mismo cliente y fecha
      const uniqueReminders = reminders.filter(
        (v, i, a) =>
          a.findIndex(
            (t) =>
              t.customerPhone === v.customerPhone &&
              t.specialDate.slice(5) === v.specialDate.slice(5)
          ) === i
      );

      setAnniversaries(uniqueReminders);
    } catch (err: any) {
      console.error('Error cargando fidelización:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mensaje oficial de WhatsApp para fidelización
  const handleContactWhatsApp = (
    phone: string,
    customerName: string,
    recipientName: string,
    occasion: string
  ) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`;
    const text = encodeURIComponent(
      `¡Hola ${customerName}! Se acerca el ${occasion.toLowerCase()} de ${recipientName} 🌸 ¿Deseas programar tu arreglo especial con anticipación? En PETALIA tenemos opciones de alta gama para sorprender en esa fecha tan especial.`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  // Filtrado
  const filteredAnniversaries = anniversaries.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.customerName.toLowerCase().includes(q) ||
      item.recipientName.toLowerCase().includes(q) ||
      item.customerPhone.includes(q) ||
      item.occasion.toLowerCase().includes(q)
    );
  });

  const filteredCustomers = customersList.filter((c) => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  // Métricas
  const upcomingCount = anniversaries.filter((a) => a.daysRemaining <= 30).length;
  const vipCustomersCount = customersList.filter((c) => c.isVip).length;
  const totalCustomerSpend = customersList.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgSpend =
    customersList.length > 0 ? totalCustomerSpend / customersList.length : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Fidelización & Fechas Especiales</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-950/70 text-rose-400 border border-rose-800/60">
                CRM Activo
              </span>
            </h1>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Calendario de aniversarios recurrentes, ocasiones especiales y recordatorios preventivos por WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData(true)}
            disabled={loading || isRefreshing}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-rose-400' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Métricas del Módulo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Aniversarios Próximos
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{upcomingCount}</div>
          <p className="text-[11px] text-rose-400 font-medium">
            Fechas a recordar en los próximos 30 días
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Clientes VIP / Recurrentes
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{vipCustomersCount}</div>
          <p className="text-[11px] text-amber-400 font-medium">
            Compradores con 2 o más pedidos registrados
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Base de Clientes
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{customersList.length}</div>
          <p className="text-[11px] text-neutral-400 font-medium">
            Contactos únicos en sistema
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Gasto Promedio
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            S/ {avgSpend.toFixed(2)}
          </div>
          <p className="text-[11px] text-emerald-400 font-medium">
            Ticket acumulado por cliente
          </p>
        </div>
      </div>

      {/* Tabs & Buscador */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-neutral-900/90 border border-neutral-800/80 rounded-2xl p-4">
        <div className="flex gap-2 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('aniversarios')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'aniversarios'
                ? 'bg-rose-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendario de Aniversarios ({anniversaries.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('clientes')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'clientes'
                ? 'bg-rose-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Clientes Recurrentes ({customersList.length})</span>
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente, persona o teléfono..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
          />
        </div>
      </div>

      {/* TAB 1: Calendario de Aniversarios & Fechas Próximas */}
      {activeTab === 'aniversarios' && (
        <div className="space-y-3">
          {filteredAnniversaries.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-500 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <p className="text-white font-medium text-sm">No hay fechas especiales registradas</p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Cuando los clientes completen sus pedidos con ocasión especial o aniversarios, aparecerán aquí para contactarlos oportunamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredAnniversaries.map((item) => {
                const isUrgent = item.daysRemaining <= 7;
                const isThisMonth = item.daysRemaining <= 30;

                return (
                  <div
                    key={item.id}
                    className={`bg-neutral-900 border rounded-2xl p-4 space-y-3 shadow-lg transition hover:border-rose-500/50 ${
                      isUrgent
                        ? 'border-rose-500/70 bg-gradient-to-b from-neutral-900 to-rose-950/20 ring-1 ring-rose-500/30'
                        : isThisMonth
                        ? 'border-neutral-700/80'
                        : 'border-neutral-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-xs border border-rose-500/20">
                          {item.formattedDate}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                            {item.occasion}
                          </span>
                          <h3 className="font-bold text-sm text-white leading-tight">
                            {item.recipientName}
                          </h3>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          item.daysRemaining === 0
                            ? 'bg-rose-500 text-neutral-950 font-bold animate-pulse'
                            : isUrgent
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-700'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {item.daysRemaining === 0
                          ? '¡Es hoy! 🌸'
                          : item.daysRemaining === 1
                          ? 'Mañana'
                          : `En ${item.daysRemaining} días`}
                      </span>
                    </div>

                    <div className="bg-neutral-950/60 rounded-xl p-2.5 border border-neutral-800/80 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Cliente que compra:</span>
                        <span className="text-white font-medium">{item.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">WhatsApp de contacto:</span>
                        <span className="text-rose-400 font-mono font-medium">
                          {item.customerPhone}
                        </span>
                      </div>
                      {item.lastOrderAmount && (
                        <div className="flex justify-between pt-1 border-t border-neutral-800">
                          <span className="text-neutral-400">Última compra:</span>
                          <span className="text-white font-mono font-medium">
                            S/ {item.lastOrderAmount.toFixed(2)} (#{item.lastOrderCode})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Botón Directo WhatsApp con Mensaje Pre-redactado */}
                    <button
                      type="button"
                      onClick={() =>
                        handleContactWhatsApp(
                          item.customerPhone,
                          item.customerName,
                          item.recipientName,
                          item.occasion
                        )
                      }
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-md active:scale-[0.98]"
                    >
                      <MessageCircle className="w-4 h-4 fill-current" />
                      <span>Contactar por WhatsApp</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Clientes Recurrentes */}
      {activeTab === 'clientes' && (
        <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-400 uppercase tracking-wider font-semibold border-b border-neutral-800">
                <tr>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Teléfono</th>
                  <th className="py-3.5 px-4 text-center">Pedidos</th>
                  <th className="py-3.5 px-4 text-right">Inversión Total</th>
                  <th className="py-3.5 px-4">Destinatarios Frecuentes</th>
                  <th className="py-3.5 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.phone} className="hover:bg-neutral-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center font-bold text-xs">
                          {cust.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{cust.name}</p>
                          {cust.isVip && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded-full">
                              ⭐ Cliente Frecuente
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-300">
                      {cust.phone}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                      {cust.totalOrders}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400">
                      S/ {cust.totalSpent.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400 max-w-xs truncate">
                      {cust.recipients.join(', ') || 'Mismo cliente'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleContactWhatsApp(
                            cust.phone,
                            cust.name,
                            cust.recipients[0] || 'tu persona especial',
                            'aniversario'
                          )
                        }
                        className="inline-flex items-center gap-1 bg-neutral-800 hover:bg-emerald-600 text-neutral-300 hover:text-white px-2.5 py-1 rounded-lg text-xs transition"
                        title="Contactar por WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Fidelizar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
