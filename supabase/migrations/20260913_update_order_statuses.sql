-- =========================================================================
-- MIGRACIÓN DE ESTADOS DE PEDIDOS Y CONFIGURACIÓN PARA PETALIA
-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase
-- =========================================================================

-- 1. Actualizar el CHECK CONSTRAINT de la columna 'status' en public.orders
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN (
    'pendiente',
    'confirmado',
    'en_preparacion',
    'en_taller',
    'en_despacho',
    'entregado',
    'cancelado'
  ));

-- 2. Asegurar que la columna tracking_code tenga índice único
CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_code_idx 
  ON public.orders (tracking_code) 
  WHERE tracking_code IS NOT NULL;

-- 3. Crear o verificar la tabla store_settings para las redes sociales y contacto
CREATE TABLE IF NOT EXISTS public.store_settings (
  id SERIAL PRIMARY KEY,
  facebook_url TEXT DEFAULT '',
  instagram_url TEXT DEFAULT '',
  tiktok_url TEXT DEFAULT '',
  whatsapp_number TEXT DEFAULT '51924257784',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar registro base si no existe
INSERT INTO public.store_settings (id, facebook_url, instagram_url, tiktok_url, whatsapp_number)
VALUES (1, '', '', '', '51924257784')
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS y políticas públicas para store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de store_settings" ON public.store_settings;
CREATE POLICY "Permitir lectura publica de store_settings" 
  ON public.store_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir actualizacion de store_settings" ON public.store_settings;
CREATE POLICY "Permitir actualizacion de store_settings" 
  ON public.store_settings FOR ALL USING (true);
