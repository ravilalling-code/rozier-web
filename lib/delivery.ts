import { supabase } from '@/lib/supabase';
import { DeliveryZone } from '@/lib/types';

export const DEFAULT_DELIVERY_ZONES: DeliveryZone[] = [
  { id: 1, district: 'Miraflores', cost: 12, active: true },
  { id: 2, district: 'San Isidro', cost: 12, active: true },
  { id: 3, district: 'Barranco', cost: 15, active: true },
  { id: 4, district: 'Santiago de Surco', cost: 15, active: true },
  { id: 5, district: 'San Borja', cost: 15, active: true },
  { id: 6, district: 'La Molina', cost: 18, active: true },
  { id: 7, district: 'Jesús María', cost: 12, active: true },
  { id: 8, district: 'Lince', cost: 12, active: true },
  { id: 9, district: 'Magdalena del Mar', cost: 12, active: true },
  { id: 10, district: 'Pueblo Libre', cost: 12, active: true },
  { id: 11, district: 'San Miguel', cost: 14, active: true },
  { id: 12, district: 'Surquillo', cost: 12, active: true },
  { id: 13, district: 'Cercado de Lima', cost: 16, active: true },
  { id: 14, district: 'Breña', cost: 15, active: true },
  { id: 15, district: 'Chorrillos', cost: 16, active: true },
  { id: 16, district: 'Ate (Zonas principales)', cost: 20, active: true },
  { id: 17, district: 'Bellavista (Callao)', cost: 20, active: true },
  { id: 18, district: 'La Perla (Callao)', cost: 20, active: true },
  { id: 19, district: 'Los Olivos', cost: 22, active: true },
  { id: 20, district: 'San Martín de Porres', cost: 22, active: true },
];

/**
 * Obtiene las tarifas de delivery de public.delivery_zones
 * @param includeInactive Si es true, retorna todas las zonas (usado en panel admin)
 */
export async function getDeliveryZones(includeInactive = false): Promise<DeliveryZone[]> {
  try {
    let query = supabase
      .from('delivery_zones')
      .select('*')
      .order('district', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.warn('Advertencia consultando delivery_zones de Supabase:', error);
      return includeInactive
        ? DEFAULT_DELIVERY_ZONES
        : DEFAULT_DELIVERY_ZONES.filter((z) => z.active !== false);
    }

    if (!data || data.length === 0) {
      return includeInactive
        ? DEFAULT_DELIVERY_ZONES
        : DEFAULT_DELIVERY_ZONES.filter((z) => z.active !== false);
    }

    const normalized = data.map((z: any) => ({
      id: z.id,
      district: z.district,
      cost: Number(z.cost),
      active: z.active !== undefined ? Boolean(z.active) : z.is_active !== undefined ? Boolean(z.is_active) : true,
      is_active: z.is_active !== undefined ? Boolean(z.is_active) : z.active !== undefined ? Boolean(z.active) : true,
      created_at: z.created_at,
    }));

    if (!includeInactive) {
      return normalized.filter((z) => z.active !== false);
    }

    return normalized;
  } catch (err) {
    console.error('Error en getDeliveryZones:', err);
    return includeInactive
      ? DEFAULT_DELIVERY_ZONES
      : DEFAULT_DELIVERY_ZONES.filter((z) => z.active !== false);
  }
}

/**
 * Crea un nuevo distrito o tarifa de delivery
 */
export async function createDeliveryZone(payload: {
  district: string;
  cost: number;
  active?: boolean;
}): Promise<DeliveryZone | null> {
  const insertData: Record<string, any> = {
    district: payload.district.trim(),
    cost: Number(payload.cost),
  };

  // Probar con 'active' primero
  try {
    const { data, error } = await supabase
      .from('delivery_zones')
      .insert([{ ...insertData, active: payload.active ?? true }])
      .select()
      .single();

    if (!error && data) {
      return {
        id: data.id,
        district: data.district,
        cost: Number(data.cost),
        active: Boolean(data.active ?? true),
      };
    }

    // Si falló por columna 'active', probar con 'is_active' o sin bandera
    if (error) {
      const retry = await supabase
        .from('delivery_zones')
        .insert([{ ...insertData, is_active: payload.active ?? true }])
        .select()
        .single();

      if (!retry.error && retry.data) {
        return {
          id: retry.data.id,
          district: retry.data.district,
          cost: Number(retry.data.cost),
          active: Boolean(retry.data.is_active ?? true),
        };
      }

      // Si ninguna de las dos columnas existe en la tabla, insertar solo distrito y costo
      const baseRetry = await supabase
        .from('delivery_zones')
        .insert([insertData])
        .select()
        .single();

      if (baseRetry.data) {
        return {
          id: baseRetry.data.id,
          district: baseRetry.data.district,
          cost: Number(baseRetry.data.cost),
          active: true,
        };
      }
    }
  } catch (err) {
    console.error('Error insertando delivery_zone:', err);
  }

  return null;
}

/**
 * Actualiza precio o distrito de una zona
 */
export async function updateDeliveryZone(
  id: number | string,
  payload: {
    district?: string;
    cost?: number;
    active?: boolean;
  }
): Promise<boolean> {
  const updateData: Record<string, any> = {};
  if (payload.district !== undefined) updateData.district = payload.district.trim();
  if (payload.cost !== undefined) updateData.cost = Number(payload.cost);

  if (payload.active !== undefined) {
    updateData.active = payload.active;
  }

  try {
    const { error } = await supabase
      .from('delivery_zones')
      .update(updateData)
      .eq('id', id);

    if (error && (error.message?.includes('column "active"') || error.code === '42703')) {
      delete updateData.active;
      updateData.is_active = payload.active;
      const retry = await supabase
        .from('delivery_zones')
        .update(updateData)
        .eq('id', id);
      return !retry.error;
    }

    return !error;
  } catch (err) {
    console.error('Error actualizando delivery_zone:', err);
    return false;
  }
}

/**
 * Conmuta el estado activo/inactivo de un distrito
 */
export async function toggleDeliveryZoneActive(
  id: number | string,
  currentActive: boolean
): Promise<boolean> {
  const nextStatus = !currentActive;
  return updateDeliveryZone(id, { active: nextStatus });
}

/**
 * Elimina un distrito de delivery_zones
 */
export async function deleteDeliveryZone(id: number | string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('delivery_zones')
      .delete()
      .eq('id', id);

    return !error;
  } catch (err) {
    console.error('Error eliminando delivery_zone:', err);
    return false;
  }
}
