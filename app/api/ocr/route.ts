import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { OCRResult } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'GEMINI_API_KEY no está configurada en el archivo .env.local.',
        },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = (formData.get('file') || formData.get('image')) as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se envió ningún archivo de imagen para escanear.' },
        { status: 400 }
      );
    }

    // Convert file to buffer and base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const ai = new GoogleGenAI({ apiKey });

    const promptText = `Analiza detalladamente esta captura de pantalla de comprobante de pago peruano (Yape, Plin o Transferencia bancaria).
Extrae con estricta exactitud los siguientes datos y responde únicamente un JSON válido sin markdown ni comentarios adicionales:
{
  "billetera": "Yape" | "Plin" | "Transferencia",
  "monto": number, // solo el número, ej: 85.50
  "remitente": string, // nombre de la persona que envió el dinero o titular
  "numero_operacion": string, // número de operación / código de referencia
  "fecha": string // fecha en formato YYYY-MM-DD
}

Reglas:
1. Si es Yape (color morado/cyan característico, texto "¡Yapeaste!", etc.), billetera es "Yape".
2. Si es Plin (color celeste/azul), billetera es "Plin".
3. Si es BCP, BBVA, Interbank o Scotiabank sin ser Yape/Plin, billetera es "Transferencia".
4. Si falta algún dato, coloca "" para strings o 0 para monto, pero siempre mantén la estructura.`;

    let responseText: string | undefined;

    // Intentamos con gemini-2.5-flash y fallback a gemini-1.5-flash
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
      responseText = response.text;
    } catch (primaryErr) {
      console.warn('Error con gemini-2.5-flash, probando gemini-1.5-flash...', primaryErr);
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });
      responseText = fallbackResponse.text;
    }

    if (!responseText) {
      throw new Error('Gemini no devolvió texto de respuesta para el comprobante.');
    }

    // Limpiar posibles delimitadores de código markdown si vinieran
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanJson);

    const result: OCRResult = {
      billetera:
        parsed.billetera === 'Yape' || parsed.billetera === 'Plin' || parsed.billetera === 'Transferencia'
          ? parsed.billetera
          : 'Yape',
      monto: typeof parsed.monto === 'number' ? parsed.monto : parseFloat(parsed.monto) || 0,
      remitente: String(parsed.remitente || '').trim(),
      numero_operacion: String(parsed.numero_operacion || '').trim(),
      fecha: String(parsed.fecha || '').trim(),
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error procesando OCR con Gemini:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Error interno al procesar comprobante con Gemini OCR.',
      },
      { status: 500 }
    );
  }
}
