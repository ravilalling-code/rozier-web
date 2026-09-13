import { supabase } from '@/lib/supabase';
import { Category } from '@/lib/types';

/**
 * Genera un slug seguro a partir del nombre de la categoría
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/[^\w\-]+/g, '') // Elimina caracteres no alfanuméricos
    .replace(/\-\-+/g, '-') // Múltiples guiones a uno
    .replace(/^-+/, '') // Quita guiones iniciales
    .replace(/-+$/, ''); // Quita guiones finales
}

/**
 * Obtiene todas las categorías desde la tabla public.categories en Supabase
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error al consultar categories en Supabase:', error);
      return [];
    }

    return (data as Category[]) || [];
  } catch (err) {
    console.error('Error inesperado en getCategories:', err);
    return [];
  }
}

/**
 * Inserta una nueva categoría en la tabla public.categories en Supabase
 */
export async function addCategory(name: string, customSlug?: string): Promise<Category> {
  const cleanName = name.trim();
  const slug = customSlug?.trim() || slugify(cleanName);

  const { data, error } = await supabase
    .from('categories')
    .insert([{ name: cleanName, slug }])
    .select()
    .single();

  if (error) {
    console.error('Error al insertar categoría en Supabase:', error);
    throw error;
  }

  return data as Category;
}

/**
 * Actualiza una categoría existente en la tabla public.categories en Supabase
 * Si el nombre o el slug cambian, opcionalmente actualiza los productos asociados.
 */
export async function updateCategory(
  id: string,
  name: string,
  customSlug?: string,
  oldSlug?: string
): Promise<Category> {
  const cleanName = name.trim();
  const slug = customSlug?.trim() || slugify(cleanName);

  const { data, error } = await supabase
    .from('categories')
    .update({ name: cleanName, slug })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar categoría en Supabase:', error);
    throw error;
  }

  // Si el slug cambió y se proporcionó el slug anterior, actualizar los productos asociados
  if (oldSlug && oldSlug.toLowerCase() !== slug.toLowerCase()) {
    try {
      const { error: prodErr } = await supabase
        .from('products')
        .update({ category: slug })
        .eq('category', oldSlug.toLowerCase());

      if (prodErr) {
        console.warn('Advertencia al migrar productos a nuevo slug de categoría:', prodErr);
      }
    } catch (migrateErr) {
      console.warn('Excepción al migrar categoría en productos:', migrateErr);
    }
  }

  return data as Category;
}

/**
 * Elimina una categoría por ID en la tabla public.categories en Supabase
 */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error al eliminar categoría en Supabase:', error);
    throw error;
  }
}
