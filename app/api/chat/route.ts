import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { supabase } from '@/lib/supabase';
import { formatLocalDate } from '@/lib/format';

const WHATSAPP_NUMBER = '51924257784';

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

    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Formato de mensajes inválido.' },
        { status: 400 }
      );
    }

    // 1. Consultar productos activos en Supabase para inyectar catálogo en tiempo real
    const { data: activeProducts, error: prodError } = await supabase
      .from('products')
      .select('id, name, description, price, promotional_price, category, image_url')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (prodError) {
      console.warn('Advertencia al obtener productos para chatbot:', prodError);
    }

    const catalogText = (activeProducts && activeProducts.length > 0)
      ? activeProducts
          .map((p) => {
            const currentPrice = p.promotional_price || p.price;
            const promoTag = p.promotional_price ? ` (¡En OFERTA! Precio regular S/ ${p.price.toFixed(2)})` : '';
            return `• Arreglo: "${p.name}" | Categoría: ${p.category} | Precio: S/ ${currentPrice.toFixed(2)}${promoTag} | Qué incluye: ${p.description || 'Detalle floral exclusivo'} | Foto: ${p.image_url}`;
          })
          .join('\n')
      : 'Actualmente estamos preparando nuevos diseños florales en taller.';

    // 2. System prompt con directiva imperativa de Function Calling
    const systemInstruction = `Eres la asesora floral virtual y experta de "PETALIA diseño floral & decoraciones" en Lima, Perú.
Tu personalidad es cálida, amable, educada, elegante y orientada a cerrar pedidos.

Contexto y políticas de PETALIA:
- Ubicación: Taller floral en Lima, Perú.
- Cobertura de delivery: Todo Lima Metropolitana y Callao con transportistas cuidadosos.
- Tiempos de entrega: Mismo día (según disponibilidad de ruta) o fechas programadas.
- Métodos de pago aceptados: Yape, Plin y Transferencia bancaria (BCP, BBVA, Interbank, Scotiabank).
- Número de WhatsApp comercial: +51 924 257 784.

Catálogo de productos activos disponibles en taller:
${catalogText}

Reglas estrictas de conversación:
1. Recomienda EXCLUSIVAMENTE productos reales del catálogo anterior con sus nombres y precios exactos en Soles (S/).
2. Orienta al cliente según la ocasión (aniversario, cumpleaños, perdón, condolencias, agradecimiento).
3. Si el cliente decide pedir o confirma qué arreglo desea, DEBES SOLICITAR AMABLEMENTE LOS DATOS COMPLETOS:
   DATOS DEL COMPRADOR (Obligatorios):
   - 1. Nombre completo del comprador (quien realiza la compra y el pago).
   - 2. Teléfono o WhatsApp de contacto del comprador.
   DATOS DE ENTREGA:
   - 3. Nombre del destinatario (a quién van dirigidas las flores, o si es para el mismo comprador).
   - 4. Dirección exacta y distrito de entrega en Lima o Callao.
   - 5. Fecha de entrega (ej: Hoy, Mañana o fecha específica).
   - 6. Dedicatoria para la tarjeta de cortesía (o si prefiere sin dedicatoria).
   - 7. Método de pago preferido (Yape, Plin o Transferencia).

4. REGLA CRUCIAL DE CIERRE: En cuanto el cliente te proporcione o confirme estos datos (especialmente nombre y teléfono del comprador, destinatario, dirección, fecha y arreglo), DEBES OBLIGATORIAMENTE invocar la herramienta/función 'createOrder'. NO digas en texto plano "He registrado tu pedido" sin invocar 'createOrder', ya que la llamada a la herramienta es lo que guarda el pedido en la base de datos de PETALIA.
5. Sé concisa y amigable, con viñetas limpias y emojis elegantes (🌸, 💐, ✨, 🌿, 🎁).`;

    // 3. Declaración formal de la función createOrder
    const createOrderDeclaration = {
      name: 'createOrder',
      description:
        'Registra formalmente el pedido floral en la base de datos de PETALIA cuando el cliente decida comprar y proporcione los datos: comprador, teléfono, destinatario, dirección, fecha de entrega, dedicatoria y producto.',
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
            description: 'Dirección completa y distrito de entrega en Lima o Callao',
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

    // 4. Formatear historial de mensajes
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const ai = new GoogleGenAI({ apiKey });

    // 5. Invocar modelo Gemini con fallback
    let response: any;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [createOrderDeclaration] }],
        },
      });
    } catch (genErr) {
      console.warn('Error con gemini-3.6-flash en chat, probando gemini-2.5-flash...', genErr);
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: [createOrderDeclaration] }],
          },
        });
      } catch (fallbackErr) {
        response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: [createOrderDeclaration] }],
          },
        });
      }
    }

    // 6. Procesar invocación de createOrder
    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
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

        // Insertar formalmente en public.orders con estado 'pendiente'
        // Intentar primero con columnas directas si existen en la tabla orders
        const directPayload = {
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
        };

        console.log('📦 Intentando registrar pedido en Supabase...', {
          comprador: buyerName,
          telefono: cleanPhone,
          destinatario: recipient,
          total: finalAmount,
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
          const fallbackPayload = {
            customer_id: customerId,
            total_amount: finalAmount,
            payment_method: sqlPaymentMethod,
            recipient_name: formattedRecipient,
            delivery_address: (args.delivery_address || 'Entrega en Lima').trim(),
            delivery_date: sqlDeliveryDate,
            dedication_message: finalDedication,
            status: 'pendiente' as const,
          };

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
          console.log('✅ Pedido insertado exitosamente en public.orders con ID:', newOrder?.id);
        }

        // Generar enlace preformateado para WhatsApp con datos del comprador y entrega
        const displayDeliveryDate = formatLocalDate(sqlDeliveryDate);

        const waLines = [
          `¡Hola *PETALIA*! 🌸 Acabo de generar mi pedido con su Asesora Virtual:`,
          ``,
          `👤 *Comprador:* ${buyerName}${cleanPhone ? ` (${cleanPhone})` : ''}`,
          `📦 *Arreglo:* ${args.product_name}`,
          `💰 *Monto a pagar:* S/ ${finalAmount.toFixed(2)}`,
          `🎁 *Destinatario:* ${recipient}`,
          `📍 *Dirección de entrega:* ${args.delivery_address}`,
          `📅 *Fecha de entrega:* ${displayDeliveryDate}`,
          userDedication !== 'Sin dedicatoria'
            ? `✍️ *Dedicatoria:* "${userDedication}"`
            : `✍️ *Dedicatoria:* Sin dedicatoria por ahora`,
          ``,
          `💳 *Método de pago:* ${sqlPaymentMethod.toUpperCase()}`,
          `Adjunto por este medio mi comprobante de pago para que inicien la preparación en taller. ¡Muchas gracias! ✨`,
        ];

        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
          waLines.join('\n')
        )}`;

        return NextResponse.json({
          text: `¡Qué gran elección, **${buyerName}**! He registrado formalmente tu pedido de **${args.product_name}** en nuestro sistema para el **${displayDeliveryDate}** con estado **Pendiente de pago**. 🌸\n\nPara que nuestro taller comience con la preparación de tus flores frescas y confirme la ruta de entrega, por favor envía la constancia de tu ${sqlPaymentMethod.toUpperCase()} haciendo clic en el botón de WhatsApp a continuación:`,
          orderCreated: {
            id: newOrder?.id,
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

    // Respuesta conversacional estándar
    return NextResponse.json({
      text: response.text || '¿En qué arreglo o detalle floral de PETALIA te puedo asesorar hoy? 🌸',
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
