const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Cargar variables de entorno desde .env.local
const envPaths = [
  path.join(__dirname, '../.env.local'),
  path.join(__dirname, '.env.local'),
  path.join(__dirname, '../../petalia-web/.env.local'),
];

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = trimmed.split('=')[1].trim();
      }
      if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        supabaseAnonKey = trimmed.split('=')[1].trim();
      }
    }
    if (supabaseUrl && supabaseAnonKey) break;
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Faltan las variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PRODUCTS_DIR = 'D:\\petalia-app\\products';

// Configuración de categorías: nombres correlativos y precios base
const CATEGORY_CONFIG = {
  ramos: {
    titlePrefix: 'Ramo Floral',
    price: 85,
  },
  boxes: {
    titlePrefix: 'Box Rosas',
    price: 110,
  },
  girasoles: {
    titlePrefix: 'Arreglo de Girasoles',
    price: 75,
  },
  detalles: {
    titlePrefix: 'Detalle Especial',
    price: 45,
  },
  condolencias: {
    titlePrefix: 'Arreglo de Condolencias',
    price: 95,
  },
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
}

async function uploadAndSeed() {
  console.log('🌸 ========================================================');
  console.log('🌸 INICIANDO SUBIDA Y REGISTRO DE ARREGLOS EN SUPABASE');
  console.log('🌸 Directorio origen:', PRODUCTS_DIR);
  console.log('🌸 ========================================================\n');

  if (!fs.existsSync(PRODUCTS_DIR)) {
    console.error(`❌ Error: El directorio ${PRODUCTS_DIR} no existe.`);
    process.exit(1);
  }

  // Leer subcarpetas (categorías)
  const entries = fs.readdirSync(PRODUCTS_DIR, { withFileTypes: true });
  const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  if (subdirs.length === 0) {
    console.error(`❌ No se encontraron subcarpetas de categorías en ${PRODUCTS_DIR}`);
    process.exit(1);
  }

  console.log(`📁 Categorías encontradas: ${subdirs.join(', ')}\n`);

  let totalUploaded = 0;
  let totalSeeded = 0;
  let totalErrors = 0;

  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  for (const category of subdirs) {
    const catDir = path.join(PRODUCTS_DIR, category);
    const files = fs
      .readdirSync(catDir)
      .filter((f) => validExtensions.includes(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const config = CATEGORY_CONFIG[category.toLowerCase()] || {
      titlePrefix: `${category.charAt(0).toUpperCase() + category.slice(1)} Floral`,
      price: 70,
    };

    console.log(`\n📦 --- Procesando Categoría: "${category}" (${files.length} fotos) ---`);
    console.log(`💰 Precio base: S/ ${config.price.toFixed(2)} | Prefijo: "${config.titlePrefix}"\n`);

    let itemNumber = 1;

    for (const file of files) {
      const filePath = path.join(catDir, file);
      const storagePath = `${category}/${file}`;
      const mimeType = getMimeType(filePath);

      try {
        // 1. Leer archivo
        const fileBuffer = fs.readFileSync(filePath);

        // 2. Subir a Supabase Storage bucket 'products'
        process.stdout.write(`⏳ [${itemNumber}/${files.length}] Subiendo ${storagePath}... `);

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(storagePath, fileBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Error de Storage: ${uploadError.message}`);
        }
        totalUploaded++;

        // 3. Obtener URL pública permanente
        const { data: publicUrlData } = supabase.storage
          .from('products')
          .getPublicUrl(storagePath);

        const imageUrl = publicUrlData.publicUrl;

        // 4. Nombre correlativo descriptivo
        const productName = `${config.titlePrefix} #${itemNumber}`;

        // 5. Verificar si ya existe en public.products para evitar duplicados
        const { data: existingProd, error: checkErr } = await supabase
          .from('products')
          .select('id')
          .eq('image_url', imageUrl)
          .maybeSingle();

        if (existingProd) {
          // Actualizar datos si ya existía
          await supabase
            .from('products')
            .update({
              name: productName,
              category: category.toLowerCase(),
              price: config.price,
              description: 'Arreglo floral elaborado con flores frescas y acabados de primera.',
              is_active: true,
            })
            .eq('id', existingProd.id);

          console.log(`✅ [Actualizado en DB: ${productName}]`);
        } else {
          // Insertar nuevo registro
          const { error: insertError } = await supabase
            .from('products')
            .insert([
              {
                name: productName,
                category: category.toLowerCase(),
                price: config.price,
                promotional_price: null,
                image_url: imageUrl,
                description: 'Arreglo floral elaborado con flores frescas y acabados de primera.',
                is_active: true,
              },
            ]);

          if (insertError) {
            throw new Error(`Error de DB insert: ${insertError.message}`);
          }

          console.log(`✅ [Registrado: ${productName}]`);
        }

        totalSeeded++;
        itemNumber++;
      } catch (err) {
        totalErrors++;
        console.log(`❌ ERROR: ${err.message}`);
      }
    }
  }

  console.log('\n========================================================');
  console.log('🎉 PROCESO COMPLETADO EXITOSAMENTE');
  console.log('========================================================');
  console.log(`📸 Total fotos subidas a Storage: ${totalUploaded}`);
  console.log(`🌺 Total arreglos registrados en DB: ${totalSeeded}`);
  console.log(`⚠️ Errores encontrados: ${totalErrors}`);
  console.log('========================================================\n');
}

uploadAndSeed().catch((err) => {
  console.error('❌ Error fatal en el proceso:', err);
  process.exit(1);
});
