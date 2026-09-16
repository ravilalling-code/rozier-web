import { supabase } from '@/lib/supabase';

export interface ClientReview {
  id: string;
  client_name?: string;
  image_url: string;
  photo_url?: string;
  district?: string;
  rating?: number;
  comment?: string;
  testimonial?: string;
  occasion?: string;
  order_index: number;
  is_active: boolean;
  created_at?: string;
}

export const DEFAULT_CLIENT_REVIEWS: ClientReview[] = [
  {
    id: 'client-photo-1',
    client_name: 'Sofía Mendívil',
    district: 'Miraflores',
    rating: 5,
    image_url: '/images/clientes/1.jpg',
    photo_url: '/images/clientes/1.jpg',
    comment: 'El aroma y la frescura de las rosas superaron todo lo imaginado. Mi novio quedó sin palabras con la sorpresa.',
    testimonial: 'El aroma y la frescura de las rosas superaron todo lo imaginado. Mi novio quedó sin palabras con la sorpresa.',
    occasion: 'Aniversario de Novios',
    order_index: 1,
    is_active: true,
  },
  {
    id: 'client-photo-2',
    client_name: 'Carlos Villarán',
    district: 'San Isidro',
    rating: 5,
    image_url: '/images/clientes/2.jpg',
    photo_url: '/images/clientes/2.jpg',
    comment: 'Pedí el ramo para nuestro aniversario. La presentación de lujo y la puntualidad fueron impecables.',
    testimonial: 'Pedí el ramo para nuestro aniversario. La presentación de lujo y la puntualidad fueron impecables.',
    occasion: 'Aniversario de Bodas',
    order_index: 2,
    is_active: true,
  },
  {
    id: 'client-photo-3',
    client_name: 'Valeria Reátegui',
    district: 'Santiago de Surco',
    rating: 5,
    image_url: '/images/clientes/3.jpg',
    photo_url: '/images/clientes/3.jpg',
    comment: 'Nunca había visto tulipanes con tanta vida. La caja y los acabados de ROZIER son puro lujo y distinción.',
    testimonial: 'Nunca había visto tulipanes con tanta vida. La caja y los acabados de ROZIER son puro lujo y distinción.',
    occasion: 'Cumpleaños Sorpresa',
    order_index: 3,
    is_active: true,
  },
  {
    id: 'client-photo-4',
    client_name: 'Diego Zegarra',
    district: 'Barranco',
    rating: 5,
    image_url: '/images/clientes/4.jpg',
    photo_url: '/images/clientes/4.jpg',
    comment: 'Le envié el detalle a su oficina y todos quedaron maravillados. Fue la envidia sana de todo el piso.',
    testimonial: 'Le envié el detalle a su oficina y todos quedaron maravillados. Fue la envidia sana de todo el piso.',
    occasion: 'Detalle Romántico',
    order_index: 4,
    is_active: true,
  },
  {
    id: 'client-photo-5',
    client_name: 'Andrea Thorne',
    district: 'San Borja',
    rating: 5,
    image_url: '/images/clientes/5.jpg',
    photo_url: '/images/clientes/5.jpg',
    comment: 'La dedicatoria y los bombones artesanales hicieron del cumpleaños de mi mamá un momento inolvidable.',
    testimonial: 'La dedicatoria y los bombones artesanales hicieron del cumpleaños de mi mamá un momento inolvidable.',
    occasion: 'Cumpleaños de Mamá',
    order_index: 5,
    is_active: true,
  },
  {
    id: 'client-photo-6',
    client_name: 'Mateo Benavides',
    district: 'La Molina',
    rating: 5,
    image_url: '/images/clientes/6.jpg',
    photo_url: '/images/clientes/6.jpg',
    comment: 'Atención de primera. El arreglo de flores amarillas llegó radiante, fresco y con un color dorado espectacular.',
    testimonial: 'Atención de primera. El arreglo de flores amarillas llegó radiante, fresco y con un color dorado espectacular.',
    occasion: 'Flores Amarillas',
    order_index: 6,
    is_active: true,
  },
  {
    id: 'client-photo-7',
    client_name: 'Lucía Palacios',
    district: 'Jesús María',
    rating: 5,
    image_url: '/images/clientes/7.jpg',
    photo_url: '/images/clientes/7.jpg',
    comment: 'La calidad floral es insuperable. Permanecieron intactas y hermosas por más de dos semanas en mi sala.',
    testimonial: 'La calidad floral es insuperable. Permanecieron intactas y hermosas por más de dos semanas en mi sala.',
    occasion: 'Agradecimiento',
    order_index: 7,
    is_active: true,
  },
  {
    id: 'client-photo-8',
    client_name: 'Gonzalo Barreto',
    district: 'Magdalena del Mar',
    rating: 5,
    image_url: '/images/clientes/8.jpg',
    photo_url: '/images/clientes/8.jpg',
    comment: 'Excelente servicio express. Entregaron en el momento justo y el lazo satinado le dio un toque único.',
    testimonial: 'Excelente servicio express. Entregaron en el momento justo y el lazo satinado le dio un toque único.',
    occasion: 'Reconciliación',
    order_index: 8,
    is_active: true,
  },
  {
    id: 'client-photo-9',
    client_name: 'Camila Noriega',
    district: 'Pueblo Libre',
    rating: 5,
    image_url: '/images/clientes/9.jpg',
    photo_url: '/images/clientes/9.jpg',
    comment: 'El detalle de la fragancia exclusiva y el envoltorio demuestran el cuidado al milímetro en cada entrega.',
    testimonial: 'El detalle de la fragancia exclusiva y el envoltorio demuestran el cuidado al milímetro en cada entrega.',
    occasion: 'Graduación',
    order_index: 9,
    is_active: true,
  },
  {
    id: 'client-photo-10',
    client_name: 'Rodrigo Castañeda',
    district: 'San Miguel',
    rating: 5,
    image_url: '/images/clientes/10.jpg',
    photo_url: '/images/clientes/10.jpg',
    comment: 'Una experiencia sensorial de primer nivel. El follaje selecto y las rosas rojas importadas me fascinaron.',
    testimonial: 'Una experiencia sensorial de primer nivel. El follaje selecto y las rosas rojas importadas me fascinaron.',
    occasion: 'Amor & Pasión',
    order_index: 10,
    is_active: true,
  },
  {
    id: 'client-photo-11',
    client_name: 'Jimena Althaus',
    district: 'Lince',
    rating: 5,
    image_url: '/images/clientes/11.jpg',
    photo_url: '/images/clientes/11.jpg',
    comment: 'Elegí el arreglo para una propuesta de noviazgo. El impacto visual y la elegancia sellaron el sí inmediato.',
    testimonial: 'Elegí el arreglo para una propuesta de noviazgo. El impacto visual y la elegancia sellaron el sí inmediato.',
    occasion: 'Propuesta de Noviazgo',
    order_index: 11,
    is_active: true,
  },
  {
    id: 'client-photo-12',
    client_name: 'Fernando Bryce',
    district: 'Surquillo',
    rating: 5,
    image_url: '/images/clientes/12.jpg',
    photo_url: '/images/clientes/12.jpg',
    comment: 'La mejor casa floral de Lima sin dudarlo. Cada botón de flor abre de forma armónica y simétrica.',
    testimonial: 'La mejor casa floral de Lima sin dudarlo. Cada botón de flor abre de forma armónica y simétrica.',
    occasion: 'Aniversario',
    order_index: 12,
    is_active: true,
  },
  {
    id: 'client-photo-13',
    client_name: 'Mariana Ugarte',
    district: 'Chorrillos',
    rating: 5,
    image_url: '/images/clientes/13.jpg',
    photo_url: '/images/clientes/13.jpg',
    comment: 'Sorprendí a mi socia por el cierre de proyecto y el nivel corporativo del detalle superó las expectativas.',
    testimonial: 'Sorprendí a mi socia por el cierre de proyecto y el nivel corporativo del detalle superó las expectativas.',
    occasion: 'Éxito Profesional',
    order_index: 13,
    is_active: true,
  },
  {
    id: 'client-photo-14',
    client_name: 'Alejandro Silva',
    district: 'San Isidro',
    rating: 5,
    image_url: '/images/clientes/14.jpg',
    photo_url: '/images/clientes/14.jpg',
    comment: 'Puntualidad suiza en la entrega. Ver la felicidad de mi esposa al recibir su ramo favorito no tiene precio.',
    testimonial: 'Puntualidad suiza en la entrega. Ver la felicidad de mi esposa al recibir su ramo favorito no tiene precio.',
    occasion: 'Cumpleaños',
    order_index: 14,
    is_active: true,
  },
  {
    id: 'client-photo-15',
    client_name: 'Claudia De La Puente',
    district: 'Miraflores',
    rating: 5,
    image_url: '/images/clientes/15.jpg',
    photo_url: '/images/clientes/15.jpg',
    comment: 'El arreglo floral fue el protagonista de nuestra cena. Los colores pasteles transmiten una paz única.',
    testimonial: 'El arreglo floral fue el protagonista de nuestra cena. Los colores pasteles transmiten una paz única.',
    occasion: 'Cena Romántica',
    order_index: 15,
    is_active: true,
  },
  {
    id: 'client-photo-16',
    client_name: 'Sebastián Rivas',
    district: 'Santiago de Surco',
    rating: 5,
    image_url: '/images/clientes/16.jpg',
    photo_url: '/images/clientes/16.jpg',
    comment: 'El trato por WhatsApp fue cálido y asesorado al 100%. El diseño final superó el catálogo.',
    testimonial: 'El trato por WhatsApp fue cálido y asesorado al 100%. El diseño final superó el catálogo.',
    occasion: 'Pedida de Mano',
    order_index: 16,
    is_active: true,
  },
  {
    id: 'client-photo-17',
    client_name: 'Fiorella Gálvez',
    district: 'San Borja',
    rating: 5,
    image_url: '/images/clientes/17.jpg',
    photo_url: '/images/clientes/17.jpg',
    comment: 'Un regalo que de verdad genera el efecto ¡Wooow!. Se siente el amor y el arte que ponen en cada flor.',
    testimonial: 'Un regalo que de verdad genera el efecto ¡Wooow!. Se siente el amor y el arte que ponen en cada flor.',
    occasion: 'Día Especial',
    order_index: 17,
    is_active: true,
  },
  {
    id: 'client-photo-18',
    client_name: 'Renato Carrillo',
    district: 'La Molina',
    rating: 5,
    image_url: '/images/clientes/18.jpg',
    photo_url: '/images/clientes/18.jpg',
    comment: 'El empaque cilíndrico de lujo y las trufas finas complementaron el obsequio a la perfección.',
    testimonial: 'El empaque cilíndrico de lujo y las trufas finas complementaron el obsequio a la perfección.',
    occasion: 'Aniversario de Pareja',
    order_index: 18,
    is_active: true,
  },
  {
    id: 'client-photo-19',
    client_name: 'Natalia Montero',
    district: 'Barranco',
    rating: 5,
    image_url: '/images/clientes/19.jpg',
    photo_url: '/images/clientes/19.jpg',
    comment: 'Flores de alta costura que tocan el corazón. Definitivamente ROZIER es mi casa de confianza.',
    testimonial: 'Flores de alta costura que tocan el corazón. Definitivamente ROZIER es mi casa de confianza.',
    occasion: 'Celebración Familiar',
    order_index: 19,
    is_active: true,
  },
];

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
      return (data as Record<string, unknown>[]).map((row) => {
        const rowOrderIndex = typeof row.order_index === 'number' ? row.order_index : undefined;
        const rowImageUrl = typeof row.image_url === 'string' ? row.image_url : undefined;
        const rowClientName = typeof row.client_name === 'string' ? row.client_name : undefined;

        const defaultMatch = DEFAULT_CLIENT_REVIEWS.find(
          (d) =>
            d.order_index === rowOrderIndex ||
            d.image_url === rowImageUrl ||
            d.client_name?.toLowerCase() === rowClientName?.toLowerCase()
        );

        return {
          id: String(row.id),
          client_name: (row.client_name as string) || defaultMatch?.client_name || 'Cliente Verificado',
          image_url: (row.image_url as string) || defaultMatch?.image_url || '/images/clientes/1.jpg',
          photo_url: (row.image_url as string) || defaultMatch?.photo_url || '/images/clientes/1.jpg',
          district: (row.district as string) || defaultMatch?.district || 'Lima',
          rating: typeof row.rating === 'number' ? Number(row.rating) : (defaultMatch?.rating || 5),
          comment: (row.comment as string) || defaultMatch?.comment || defaultMatch?.testimonial || 'Excelente experiencia floral.',
          testimonial: (row.testimonial as string) || (row.comment as string) || defaultMatch?.testimonial || defaultMatch?.comment || 'Excelente experiencia floral.',
          occasion: (row.occasion as string) || defaultMatch?.occasion || 'Ocasión Especial',
          order_index: (row.order_index as number) ?? defaultMatch?.order_index ?? 0,
          is_active: (row.is_active as boolean) ?? true,
          created_at: row.created_at as string | undefined,
        };
      }) as ClientReview[];
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
      return (data as Record<string, unknown>[]).map((row) => {
        const rowOrderIndex = typeof row.order_index === 'number' ? row.order_index : undefined;
        const rowImageUrl = typeof row.image_url === 'string' ? row.image_url : undefined;
        const rowClientName = typeof row.client_name === 'string' ? row.client_name : undefined;

        const defaultMatch = DEFAULT_CLIENT_REVIEWS.find(
          (d) =>
            d.order_index === rowOrderIndex ||
            d.image_url === rowImageUrl ||
            d.client_name?.toLowerCase() === rowClientName?.toLowerCase()
        );

        return {
          id: String(row.id),
          client_name: (row.client_name as string) || defaultMatch?.client_name || 'Cliente Verificado',
          image_url: (row.image_url as string) || defaultMatch?.image_url || '/images/clientes/1.jpg',
          photo_url: (row.image_url as string) || defaultMatch?.photo_url || '/images/clientes/1.jpg',
          district: (row.district as string) || defaultMatch?.district || 'Lima',
          rating: typeof row.rating === 'number' ? Number(row.rating) : (defaultMatch?.rating || 5),
          comment: (row.comment as string) || defaultMatch?.comment || defaultMatch?.testimonial || 'Excelente experiencia floral.',
          testimonial: (row.testimonial as string) || (row.comment as string) || defaultMatch?.testimonial || defaultMatch?.comment || 'Excelente experiencia floral.',
          occasion: (row.occasion as string) || defaultMatch?.occasion || 'Ocasión Especial',
          order_index: (row.order_index as number) ?? defaultMatch?.order_index ?? 0,
          is_active: (row.is_active as boolean) ?? true,
          created_at: row.created_at as string | undefined,
        };
      }) as ClientReview[];
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
