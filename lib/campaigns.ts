import { supabase } from '@/lib/supabase';
import { Campaign } from '@/lib/types';

export const DEFAULT_CAMPAIGN: Campaign = {
  id: 'active_campaign',
  title: 'Día de las Flores Amarillas',
  subtitle: 'Arreglos florales radiantes en tonos dorados y girasoles seleccionados.',
  badge_text: 'Campaña Especial',
  layout_type: 'carousel',
  images: [
    'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=80',
  ],
  cta_text: 'Explorar Flores Amarillas',
  cta_link: 'girasoles',
  is_active: true,
};

const LOCAL_STORAGE_KEY = 'petalia_active_campaign';

export async function getActiveCampaign(): Promise<Campaign> {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', 'active_campaign')
      .maybeSingle();

    if (!error && data) {
      return data as Campaign;
    }

    // Si no hay id 'active_campaign', consultar la primera campaña activa
    const { data: firstActive, error: firstErr } = await supabase
      .from('campaigns')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!firstErr && firstActive) {
      return firstActive as Campaign;
    }
  } catch (err) {
    console.warn('Advertencia consultando campaigns en Supabase:', err);
  }

  // Fallback a localStorage si estamos en el navegador
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.title) {
          return parsed;
        }
      }
    } catch {
      // Ignorar error de parsing
    }
  }

  return DEFAULT_CAMPAIGN;
}

export async function updateCampaign(campaign: Campaign): Promise<Campaign> {
  const payload = {
    ...campaign,
    id: campaign.id || 'active_campaign',
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('campaigns')
      .upsert(payload)
      .select()
      .single();

    if (!error && data) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      }
      return data as Campaign;
    }
    if (error) {
      console.warn('Error upsert campaigns en Supabase:', error);
    }
  } catch (err) {
    console.warn('No se pudo guardar la campaña en Supabase:', err);
  }

  // Guardar en fallback local
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  }

  return payload;
}

export async function uploadCampaignImage(file: File): Promise<string> {
  const cleanName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = `campaigns/${cleanName}`;

  const { error: uploadError } = await supabase.storage
    .from('products')
    .upload(filePath, file, { cacheControl: '3600', upsert: true });

  if (uploadError) {
    throw new Error('Error al subir imagen de campaña a Storage: ' + uploadError.message);
  }

  const { data: publicData } = supabase.storage
    .from('products')
    .getPublicUrl(filePath);

  return publicData.publicUrl;
}
