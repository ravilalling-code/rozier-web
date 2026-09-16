import { supabase } from '@/lib/supabase';

export interface ClientReview {
  id: string;
  client_name?: string;
  image_url: string;
  photo_url?: string;
  comment?: string;
  testimonial?: string;
  occasion?: string;
  order_index: number;
  is_active: boolean;
  created_at?: string;
}

export const DEFAULT_CLIENT_REVIEWS: ClientReview[] = Array.from({ length: 19 }, (_, i) => ({
  id: `client-photo-${i + 1}`,
  client_name: `Momento ROZIER #${i + 1}`,
  image_url: `/images/clientes/${i + 1}.jpg`,
  photo_url: `/images/clientes/${i + 1}.jpg`,
  comment: 'La emoción de recibir flores frescas de alta costura.',
  testimonial: 'La emoción de recibir flores frescas de alta costura.',
  occasion: 'Celebración Especial',
  order_index: i + 1,
  is_active: true,
}));

const LOCAL_STORAGE_KEY = 'rozier_client_reviews';

function getLocalReviews(): ClientReview[] {
  if (typeof window === 'undefined') return DEFAULT_CLIENT_REVIEWS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error leyendo rozier_client_reviews de localStorage:', err);
  }
  return DEFAULT_CLIENT_REVIEWS;
}

function saveLocalReviews(reviews: ClientReview[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reviews));
    } catch (err) {
      console.warn('Error guardando en localStorage:', err);
    }
  }
}

/**
 * Obtiene las fotos de clientes activas para el carrusel de la tienda pública
 */
export async function getClientReviews(): Promise<ClientReview[]> {
  try {
    const { data, error } = await supabase
      .from('client_reviews')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as ClientReview[];
    }
  } catch (err) {
    console.warn('Advertencia consultando client_reviews en Supabase, recurriendo a local:', err);
  }

  // Fallback
  return getLocalReviews().filter((r) => r.is_active !== false);
}

/**
 * Obtiene todas las fotos para el panel de administración (activas e inactivas)
 */
export async function getAllClientReviews(): Promise<ClientReview[]> {
  try {
    const { data, error } = await supabase
      .from('client_reviews')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as ClientReview[];
    }
  } catch (err) {
    console.warn('Advertencia consultando client_reviews para admin:', err);
  }

  return getLocalReviews();
}

/**
 * Agrega una nueva foto de cliente
 */
export async function addClientReview(
  item: Omit<ClientReview, 'id' | 'created_at'>
): Promise<ClientReview> {
  const newId = crypto.randomUUID();
  const img = item.image_url || item.photo_url || '';
  const newRow: ClientReview = {
    ...item,
    image_url: img,
    photo_url: img,
    id: newId,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('client_reviews')
      .insert([newRow])
      .select()
      .maybeSingle();

    if (!error && data) {
      const all = getLocalReviews();
      saveLocalReviews([data as ClientReview, ...all]);
      return data as ClientReview;
    }
  } catch (err) {
    console.warn('Error insertando en Supabase client_reviews:', err);
  }

  // Fallback local
  const current = getLocalReviews();
  const updated = [newRow, ...current];
  saveLocalReviews(updated);
  return newRow;
}

/**
 * Activa o desactiva la visibilidad de una foto
 */
export async function toggleClientReviewActive(
  id: string,
  is_active: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('client_reviews')
      .update({ is_active })
      .eq('id', id);

    if (!error) {
      const current = getLocalReviews().map((r) =>
        r.id === id ? { ...r, is_active } : r
      );
      saveLocalReviews(current);
      return true;
    }
  } catch (err) {
    console.warn('Error actualizando estado en Supabase:', err);
  }

  // Fallback local
  const current = getLocalReviews().map((r) =>
    r.id === id ? { ...r, is_active } : r
  );
  saveLocalReviews(current);
  return true;
}

/**
 * Elimina una foto de cliente
 */
export async function deleteClientReview(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('client_reviews')
      .delete()
      .eq('id', id);

    if (!error) {
      const current = getLocalReviews().filter((r) => r.id !== id);
      saveLocalReviews(current);
      return true;
    }
  } catch (err) {
    console.warn('Error eliminando en Supabase:', err);
  }

  // Fallback local
  const current = getLocalReviews().filter((r) => r.id !== id);
  saveLocalReviews(current);
  return true;
}

/**
 * Sube una imagen de cliente a Supabase Storage (bucket products, carpeta clientes/)
 */
export async function uploadClientPhoto(file: File): Promise<string> {
  const cleanName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `clientes/${cleanName}`;

  const { error: uploadError } = await supabase.storage
    .from('products')
    .upload(filePath, file, { cacheControl: '3600', upsert: true });

  if (uploadError) {
    throw new Error('Error al subir foto de cliente: ' + uploadError.message);
  }

  const { data: publicData } = supabase.storage
    .from('products')
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}
