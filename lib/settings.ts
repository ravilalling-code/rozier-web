import { supabase } from '@/lib/supabase';
import { StoreSettings } from '@/lib/types';

export const DEFAULT_SETTINGS: StoreSettings = {
  id: 1,
  facebook_url: 'https://facebook.com',
  instagram_url: 'https://instagram.com',
  tiktok_url: 'https://tiktok.com',
  whatsapp_number: '51924257784',
  logo_url: '/images/logo.jpg',
  yape_qr_url: '/images/qr-yape.png',
};

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_SETTINGS;
    }

    return {
      id: data.id || 1,
      facebook_url: data.facebook_url || '',
      instagram_url: data.instagram_url || '',
      tiktok_url: data.tiktok_url || '',
      whatsapp_number: data.whatsapp_number || '51924257784',
      logo_url: data.logo_url || '/images/logo.jpg',
      yape_qr_url: data.yape_qr_url || '/images/qr-yape.png',
    };
  } catch (err) {
    console.error('Error obteniendo store_settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export async function updateStoreSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .update({
        facebook_url: settings.facebook_url ?? '',
        instagram_url: settings.instagram_url ?? '',
        tiktok_url: settings.tiktok_url ?? '',
        whatsapp_number: settings.whatsapp_number ?? '51924257784',
        logo_url: settings.logo_url ?? '/images/logo.jpg',
        yape_qr_url: settings.yape_qr_url ?? '/images/qr-yape.png',
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando store_settings:', error);
      throw error;
    }

    return data as StoreSettings;
  } catch (err) {
    console.error('Error guardando store_settings:', err);
    throw err;
  }
}
