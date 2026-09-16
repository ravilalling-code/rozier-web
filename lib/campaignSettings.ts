import { supabase } from '@/lib/supabase';

export interface CampaignSettings {
  id: number;
  is_active: boolean;
  title: string;
  subtitle: string;
  description: string;
  button_text: string;
  target_date: string;
  selected_product_ids: string[];
  badge_text?: string;
  updated_at?: string;
}

// Fecha por defecto: 5 días desde hoy a las 23:59
const getDefaultTargetDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
};

export const DEFAULT_CAMPAIGN_SETTINGS: CampaignSettings = {
  id: 1,
  is_active: true,
  title: 'Los Top premium de Flores Amarillas',
  subtitle: 'El regalo perfecto que genera Wooow.',
  description: 'Edición limitada de arreglos florales radiantes en tonos dorados y girasoles seleccionados artesanalmente.',
  button_text: 'Ver colección',
  badge_text: 'Campaña Especial',
  target_date: getDefaultTargetDate(),
  selected_product_ids: [],
};

const LOCAL_STORAGE_KEY = 'rozier_campaign_settings';

export function getLocalCampaignSettings(): CampaignSettings {
  if (typeof window === 'undefined') return DEFAULT_CAMPAIGN_SETTINGS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_CAMPAIGN_SETTINGS,
          ...parsed,
        };
      }
    }
  } catch (err) {
    console.warn('Error leyendo rozier_campaign_settings de localStorage:', err);
  }
  return DEFAULT_CAMPAIGN_SETTINGS;
}

export function saveLocalCampaignSettings(settings: CampaignSettings) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
      window.dispatchEvent(
        new CustomEvent('rozier:campaign-settings-updated', { detail: settings })
      );
    } catch (err) {
      console.warn('Error guardando rozier_campaign_settings en localStorage:', err);
    }
  }
}

/**
 * Obtiene la configuración de campaña activa desde Supabase o fallback local
 */
export async function getCampaignSettings(): Promise<CampaignSettings> {
  try {
    const { data, error } = await supabase
      .from('campaign_settings')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const merged: CampaignSettings = {
        ...DEFAULT_CAMPAIGN_SETTINGS,
        ...data,
        selected_product_ids: Array.isArray(data.selected_product_ids)
          ? data.selected_product_ids
          : [],
      };
      saveLocalCampaignSettings(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Error consultando public.campaign_settings en Supabase:', err);
  }

  return getLocalCampaignSettings();
}

/**
 * Actualiza la configuración de campaña activa en Supabase y localmente
 */
export async function updateCampaignSettings(
  updates: Partial<CampaignSettings>
): Promise<CampaignSettings> {
  const current = getLocalCampaignSettings();
  const updated: CampaignSettings = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  try {
    // Intentar update en Supabase
    const { data, error } = await supabase
      .from('campaign_settings')
      .update({
        is_active: updated.is_active,
        title: updated.title,
        subtitle: updated.subtitle,
        description: updated.description,
        button_text: updated.button_text,
        badge_text: updated.badge_text || 'Campaña Especial',
        target_date: updated.target_date,
        selected_product_ids: updated.selected_product_ids,
        updated_at: updated.updated_at,
      })
      .eq('id', updated.id || 1)
      .select()
      .maybeSingle();

    if (!error && data) {
      const finalResult: CampaignSettings = {
        ...updated,
        ...data,
        selected_product_ids: Array.isArray(data.selected_product_ids)
          ? data.selected_product_ids
          : updated.selected_product_ids,
      };
      saveLocalCampaignSettings(finalResult);
      return finalResult;
    }

    // Si la tabla no tenía registros previos, intentar insert
    if (!data) {
      const insertRow = {
        id: updated.id || 1,
        is_active: updated.is_active,
        title: updated.title,
        subtitle: updated.subtitle,
        description: updated.description,
        button_text: updated.button_text,
        badge_text: updated.badge_text || 'Campaña Especial',
        target_date: updated.target_date,
        selected_product_ids: updated.selected_product_ids,
        updated_at: updated.updated_at,
      };

      const insertRes = await supabase
        .from('campaign_settings')
        .insert([insertRow])
        .select()
        .maybeSingle();

      if (!insertRes.error && insertRes.data) {
        const finalResult: CampaignSettings = {
          ...updated,
          ...insertRes.data,
          selected_product_ids: Array.isArray(insertRes.data.selected_product_ids)
            ? insertRes.data.selected_product_ids
            : updated.selected_product_ids,
        };
        saveLocalCampaignSettings(finalResult);
        return finalResult;
      }
    }
  } catch (err) {
    console.warn('Error sincronizando campaign_settings con Supabase:', err);
  }

  // Fallback seguro local siempre garantizado
  saveLocalCampaignSettings(updated);
  return updated;
}
