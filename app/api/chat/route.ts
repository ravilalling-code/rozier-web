import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { supabase } from '@/lib/supabase';

const WHATSAPP_NUMBER = '51924257784';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          text: 'Hola. Disculpa la molestia, el servicio de inteligencia artificial está temporalmente fuera de línea porque falta configurar GEMINI_API_KEY. Por favor contáctanos directamente a nuestro WhatsApp oficial: +51 924 257 784.',
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

    // 1. Consultar productos activos en Supabase para tener el catálogo en tiempo real
    const { data: activeProducts, error: prodError } = await supabase
      .from('products')
      .select('id, name, description, price, promotional_price, category, image_url')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (prodError) {
      console.warn('Error obteniendo productos para el chatbot:', prodError);
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

    // 2. Definir system prompt con contexto de negocio de PETALIA
    const systemInstruction = `Eres la asesora floral virtual y experta de "PETALIA diseño floral & decoraciones" en Lima, Perú.
Tu personalidad es excepcionalmente cálida, educada, elegante, detallista y orientada a cerrar pedidos.

Contexto y políticas del negocio:
- Taller floral ubicado en Lima, Perú.
- Cobertura de delivery: Todo Lima Metropolitana y Callao con transportistas especializados en flores.
- Tiempos de entrega: Mismo día (según disponibilidad de ruta) o fechas programadas.
- Métodos de pago aceptados: Yape, Plin y Transferencia bancaria (BCP, BBVA, Interbank, Scotiabank).
- Número de WhatsApp comercial: +51 924 257 784.

Catálogo de productos activos disponibles AHORA:
${catalogText}

Reglas estrictas de conversación:
1. Recomienda EXCLUSIVAMENTE productos reales del catálogo anterior con sus nombres y precios exactos en Soles (S/). Si te piden algo que no está en el catálogo, ofréceles la alternativa más cercana que sí tengamos.
2. Orienta al cliente según la ocasión:
   - Aniversarios o romance: Boxes de rosas, ramos de rosas rojas y detalles finos.
   - Cumpleaños o agradecimiento: Ramos variados, alegres o boxes con toques especiales.
   - Condolencias o pronta recuperación: Arreglos sobrios en tonos blancos o pasteles.
   - Perdón o reconciliación: Detalles expresivos y emotivos.
3. Si el cliente decide hacer el pedido o confirma qué arreglo desea, guíalo paso a paso para recopilar los 5 datos clave:
   - 1. Nombre completo del destinatario (quién recibe el arreglo).
   - 2. Teléfono o WhatsApp del cliente para la coordinación.
   - 3. Dirección exacta y distrito de entrega en Lima o Callao.
   - 4. Fecha de entrega deseada (ej: Hoy, Mañana, o fecha en formato DD/MM/AAAA).
   - 5. Dedicatoria para la tarjeta de cortesía que acompaña el arreglo.
4. Cuando el cliente te proporcione o confirme estos datos, DEBES invocar la herramienta/función 'createOrder' para registrar de inmediato el pedido en el sistema.
5. Sé concisa y amigable, estructurando tus mensajes con viñetas limpias y emojis elegantes (🌸, 💐, ✨, 🌿, 🎁).`;

    // 3. Declaración de la función createOrder
    const createOrderDeclaration = {
      name: 'createOrder',
      description:
        'Registra formalmente el pedido floral en la base de datos de PETALIA cuando el cliente haya decidido comprar y proporcione los datos esenciales: destinatario, teléfono, dirección, fecha de entrega, dedicatoria y producto.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          recipient_name: {
            type: Type.STRING,
            description: 'Nombre completo de la persona que recibirá las flores',
          },
          phone: {
            type: Type.STRING,
            description: 'Teléfono o WhatsApp del cliente que realiza el pedido',
          },
          customer_name: {
            type: Type.STRING,
            description: 'Nombre del cliente comprador (opcional si es el mismo destinatario)',
          },
          delivery_address: {
            type: Type.STRING,
            description: 'Dirección completa y distrito de entrega en Lima o Callao',
          },
          delivery_date: {
            type: Type.STRING,
            description: 'Fecha acordada para la entrega (ej: Hoy, Mañana o YYYY-MM-DD)',
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
            description: 'Método de pago preferido: Yape, Plin o Transferencia',
          },
        },
        required: [
          'recipient_name',
          'phone',
          'delivery_address',
          'delivery_date',
          'product_name',
          'amount',
        ],
      },
    };

    // 4. Preparar historial para Gemini
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const ai = new GoogleGenAI({ apiKey });

    // 5. Invocar modelo Gemini
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
      console.warn('Error con gemini-3.6-flash en chat, probando fallback gemini-2.5-flash...', genErr);
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

    // 6. Verificar si el modelo solicitó registrar el pedido mediante tool call
    const functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === 'createOrder') {
        const args = call.args as {
          recipient_name: string;
          phone: string;
          customer_name?: string;
          delivery_address: string;
          delivery_date: string;
          dedication_message?: string;
          product_name: string;
          amount: number;
          payment_method?: string;
        };

        // Buscar producto coincidente en el catálogo para validar monto exacto
        const matchedProduct = activeProducts?.find(
          (p) =>
            p.name.toLowerCase().includes((args.product_name || '').toLowerCase()) ||
            (args.product_name || '').toLowerCase().includes(p.name.toLowerCase())
        );

        const finalAmount =
          Number(args.amount) ||
          (matchedProduct ? (matchedProduct.promotional_price || matchedProduct.price) : 0);

        // Limpiar teléfono
        const cleanPhone = (args.phone || '').replace(/\D/g, '');

        // Lógica CRM: Cliente en public.customers
        let customerId: string | null = null;
        if (cleanPhone) {
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', cleanPhone)
            .maybeSingle();

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            const { data: newCustomer } = await supabase
              .from('customers')
              .insert([
                {
                  phone: cleanPhone,
                  full_name: (args.customer_name || args.recipient_name || 'Cliente Asistente').trim(),
                },
              ])
              .select('id')
              .single();

            if (newCustomer) customerId = newCustomer.id;
          }
        }

        // Insertar pedido en public.orders con estado 'pendiente'
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert([
            {
              customer_id: customerId,
              total_amount: finalAmount,
              payment_method: args.payment_method || 'Yape',
              recipient_name: args.recipient_name,
              delivery_address: args.delivery_address,
              delivery_date: args.delivery_date,
              dedication_message: args.dedication_message || null,
              status: 'pendiente',
            },
          ])
          .select()
          .single();

        if (orderError) {
          console.error('Error insertando pedido desde Chatbot:', orderError);
        }

        // Generar enlace preformateado para WhatsApp
        const waLines = [
          `¡Hola *PETALIA*! 🌸 Acabo de generar mi pedido con su Asesora Virtual:`,
          ``,
          `📦 *Arreglo:* ${args.product_name}`,
          `💰 *Monto a pagar:* S/ ${finalAmount.toFixed(2)}`,
          `👤 *Destinatario:* ${args.recipient_name}`,
          `📍 *Dirección:* ${args.delivery_address}`,
          `📅 *Fecha de entrega:* ${args.delivery_date}`,
          args.dedication_message
            ? `✍️ *Dedicatoria:* "${args.dedication_message}"`
            : `✍️ *Dedicatoria:* Sin dedicatoria por ahora`,
          ``,
          `💳 *Método de pago:* ${args.payment_method || 'Yape'}`,
          `Adjunto por este medio mi comprobante de pago para que inicien la preparación en taller. ¡Muchas gracias! ✨`,
        ];

        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
          waLines.join('\n')
        )}`;

        return NextResponse.json({
          text: `¡Qué gran elección! He registrado formalmente tu pedido de **${args.product_name}** en nuestro sistema con estado **Pendiente de pago**. 🌸\n\nPara que nuestro taller comience con la preparación de tus flores frescas y confirme el horario de delivery, por favor envía la constancia de tu Yape, Plin o transferencia haciendo clic en el botón de WhatsApp a continuación:`,
          orderCreated: {
            id: newOrder?.id,
            product_name: args.product_name,
            recipient_name: args.recipient_name,
            phone: args.phone,
            delivery_address: args.delivery_address,
            delivery_date: args.delivery_date,
            dedication_message: args.dedication_message || '',
            amount: finalAmount,
            payment_method: args.payment_method || 'Yape',
            whatsapp_url: whatsappUrl,
          },
        });
      }
    }

    // Respuesta conversacional regular
    return NextResponse.json({
      text: response.text || '¿En qué arreglo o detalle floral de PETALIA te puedo asesorar hoy? 🌸',
    });
  } catch (error: any) {
    console.error('Error en /api/chat:', error);
    return NextResponse.json(
      {
        text: 'Lo siento, ocurrió un pequeño problema al procesar tu consulta. Si deseas atención inmediata, puedes escribirnos directamente a nuestro WhatsApp oficial: +51 924 257 784 🌸',
        error: error?.message,
      },
      { status: 500 }
    );
  }
}
