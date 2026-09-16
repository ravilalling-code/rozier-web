import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { supabase } from '@/lib/supabase';
import { formatLocalDate, generateTrackingCode } from '@/lib/format';
import { DEFAULT_WHATSAPP_NUMBER, createWhatsAppLink } from '@/lib/whatsapp';

const WHATSAPP_NUMBER = DEFAULT_WHATSAPP_NUMBER;

/**
 * Normaliza cualquier expresión de fecha a un formato válido SQL DATE (YYYY-MM-DD)
 */
function parseToSqlDate(rawDate?: string): string {
  const now = new Date();
  if (!rawDate) {
    return now.toISOString().split('T')[0];
  }

  const clean = rawDate.trim().toLowerCase();

  if (clean.includes('hoy') || clean.includes('today')) {
    return now.toISOString().split('T')[0];
  }

  if (clean.includes('manana') || clean.includes('mañana') || clean.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  if (clean.includes('pasado')) {
    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter.toISOString().split('T')[0];
  }

  // Si ya tiene formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Si tiene formato DD/MM/YYYY o DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Parseo genérico con Date
  const parsed = new Date(rawDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  // Fallback seguro al día de hoy
  return now.toISOString().split('T')[0];
}

/**
 * Normaliza el método de pago al valor exacto del check constraint de Supabase:
 * 'yape' | 'plin' | 'transferencia' | 'efectivo'
 */
function normalizePaymentMethod(method?: string): 'yape' | 'plin' | 'transferencia' | 'efectivo' {
  if (!method) return 'yape';
  const clean = method.trim().toLowerCase();
  if (clean.includes('plin')) return 'plin';
  if (clean.includes('transf') || clean.includes('banco') || clean.includes('bcp') || clean.includes('bbva')) {
    return 'transferencia';
  }
  if (clean.includes('efectivo') || clean.includes('cash')) {
    return 'efectivo';
  }
  return 'yape';
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          text: 'Hola. El servicio de inteligencia artificial requiere configurar GEMINI_API_KEY en .env.local. Puedes escribirnos directamente al WhatsApp oficial: +51 924 257 784 🌸',
        },
        { status: 200 }
      );
    }

    const { messages, selectedProduct } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Formato de mensajes inválido.' },
        { status: 400 }
      );
    }

    // 1. Consultar base de datos viva en paralelo: Productos, Categorías, Complementos, Zonas de Delivery y Campaña
    const [prodsRes, catsRes, addonsRes, zonesRes, campRes] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, description, price, promotional_price, category, image_url')
        .eq('is_active', true)
        .order('price', { ascending: true }),
      supabase
        .from('categories')
        .select('id, name, slug')
        .order('name', { ascending: true }),
      supabase
        .from('special_addons')
        .select('id, name, category, price')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('delivery_zones')
        .select('district, cost')
        .eq('active', true)
        .order('district', { ascending: true }),
      supabase
        .from('campaigns')
        .select('name, title, subtitle, badge_text')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
    ]);

    const activeProducts = prodsRes.data || [];
    const activeCategories = catsRes.data || [];
    const activeAddons = addonsRes.data || [];
    const activeZones = zonesRes.data || [];
    const activeCampaign = campRes.data;

    // Formatear categorías vivas
    const categoriesText = activeCategories.length > 0
      ? activeCategories.map((c) => `• ${c.name} (sección: ${c.slug})`).join('\n')
      : '• Ramos de Rosas, Boxes de Lujo, Girasoles Radiantes, Detalles Florales, Tulipanes.';

    // Formatear catálogo de productos
    const catalogText = activeProducts.length > 0
      ? activeProducts
          .map((p) => {
            const currentPrice = p.promotional_price || p.price;
            const promoTag = p.promotional_price ? ` (¡En OFERTA! Precio regular S/ ${p.price.toFixed(2)})` : '';
            return `• Arreglo: "${p.name}" | Categoría: ${p.category} | Precio: S/ ${currentPrice.toFixed(2)}${promoTag} | Qué incluye: ${p.description || 'Detalle floral exclusivo'} | Foto: ${p.image_url}`;
          })
          .join('\n')
      : 'Actualmente estamos preparando nuevos hermosos diseños florales.';

    // Formatear toques especiales (complementos para cross-selling)
    const addonsText = activeAddons.length > 0
      ? activeAddons
          .map((a) => `• ${a.name} [Categoría: ${a.category}] - Precio: S/ ${Number(a.price).toFixed(2)}`)
          .join('\n')
      : '• Chocolates Ferrero Rocher (8 bombones) - S/ 35.00\n• Peluche Oso Premium 25cm - S/ 45.00\n• Globo Metalizado "Feliz Día" - S/ 18.00\n• Vino Tinto Selección Especial - S/ 55.00';

    // Formatear zonas de delivery y cobertura
    const sampleZones = activeZones.slice(0, 10).map((z) => `${z.district} (S/ ${Number(z.cost).toFixed(2)})`).join(', ');
    const deliveryText = `• Cobertura: Todo Lima Metropolitana con transportistas y choferes propios especializados en flores.\n• Tiempos: Entregas el mismo día (Same-Day Delivery) en horarios convenientes o fechas programadas con antelación.\n• Distritos cubiertos (tarifa de referencia): ${sampleZones || 'Miraflores (S/ 12), San Isidro (S/ 12), Surco (S/ 15), San Borja (S/ 14), La Molina (S/ 18)'}.\n• Calidad: Flores frescas seleccionadas cada mañana, hidratación durante el traslado, empaque de alta costura y tarjeta dedicatoria de cortesía impresa.`;

    // Formatear campaña de temporada activa
    const campaignText = activeCampaign
      ? `• Campaña Estacional Vigente: "${activeCampaign.title}" (${activeCampaign.badge_text || 'EDICIÓN LIMITADA'})\n  Detalle: ${activeCampaign.subtitle || 'Colección temática exclusiva en tienda.'}`
      : '• Sin campaña estacional activa por el momento (Catálogo regular completo disponible).';

    // 2. System prompt con directivas de Function Calling para pedidos y rastreo
    const systemInstruction = `Eres la Asesora Floral Concierge de lujo y experta de "ROZIER, Alta Floristería" en Lima, Perú. Slogan oficial: "La exclusividad de crear momentos inolvidables".
Tu trato es sumamente empático, distinguido, educado, refinado y resolutivo. Actúas como una personal shopper o concierge floral de alta gama que asesora a clientes exigentes para sorprender a sus seres queridos.

INFORMACIÓN VIVA Y CONTEXTO EN TIEMPO REAL DE ROZIER:

1. CATÁLOGO DE LÍNEAS Y CATEGORÍAS FLORALES EN VIVO:
${categoriesText}
Ocasiones frecuentes a recomendar con criterio experto:
- Amor y Romance / Aniversarios: Ramos abundantes de rosas rojas, tulipanes y boxes de rosas de lujo.
- Cumpleaños / Celebraciones: Girasoles radiantes, arreglos coloridos y combinaciones florales vivas.
- Perdón / Reconciliación: Ramos pasteles, combinaciones románticas delicadas.
- Condolencias y Homenaje: Arreglos blancos, lirios, rosas blancas con trato sobrio y respetuoso.
- Agradecimiento y Amistad: Detalles con rosas rosadas, girasoles o tulipanes.

2. CATÁLOGO DE ARREGLOS FLORALES ACTIVOS DISPONIBLES:
${catalogText}

3. TOQUES ESPECIALES & COMPLEMENTOS (CROSS-SELLING DISPONIBLE):
${addonsText}
REGLA DE VENTA CONCIERGE: Cuando un cliente elija o pregunte por un arreglo floral, sugiere con sutileza, buen gusto y elegancia complementar su regalo con uno de estos toques especiales citando su nombre y precio exacto en Soles (ej: "¿Te gustaría añadir una cajita de Ferrero Rocher x8 por S/ 35 adicionales para hacer el momento aún más inolvidable? ✨").

4. POLÍTICAS DE ENTREGA Y COBERTURA (DELIVERY):
${deliveryText}

5. CAMPAÑA DESTACADA DE TEMPORADA:
${campaignText}

6. MÉTODOS DE PAGO Y CONTACTO DIRECTO:
- Métodos aceptados: Yape, Plin y Transferencia bancaria (BCP, BBVA, Interbank, Scotiabank).
- Número oficial de WhatsApp y Yape/Plin: +51 924 257 784 (a nombre de ROZIER / Antero).

DIRECTIVAS PRINCIPALES DE ATENCIÓN Y EMBUDO ULTRARRÁPIDO:

1. RECOMENDACIÓN DE ARREGLOS CON TARJETAS VISUALES (REGLA ESTRICTA ANTI-DUPLICIDAD):
Cuando el cliente solicite sugerencias ("¿Qué regalo para un aniversario?", "muéstrame opciones", "catálogo", etc.):
- Escribe ÚNICAMENTE una introducción cordial, breve y elegante (1 o 2 oraciones máximo) presentando la selección.
- ¡PROHIBIDO TOTALMENTE! NO escribas listas con viñetas ni enumeres los nombres, descripciones o precios de los productos en el texto ordinario.
- El chat interactivo convierte automáticamente cada etiqueta [PRODUCTO: ...] en una tarjeta visual de alta definición con foto, precio y botón interactivo "Elegir este diseño". Si repites los nombres o precios en el texto se verá duplicado y tosco.
- Incluye ÚNICAMENTE las etiquetas al final de tu breve saludo, de 1 a 3 arreglos diferentes del catálogo:
  [PRODUCTO: Nombre Exacto | Precio | URL_Foto]
- Cada diseño floral debe renderizarse UNA SOLA VEZ. Nunca repitas el mismo diseño en un mismo mensaje.

2. FLUJO SECUENCIAL ESTRICTO TRAS SELECCIONAR UN DISEÑO:
${selectedProduct ? `⚠️ CONTEXTO ACTIVO: El cliente ha seleccionado el diseño: "${selectedProduct.name}" (Precio: S/ ${Number(selectedProduct.price).toFixed(2)}).\n` : ''}
Cuando el usuario pulsa el botón [ Elegir este diseño ], el chat ya registra el producto en sesión y le solicita de inmediato:
"Excelente elección. Para coordinar la entrega exclusiva de tu [Nombre del Producto], indícame tu Nombre y Teléfono de contacto."

A partir de ese instante, DEBES seguir RIGUROSAMENTE esta secuencia paso a paso:

• PASO 1 (Recepción de Nombre y Teléfono):
En cuanto el usuario proporcione su Nombre y Teléfono, responde de inmediato con amabilidad y distinción preguntando:
"¡Un placer, [Nombre]! Para coordinar los detalles de tu ${selectedProduct?.name || '[Nombre del Producto]'}:
¿Deseas recibirlo tú personalmente o es una sorpresa para alguien especial? 🎁"

• PASO 2 (Bifurcación según Destinatario):
- Si responde que es para SÍ MISMO (personalmente):
  AVANZA DIRECTO sin pedir datos de terceros ni dedicatoria. Solicita fecha/horario preferido de entrega y dirección/distrito (o indícale que puede compartir su ubicación/referencia).
- Si responde que es una SORPRESA PARA ALGUIEN ESPECIAL (o para otra persona):
  Solicita de forma ordenada y concisa:
  1. Nombre de quien recibirá el arreglo
  2. Dirección exacta y Distrito de entrega en Lima (o compartir ubicación/referencia)
  3. Dedicatoria para la tarjeta floral de cortesía (o indicar si prefiere sin dedicatoria)
  Una vez brindados, confirma la fecha/horario de entrega si no la mencionó.

• PASO 3 (Toque Especial Opcional):
Pregunta si desea un toque especial opcional (chocolates Ferrero, peluche, vino o globos):
"¿Deseas acompañar tu arreglo con algún toque especial (chocolates Ferrero, peluche o vino)? ✨"
- Si responde SÍ (o pide opciones): muestra de 1 a 3 opciones de toques especiales disponibles con [ADDON: Nombre | Precio | URL_Foto].
- Si responde NO (o continuar): pasa directo al método de pago.

• PASO 4 (Método de Pago y Ubicación / Referencia):
- Consulta el método de pago preferido (Yape, Plin o Transferencia bancaria) si aún no lo especificó.
- Ofrece compartir ubicación o referencia exacta para el chofer de entrega.

• PASO 5 (Cierre Oficial y Generación con Botón a WhatsApp 51924257784):
- Invoca OBLIGATORIAMENTE la herramienta 'createOrder' con todos los datos recopilados para emitir el resumen oficial en el sistema y el botón directo a WhatsApp (51924257784) con el mensaje precargado para el comprobante.

3. RASTREO DE PEDIDOS: Si el cliente pregunta por el estado de su pedido o da un código (ej. PET-8492 o ROZ-8492), DEBES OBLIGATORIAMENTE invocar 'trackOrder'.
4. PAGO YAPE/PLIN: Si pregunta cómo pagar, incluye [MOSTRAR_QR_YAPE] para mostrar el QR interactivo oficial al 924 257 784.
5. ESTILO CONCIERGE: Tono sumamente distinguido, cálido, resolutivo y elegante.`;

    // 3. Declaraciones formales de herramientas
    const createOrderDeclaration = {
      name: 'createOrder',
      description:
        'Registra formalmente el pedido floral en la base de datos de ROZIER cuando el cliente decida comprar y proporcione los datos: comprador, teléfono, destinatario, dirección, fecha de entrega, dedicatoria y producto.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          customer_name: {
            type: Type.STRING,
            description: 'Nombre completo del cliente comprador que realiza y paga el pedido (OBLIGATORIO)',
          },
          customer_phone: {
            type: Type.STRING,
            description: 'Número de celular o WhatsApp del cliente comprador para coordinar el pago (OBLIGATORIO)',
          },
          recipient_name: {
            type: Type.STRING,
            description: 'Nombre de la persona que recibe el arreglo (puede ser el mismo comprador o un tercero)',
          },
          phone: {
            type: Type.STRING,
            description: 'Teléfono de contacto secundario o del comprador si no se especificó customer_phone',
          },
          delivery_address: {
            type: Type.STRING,
            description: 'Dirección completa y distrito de entrega en Lima Metropolitana',
          },
          delivery_date: {
            type: Type.STRING,
            description: 'Fecha o día de entrega (ej: Hoy, Mañana o formato YYYY-MM-DD)',
          },
          dedication_message: {
            type: Type.STRING,
            description: 'Texto para la tarjeta dedicatoria impresa',
          },
          product_name: {
            type: Type.STRING,
            description: 'Nombre del arreglo o producto elegido del catálogo',
          },
          amount: {
            type: Type.NUMBER,
            description: 'Precio o monto total en Soles (S/) del arreglo',
          },
          payment_method: {
            type: Type.STRING,
            description: 'Método de pago preferido: yape, plin o transferencia',
          },
          extra_items: {
            type: Type.ARRAY,
            description: 'Lista de toques especiales o complementos elegidos (ej. Chocolates, Peluches, Vino, Globos)',
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: 'Nombre del complemento' },
                price: { type: Type.NUMBER, description: 'Precio unitario en Soles' },
                quantity: { type: Type.NUMBER, description: 'Cantidad' },
              },
            },
          },
        },
        required: [
          'customer_name',
          'recipient_name',
          'delivery_address',
          'delivery_date',
          'product_name',
          'amount',
        ],
      },
    };

    const trackOrderDeclaration = {
      name: 'trackOrder',
      description:
        'Consulta el estado de un pedido en tiempo real cuando el cliente proporciona su código de rastreo (ej. PET-8492) o consulta por el seguimiento de su pedido.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          tracking_code: {
            type: Type.STRING,
            description: 'El código de seguimiento del pedido, por ejemplo PET-8492',
          },
        },
        required: ['tracking_code'],
      },
    };

    // 4. Formatear historial de mensajes
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const ai = new GoogleGenAI({ apiKey });

    // 5. Invocar modelo Gemini con herramientas
    let response: any;
    const tools = [{ functionDeclarations: [createOrderDeclaration, trackOrderDeclaration] }];

    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          tools,
        },
      });
    } catch (genErr) {
      console.warn('Error con gemini-2.5-flash en chat, probando fallback...', genErr);
      try {
        response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents,
          config: {
            systemInstruction,
            tools,
          },
        });
      } catch (fallbackErr) {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents,
          config: {
            systemInstruction,
            tools,
          },
        });
      }
    }

    // 6. Procesar invocación de herramientas (createOrder o trackOrder)
    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];

      // HERRAMIENTA 1: Rastrear Pedido (trackOrder)
      if (call.name === 'trackOrder') {
        const { tracking_code } = (call.args || {}) as { tracking_code: string };
        const cleanCode = (tracking_code || '').trim().toUpperCase();

        console.log('🔍 Chatbot consultando rastreo para código:', cleanCode);

        const { data: foundOrder, error: trackError } = await supabase
          .from('orders')
          .select('*, customer:customers(*)')
          .ilike('tracking_code', cleanCode)
          .maybeSingle();

        if (trackError || !foundOrder) {
          return NextResponse.json({
            text: `No encontré ningún pedido registrado con el código **${cleanCode}** 🔍.\n\nPor favor verifica que esté bien escrito (ejemplo: **PET-8492**) o escríbenos directamente a nuestro WhatsApp oficial: **+51 924 257 784** para ayudarte a ubicarlo de inmediato 🌸.`,
          });
        }

        const rawStatus = (foundOrder.status || 'pendiente').toLowerCase();
        const stageDescriptions: Record<string, { stage: string; desc: string }> = {
          pendiente: {
            stage: '⏳ Recibido / Pendiente de Pago',
            desc: 'Tu solicitud de pedido fue registrada y estamos a la espera de la validación del comprobante de pago.',
          },
          confirmado: {
            stage: '✅ Confirmado',
            desc: 'Tu pago ha sido validado con éxito. Tu pedido ya está programado para ingresar a preparación.',
          },
          en_preparacion: {
            stage: '🌸 En Preparación',
            desc: '¡Nuestros floristas expertos están elaborando tu hermoso arreglo con las flores más frescas del día!',
          },
          en_taller: {
            stage: '🌸 En Preparación',
            desc: '¡Nuestros floristas expertos están elaborando tu hermoso arreglo con las flores más frescas del día!',
          },
          en_despacho: {
            stage: '🚗 En Despacho (En camino)',
            desc: 'Tu arreglo ya está en camino y nuestro chofer se encuentra en ruta para realizar la entrega.',
          },
          entregado: {
            stage: '✨ Entregado con Éxito',
            desc: '¡El pedido ha sido entregado en la dirección indicada! Esperamos haber alegrado el día de esa persona especial.',
          },
          cancelado: {
            stage: '❌ Cancelado',
            desc: 'Este pedido fue cancelado. Si tienes alguna duda, por favor contáctanos por WhatsApp.',
          },
        };

        const currentStage = stageDescriptions[rawStatus] || stageDescriptions.pendiente;
        const trackingUrl = `https://petalia-web.vercel.app/?track=${foundOrder.tracking_code || cleanCode}`;
        const recipient = foundOrder.recipient_name?.split('[Comprador:')[0].split('(Cel:')[0].trim() || 'Cliente';
        const formattedDate = formatLocalDate(foundOrder.delivery_date);

        const responseText =
          `¡Hola! Aquí tienes el estado en vivo de tu pedido **${foundOrder.tracking_code || cleanCode}** 🌸:\n\n` +
          `📌 **Etapa actual:** ${currentStage.stage}\n` +
          `ℹ️ **Detalle:** ${currentStage.desc}\n\n` +
          `🎁 **Destinatario:** ${recipient}\n` +
          `📅 **Fecha de entrega:** ${formattedDate}\n` +
          `💰 **Total:** S/ ${Number(foundOrder.total_amount).toFixed(2)}\n\n` +
          `Puedes ver la línea de tiempo visual y detalles completos haciendo clic aquí: [Rastrear Pedido en Vivo](${trackingUrl}) 🚚`;

        return NextResponse.json({ text: responseText });
      }

      // HERRAMIENTA 2: Crear Pedido (createOrder)
      if (call.name === 'createOrder') {
        const args = call.args as {
          customer_name?: string;
          customer_phone?: string;
          recipient_name?: string;
          phone?: string;
          delivery_address: string;
          delivery_date: string;
          dedication_message?: string;
          product_name: string;
          amount: number;
          payment_method?: string;
          extra_items?: Array<{ name: string; price: number; quantity?: number }>;
        };

        console.log('🤖 Chatbot Gemini invocó createOrder con args:', args);

        // Nombre y teléfono del comprador
        const buyerName = (args.customer_name || args.recipient_name || 'Cliente').trim();
        const rawPhone = args.customer_phone || args.phone || '';
        const cleanPhone = rawPhone.replace(/\D/g, '');
        const recipient = (args.recipient_name || buyerName).trim();

        // Buscar producto coincidente en el catálogo para validar monto exacto
        const matchedProduct = activeProducts?.find(
          (p) =>
            p.name.toLowerCase().includes((args.product_name || '').toLowerCase()) ||
            (args.product_name || '').toLowerCase().includes(p.name.toLowerCase())
        );

        const finalAmount =
          Number(args.amount) ||
          (matchedProduct ? (matchedProduct.promotional_price || matchedProduct.price) : 0);

        // Normalizar fecha a formato SQL DATE YYYY-MM-DD
        const sqlDeliveryDate = parseToSqlDate(args.delivery_date);

        // Normalizar método de pago al check constraint ('yape' | 'plin' | 'transferencia' | 'efectivo')
        const sqlPaymentMethod = normalizePaymentMethod(args.payment_method);

        // Generar código de rastreo único para este pedido
        const trackingCode = generateTrackingCode();

        // Guardar constancia del comprador en recipient_name si el destinatario es otra persona
        const formattedRecipient =
          recipient.toLowerCase() !== buyerName.toLowerCase()
            ? `${recipient} [Comprador: ${buyerName} | Cel: ${cleanPhone}]`
            : `${buyerName} (Cel: ${cleanPhone})`;

        // Preparar dedicatoria incluyendo el nombre del arreglo y del comprador para visualización en CRM
        const productTag = args.product_name ? `[Arreglo: ${args.product_name}] ` : '';
        const buyerTag = cleanPhone ? `[Comprador: ${buyerName} | Cel: ${cleanPhone}] ` : `[Comprador: ${buyerName}] `;
        const userDedication = args.dedication_message ? args.dedication_message.trim() : 'Sin dedicatoria';
        const finalDedication = `${productTag}${buyerTag}${userDedication}`;

        // Lógica CRM: Cliente en public.customers
        let customerId: string | null = null;
        if (cleanPhone) {
          try {
            const { data: existingCustomer, error: findCustErr } = await supabase
              .from('customers')
              .select('id')
              .eq('phone', cleanPhone)
              .maybeSingle();

            if (findCustErr) {
              console.warn('Búsqueda de cliente en Supabase:', findCustErr.message);
            }

            if (existingCustomer) {
              customerId = existingCustomer.id;
              // Actualizar notas del cliente con el arreglo
              await supabase
                .from('customers')
                .update({
                  full_name: buyerName,
                  notes: `Último pedido virtual: ${args.product_name} - S/ ${finalAmount.toFixed(2)}`,
                })
                .eq('id', customerId);
            } else {
              const { data: newCustomer, error: insertCustErr } = await supabase
                .from('customers')
                .insert([
                  {
                    phone: cleanPhone,
                    full_name: buyerName,
                    notes: `Pedido virtual: ${args.product_name} - S/ ${finalAmount.toFixed(2)}`,
                  },
                ])
                .select('id')
                .single();

              if (insertCustErr) {
                console.warn('Creación de cliente en CRM (RLS o error):', insertCustErr.message);
              } else if (newCustomer) {
                customerId = newCustomer.id;
              }
            }
          } catch (custErr: any) {
            console.warn('Excepción gestionando cliente en CRM:', custErr.message || custErr);
          }
        }

        // Insertar formalmente en public.orders con estado 'pendiente' y tracking_code
        const directPayload: any = {
          customer_id: customerId,
          customer_name: buyerName,
          customer_phone: cleanPhone,
          total_amount: finalAmount,
          payment_method: sqlPaymentMethod,
          recipient_name: formattedRecipient,
          delivery_address: (args.delivery_address || 'Entrega en Lima').trim(),
          delivery_date: sqlDeliveryDate,
          dedication_message: finalDedication,
          status: 'pendiente' as const,
          tracking_code: trackingCode,
        };

        if (args.extra_items && args.extra_items.length > 0) {
          directPayload.extra_items = args.extra_items;
        }

        console.log('📦 Intentando registrar pedido con tracking en Supabase...', {
          tracking: trackingCode,
          comprador: buyerName,
          total: finalAmount,
          extra_items: args.extra_items,
        });

        let newOrder: any = null;
        let { data: insertedOrder, error: orderError } = await supabase
          .from('orders')
          .insert([directPayload])
          .select()
          .single();

        // Si la tabla orders no tiene las columnas customer_name/customer_phone (código PGRST204)
        if (orderError && orderError.code === 'PGRST204') {
          console.warn('ℹ️ La tabla orders no tiene customer_name/customer_phone nativas, insertando con campos base...');
          const fallbackPayload: any = {
            customer_id: customerId,
            total_amount: finalAmount,
            payment_method: sqlPaymentMethod,
            recipient_name: formattedRecipient,
            delivery_address: (args.delivery_address || 'Entrega en Lima').trim(),
            delivery_date: sqlDeliveryDate,
            dedication_message: finalDedication,
            status: 'pendiente' as const,
            tracking_code: trackingCode,
          };

          if (args.extra_items && args.extra_items.length > 0) {
            fallbackPayload.extra_items = args.extra_items;
          }

          const retryRes = await supabase
            .from('orders')
            .insert([fallbackPayload])
            .select()
            .single();

          insertedOrder = retryRes.data;
          orderError = retryRes.error;
        }

        if (orderError) {
          console.error('❌ Error crítico insertando pedido en Supabase:', orderError);
        } else {
          newOrder = insertedOrder;
          console.log('✅ Pedido insertado exitosamente en public.orders con tracking:', trackingCode);
        }

        // Generar enlace preformateado para WhatsApp con datos del comprador, entrega y link de seguimiento
        const displayDeliveryDate = formatLocalDate(sqlDeliveryDate);
        const trackingLink = `https://petalia-web.vercel.app/?track=${trackingCode}`;

        const waLines = [
          `🌸 *NUEVO PEDIDO CONFIRMADO — ROZIER* 🌸`,
          ``,
          `🔖 *Código de rastreo:* ${trackingCode}`,
          `👤 *Comprador:* ${buyerName}${cleanPhone ? ` (${cleanPhone})` : ''}`,
          `📦 *Arreglo Floral:* ${args.product_name}`,
        ];

        if (args.extra_items && args.extra_items.length > 0) {
          const addonsListText = args.extra_items
            .map((item) => `${item.name} (${item.quantity || 1}x S/ ${Number(item.price).toFixed(2)})`)
            .join(', ');
          waLines.push(`✨ *Toques Especiales:* ${addonsListText}`);
        }

        waLines.push(
          `💰 *Monto a pagar:* S/ ${finalAmount.toFixed(2)}`,
          `🎁 *Destinatario:* ${recipient}`,
          `📍 *Dirección de entrega:* ${args.delivery_address}`,
          `📅 *Fecha de entrega:* ${displayDeliveryDate}`,
          userDedication !== 'Sin dedicatoria'
            ? `✍️ *Dedicatoria:* "${userDedication}"`
            : `✍️ *Dedicatoria:* Sin dedicatoria por ahora`,
          ``,
          `💳 *Método de pago:* ${sqlPaymentMethod.toUpperCase()}`,
          `🔍 *Rastreo en vivo:* ${trackingLink}`,
          ``,
          `Adjunto por este medio mi comprobante de pago para que inicien la preparación. ¡Muchas gracias por confiar en ROZIER! ✨`
        );

        let targetWhatsapp = WHATSAPP_NUMBER;
        try {
          const { data: stData } = await supabase
            .from('store_settings')
            .select('whatsapp_number')
            .eq('id', 1)
            .maybeSingle();
          if (stData?.whatsapp_number) {
            targetWhatsapp = stData.whatsapp_number;
          }
        } catch {
          // fallback a WHATSAPP_NUMBER
        }

        const whatsappUrl = createWhatsAppLink(targetWhatsapp, waLines.join('\n'));

        return NextResponse.json({
          text: `¡Qué gran elección, **${buyerName}**! He registrado tu pedido de **${args.product_name}** en nuestro sistema con código de rastreo **${trackingCode}** 🌸.\n\nPara que nuestro equipo comience con la preparación de tus flores frescas y confirme la ruta de entrega, por favor envía la constancia de tu ${sqlPaymentMethod.toUpperCase()} haciendo clic en el botón de WhatsApp a continuación:`,
          orderCreated: {
            id: newOrder?.id,
            tracking_code: trackingCode,
            product_name: args.product_name,
            customer_name: buyerName,
            recipient_name: recipient,
            phone: cleanPhone,
            delivery_address: args.delivery_address,
            delivery_date: displayDeliveryDate,
            dedication_message: userDedication,
            amount: finalAmount,
            payment_method: sqlPaymentMethod,
            whatsapp_url: whatsappUrl,
          },
        });
      }
    }

    // Extraer productos recomendados si fueron mencionados o etiquetados
    const recommendedProducts: Array<{
      name: string;
      price: number;
      image_url: string;
      description?: string;
    }> = [];

    const rawResponseText = response.text || '';

    // 1. Revisar etiquetas [PRODUCTO: ... | ... | ...]
    const prodTagRegex = /\[PRODUCTO:\s*([^|\]]+)\s*\|\s*([^|\]]+)\s*\|\s*([^\]]+)\]/gi;
    let pMatch;
    while ((pMatch = prodTagRegex.exec(rawResponseText)) !== null) {
      const pName = pMatch[1].trim();
      const pPrice = parseFloat(pMatch[2].replace(/[^\d.]/g, ''));
      const pImg = pMatch[3].trim();
      if (pName) {
        recommendedProducts.push({
          name: pName,
          price: isNaN(pPrice) ? 0 : pPrice,
          image_url: pImg,
        });
      }
    }

    // 2. Si no hubo etiquetas pero el texto menciona algún producto del catálogo activo
    if (recommendedProducts.length === 0 && activeProducts.length > 0) {
      for (const p of activeProducts) {
        if (rawResponseText.toLowerCase().includes(p.name.toLowerCase())) {
          recommendedProducts.push({
            name: p.name,
            price: p.promotional_price || p.price,
            image_url: p.image_url,
            description: p.description,
          });
          if (recommendedProducts.length >= 3) break;
        }
      }
    }

    // Extraer toques especiales o complementos
    const recommendedAddons: Array<{
      name: string;
      price: number;
      image_url?: string;
    }> = [];
    const addonTagRegex = /\[ADDON:\s*([^|\]]+)\s*\|\s*([^|\]]+)(?:\s*\|\s*([^\]]+))?\]/gi;
    let aMatch;
    while ((aMatch = addonTagRegex.exec(rawResponseText)) !== null) {
      const aName = aMatch[1].trim();
      const aPrice = parseFloat(aMatch[2].replace(/[^\d.]/g, ''));
      const aImg = aMatch[3]?.trim();
      recommendedAddons.push({
        name: aName,
        price: isNaN(aPrice) ? 0 : aPrice,
        image_url: aImg,
      });
    }

    // Deduplicar productos recomendados para garantizar que cada diseño aparezca una sola vez
    const seenProdNames = new Set<string>();
    const uniqueProducts = recommendedProducts.filter((p) => {
      const key = p.name.trim().toLowerCase();
      if (!key || seenProdNames.has(key)) return false;
      seenProdNames.add(key);
      return true;
    });

    // Deduplicar toques especiales
    const seenAddonNames = new Set<string>();
    const uniqueAddons = recommendedAddons.filter((a) => {
      const key = a.name.trim().toLowerCase();
      if (!key || seenAddonNames.has(key)) return false;
      seenAddonNames.add(key);
      return true;
    });

    // Sanitizar texto para remover nombres y precios de productos recomendados si hay tarjetas
    let sanitizedText = rawResponseText;
    if (uniqueProducts.length > 0) {
      sanitizedText = sanitizedText
        .replace(/\[MOSTRAR_QR_YAPE\]/gi, '')
        .replace(/\[PRODUCTO:\s*[^|\]]+\s*\|\s*([^|\]]+)\s*\|\s*([^\]]+)\]/gi, '')
        .replace(/\[ADDON:\s*[^|\]]+\s*\|\s*[^|\]]+(?:\s*\|\s*[^\]]+)?\]/gi, '');

      const lines = sanitizedText.split('\n').filter((line: string) => {
        const trimmed = line.trim().toLowerCase();
        if (!trimmed) return false;
        return !uniqueProducts.some((p) => {
          const name = p.name.trim().toLowerCase();
          return (
            trimmed.includes(name) ||
            trimmed.includes(`s/ ${Number(p.price).toFixed(2)}`) ||
            trimmed.includes(`s/${Number(p.price).toFixed(2)}`) ||
            (trimmed.startsWith('•') && trimmed.includes(name.slice(0, 8))) ||
            (trimmed.startsWith('-') && trimmed.includes(name.slice(0, 8)))
          );
        });
      });
      sanitizedText = lines.join('\n').trim();
      if (!sanitizedText) {
        sanitizedText = 'He seleccionado estas opciones exclusivas para ti 🌸:';
      }
    }

    // Determinar quickReplies sugeridas según el paso de la conversación
    const quickReplies: string[] = [];
    const lowerText = rawResponseText.toLowerCase();
    if (
      lowerText.includes('sorpresa') ||
      lowerText.includes('personalmente') ||
      lowerText.includes('alguien especial')
    ) {
      quickReplies.push('🎁 Sorpresa para alguien especial', '👤 Para mí personalmente');
    } else if (
      lowerText.includes('toque especial') ||
      lowerText.includes('chocolates') ||
      lowerText.includes('peluche') ||
      lowerText.includes('adicionales') ||
      lowerText.includes('complementos')
    ) {
      quickReplies.push('🍫 Añadir Ferrero Rocher (+S/ 35)', '🧸 Añadir Peluche (+S/ 45)', '⏩ Continuar sin adicionales');
    } else if (lowerText.includes('gps') || lowerText.includes('ubicación') || lowerText.includes('referencia')) {
      quickReplies.push('📍 Por dirección y distrito', '🗺️ Compartir GPS por WhatsApp');
    } else if (
      lowerText.includes('método de pago') ||
      lowerText.includes('forma de pago') ||
      lowerText.includes('yape') ||
      lowerText.includes('transferencia')
    ) {
      quickReplies.push('💜 Pagar con Yape', '💙 Pagar con Plin', '🏦 Transferencia bancaria');
    }

    // Respuesta conversacional estándar enriquecida
    return NextResponse.json({
      text: sanitizedText || response.text || '¿En qué arreglo o detalle floral de ROZIER te puedo asesorar hoy? 🌸',
      recommendedProducts: uniqueProducts,
      recommendedAddons: uniqueAddons,
      quickReplies,
    });
  } catch (error: any) {
    console.error('Error general en /api/chat:', error);
    return NextResponse.json(
      {
        text: 'Lo siento, ocurrió un pequeño problema al procesar tu consulta. Si deseas atención inmediata, puedes escribirnos directamente a nuestro WhatsApp oficial: +51 924 257 784 🌸',
        error: error?.message,
      },
      { status: 500 }
    );
  }
}
