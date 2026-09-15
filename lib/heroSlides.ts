import { supabase } from '@/lib/supabase';
import { HeroSlide } from '@/lib/types';

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: '25772623-74fb-4b49-b8e7-a613be990496',
    badge_text: 'MOMENTOS ÚNICOS',
    title: 'ARTE FLORAL DISEÑADO PARA EMOCIONAR',
    subtitle: 'Ramos de autor y colecciones exclusivas confeccionadas con flores frescas de exportación.',
    image_url: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/ramos/IMG-20260912-WA0043.jpg',
    cta_text: 'Explorar Colección',
    cta_link: '#catalogo',
    watermark_text: 'Rozier',
    sort_order: 1,
    is_active: true,
  },
  {
    id: '2279f741-d6c2-434e-b8b6-a25707b4a79b',
    badge_text: 'ALTA FLORISTERÍA',
    title: 'BOXES DE ROSAS & DISTINCIÓN ETERNA',
    subtitle: 'Arreglos en cajas de lujo con acabados de alta costura floral y dedicatoria personalizada.',
    image_url: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/boxes/IMG-20260912-WA0044.jpg',
    cta_text: 'Ver Boxes Exclusivos',
    cta_link: '#catalogo',
    watermark_text: 'Romance',
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'b6fef1d0-916a-45c5-b295-9543c97d977e',
    badge_text: 'EXPERIENCIA WOW',
    title: 'ENERGÍA RADIANTE EN GIRASOLES SELECTOS',
    subtitle: 'La luz y sofisticación de los tonos dorados seleccionados flor por flor.',
    image_url: 'https://qnrwguxaxcwqzodngztg.supabase.co/storage/v1/object/public/products/girasoles/IMG-20260912-WA0040.jpg',
    cta_text: 'Descubrir Girasoles',
    cta_link: '#catalogo',
    watermark_text: 'Amor',
    sort_order: 3,
    is_active: true,
  },
];

const LOCAL_STORAGE_KEY = 'petalia_hero_slides';

/**
 * Obtiene los slides activos para la tienda pública (ordenados por sort_order asc)
 */
export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const { data, error } = await supabase
      .from('hero_slides')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as HeroSlide[];
    }
  } catch (err) {
    console.warn('Advertencia consultando hero_slides en Supabase, recurriendo a fallback:', err);
  }

  // Fallback a localStorage si falla la red
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const actives = parsed.filter((s: HeroSlide) => s.is_active);
          if (actives.length > 0) return actives;
        }
      }
    } catch {
      // Ignorar error de parsing
    }
  }

  return DEFAULT_HERO_SLIDES;
}

/**
 * Obtiene todos los slides (activos e inactivos) para el panel administrativo
 */
export async function getAllHeroSlides(): Promise<HeroSlide[]> {
  try {
    const { data, error } = await supabase
      .from('hero_slides')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as HeroSlide[];
    }
  } catch (err) {
    console.warn('Advertencia consultando all hero_slides en Supabase:', err);
  }

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

  return DEFAULT_HERO_SLIDES;
}

/**
 * Actualiza o guarda la lista completa de slides en Supabase
 */
export async function updateHeroSlides(slides: HeroSlide[]): Promise<HeroSlide[]> {
  const sanitized = slides.map((slide, idx) => ({
    id: slide.id || crypto.randomUUID(),
    badge_text: slide.badge_text?.trim() || 'COLECCIÓN EXCLUSIVA',
    title: slide.title?.trim() || 'DISEÑO FLORAL DE AUTOR',
    subtitle: slide.subtitle?.trim() || 'Flores frescas de exportación seleccionadas a mano.',
    image_url: slide.image_url?.trim() || '',
    cta_text: slide.cta_text?.trim() || 'Ver Diseños',
    cta_link: slide.cta_link?.trim() || '#catalogo',
    watermark_text: slide.watermark_text?.trim() || 'Rozier',
    sort_order: slide.sort_order ?? idx + 1,
    is_active: slide.is_active ?? true,
  }));

  try {
    // 1. Obtener los IDs actuales en la base de datos para detectar eliminaciones
    const { data: currentRows } = await supabase.from('hero_slides').select('id');
    const incomingIds = new Set(sanitized.map((s) => s.id));

    if (currentRows && currentRows.length > 0) {
      const idsToDelete = currentRows
        .map((r) => r.id)
        .filter((id) => !incomingIds.has(id));

      if (idsToDelete.length > 0) {
        await supabase.from('hero_slides').delete().in('id', idsToDelete);
      }
    }

    // 2. Upsert de todos los slides
    const { data, error } = await supabase
      .from('hero_slides')
      .upsert(sanitized)
      .select()
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      }
      return data as HeroSlide[];
    }

    if (error) {
      console.error('Error al guardar hero_slides en Supabase:', error);
    }
  } catch (err) {
    console.warn('No se pudo guardar hero_slides directamente en Supabase:', err);
  }

  // Guardar en fallback local
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
  }

  return sanitized;
}

/**
 * Sube una imagen al bucket de Supabase Storage en la carpeta hero/
 */
export async function uploadHeroSlideImage(file: File): Promise<string> {
  const cleanName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `hero/${cleanName}`;

  const { error: uploadError } = await supabase.storage
    .from('products')
    .upload(filePath, file, { cacheControl: '3600', upsert: true });

  if (uploadError) {
    throw new Error('Error al subir imagen del slider a Storage: ' + uploadError.message);
  }

  const { data: publicData } = supabase.storage
    .from('products')
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}
