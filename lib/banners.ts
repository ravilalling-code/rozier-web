import { supabase } from '@/lib/supabase';
import { CategoryBanner } from '@/lib/types';

export const DEFAULT_CATEGORY_BANNERS: CategoryBanner[] = [
  {
    id: 'amor',
    title: 'Amor',
    badge_text: 'Más popular',
    image_url: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/boxes/IMG-20260912-WA0044.jpg',
    category_slug: 'boxes',
    link_category: 'Amor',
    order_index: 1,
    sort_order: 1,
  },
  {
    id: 'cumpleanos',
    title: 'Cumpleaños',
    badge_text: 'Celebra su día',
    image_url: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/items/1789326365177-uervpign.jpg',
    category_slug: 'girasoles',
    link_category: 'Cumpleaños',
    order_index: 2,
    sort_order: 2,
  },
  {
    id: 'aniversario',
    title: 'Aniversario',
    badge_text: 'Momentos únicos',
    image_url: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/items/1789322993190.jpg',
    category_slug: 'ramos',
    link_category: 'Aniversario',
    order_index: 3,
    sort_order: 3,
  },
  {
    id: 'para_el',
    title: 'Para Él',
    badge_text: 'Elegante & sobrio',
    image_url: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/boxes/IMG-20260912-WA0058.jpg',
    category_slug: 'detalles',
    link_category: 'Para Él',
    order_index: 4,
    sort_order: 4,
  },
];

const LOCAL_STORAGE_KEY = 'petalia_category_banners';

export async function getCategoryBanners(): Promise<CategoryBanner[]> {
  try {
    const { data, error } = await supabase
      .from('category_banners')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((b: any, idx: number) => ({
        id: b.id,
        title: b.title,
        badge_text: b.badge_text || '',
        image_url: b.image_url || '',
        category_slug: b.category_slug || b.link_category || 'todos',
        link_category: b.link_category || b.category_slug || '',
        order_index: b.order_index ?? b.sort_order ?? (idx + 1),
        sort_order: b.sort_order ?? b.order_index ?? (idx + 1),
      }));
    }
    if (error) {
      console.warn('Advertencia consultando category_banners en Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Advertencia consultando category_banners en Supabase, recurriendo a fallback:', err);
  }

  // Fallback local en caso de que aún no se haya creado la tabla en Supabase o no haya conexión
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignorar error de parsing
    }
  }

  return DEFAULT_CATEGORY_BANNERS;
}

export async function updateCategoryBanners(banners: CategoryBanner[]): Promise<CategoryBanner[]> {
  // Mapear estrictamente a las columnas existentes en public.category_banners
  const payload = banners.map((b, idx) => ({
    id: b.id,
    title: b.title,
    badge_text: b.badge_text || '',
    image_url: b.image_url || '',
    link_category: b.link_category || b.category_slug || '',
    sort_order: b.sort_order ?? b.order_index ?? (idx + 1),
  }));

  try {
    const { data, error } = await supabase
      .from('category_banners')
      .upsert(payload)
      .select();

    if (!error && data && data.length > 0) {
      const normalized = data.map((b: any, idx: number) => ({
        id: b.id,
        title: b.title,
        badge_text: b.badge_text || '',
        image_url: b.image_url || '',
        category_slug: b.category_slug || b.link_category || 'todos',
        link_category: b.link_category || b.category_slug || '',
        order_index: b.order_index ?? b.sort_order ?? (idx + 1),
        sort_order: b.sort_order ?? b.order_index ?? (idx + 1),
      }));

      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
      }
      return normalized;
    }
    if (error) {
      console.error('Error al guardar category_banners en Supabase:', error);
    }
  } catch (err) {
    console.warn('No se pudo persistir en Supabase category_banners directamente:', err);
  }

  // Persistir en fallback local
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(banners));
  }

  return banners;
}

export async function uploadBannerImage(file: File): Promise<string> {
  const cleanName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `banners/${cleanName}`;

  const { error: uploadError } = await supabase.storage
    .from('products')
    .upload(filePath, file, { cacheControl: '3600', upsert: true });

  if (uploadError) {
    throw new Error('Error al subir imagen a Supabase Storage: ' + uploadError.message);
  }

  const { data: publicData } = supabase.storage
    .from('products')
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}
