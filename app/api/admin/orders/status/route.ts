import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const VALID_STATUSES = ['pendiente', 'confirmado', 'en_taller', 'entregado'];

export async function PATCH(req: NextRequest) {
  try {
    const { orderId, status } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Falta el ID del pedido (orderId)' }, { status: 400 });
    }

    // Normalizar estrictamente a minúsculas y snake_case para el check constraint
    const cleanStatus = (status || '')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');

    if (!VALID_STATUSES.includes(cleanStatus)) {
      return NextResponse.json(
        {
          error: `Estado inválido "${status}". Valores permitidos por la base de datos: ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    console.log(`🔄 Actualizando estado del pedido ${orderId} a "${cleanStatus}"...`);

    const { data, error } = await supabase
      .from('orders')
      .update({ status: cleanStatus })
      .eq('id', orderId)
      .select();

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

    console.log(`✅ Pedido ${orderId} actualizado con éxito a "${cleanStatus}"`);
    return NextResponse.json({ success: true, order: data[0] });
  } catch (err: any) {
    console.error('❌ Excepción en /api/admin/orders/status:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}
