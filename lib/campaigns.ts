import { supabase } from '@/lib/supabase';
import { Campaign } from '@/lib/types';

export const DEFAULT_CAMPAIGN: Campaign = {
  id: 'active_campaign',
  name: 'Flores Amarillas',
  title: 'Día de las Flores Amarillas',
  subtitle: 'Arreglos florales radiantes en tonos dorados y girasoles seleccionados.',
  badge_text: 'Campaña Especial',
  layout_type: 'carousel',
  is_carousel: true,
  images: [
    'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=80',
  ],
  banner_images: [
    'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=80',
  ],
  banner_url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=900&q=80',
  cta_text: 'Explorar Flores Amarillas',
  cta_link: 'girasoles',
  is_active: true,
};

function normalizeCampaign(camp: any): Campaign {
  const images = (camp.banner_images && camp.banner_images.length > 0)
    ? camp.banner_images.slice(0, 3)
    : ((camp.images && camp.images.length > 0)
      ? camp.images.slice(0, 3)
      : (camp.banner_url ? [camp.banner_url] : []));

  const isCarousel = typeof camp.is_carousel === 'boolean'
    ? camp.is_carousel
    : (camp.layout_type === 'carousel' || images.length > 1);

  return {
    ...camp,
    is_carousel: isCarousel,
    layout_type: isCarousel ? 'carousel' : 'banner',
    banner_images: images,
    images,
    banner_url: camp.banner_url || images[0] || null,
  };
}

export async function getAllCampaigns(): Promise<Campaign[]> {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      return data.map(normalizeCampaign);
    }
  } catch (err) {
    console.error('Error al obtener campañas:', err);
  }
  return [];
}

export async function getActiveCampaign(): Promise<Campaign | null> {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error) {
      if (data) return normalizeCampaign(data);
      return null;
    }
  } catch (err) {
    console.warn('Advertencia consultando campaña activa en Supabase:', err);
  }
  return null;
}

export async function createCampaign(campaign: Omit<Campaign, 'id'> & { id?: string }): Promise<Campaign> {
  const id = campaign.id || `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const bannerImages = (campaign.banner_images && campaign.banner_images.length > 0)
    ? campaign.banner_images.slice(0, 3)
    : ((campaign.images && campaign.images.length > 0)
      ? campaign.images.slice(0, 3)
      : (campaign.banner_url ? [campaign.banner_url] : []));

  const bannerUrl = campaign.banner_url || bannerImages[0] || null;
  const isCarousel = typeof campaign.is_carousel === 'boolean'
    ? campaign.is_carousel
    : (campaign.layout_type === 'carousel');

  const payload: any = {
    ...campaign,
    id,
    name: campaign.name || campaign.title,
    banner_url: bannerUrl,
    images: bannerImages,
    banner_images: bannerImages,
    is_carousel: isCarousel,
    layout_type: isCarousel ? 'carousel' : 'banner',
    updated_at: new Date().toISOString(),
  };

  // Si se crea como activa, desactivamos las demás
  if (campaign.is_active) {
    await supabase
      .from('campaigns')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .neq('id', id);
  }

  let { data, error } = await supabase
    .from('campaigns')
    .insert([payload])
    .select()
    .single();

  // Si la tabla no tiene columnas banner_images o is_carousel todavía
  if (error && error.code === 'PGRST204') {
    const { banner_images, is_carousel, ...fallbackPayload } = payload;
    const retry = await supabase
      .from('campaigns')
      .insert([fallbackPayload])
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  return normalizeCampaign(data);
}

export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
  // Si se actualiza como activa, desactivamos las demás
  if (updates.is_active) {
    await supabase
      .from('campaigns')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .neq('id', id);
  }

  const bannerImages = (updates.banner_images && updates.banner_images.length > 0)
    ? updates.banner_images.slice(0, 3)
    : (updates.images && updates.images.length > 0 ? updates.images.slice(0, 3) : undefined);

  const isCarousel = typeof updates.is_carousel === 'boolean'
    ? updates.is_carousel
    : (updates.layout_type ? updates.layout_type === 'carousel' : undefined);

  const payload: any = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (bannerImages) {
    payload.banner_images = bannerImages;
    payload.images = bannerImages;
    if (!payload.banner_url && bannerImages.length > 0) {
      payload.banner_url = bannerImages[0];
    }
  }

  if (typeof isCarousel === 'boolean') {
    payload.is_carousel = isCarousel;
    payload.layout_type = isCarousel ? 'carousel' : 'banner';
  }

  let { data, error } = await supabase
    .from('campaigns')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  // Si la tabla no tiene columnas banner_images o is_carousel todavía
  if (error && error.code === 'PGRST204') {
    const { banner_images, is_carousel, ...fallbackPayload } = payload;
    const retry = await supabase
      .from('campaigns')
      .update(fallbackPayload)
      .eq('id', id)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  return normalizeCampaign(data);
}

export async function toggleCampaignStatus(id: string, isActive: boolean): Promise<boolean> {
  // Si activamos esta campaña, desactivamos las demás para que la landing refleje de inmediato la activa
  if (isActive) {
    await supabase
      .from('campaigns')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .neq('id', id);
  }

  const { error } = await supabase
    .from('campaigns')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error actualizando estado de campaña:', error);
    throw error;
  }
  return true;
}

export async function deleteCampaign(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
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
