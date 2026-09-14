import { supabase } from '@/lib/supabase';
import { Campaign } from '@/lib/types';

export const DEFAULT_CAMPAIGN: Campaign = {
  id: 'active_campaign',
  name: 'Flores Amarillas',
  title: 'Día de las Flores Amarillas',
  subtitle: 'Arreglos florales radiantes en tonos dorados y girasoles seleccionados.',
  badge_text: 'Campaña Especial',
  layout_type: 'carousel',
  images: [
    'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=80',
  ],
  banner_url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=900&q=80',
  cta_text: 'Explorar Flores Amarillas',
  cta_link: 'girasoles',
  is_active: true,
};

export async function getAllCampaigns(): Promise<Campaign[]> {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      return data as Campaign[];
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
      if (data) return data as Campaign;
      return null;
    }
  } catch (err) {
    console.warn('Advertencia consultando campaña activa en Supabase:', err);
  }
  return null;
}

export async function createCampaign(campaign: Omit<Campaign, 'id'> & { id?: string }): Promise<Campaign> {
  const id = campaign.id || `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const bannerUrl = campaign.banner_url || (campaign.images && campaign.images[0]) || null;
  const images = (campaign.images && campaign.images.length > 0)
    ? campaign.images
    : (bannerUrl ? [bannerUrl] : []);

  const payload = {
    ...campaign,
    id,
    name: campaign.name || campaign.title,
    banner_url: bannerUrl,
    images,
    updated_at: new Date().toISOString(),
  };

  // Si se crea como activa, desactivamos las demás
  if (campaign.is_active) {
    await supabase
      .from('campaigns')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .neq('id', id);
  }

  const { data, error } = await supabase
    .from('campaigns')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as Campaign;
}

export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
  // Si se actualiza como activa, desactivamos las demás
  if (updates.is_active) {
    await supabase
      .from('campaigns')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .neq('id', id);
  }

  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('campaigns')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Campaign;
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
