const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envFile = path.resolve(process.cwd(), '.env.local');
let env = {};
if (fs.existsSync(envFile)) {
  env = Object.fromEntries(
    fs.readFileSync(envFile, 'utf8')
      .split('\n')
      .filter(l => l.includes('=') && !l.trim().startsWith('#'))
      .map(l => {
        const idx = l.indexOf('=');
        const k = l.slice(0, idx).trim();
        const v = l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        return [k, v];
      })
  );
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Falta NEXT_PUBLIC_SUPABASE_URL o API Key en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const REVIEWS = [
  { client_name: 'Sofía Mendívil', district: 'Miraflores', rating: 5, image_url: '/images/clientes/1.jpg', order_index: 1, is_active: true },
  { client_name: 'Carlos Villarán', district: 'San Isidro', rating: 5, image_url: '/images/clientes/2.jpg', order_index: 2, is_active: true },
  { client_name: 'Valeria Reátegui', district: 'Santiago de Surco', rating: 5, image_url: '/images/clientes/3.jpg', order_index: 3, is_active: true },
  { client_name: 'Diego Zegarra', district: 'Barranco', rating: 5, image_url: '/images/clientes/4.jpg', order_index: 4, is_active: true },
  { client_name: 'Andrea Thorne', district: 'San Borja', rating: 5, image_url: '/images/clientes/5.jpg', order_index: 5, is_active: true },
  { client_name: 'Mateo Benavides', district: 'La Molina', rating: 5, image_url: '/images/clientes/6.jpg', order_index: 6, is_active: true },
  { client_name: 'Lucía Palacios', district: 'Jesús María', rating: 5, image_url: '/images/clientes/7.jpg', order_index: 7, is_active: true },
  { client_name: 'Gonzalo Barreto', district: 'Magdalena del Mar', rating: 5, image_url: '/images/clientes/8.jpg', order_index: 8, is_active: true },
  { client_name: 'Camila Noriega', district: 'Pueblo Libre', rating: 5, image_url: '/images/clientes/9.jpg', order_index: 9, is_active: true },
  { client_name: 'Rodrigo Castañeda', district: 'San Miguel', rating: 5, image_url: '/images/clientes/10.jpg', order_index: 10, is_active: true },
  { client_name: 'Jimena Althaus', district: 'Lince', rating: 5, image_url: '/images/clientes/11.jpg', order_index: 11, is_active: true },
  { client_name: 'Fernando Bryce', district: 'Surquillo', rating: 5, image_url: '/images/clientes/12.jpg', order_index: 12, is_active: true },
  { client_name: 'Mariana Ugarte', district: 'Chorrillos', rating: 5, image_url: '/images/clientes/13.jpg', order_index: 13, is_active: true },
  { client_name: 'Sebastián De La Cuba', district: 'San Isidro', rating: 5, image_url: '/images/clientes/14.jpg', order_index: 14, is_active: true },
  { client_name: 'Alessandra Pardo', district: 'Miraflores', rating: 5, image_url: '/images/clientes/15.jpg', order_index: 15, is_active: true },
  { client_name: 'Joaquín Moncloa', district: 'Santiago de Surco', rating: 5, image_url: '/images/clientes/16.jpg', order_index: 16, is_active: true },
  { client_name: 'Fiorella Carrillo', district: 'San Borja', rating: 5, image_url: '/images/clientes/17.jpg', order_index: 17, is_active: true },
  { client_name: 'Álvaro Echecopar', district: 'La Molina', rating: 5, image_url: '/images/clientes/18.jpg', order_index: 18, is_active: true },
  { client_name: 'Natalia Montero', district: 'Barranco', rating: 5, image_url: '/images/clientes/19.jpg', order_index: 19, is_active: true },
];

async function seed() {
  console.log('🔍 Comprobando tabla public.client_reviews en Supabase...');
  const { data: existing, error: selectError } = await supabase
    .from('client_reviews')
    .select('id, client_name, image_url')
    .limit(5);

  if (selectError) {
    console.error('❌ Error consultando client_reviews:', selectError.message);
    printSqlSnippet();
    return;
  }

  console.log(`📊 Filas existentes actualmente: ${existing ? existing.length : 0}`);

  if (existing && existing.length >= 15) {
    console.log('✅ client_reviews ya contiene suficientes testimonios.');
    return;
  }

  console.log('🌱 Insertando las 19 reseñas fotográficas reales...');
  const { data: inserted, error: insertError } = await supabase
    .from('client_reviews')
    .insert(REVIEWS)
    .select();

  if (insertError) {
    console.error('⚠️ Error al insertar mediante anon key (posible restricción RLS):', insertError.message);
    printSqlSnippet();
  } else {
    console.log(`🎉 ¡Éxito! Se insertaron ${inserted?.length || REVIEWS.length} reseñas en Supabase.`);
  }
}

function printSqlSnippet() {
  console.log('\n========================================');
  console.log('📋 SQL Alternativo para Supabase SQL Editor:');
  console.log('========================================');
  const values = REVIEWS.map(r => 
    `('${r.client_name.replace(/'/g, "''")}', '${r.image_url}', '${r.district.replace(/'/g, "''")}', ${r.rating}, ${r.order_index}, ${r.is_active})`
  ).join(',\n  ');
  console.log(`
INSERT INTO public.client_reviews (client_name, image_url, district, rating, order_index, is_active)
VALUES
  ${values}
ON CONFLICT DO NOTHING;
  `);
  console.log('========================================\n');
}

seed();
