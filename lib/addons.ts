import { supabase } from '@/lib/supabase';
import { SpecialAddon } from '@/lib/types';

export const ADDON_CATEGORIES = [
  'Chocolates',
  'Peluches',
  'Vinos & Licores',
  'Globos',
  'Tarjetas & Dedicatorias',
  'Complementos Exclusivos',
];

export const DEFAULT_SPECIAL_ADDONS: SpecialAddon[] = [
  {
    id: '615807fb-2dc3-4a6e-8361-7855ae194534',
    name: 'Chocolates Ferrero Rocher (8 bombones)',
    category: 'Chocolates',
    price: 35,
    image_url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=400&q=80',
    is_active: true,
    sort_order: 1,
  },
  {
    id: '39db4d60-b544-4259-bb47-44ba64c06c75',
    name: 'Peluche Oso Premium 25cm',
    category: 'Peluches',
    price: 45,
    image_url: 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=400&q=80',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'c6d6c818-8c55-4b89-8db7-0d1712a60c10',
    name: 'Globo Metalizado "Feliz Día"',
    category: 'Globos',
    price: 18,
    image_url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=400&q=80',
    is_active: true,
    sort_order: 3,
  },
  {
    id: '06f225cf-bf0a-4905-a398-4cc7eb8df2f2',
    name: 'Vino Tinto Selección 750ml',
    category: 'Vinos & Licores',
    price: 55,
    image_url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=400&q=80',
    is_active: true,
    sort_order: 4,
  },
];

export async function getSpecialAddons(includeInactive = false): Promise<SpecialAddon[]> {
  try {
    let query = supabase
      .from('special_addons')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (data && data.length > 0) return data as SpecialAddon[];
  } catch (err) {
    console.warn('Advertencia consultando special_addons en Supabase, recurriendo a fallback:', err);
  }

  return includeInactive
    ? DEFAULT_SPECIAL_ADDONS
    : DEFAULT_SPECIAL_ADDONS.filter((a) => a.is_active);
}

export async function toggleSpecialAddonActive(id: string, is_active: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('special_addons')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error actualizando estado de special_addon:', err);
    throw err;
  }
}

export async function deleteSpecialAddon(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('special_addons')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error eliminando special_addon:', err);
    throw err;
  }
}
