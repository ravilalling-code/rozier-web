const fs = require('fs');
const path = require('path');

// 1. Obtener API KEY de GEMINI
let apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  const envPaths = [
    path.join(__dirname, '../.env.local'),
    path.join(__dirname, '.env.local'),
    path.join(__dirname, '../../petalia-web/.env.local'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('GEMINI_API_KEY=')) {
          apiKey = line.trim().split('=')[1].trim();
          break;
        }
      }
      if (apiKey) break;
    }
  }
}

if (!apiKey) {
  console.error('❌ Error: No se encontró la variable GEMINI_API_KEY en el entorno ni en .env.local');
  process.exit(1);
}

// 2. Cargar SDK de Google GenAI
let GoogleGenAI;
try {
  ({ GoogleGenAI } = require('@google/genai'));
} catch (e) {
  try {
    ({ GoogleGenAI } = require(path.join(__dirname, '../node_modules/@google/genai')));
  } catch (e2) {
    console.error('❌ Error cargando @google/genai:', e2.message);
    process.exit(1);
  }
}

const ai = new GoogleGenAI({ apiKey });

// Modelos a probar (prioridad: gemini-2.5-flash según requerimiento, con fallback automático)
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

const VALID_CATEGORIES = ['ramos', 'boxes', 'girasoles', 'detalles', 'condolencias', 'otros'];
const PRODUCTS_DIR = 'D:\\petalia-app\\products';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

async function classifyImageWithRetry(filePath, preferredModel) {
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType = getMimeType(filePath);
  const base64Data = fileBuffer.toString('base64');

  const prompt =
    "Clasifica este arreglo floral en una sola categoría: 'ramos', 'boxes', 'girasoles', 'detalles', 'condolencias' u 'otros'. Responde ÚNICAMENTE con el nombre de la categoría en minúsculas, sin puntuación ni texto adicional.";

  const modelsToTry = [
    preferredModel,
    ...CANDIDATE_MODELS.filter((m) => m !== preferredModel),
  ];

  for (const modelName of modelsToTry) {
    let retries = 3;
    while (retries > 0) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            prompt,
          ],
        });

        const rawText = (response.text || '').trim().toLowerCase();
        // Limpiar comillas, puntos y espacios extras
        const clean = rawText.replace(/['"`\.\*\n]/g, '').trim();

        // Extraer la categoría si vino con texto adicional
        for (const cat of VALID_CATEGORIES) {
          if (clean === cat || clean.includes(cat)) {
            return { category: cat, modelUsed: modelName };
          }
        }

        return { category: 'otros', modelUsed: modelName };
      } catch (err) {
        const errMsg = err?.message || String(err);

        // Si el modelo no existe o fue descontinuado (404), pasar al siguiente modelo
        if (errMsg.includes('404') || errMsg.includes('NOT_FOUND') || errMsg.includes('no longer available')) {
          break;
        }

        // Si es rate limit / quota (429), esperar y reintentar
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          console.warn(`\n⏳ Cuota temporal alcanzada en ${modelName}. Esperando 12s para reintentar...`);
          await sleep(12000);
          retries--;
          continue;
        }

        // Cualquier otro error, reintentar una vez más
        retries--;
        if (retries > 0) {
          await sleep(2000);
        }
      }
    }
  }

  // Fallback por defecto si no se pudo clasificar
  return { category: 'otros', modelUsed: 'fallback' };
}

async function main() {
  console.log('🌸 ====================================================');
  console.log('🌸 PETALIA - Clasificador Automático de Fotos con IA');
  console.log('🌸 ====================================================\n');

  if (!fs.existsSync(PRODUCTS_DIR)) {
    console.error(`❌ La carpeta ${PRODUCTS_DIR} no existe.`);
    process.exit(1);
  }

  // Listar únicamente archivos de imagen soportados (.jpg, .jpeg, .png, .webp)
  // Ignorando subdirectorios
  const entries = fs.readdirSync(PRODUCTS_DIR, { withFileTypes: true });
  const imageFiles = entries
    .filter((entry) => {
      if (!entry.isFile()) return false;
      const ext = path.extname(entry.name).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    })
    .map((entry) => entry.name);

  const total = imageFiles.length;
  console.log(`📁 Directorio: ${PRODUCTS_DIR}`);
  console.log(`📸 Fotos encontradas para clasificar: ${total}\n`);

  if (total === 0) {
    console.log('✨ No hay fotos pendientes por clasificar en la carpeta raíz.');
    return;
  }

  let activeModel = 'gemini-2.5-flash';
  let processed = 0;
  const stats = {
    ramos: 0,
    boxes: 0,
    girasoles: 0,
    detalles: 0,
    condolencias: 0,
    otros: 0,
  };

  for (let i = 0; i < total; i++) {
    const file = imageFiles[i];
    const filePath = path.join(PRODUCTS_DIR, file);

    try {
      const { category, modelUsed } = await classifyImageWithRetry(filePath, activeModel);
      activeModel = modelUsed; // Mantener el modelo que sí funcionó

      // Asegurar carpeta destino
      const targetDir = path.join(PRODUCTS_DIR, category);
      fs.mkdirSync(targetDir, { recursive: true });

      // Mover archivo
      const destPath = path.join(targetDir, file);
      fs.renameSync(filePath, destPath);

      stats[category] = (stats[category] || 0) + 1;
      processed++;

      // Imprimir avance según formato requerido
      console.log(`[${i + 1}/${total}] Foto '${file}' -> ${category}/`);

      // Pequeña pausa para evitar rate limits
      await sleep(600);
    } catch (err) {
      console.error(`❌ Error procesando '${file}':`, err.message);
    }
  }

  console.log('\n====================================================');
  console.log(`🎉 Clasificación completada con éxito: ${processed}/${total} fotos.`);
  console.log('📊 Resumen por categorías:');
  Object.entries(stats).forEach(([cat, count]) => {
    if (count > 0) {
      console.log(`   • ${cat.padEnd(14)}: ${count} fotos`);
    }
  });
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('❌ Error fatal en organize-photos:', err);
  process.exit(1);
});
