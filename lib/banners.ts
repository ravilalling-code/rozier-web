import { supabase } from '@/lib/supabase';
import { CategoryBanner } from '@/lib/types';

export const DEFAULT_CATEGORY_BANNERS: CategoryBanner[] = [
  {
    id: 'amor',
    title: 'Amor',
    badge_text: 'Más popular',
    image_url: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/boxes/IMG-20260912-WA0044.jpg',
    category_slug: 'boxes',
    order_index: 1,
  },
  {
    id: 'cumpleanos',
    title: 'Cumpleaños',
    badge_text: 'Celebra su día',
    image_url: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/items/1789326365177-uervpign.jpg',
    category_slug: 'girasoles',
    order_index: 2,
  },
  {
    id: 'aniversario',
    title: 'Aniversario',
    badge_text: 'Momentos únicos',
    image_url: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/items/1789322993190.jpg',
    category_slug: 'ramos',
    order_index: 3,
  },
  {
    id: 'para_el',
    title: 'Para Él',
    badge_text: 'Elegante & sobrio',
    image_url: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/boxes/IMG-20260912-WA0058.jpg',
    category_slug: 'detalles',
    order_index: 4,
  },
];

const LOCAL_STORAGE_KEY = 'petalia_category_banners';

export async function getCategoryBanners(): Promise<CategoryBanner[]> {
  try {
    const { data, error } = await supabase
      .from('category_banners')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as CategoryBanner[];
    }
  } catch (err) {
    console.warn('Advertencia consultando category_banners en Supabase, recurriendo a fallback:', err);
  }

  // Fallback local en caso de que aún no se haya creado la tabla en Supabase
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
  try {
    const { data, error } = await supabase
      .from('category_banners')
      .upsert(banners)
      .select();

    if (!error && data && data.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      }
      return data as CategoryBanner[];
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
