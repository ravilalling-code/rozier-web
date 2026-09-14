import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const VALID_STATUSES = [
  'pendiente',
  'confirmado',
  'en_preparacion',
  'en_taller',
  'en_despacho',
  'entregado',
  'cancelado',
];

export async function PATCH(req: NextRequest) {
  try {
    const { orderId, status, voucherUrl, paymentMethod, trackingCode } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Falta el ID del pedido (orderId)' }, { status: 400 });
    }

    // Normalizar estrictamente a minúsculas y snake_case para el check constraint
    let cleanStatus = (status || '')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');

    if (!VALID_STATUSES.includes(cleanStatus)) {
      return NextResponse.json(
        {
          error: `Estado inválido "${status}". Valores permitidos: ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Si se envía 'en_despacho', mapear a 'en_ruta' para cumplir con el check constraint de Postgres
    const dbStatus = cleanStatus === 'en_despacho' ? 'en_ruta' : cleanStatus;
    const updatePayload: Record<string, any> = { status: dbStatus };
    if (voucherUrl !== undefined) updatePayload.voucher_url = voucherUrl;
    if (paymentMethod !== undefined) updatePayload.payment_method = paymentMethod;
    if (trackingCode !== undefined) updatePayload.tracking_code = trackingCode;

    let { data, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select();

    // Fallback inteligente: si la base de datos aún tiene el check constraint previo que no incluye 'en_preparacion'
    if (error && error.message?.includes('orders_status_check') && cleanStatus === 'en_preparacion') {
      console.warn('⚠️ Base de datos tiene constraint antiguo. Intentando fallback con "en_taller"...');
      updatePayload.status = 'en_taller';
      const retryRes = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select();
      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      console.error('❌ Error de Supabase al actualizar status en orders:', error);
      return NextResponse.json(
        { error: error.message, code: error.code, details: error },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️ No se actualizó ninguna fila para el pedido ID: ${orderId}`);
      return NextResponse.json(
        { error: 'No se encontró el pedido o las políticas RLS no permitieron la modificación.' },
        { status: 404 }
      );
    }

    console.log(`✅ Pedido ${orderId} actualizado con éxito a "${updatePayload.status}"`);
    return NextResponse.json({ success: true, order: data[0] });
  } catch (err: any) {
    console.error('❌ Excepción en /api/admin/orders/status:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}
