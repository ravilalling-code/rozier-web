'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, OrderStatus, OCRResult } from '@/lib/types';
import { formatLocalDate, formatLocalDateTime, generateTrackingCode } from '@/lib/format';
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
  Package,
  Copy,
  Check,
  DollarSign,
  Send,
  Share2,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  string,
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
  en_preparacion: {
    label: 'En Preparación',
    bg: 'bg-purple-950/50',
    text: 'text-purple-400',
    border: 'border-purple-800/60',
    icon: Hammer,
  },
  en_taller: {
    label: 'En Preparación',
    bg: 'bg-purple-950/50',
    text: 'text-purple-400',
    border: 'border-purple-800/60',
    icon: Hammer,
  },
  en_despacho: {
    label: 'En Despacho',
    bg: 'bg-indigo-950/50',
    text: 'text-indigo-400',
    border: 'border-indigo-800/60',
    icon: Truck,
  },
  entregado: {
    label: 'Entregado',
    bg: 'bg-emerald-950/50',
    text: 'text-emerald-400',
    border: 'border-emerald-800/60',
    icon: CheckCircle2,
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-rose-950/50',
    text: 'text-rose-400',
    border: 'border-rose-800/60',
    icon: AlertCircle,
  },
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [recipientName, setRecipientName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [dedicationMessage, setDedicationMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'yape' | 'plin' | 'transferencia' | 'efectivo'>('yape');
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

  // Modal Validar Pago / Adjuntar Voucher & Pase a Taller
  const [validatingOrder, setValidatingOrder] = useState<Order | null>(null);
  const [valPaymentMethod, setValPaymentMethod] = useState<'yape' | 'plin' | 'transferencia' | 'efectivo'>('yape');
  const [valVoucherFile, setValVoucherFile] = useState<File | null>(null);
  const [valVoucherPreview, setValVoucherPreview] = useState<string | null>(null);
  const [valLoading, setValLoading] = useState(false);
  const [copiedTrackingId, setCopiedTrackingId] = useState<string | null>(null);

  // Cargar Pedidos de Supabase
  const fetchOrders = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customers(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al consultar orders en Supabase:', error);
      } else if (data) {
        setOrders(data as Order[]);
      }
    } catch (err: any) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  // Suscripción Realtime y Auto-refresco
  useEffect(() => {
    fetchOrders();

    // Polling cada 12 segundos para captar pedidos del Chatbot IA automáticamente
    const interval = setInterval(() => {
      fetchOrders();
    }, 12000);

    // Suscripción Realtime en Supabase a la tabla orders
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('⚡ Cambio en tiempo real en orders:', payload);
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

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

      if (uploadRes.status === 'fulfilled' && !uploadRes.value.error) {
        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(cleanFileName);
        setVoucherStorageUrl(publicUrlData.publicUrl);
      }

      if (ocrResult.status === 'fulfilled') {
        const ocrData: OCRResult & { error?: string } = ocrResult.value;
        if (ocrData.error) {
          setOcrErrorMessage(ocrData.error);
        } else {
          if (ocrData.monto) setTotalAmount(ocrData.monto.toString());
          if (ocrData.billetera) {
            const b = ocrData.billetera.toLowerCase();
            if (b.includes('plin')) setPaymentMethod('plin');
            else if (b.includes('transf')) setPaymentMethod('transferencia');
            else setPaymentMethod('yape');
          }
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

  // Guardar Venta Manual con validaciones estrictas
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

      // 1. Lógica CRM: Buscar o crear cliente
      try {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
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
          const { data: newCust, error: custError } = await supabase
            .from('customers')
            .insert([
              {
                full_name: customerName.trim() || 'Cliente Taller',
                phone: cleanPhone,
                anniversary_date: anniversaryDate || null,
                notes: customerNotes.trim() || null,
              },
            ])
            .select()
            .single();

          if (!custError && newCust) {
            customerId = newCust.id;
          }
        }
      } catch (cErr) {
        console.warn('Advertencia CRM al guardar cliente:', cErr);
      }

      // 2. Registrar Pedido con campos en minúsculas y fecha normalizada
      const sqlDeliveryDate = deliveryDate || new Date().toISOString().split('T')[0];
      const sqlPaymentMethod = (paymentMethod || 'yape').toLowerCase();
      const sqlStatus = (orderStatus || 'confirmado').toLowerCase() as OrderStatus;

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            customer_id: customerId,
            total_amount: parseFloat(totalAmount),
            payment_method: sqlPaymentMethod,
            operation_number: operationNumber.trim() || null,
            voucher_url: voucherStorageUrl || null,
            delivery_date: sqlDeliveryDate,
            recipient_name: recipientName.trim() || (customerName.trim() ? `${customerName.trim()} (Cel: ${cleanPhone})` : 'Cliente'),
            delivery_address: deliveryAddress.trim() || 'Entrega en taller',
            dedication_message: dedicationMessage.trim() || null,
            status: sqlStatus,
            tracking_code: generateTrackingCode(),
          },
        ])
        .select('*, customer:customers(*)')
        .single();

      if (orderError) {
        console.error('Error al insertar orden:', orderError);
        throw orderError;
      }

      if (newOrder) {
        setOrders((prev) => [newOrder as Order, ...prev]);
      }

      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      console.error('Error creando pedido:', err);
      alert('Error al guardar la venta: ' + (err.message || err));
    } finally {
      setCreateLoading(false);
    }
  };

  const resetForm = () => {
    setCustomerPhone('');
    setCustomerName('');
    setAnniversaryDate('');
    setCustomerNotes('');
    setDeliveryDate(new Date().toISOString().split('T')[0]);
    setRecipientName('');
    setDeliveryAddress('');
    setDedicationMessage('');
    setPaymentMethod('yape');
    setTotalAmount('');
    setOperationNumber('');
    setOrderStatus('confirmado');
    setVoucherFile(null);
    setVoucherPreview(null);
    setVoucherStorageUrl(null);
    setOcrSuccessMessage(null);
    setOcrErrorMessage(null);
  };

  // Copiar código de seguimiento
  const handleCopyTrackingCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTrackingId(code);
    setTimeout(() => setCopiedTrackingId(null), 2500);
  };

  // Notificación automática por WhatsApp según estado
  const handleSendStatusWhatsApp = (order: Order, targetStatus: string) => {
    const { phone, clientName } = getOrderDetailsHelpers(order);
    if (!phone) {
      alert('Este pedido no cuenta con un número de celular o WhatsApp registrado.');
      return;
    }

    const tracking = order.tracking_code || 'PET-TALLER';
    const trackingUrl = `https://petalia-web.vercel.app/?track=${tracking}`;
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`;

    let message = '';
    const norm = (targetStatus || '').toLowerCase();
    if (norm === 'en_preparacion' || norm === 'en_taller') {
      message = `¡Hola ${clientName}! Tu pedido ${tracking} ha sido confirmado y ya se encuentra *En Preparación* en nuestro taller floral 🌸. Puedes rastrearlo aquí: ${trackingUrl}`;
    } else if (norm === 'en_despacho') {
      message = `¡Hola ${clientName}! Tu arreglo floral de PETALIA (${tracking}) ya está *En Despacho* en camino a la dirección indicada 🚗💐. Puedes seguir su recorrido aquí: ${trackingUrl}`;
    } else if (norm === 'entregado') {
      message = `¡Hola ${clientName}! Tu pedido ${tracking} ha sido *Entregado* con éxito ✨. ¡Esperamos que sea un momento inolvidable! Muchas gracias por confiar en PETALIA 🌸`;
    } else {
      message = `¡Hola ${clientName}! Te saludamos de *PETALIA diseño floral*. Te informamos que tu pedido ${tracking} se encuentra en estado *${STATUS_CONFIG[norm]?.label || targetStatus}*. Puedes consultarlo aquí: ${trackingUrl}`;
    }

    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Asignar o regenerar tracking_code para un pedido
  const handleAssignTrackingCode = async (orderId: string) => {
    const newCode = generateTrackingCode();
    try {
      const { error } = await supabase
        .from('orders')
        .update({ tracking_code: newCode })
        .eq('id', orderId);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, tracking_code: newCode } : o))
      );
      if (selectedOrderDetails?.id === orderId) {
        setSelectedOrderDetails((prev) => (prev ? { ...prev, tracking_code: newCode } : null));
      }
    } catch (err: any) {
      console.error('Error generando tracking code:', err);
    }
  };

  // Validar Pago / Adjuntar Voucher y pasar a taller
  const handleConfirmValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatingOrder) return;

    setValLoading(true);

    try {
      let finalVoucherUrl = validatingOrder.voucher_url;

      // 1. Si adjuntó archivo, subir a bucket 'vouchers'
      if (valVoucherFile) {
        const ext = valVoucherFile.name.split('.').pop() || 'jpg';
        const cleanName = `${Date.now()}-${Math.random().toString(36).substring(5)}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from('vouchers')
          .upload(cleanName, valVoucherFile, {
            contentType: valVoucherFile.type || 'image/jpeg',
            upsert: true,
          });

        if (upErr) {
          console.warn('Subida a vouchers falló, probando fallback en products/vouchers...', upErr);
          const fallbackPath = `vouchers/${cleanName}`;
          await supabase.storage.from('products').upload(fallbackPath, valVoucherFile, { upsert: true });
          const { data: pUrl } = supabase.storage.from('products').getPublicUrl(fallbackPath);
          finalVoucherUrl = pUrl.publicUrl;
        } else {
          const { data: vUrl } = supabase.storage.from('vouchers').getPublicUrl(cleanName);
          finalVoucherUrl = vUrl.publicUrl;
        }
      }

      // 2. Generar tracking_code si no lo tiene
      const trackingCode = validatingOrder.tracking_code || generateTrackingCode();

      // 3. Al validar comprobante o marcar efectivo, la orden pasa a 'confirmado' e inmediatamente a 'en_preparacion' (taller)
      const targetStatus: OrderStatus = 'en_preparacion';

      const updateData: Record<string, any> = {
        payment_method: valPaymentMethod,
        voucher_url: finalVoucherUrl,
        tracking_code: trackingCode,
        status: targetStatus,
      };

      let { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', validatingOrder.id)
        .select();

      // Fallback a 'en_taller' si la base de datos aún no ejecutó la migración
      if (error && error.message?.includes('orders_status_check')) {
        updateData.status = 'en_taller';
        const retryRes = await supabase
          .from('orders')
          .update(updateData)
          .eq('id', validatingOrder.id)
          .select();
        data = retryRes.data;
        error = retryRes.error;
      }

      if (error) throw error;

      const updatedOrder: Order = {
        ...validatingOrder,
        payment_method: valPaymentMethod,
        voucher_url: finalVoucherUrl,
        tracking_code: trackingCode,
        status: (updateData.status as OrderStatus) || 'en_preparacion',
      };

      setOrders((prev) =>
        prev.map((o) => (o.id === validatingOrder.id ? updatedOrder : o))
      );

      if (selectedOrderDetails?.id === validatingOrder.id) {
        setSelectedOrderDetails(updatedOrder);
      }

      const orderToNotify = updatedOrder;
      setValidatingOrder(null);
      setValVoucherFile(null);
      setValVoucherPreview(null);

      // Abrir o sugerir confirmación inmediata por WhatsApp
      if (
        window.confirm(
          `¡Pago validado con éxito! Pedido asignado a ${trackingCode} y pasado al taller.\n\n¿Deseas abrir WhatsApp para enviar la confirmación y enlace de rastreo al cliente?`
        )
      ) {
        handleSendStatusWhatsApp(orderToNotify, 'en_preparacion');
      }
    } catch (err: any) {
      console.error('Error al validar comprobante:', err);
      alert('Error al validar el pago: ' + (err.message || err));
    } finally {
      setValLoading(false);
    }
  };

  // Actualizar estado rápido del pedido con validación estricta y sincronización dual
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    // Normalizar estrictamente a minúsculas para cumplir con el check constraint "orders_status_check"
    const raw = (nextStatus || '').toString().toLowerCase().trim().replace(/\s+/g, '_');
    const validStatusMap: Record<string, OrderStatus> = {
      pendiente: 'pendiente',
      confirmado: 'confirmado',
      en_preparacion: 'en_preparacion',
      en_taller: 'en_taller',
      en_despacho: 'en_despacho',
      entregado: 'entregado',
      cancelado: 'cancelado',
    };
    const normalizedStatus: OrderStatus = validStatusMap[raw] || 'pendiente';

    // Guardar estado previo para rollback en caso de fallo
    const previousOrder = orders.find((o) => o.id === orderId);
    const previousStatus = (previousOrder?.status || 'pendiente').toLowerCase() as OrderStatus;

    if (previousStatus === normalizedStatus && previousOrder) return;

    // Generar tracking_code si no tenía y pasa a confirmado/preparación/despacho
    let trackingToSave = previousOrder?.tracking_code;
    if (
      !trackingToSave &&
      ['confirmado', 'en_preparacion', 'en_taller', 'en_despacho'].includes(normalizedStatus)
    ) {
      trackingToSave = generateTrackingCode();
    }

    // 1. Actualización optimista inmediata en la interfaz
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: normalizedStatus, tracking_code: trackingToSave || o.tracking_code } : o
      )
    );
    if (selectedOrderDetails?.id === orderId) {
      setSelectedOrderDetails((prev) =>
        prev ? { ...prev, status: normalizedStatus, tracking_code: trackingToSave || prev.tracking_code } : null
      );
    }

    try {
      // 2. Intentar actualizar directamente en Supabase con .select() para confirmar persistencia
      console.log(`📡 [Orders] Actualizando pedido ${orderId} a estado "${normalizedStatus}"...`);
      const updatePayload: Record<string, any> = { status: normalizedStatus };
      if (trackingToSave) updatePayload.tracking_code = trackingToSave;

      let { data, error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select();

      // Fallback a 'en_taller' si constraint orders_status_check aún no incluye 'en_preparacion'
      if (error && error.message?.includes('orders_status_check') && normalizedStatus === 'en_preparacion') {
        console.warn('⚠️ Base de datos tiene constraint antiguo. Intentando fallback con "en_taller"...');
        updatePayload.status = 'en_taller';
        const retryDirect = await supabase
          .from('orders')
          .update(updatePayload)
          .eq('id', orderId)
          .select();
        data = retryDirect.data;
        error = retryDirect.error;
      }

      if (error) {
        console.error('❌ Error devuelto por Supabase en update directo:', error);

        // Fallback inmediato a ruta API del servidor
        console.log('🔄 Intentando fallback mediante ruta API /api/admin/orders/status...');
        const apiRes = await fetch('/api/admin/orders/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status: normalizedStatus, trackingCode: trackingToSave }),
        });
        const apiData = await apiRes.json();

        if (!apiRes.ok || !apiData.success) {
          throw new Error(apiData.error || error.message || 'Error al persistir el estado');
        } else {
          console.log('✅ Fallback API exitoso:', apiData.order);
        }
      } else if (!data || data.length === 0) {
        console.warn('⚠️ Supabase no reportó filas actualizadas directamente. Invocando API...');
        const apiRes = await fetch('/api/admin/orders/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status: normalizedStatus, trackingCode: trackingToSave }),
        });
        const apiData = await apiRes.json();

        if (!apiRes.ok || !apiData.success) {
          throw new Error('No se pudo modificar el pedido en la base de datos (0 filas afectadas)');
        }
      } else {
        console.log(`✅ Estado actualizado con éxito a "${normalizedStatus}" en Supabase:`, data[0]);
      }
    } catch (err: any) {
      console.error('❌ Error crítico al actualizar estado del pedido:', err);
      // Revertir el estado local
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: previousStatus } : o))
      );
      if (selectedOrderDetails?.id === orderId) {
        setSelectedOrderDetails((prev) => (prev ? { ...prev, status: previousStatus } : null));
      }
      alert(
        `Error al guardar el nuevo estado:\n${err?.message || err}\n\nEl pedido se restauró a "${previousStatus}".`
      );
    }
  };

  // Abrir chat de WhatsApp con el cliente
  const handleOpenWhatsAppChat = (phone?: string, customerFullName?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`;
    const greeting = customerFullName ? `¡Hola ${customerFullName}!` : '¡Hola!';
    const text = encodeURIComponent(
      `${greeting} Te saludamos de *PETALIA diseño floral*. Nos comunicamos para coordinar los detalles de tu pedido 🌸`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  // Extraer teléfono, comprador, destinatario y dedicatoria para pedidos de Chatbot o manuales
  const getOrderDetailsHelpers = (order: Order) => {
    // 1. Teléfono del comprador
    const phone =
      (order as any).customer_phone ||
      order.customer?.phone ||
      order.recipient_name?.match(/\[(?:Comprador|Cliente):.*?\|\s*(?:Cel|Tel):\s*(\d{8,11})\]/)?.[1] ||
      order.recipient_name?.match(/\(Cel:\s*(\d{8,11})\)/)?.[1] ||
      order.dedication_message?.match(/\[(?:Comprador|Cliente):.*?\|\s*(?:Cel|Tel):\s*(\d{8,11})\]/)?.[1] ||
      order.recipient_name?.match(/\b9\d{8}\b/)?.[0] ||
      order.delivery_address?.match(/\b9\d{8}\b/)?.[0] ||
      order.dedication_message?.match(/\b9\d{8}\b/)?.[0] ||
      '';

    // 2. Nombre del comprador
    const clientName =
      (order as any).customer_name ||
      order.customer?.full_name ||
      order.recipient_name?.match(/\[(?:Comprador|Cliente):\s*(.*?)\s*\|/)?.[1] ||
      order.dedication_message?.match(/\[(?:Comprador|Cliente):\s*(.*?)\s*\|/)?.[1] ||
      order.recipient_name?.split('[Comprador:')[0].split('(Cel:')[0].trim() ||
      'Cliente';

    // 3. Nombre limpio del destinatario
    let cleanRecipient = order.recipient_name || 'Mismo cliente';
    if (cleanRecipient.includes('[Comprador:')) {
      cleanRecipient = cleanRecipient.split('[Comprador:')[0].trim();
    } else if (cleanRecipient.includes('(Cel:')) {
      cleanRecipient = cleanRecipient.split('(Cel:')[0].trim();
    }

    // 4. Arreglo extraído
    const matchedArrangement = order.dedication_message?.match(/\[Arreglo:\s*(.*?)\]/)?.[1];

    // 5. Dedicatoria limpia sin tags técnicos
    let cleanDedication = order.dedication_message || '';
    cleanDedication = cleanDedication
      .replace(/\[Arreglo:\s*.*?\]\s*/g, '')
      .replace(/\[(?:Comprador|Cliente):\s*.*?\]\s*/g, '')
      .trim();

    return { phone, clientName, cleanRecipient, matchedArrangement, cleanDedication };
  };

  // Filtrado de pedidos
  const filteredOrders = orders.filter((order) => {
    const rawSt = (order.status || 'pendiente').toLowerCase();
    const matchesStatus =
      statusFilter === 'todos' ||
      rawSt === statusFilter.toLowerCase() ||
      ((statusFilter === 'en_preparacion' || statusFilter === 'en_taller') &&
        (rawSt === 'en_preparacion' || rawSt === 'en_taller'));

    const { phone, clientName } = getOrderDetailsHelpers(order);
    const recipient = order.recipient_name || '';
    const opNum = order.operation_number || '';
    const ded = order.dedication_message || '';
    const tracking = order.tracking_code || '';

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      clientName.toLowerCase().includes(query) ||
      phone.includes(query) ||
      recipient.toLowerCase().includes(query) ||
      opNum.toLowerCase().includes(query) ||
      ded.toLowerCase().includes(query) ||
      tracking.toLowerCase().includes(query);

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
            Pedidos de la tienda, Asistente Virtual IA y registro en taller sincronizados en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchOrders(true)}
            disabled={loading || isRefreshing}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium"
            title="Recargar pedidos manualmente"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-rose-400' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
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
              placeholder="Buscar por cliente, destinatario, teléfono, arreglo o N° de operación..."
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
            {(['pendiente', 'confirmado', 'en_preparacion', 'en_despacho', 'entregado'] as OrderStatus[]).map((st) => {
              const count = orders.filter((o) => {
                const s = (o.status || '').toLowerCase();
                if (st === 'en_preparacion') return s === 'en_preparacion' || s === 'en_taller';
                return s === st;
              }).length;
              const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.pendiente;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                    statusFilter === st || (statusFilter === 'en_taller' && st === 'en_preparacion')
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
          <p className="text-sm">Cargando ventas y pedidos en vivo...</p>
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
              : 'Los pedidos que hagan los clientes en la tienda web o mediante la Asesora IA aparecerán aquí automáticamente.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const currentStatus = (order.status || 'pendiente').toLowerCase() as OrderStatus;
            const statusCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.pendiente;
            const StatusIcon = statusCfg.icon;
            const { phone, clientName, cleanRecipient, matchedArrangement, cleanDedication } = getOrderDetailsHelpers(order);

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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold text-white">
                          S/ {Number(order.total_amount).toFixed(2)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-medium uppercase">
                          {order.payment_method}
                        </span>
                        {/* Tracking Code Badge */}
                        {order.tracking_code ? (
                          <button
                            onClick={() => handleCopyTrackingCode(order.tracking_code!)}
                            className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 transition group"
                            title="Clic para copiar código de rastreo"
                          >
                            <Truck className="w-3 h-3 text-rose-400" />
                            <span className="font-semibold">{order.tracking_code}</span>
                            {copiedTrackingId === order.tracking_code ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-rose-400/70 group-hover:text-rose-300" />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssignTrackingCode(order.id)}
                            className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full"
                          >
                            + Asignar código
                          </button>
                        )}
                        {matchedArrangement && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950/70 border border-rose-800/60 text-rose-300 font-semibold flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            <span>{matchedArrangement}</span>
                          </span>
                        )}
                        {order.operation_number && (
                          <span className="text-[11px] text-neutral-500 font-mono">
                            Op: {order.operation_number}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Registrado:{' '}
                        {order.created_at
                          ? formatLocalDateTime(order.created_at)
                          : 'Reciente'}
                      </p>
                    </div>
                  </div>

                  {/* Estado Badge & Switcher */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusCfg.label}</span>
                    </div>

                    {/* Selector de estado rápido con valores normalizados */}
                    <select
                      value={currentStatus === 'en_taller' ? 'en_preparacion' : currentStatus}
                      onChange={(e) =>
                        handleUpdateStatus(order.id, e.target.value as OrderStatus)
                      }
                      className="bg-neutral-800 text-neutral-300 text-xs rounded-xl px-2.5 py-1 border border-neutral-700 focus:outline-none focus:border-rose-500 transition cursor-pointer"
                    >
                      <option value="pendiente">⏳ Pendiente</option>
                      <option value="confirmado">✅ Confirmado</option>
                      <option value="en_preparacion">🌸 En Preparación</option>
                      <option value="en_despacho">🚗 En Despacho</option>
                      <option value="entregado">✨ Entregado</option>
                      <option value="cancelado">❌ Cancelado</option>
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
                      {clientName}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-neutral-400">{phone || 'Sin cel'}</span>
                      {phone && (
                        <button
                          onClick={() => handleOpenWhatsAppChat(phone, clientName)}
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
                        <span>Aniversario: {formatLocalDate(order.customer.anniversary_date)}</span>
                      </div>
                    )}
                  </div>

                  {/* Destinatario & Entrega */}
                  <div className="bg-neutral-950/60 rounded-xl p-3 border border-neutral-800/60 space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                      Entrega & Destinatario
                    </span>
                    <p className="font-semibold text-white text-sm">
                      {cleanRecipient || 'Mismo cliente'}
                    </p>
                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{formatLocalDate(order.delivery_date)}</span>
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
                        {cleanDedication
                          ? `"${cleanDedication}"`
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
                          <span>Ver Voucher</span>
                        </button>
                      ) : (
                        <span className="text-neutral-600 text-[11px]">Sin voucher adjunto</span>
                      )}

                      <button
                        onClick={() => setSelectedOrderDetails(order)}
                        className="text-neutral-400 hover:text-white text-[11px] hover:underline"
                      >
                        Ver detalles
                      </button>
                    </div>
                  </div>
                </div>

                {/* BARRA OPERATIVA: Validar Voucher & Notificaciones WhatsApp */}
                <div className="pt-2 border-t border-neutral-800/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Botón para validar pago si está pendiente o falta voucher */}
                    {(currentStatus === 'pendiente' || (!order.voucher_url && (order.payment_method || '').toLowerCase() !== 'efectivo')) && (
                      <button
                        onClick={() => {
                          setValidatingOrder(order);
                          const pm = (order.payment_method || 'yape').toLowerCase();
                          setValPaymentMethod(
                            (['yape', 'plin', 'transferencia', 'efectivo'].includes(pm)
                              ? pm
                              : 'yape') as 'yape' | 'plin' | 'transferencia' | 'efectivo'
                          );
                          setValVoucherFile(null);
                          setValVoucherPreview(order.voucher_url || null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-950/40 transition active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Validar Pago & Pasar a Taller</span>
                      </button>
                    )}

                    {/* Botón WhatsApp contextual por estado */}
                    {(currentStatus === 'en_preparacion' || currentStatus === 'en_taller') && (
                      <button
                        onClick={() => handleSendStatusWhatsApp(order, 'en_preparacion')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/50 border border-purple-800/60 text-purple-300 text-xs font-semibold transition"
                        title="Avisar al cliente que su arreglo está en preparación con link de rastreo"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Avisar Taller 🌸</span>
                      </button>
                    )}

                    {currentStatus === 'en_despacho' && (
                      <button
                        onClick={() => handleSendStatusWhatsApp(order, 'en_despacho')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/50 hover:bg-sky-900/50 border border-sky-800/60 text-sky-300 text-xs font-semibold transition"
                        title="Avisar al cliente que el chofer va en camino con link de rastreo"
                      >
                        <Truck className="w-3.5 h-3.5 text-sky-400" />
                        <span>Avisar Chofer en Camino 🚗</span>
                      </button>
                    )}

                    {currentStatus === 'entregado' && (
                      <button
                        onClick={() => handleSendStatusWhatsApp(order, 'entregado')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-800/60 text-emerald-300 text-xs font-semibold transition"
                        title="Avisar entrega completada"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Avisar Entrega Exitosa ✨</span>
                      </button>
                    )}
                  </div>

                  {/* Acceso directo a URL de rastreo pública */}
                  {order.tracking_code && (
                    <a
                      href={`/?track=${order.tracking_code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-rose-400 transition ml-auto"
                      title="Ver vista del cliente de este pedido"
                    >
                      <span>Ver Tracking</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
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
                      Notas del Cliente
                    </label>
                    <input
                      type="text"
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Preferencias o detalles"
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
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition"
                    >
                      <option value="yape">Yape</option>
                      <option value="plin">Plin</option>
                      <option value="transferencia">Transferencia Bancaria</option>
                      <option value="efectivo">Efectivo</option>
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
                      Fecha de Entrega *
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      required
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
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
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
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
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
                      placeholder="Escribe el mensaje que irá en la tarjeta..."
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
              {(() => {
                const modalHelper = getOrderDetailsHelpers(selectedOrderDetails);
                return (
                  <>
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1">
                      <span className="text-neutral-500 font-medium">Cliente / Comprador:</span>
                      <p className="text-sm font-semibold text-white">
                        {modalHelper.clientName}
                      </p>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-neutral-400">
                          Teléfono: {modalHelper.phone || 'No registrado'}
                        </span>
                        {modalHelper.phone && (
                          <button
                            onClick={() => handleOpenWhatsAppChat(modalHelper.phone, modalHelper.clientName)}
                            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-[11px] font-medium"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>
                        )}
                      </div>
                      {selectedOrderDetails.customer?.anniversary_date && (
                        <p className="text-pink-400">
                          Aniversario / Cumpleaños: {formatLocalDate(selectedOrderDetails.customer.anniversary_date)}
                        </p>
                      )}
                      {selectedOrderDetails.customer?.notes && (
                        <p className="text-neutral-400 italic">Notas CRM: {selectedOrderDetails.customer.notes}</p>
                      )}
                    </div>

                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1">
                      <span className="text-neutral-500 font-medium">Destinatario & Entrega:</span>
                      <p className="text-sm font-semibold text-white">
                        {modalHelper.cleanRecipient || 'Mismo cliente'}
                      </p>
                      <p className="text-neutral-400">
                        Fecha: {formatLocalDate(selectedOrderDetails.delivery_date)}
                      </p>
                      <p className="text-neutral-400">
                        Dirección: {selectedOrderDetails.delivery_address || 'Entrega en taller'}
                      </p>
                    </div>

                    {modalHelper.matchedArrangement && (
                      <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1">
                        <span className="text-neutral-500 font-medium">Arreglo Solicitado:</span>
                        <p className="text-sm font-semibold text-rose-400">
                          {modalHelper.matchedArrangement}
                        </p>
                      </div>
                    )}

                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1">
                      <span className="text-neutral-500 font-medium">Dedicatoria:</span>
                      <p className="text-neutral-200 italic">
                        {modalHelper.cleanDedication
                          ? `"${modalHelper.cleanDedication}"`
                          : 'Sin dedicatoria'}
                      </p>
                    </div>
                  </>
                );
              })()}

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1">
                <span className="text-neutral-500 font-medium">Información de Pago:</span>
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-white font-mono">
                    S/ {Number(selectedOrderDetails.total_amount).toFixed(2)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 uppercase font-mono">
                    {selectedOrderDetails.payment_method}
                  </span>
                </div>
                {selectedOrderDetails.operation_number && (
                  <p className="text-neutral-400 font-mono">
                    N° Operación: {selectedOrderDetails.operation_number}
                  </p>
                )}
              </div>

              {/* Tracking Code en Detalle */}
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
                <span className="text-neutral-500 font-medium">Código de Rastreo para el Cliente:</span>
                <div className="flex items-center justify-between">
                  {selectedOrderDetails.tracking_code ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-rose-400">
                        {selectedOrderDetails.tracking_code}
                      </span>
                      <button
                        onClick={() => handleCopyTrackingCode(selectedOrderDetails.tracking_code!)}
                        className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                        title="Copiar código"
                      >
                        {copiedTrackingId === selectedOrderDetails.tracking_code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAssignTrackingCode(selectedOrderDetails.id)}
                      className="text-xs text-amber-400 hover:underline"
                    >
                      + Generar código de rastreo
                    </button>
                  )}

                  {selectedOrderDetails.tracking_code && (
                    <a
                      href={`/?track=${selectedOrderDetails.tracking_code}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <span>Abrir vista pública</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2">
                <span className="text-neutral-500 font-medium">Estado Actual del Pedido:</span>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {(() => {
                    const mStatus = (selectedOrderDetails.status || 'pendiente').toLowerCase() as OrderStatus;
                    const mCfg = STATUS_CONFIG[mStatus] || STATUS_CONFIG.pendiente;
                    const MIcon = mCfg.icon;
                    return (
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${mCfg.bg} ${mCfg.text} ${mCfg.border}`}>
                        <MIcon className="w-3.5 h-3.5" />
                        <span>{mCfg.label}</span>
                      </div>
                    );
                  })()}
                  <select
                    value={
                      (selectedOrderDetails.status || 'pendiente').toLowerCase() === 'en_taller'
                        ? 'en_preparacion'
                        : (selectedOrderDetails.status || 'pendiente').toLowerCase()
                    }
                    onChange={(e) => handleUpdateStatus(selectedOrderDetails.id, e.target.value)}
                    className="bg-neutral-800 text-neutral-200 text-xs rounded-xl px-3 py-1.5 border border-neutral-700 focus:outline-none focus:border-rose-500 transition cursor-pointer font-medium"
                  >
                    <option value="pendiente">⏳ Marcar Pendiente</option>
                    <option value="confirmado">✅ Marcar Confirmado</option>
                    <option value="en_preparacion">🌸 Pasar a Preparación</option>
                    <option value="en_despacho">🚗 Pasar a Despacho</option>
                    <option value="entregado">✨ Marcar Entregado</option>
                    <option value="cancelado">❌ Cancelar Pedido</option>
                  </select>
                </div>

                {/* Acciones de WhatsApp rápidas desde la ficha */}
                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-neutral-400">Notificar al cliente:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSendStatusWhatsApp(selectedOrderDetails, 'en_preparacion')}
                      className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-300 hover:bg-purple-900/60 text-[11px] font-medium transition flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-400" />
                      <span>Taller</span>
                    </button>
                    <button
                      onClick={() => handleSendStatusWhatsApp(selectedOrderDetails, 'en_despacho')}
                      className="px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-800/60 text-sky-300 hover:bg-sky-900/60 text-[11px] font-medium transition flex items-center gap-1"
                    >
                      <Truck className="w-3 h-3" />
                      <span>Despacho</span>
                    </button>
                    <button
                      onClick={() => handleSendStatusWhatsApp(selectedOrderDetails, 'entregado')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60 text-[11px] font-medium transition flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Entregado</span>
                    </button>
                  </div>
                </div>
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

      {/* MODAL: Validar Pago / Subir Voucher y Pasar a Taller */}
      {validatingOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Validar Pago & Pasar a Taller</h3>
                  <p className="text-xs text-neutral-400">
                    Confirma el pago recibido para asignar tracking y pasar el arreglo a preparación.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setValidatingOrder(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen del Pedido */}
            <div className="bg-neutral-950 rounded-2xl p-4 border border-neutral-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Monto del Pedido:</span>
                <span className="text-base font-bold text-white font-mono">
                  S/ {Number(validatingOrder.total_amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Destinatario:</span>
                <span className="text-neutral-200 font-medium">
                  {validatingOrder.recipient_name || 'Cliente'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Código de Rastreo:</span>
                <span className="font-mono text-rose-400 font-bold">
                  {validatingOrder.tracking_code || 'Se generará automáticamente (ej. PET-XXXX)'}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmValidation} className="space-y-4">
              {/* Método de Pago */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Método de Pago Confirmado
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'yape' as const, label: 'Yape', color: 'border-purple-700 bg-purple-950/40 text-purple-300' },
                    { id: 'plin' as const, label: 'Plin', color: 'border-cyan-700 bg-cyan-950/40 text-cyan-300' },
                    { id: 'transferencia' as const, label: 'Transferencia', color: 'border-blue-700 bg-blue-950/40 text-blue-300' },
                    { id: 'efectivo' as const, label: 'Efectivo', color: 'border-emerald-700 bg-emerald-950/40 text-emerald-300' },
                  ].map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setValPaymentMethod(m.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition ${
                        valPaymentMethod.toLowerCase() === m.id
                          ? `${m.color} ring-2 ring-rose-500`
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subir Comprobante (Voucher) */}
              {valPaymentMethod.toLowerCase() !== 'efectivo' ? (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Comprobante de Pago / Voucher (Captura)
                  </label>
                  <label className="border-2 border-dashed border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-neutral-950/60 transition group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setValVoucherFile(file);
                          setValVoucherPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                    {valVoucherPreview ? (
                      <div className="space-y-2 flex flex-col items-center">
                        <img
                          src={valVoucherPreview}
                          alt="Preview comprobante"
                          className="h-28 object-contain rounded-lg border border-neutral-800 shadow"
                        />
                        <span className="text-xs text-rose-400 group-hover:underline">
                          Cambiar imagen
                        </span>
                      </div>
                    ) : (
                      <div className="text-center space-y-1">
                        <Upload className="w-6 h-6 text-neutral-500 mx-auto group-hover:text-rose-400 transition" />
                        <p className="text-xs text-neutral-300 font-medium">
                          Haz clic para seleccionar o arrastra la foto del voucher
                        </p>
                        <p className="text-[11px] text-neutral-500">JPG, PNG o WEBP</p>
                      </div>
                    )}
                  </label>
                </div>
              ) : (
                <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                  <span>
                    Marcado como <strong>Efectivo contra entrega</strong>. No se requiere adjuntar comprobante previo.
                  </span>
                </div>
              )}

              <div className="bg-neutral-950/80 rounded-xl p-3 border border-neutral-800/80 text-[11px] text-neutral-400 space-y-1">
                <p className="font-semibold text-neutral-300">⚡ Automatización de Taller & Tracking:</p>
                <p>
                  Al confirmar, el pedido pasará de inmediato a <strong>En Preparación</strong>, se generará el código único de rastreo y podrás abrir WhatsApp con el mensaje preformateado para el cliente con un solo clic.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setValidatingOrder(null)}
                  disabled={valLoading}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={valLoading}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-950/50 transition active:scale-95 disabled:opacity-50"
                >
                  {valLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando & Pasando a Taller...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar Pago y Pasar a Taller</span>
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
