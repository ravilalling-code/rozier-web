'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, Customer, OrderStatus, OCRResult } from '@/lib/types';
import {
  Plus,
  Search,
  Upload,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  Clock,
  Hammer,
  Truck,
  FileText,
  AlertCircle,
  Sparkles,
  X,
  Loader2,
  RefreshCw,
  Eye,
  Calendar,
  MapPin,
  Heart,
  ChevronDown,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  pendiente: {
    label: 'Pendiente',
    bg: 'bg-amber-950/50',
    text: 'text-amber-400',
    border: 'border-amber-800/60',
    icon: Clock,
  },
  confirmado: {
    label: 'Confirmado',
    bg: 'bg-sky-950/50',
    text: 'text-sky-400',
    border: 'border-sky-800/60',
    icon: CheckCircle2,
  },
  en_taller: {
    label: 'En Taller',
    bg: 'bg-purple-950/50',
    text: 'text-purple-400',
    border: 'border-purple-800/60',
    icon: Hammer,
  },
  entregado: {
    label: 'Entregado',
    bg: 'bg-emerald-950/50',
    text: 'text-emerald-400',
    border: 'border-emerald-800/60',
    icon: Truck,
  },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Registrar Venta
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrSuccessMessage, setOcrSuccessMessage] = useState<string | null>(null);
  const [ocrErrorMessage, setOcrErrorMessage] = useState<string | null>(null);

  // Formulario Pedido
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [dedicationMessage, setDedicationMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Yape');
  const [totalAmount, setTotalAmount] = useState('');
  const [operationNumber, setOperationNumber] = useState('');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('confirmado');

  // Voucher File & Storage
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
  const [voucherStorageUrl, setVoucherStorageUrl] = useState<string | null>(null);

  // Modal Ver Voucher / Detalle
  const [selectedVoucherUrl, setSelectedVoucherUrl] = useState<string | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Cargar Pedidos
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customers(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setOrders(data as Order[]);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Búsqueda inteligente de cliente existente por teléfono en tiempo real
  const handlePhoneChange = async (phoneValue: string) => {
    setCustomerPhone(phoneValue);
    const clean = phoneValue.replace(/\D/g, '');
    if (clean.length >= 8) {
      try {
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', clean)
          .maybeSingle();

        if (customer) {
          if (!customerName) setCustomerName(customer.full_name);
          if (!anniversaryDate && customer.anniversary_date) {
            setAnniversaryDate(customer.anniversary_date);
          }
          if (!customerNotes && customer.notes) {
            setCustomerNotes(customer.notes);
          }
        }
      } catch (e) {
        // Silencioso
      }
    }
  };

  // Subida de voucher y llamada a Gemini OCR
  const handleVoucherUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setVoucherFile(file);
    const previewUrl = URL.createObjectURL(file);
    setVoucherPreview(previewUrl);

    setOcrScanning(true);
    setOcrSuccessMessage(null);
    setOcrErrorMessage(null);

    try {
      // 1. Llamar a API OCR con Gemini
      const ocrFormData = new FormData();
      ocrFormData.append('file', file);

      const ocrPromise = fetch('/api/ocr', {
        method: 'POST',
        body: ocrFormData,
      }).then((res) => res.json());

      // 2. Subir simultáneamente a Supabase Storage
      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanFileName = `vouchers/${Date.now()}-${Math.random().toString(36).substring(5)}.${fileExt}`;

      const uploadPromise = supabase.storage
        .from('products')
        .upload(cleanFileName, file, { cacheControl: '3600', upsert: false });

      const [ocrResult, uploadRes] = await Promise.allSettled([ocrPromise, uploadPromise]);

      // Manejo de la subida a Storage
      if (uploadRes.status === 'fulfilled' && !uploadRes.value.error) {
        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(cleanFileName);
        setVoucherStorageUrl(publicUrlData.publicUrl);
      } else {
        console.warn('Advertencia al subir voucher a Storage:', uploadRes);
      }

      // Manejo del OCR
      if (ocrResult.status === 'fulfilled') {
        const ocrData: OCRResult & { error?: string } = ocrResult.value;
        if (ocrData.error) {
          setOcrErrorMessage(ocrData.error);
        } else {
          // Autocompletar datos
          if (ocrData.monto) setTotalAmount(ocrData.monto.toString());
          if (ocrData.billetera) setPaymentMethod(ocrData.billetera);
          if (ocrData.numero_operacion) setOperationNumber(ocrData.numero_operacion);
          if (ocrData.remitente && !customerName) {
            setCustomerName(ocrData.remitente);
          }

          setOcrSuccessMessage(
            `¡Voucher escaneado con éxito! Billetera: ${ocrData.billetera} • Monto: S/ ${ocrData.monto.toFixed(
              2
            )} • Op: ${ocrData.numero_operacion || 'S/N'}`
          );
        }
      } else {
        setOcrErrorMessage('No se pudo procesar el OCR automáticamente. Puedes ingresar los montos manualmente.');
      }
    } catch (err: any) {
      console.error('Error procesando voucher:', err);
      setOcrErrorMessage('Error conectando con el servicio de OCR.');
    } finally {
      setOcrScanning(false);
    }
  };

  // Guardar Venta y Aplicar Lógica CRM
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerPhone.trim()) {
      alert('Ingresa el teléfono del cliente.');
      return;
    }
    if (!totalAmount || Number(totalAmount) <= 0) {
      alert('Ingresa un monto cobrado válido.');
      return;
    }

    setCreateLoading(true);

    try {
      const cleanPhone = customerPhone.replace(/\D/g, '');
      let customerId: string | null = null;

      // 1. Lógica CRM: Buscar cliente por teléfono
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Si se especificó aniversario o notas actualizadas, enriquecemos el perfil
        await supabase
          .from('customers')
          .update({
            full_name: customerName.trim() || existingCustomer.full_name,
            anniversary_date: anniversaryDate || existingCustomer.anniversary_date,
            notes: customerNotes.trim()
              ? existingCustomer.notes
                ? `${existingCustomer.notes} | ${customerNotes.trim()}`
                : customerNotes.trim()
              : existingCustomer.notes,
          })
          .eq('id', existingCustomer.id);
      } else {
        // Crear nuevo cliente automáticamente
        const { data: newCust, error: custError } = await supabase
          .from('customers')
          .insert([
            {
              full_name: customerName.trim() || 'Cliente WhatsApp',
              phone: cleanPhone,
              anniversary_date: anniversaryDate || null,
              notes: customerNotes.trim() || null,
            },
          ])
          .select()
          .single();

        if (custError) throw custError;
        if (newCust) customerId = newCust.id;
      }

      // 2. Registrar Pedido
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            customer_id: customerId,
            total_amount: parseFloat(totalAmount),
            payment_method: paymentMethod,
            operation_number: operationNumber.trim() || null,
            voucher_url: voucherStorageUrl || null,
            delivery_date: deliveryDate || null,
            recipient_name: recipientName.trim() || null,
            delivery_address: deliveryAddress.trim() || null,
            dedication_message: dedicationMessage.trim() || null,
            status: orderStatus,
          },
        ])
        .select('*, customer:customers(*)')
        .single();

      if (orderError) throw orderError;

      // Actualizar estado local
      if (newOrder) {
        setOrders((prev) => [newOrder as Order, ...prev]);
      }

      // Resetear modal
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Error creando pedido:', err);
      alert('Error al guardar la venta: ' + err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const resetForm = () => {
    setCustomerPhone('');
    setCustomerName('');
    setAnniversaryDate('');
    setCustomerNotes('');
    setDeliveryDate('');
    setRecipientName('');
    setDeliveryAddress('');
    setDedicationMessage('');
    setPaymentMethod('Yape');
    setTotalAmount('');
    setOperationNumber('');
    setOrderStatus('confirmado');
    setVoucherFile(null);
    setVoucherPreview(null);
    setVoucherStorageUrl(null);
    setOcrSuccessMessage(null);
    setOcrErrorMessage(null);
  };

  // Actualizar estado rápido del pedido
  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId);

      if (error) {
        fetchOrders();
        alert('Error al actualizar estado: ' + error.message);
      }
    } catch (e) {
      fetchOrders();
    }
  };

  // Abrir chat de WhatsApp con el cliente
  const handleOpenWhatsAppChat = (phone: string, customerFullName?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`;
    const greeting = customerFullName ? `¡Hola ${customerFullName}!` : '¡Hola!';
    const text = encodeURIComponent(
      `${greeting} Te saludamos de *PETALIA diseño floral*. Nos comunicamos para confirmar y coordinar los detalles de tu pedido floral 🌸`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  // Filtrado de pedidos
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'todos' || order.status === statusFilter;
    const clientName = order.customer?.full_name || '';
    const clientPhone = order.customer?.phone || '';
    const recipient = order.recipient_name || '';
    const opNum = order.operation_number || '';

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      clientName.toLowerCase().includes(query) ||
      clientPhone.includes(query) ||
      recipient.toLowerCase().includes(query) ||
      opNum.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Ventas, Pedidos & CRM
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-800 text-rose-400 border border-neutral-700">
              {orders.length} pedidos
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Registro rápido con OCR de Yape/Plin, historial de clientes y estados del taller floral.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition disabled:opacity-50"
            title="Recargar pedidos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 transition active:scale-98 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Venta</span>
          </button>
        </div>
      </div>

      {/* Filtros de Estado & Buscador */}
      <div className="bg-neutral-900/90 rounded-2xl border border-neutral-800/80 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, destinatario, teléfono o N° de operación..."
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
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                statusFilter === 'todos'
                  ? 'bg-rose-500 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              Todos ({orders.length})
            </button>
            {(['pendiente', 'confirmado', 'en_taller', 'entregado'] as OrderStatus[]).map((st) => {
              const count = orders.filter((o) => o.status === st).length;
              const cfg = STATUS_CONFIG[st];
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                    statusFilter === st
                      ? 'bg-rose-500 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                  }`}
                >
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lista de Pedidos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-sm">Cargando ventas y pedidos...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-neutral-900/50 rounded-2xl border border-neutral-800/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No hay pedidos para mostrar</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'todos'
              ? 'Prueba modificando los filtros de estado o búsqueda.'
              : 'Registra la primera venta usando el botón verde superior con lectura automática de vouchers.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pendiente;
            const StatusIcon = statusCfg.icon;

            return (
              <div
                key={order.id}
                className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 hover:border-neutral-700 transition space-y-4 shadow-lg shadow-black/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-white font-bold text-sm">
                      S/
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">
                          S/ {Number(order.total_amount).toFixed(2)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-medium">
                          {order.payment_method}
                        </span>
                        {order.operation_number && (
                          <span className="text-[11px] text-neutral-500 font-mono">
                            Op: {order.operation_number}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Registrado:{' '}
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString('es-PE', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Reciente'}
                      </p>
                    </div>
                  </div>

                  {/* Estado Badge & Switcher */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusCfg.label}</span>
                    </div>

                    {/* Selector de estado rápido */}
                    <select
                      value={order.status}
                      onChange={(e) =>
                        handleUpdateStatus(order.id, e.target.value as OrderStatus)
                      }
                      className="bg-neutral-800 text-neutral-300 text-xs rounded-xl px-2.5 py-1 border border-neutral-700 focus:outline-none focus:border-rose-500 transition"
                    >
                      <option value="pendiente">Marcar Pendiente</option>
                      <option value="confirmado">Marcar Confirmado</option>
                      <option value="en_taller">Pasar a Taller</option>
                      <option value="entregado">Marcar Entregado</option>
                    </select>
                  </div>
                </div>

                {/* Info Cliente & Entrega */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {/* Cliente */}
                  <div className="bg-neutral-950/60 rounded-xl p-3 border border-neutral-800/60 space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">
                      Cliente / Comprador
                    </span>
                    <p className="font-semibold text-white text-sm">
                      {order.customer?.full_name || 'Sin nombre registrado'}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-neutral-400">{order.customer?.phone || 'Sin cel'}</span>
                      {order.customer?.phone && (
                        <button
                          onClick={() =>
                            handleOpenWhatsAppChat(
                              order.customer!.phone,
                              order.customer?.full_name
                            )
                          }
                          className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-2 py-1 rounded-lg transition font-medium text-[11px]"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </button>
                      )}
                    </div>
                    {order.customer?.anniversary_date && (
                      <div className="flex items-center gap-1 text-[11px] text-pink-400 pt-1">
                        <Heart className="w-3 h-3" />
                        <span>Aniversario: {order.customer.anniversary_date}</span>
                      </div>
                    )}
                  </div>

                  {/* Destinatario & Entrega */}
                  <div className="bg-neutral-950/60 rounded-xl p-3 border border-neutral-800/60 space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                      Entrega & Destinatario
                    </span>
                    <p className="font-semibold text-white text-sm">
                      {order.recipient_name || 'Mismo cliente'}
                    </p>
                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{order.delivery_date || 'Fecha no fijada'}</span>
                    </div>
                    {order.delivery_address && (
                      <div className="flex items-start gap-1.5 text-neutral-400 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0 mt-0.5" />
                        <span>{order.delivery_address}</span>
                      </div>
                    )}
                  </div>

                  {/* Dedicatoria & Voucher */}
                  <div className="bg-neutral-950/60 rounded-xl p-3 border border-neutral-800/60 space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
                        Dedicatoria de Tarjeta
                      </span>
                      <p className="text-neutral-300 italic line-clamp-2 mt-1">
                        {order.dedication_message
                          ? `"${order.dedication_message}"`
                          : 'Sin dedicatoria'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-neutral-800">
                      {order.voucher_url ? (
                        <button
                          onClick={() => setSelectedVoucherUrl(order.voucher_url)}
                          className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium text-[11px] hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Voucher Yape/Plin</span>
                        </button>
                      ) : (
                        <span className="text-neutral-600 text-[11px]">Sin voucher adjunto</span>
                      )}

                      <button
                        onClick={() => setSelectedOrderDetails(order)}
                        className="text-neutral-400 hover:text-white text-[11px] hover:underline"
                      >
                        Ver detalles completos
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Registrar Venta con OCR */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Registrar Nueva Venta</h2>
                  <p className="text-xs text-neutral-400">
                    Sube el comprobante de pago para autocompletar con Gemini OCR.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECCIÓN OCR: Subida de Voucher */}
            <div className="bg-neutral-950 rounded-2xl p-4 border border-neutral-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Extracción Inteligente de Voucher (Yape / Plin)
                  </span>
                </div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{voucherFile ? 'Cambiar Voucher' : 'Subir Captura de Voucher'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleVoucherUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {ocrScanning && (
                <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 flex items-center gap-3 text-emerald-300 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span>
                    Analizando comprobante con <strong>Gemini OCR</strong> y subiendo a Storage...
                  </span>
                </div>
              )}

              {ocrSuccessMessage && (
                <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-xl p-3 flex items-start gap-2 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{ocrSuccessMessage}</span>
                </div>
              )}

              {ocrErrorMessage && (
                <div className="bg-rose-950/60 border border-rose-800/80 rounded-xl p-3 flex items-start gap-2 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{ocrErrorMessage}</span>
                </div>
              )}

              {voucherPreview && (
                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={voucherPreview}
                    alt="Voucher Preview"
                    className="w-14 h-14 object-cover rounded-xl border border-neutral-700"
                  />
                  <div className="text-xs text-neutral-400">
                    <p className="text-neutral-200 font-medium">{voucherFile?.name}</p>
                    <p className="text-[11px] text-neutral-500">
                      Guardado en el bucket seguro de Supabase
                    </p>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              {/* Sección Cliente & CRM */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  1. Datos del Cliente & CRM
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Teléfono WhatsApp *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="Ej: 924257784"
                      required
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition font-mono"
                    />
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      Si el cliente ya compró antes, se autocompletará su historial.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nombre del cliente"
                      required
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Fecha Especial / Aniversario (CRM)
                    </label>
                    <input
                      type="date"
                      value={anniversaryDate}
                      onChange={(e) => setAnniversaryDate(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Notas del Cliente (Preferencias, gustos)
                    </label>
                    <input
                      type="text"
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Ej: Le gustan las rosas blancas y follaje fino"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Sección Pago */}
              <div className="space-y-3 pt-2 border-t border-neutral-800">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  2. Datos de Pago
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Monto Cobrado (S/) *
                    </label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="Ej: 90.00"
                      required
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Método de Pago
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition"
                    >
                      <option value="Yape">Yape</option>
                      <option value="Plin">Plin</option>
                      <option value="Transferencia">Transferencia Bancaria</option>
                      <option value="Efectivo">Efectivo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      N° de Operación
                    </label>
                    <input
                      type="text"
                      value={operationNumber}
                      onChange={(e) => setOperationNumber(e.target.value)}
                      placeholder="Ej: 1984238"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Sección Entrega & Arreglo */}
              <div className="space-y-3 pt-2 border-t border-neutral-800">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  3. Logística de Entrega & Taller
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Fecha de Entrega
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Estado Inicial
                    </label>
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value as OrderStatus)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition"
                    >
                      <option value="confirmado">Confirmado (Pago verificado)</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="en_taller">En Taller (Armando)</option>
                      <option value="entregado">Entregado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Nombre del Destinatario
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Persona que recibe el arreglo"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Dirección de Entrega / Referencia
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Calle, número, urbanización o distrito"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">
                      Dedicatoria para la Tarjeta
                    </label>
                    <textarea
                      rows={2}
                      value={dedicationMessage}
                      onChange={(e) => setDedicationMessage(e.target.value)}
                      placeholder="Escribe el mensaje exacto que irá en la tarjeta del arreglo..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={createLoading}
                  className="px-4 py-2.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 text-sm font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-950 transition active:scale-98 text-sm disabled:opacity-50"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando venta...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Registrar Pedido</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Visualizar Voucher */}
      {selectedVoucherUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative bg-neutral-900 border border-neutral-800 max-w-md w-full rounded-3xl p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h4 className="text-sm font-bold text-white">Comprobante de Pago</h4>
              <button
                onClick={() => setSelectedVoucherUrl(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-[9/16] max-h-[70vh] bg-black rounded-2xl overflow-hidden flex items-center justify-center">
              <img
                src={selectedVoucherUrl}
                alt="Comprobante de pago"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <a
                href={selectedVoucherUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir en tamaño original</span>
              </a>
              <button
                onClick={() => setSelectedVoucherUrl(null)}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detalle Completo del Pedido */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white">Ficha del Pedido</h3>
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-neutral-500 font-medium">Cliente:</span>
                <p className="text-sm font-semibold text-white">
                  {selectedOrderDetails.customer?.full_name || 'Sin nombre'}
                </p>
                <p className="text-neutral-400">Teléfono: {selectedOrderDetails.customer?.phone}</p>
                {selectedOrderDetails.customer?.anniversary_date && (
                  <p className="text-pink-400">
                    Aniversario / Cumpleaños: {selectedOrderDetails.customer.anniversary_date}
                  </p>
                )}
                {selectedOrderDetails.customer?.notes && (
                  <p className="text-neutral-400 italic">Notas CRM: {selectedOrderDetails.customer.notes}</p>
                )}
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-neutral-500 font-medium">Destinatario & Entrega:</span>
                <p className="text-sm font-semibold text-white">
                  {selectedOrderDetails.recipient_name || 'Mismo cliente'}
                </p>
                <p className="text-neutral-400">
                  Fecha: {selectedOrderDetails.delivery_date || 'No definida'}
                </p>
                <p className="text-neutral-400">
                  Dirección: {selectedOrderDetails.delivery_address || 'Entrega en taller / Por coordinar'}
                </p>
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-neutral-500 font-medium">Dedicatoria:</span>
                <p className="text-neutral-200 italic">
                  {selectedOrderDetails.dedication_message
                    ? `"${selectedOrderDetails.dedication_message}"`
                    : 'Sin dedicatoria'}
                </p>
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-neutral-500 font-medium">Información de Pago:</span>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-white">
                    S/ {Number(selectedOrderDetails.total_amount).toFixed(2)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                    {selectedOrderDetails.payment_method}
                  </span>
                </div>
                {selectedOrderDetails.operation_number && (
                  <p className="text-neutral-400 font-mono">
                    N° Operación: {selectedOrderDetails.operation_number}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              {selectedOrderDetails.voucher_url && (
                <button
                  onClick={() => {
                    const url = selectedOrderDetails.voucher_url;
                    setSelectedOrderDetails(null);
                    setSelectedVoucherUrl(url);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/60 text-xs font-medium transition"
                >
                  Ver Voucher
                </button>
              )}
              <button
                onClick={() => setSelectedOrderDetails(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
