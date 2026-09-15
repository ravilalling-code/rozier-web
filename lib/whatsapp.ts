/**
 * Generador de plantillas de mensajes para WhatsApp — ROZIER Alta Floristería
 */

import { formatLocalDate } from './format';

export interface OrderWhatsAppDetails {
  trackingCode: string;
  customerName: string;
  customerPhone?: string;
  productName: string;
  recipientName: string;
  deliveryAddress: string;
  deliveryDate: string;
  totalAmount: number;
  paymentMethod: string;
  dedicationMessage?: string;
  extraItems?: Array<{ name: string; price: number; quantity?: number }>;
  trackingUrl?: string;
}

/**
 * Genera el mensaje oficial para WhatsApp de confirmación de pedido
 * Encabezado estandarizado: 🌸 *NUEVO PEDIDO CONFIRMADO — ROZIER* 🌸
 */
export function generateOrderWhatsAppMessage(details: OrderWhatsAppDetails): string {
  const lines: string[] = [
    '🌸 *NUEVO PEDIDO CONFIRMADO — ROZIER* 🌸',
    '',
    `🔖 *Código de rastreo:* ${details.trackingCode}`,
    `👤 *Comprador:* ${details.customerName}${details.customerPhone ? ` (${details.customerPhone})` : ''}`,
    `📦 *Arreglo Floral:* ${details.productName}`,
  ];

  if (details.extraItems && details.extraItems.length > 0) {
    const addonsListText = details.extraItems
      .map((item) => `${item.name} (${item.quantity || 1}x S/ ${Number(item.price).toFixed(2)})`)
      .join(', ');
    lines.push(`✨ *Toques Especiales:* ${addonsListText}`);
  }

  lines.push(
    `💰 *Monto Total:* S/ ${details.totalAmount.toFixed(2)}`,
    `🎁 *Destinatario:* ${details.recipientName}`,
    `📍 *Dirección de Entrega:* ${details.deliveryAddress}`,
    `📅 *Fecha de Entrega:* ${formatLocalDate(details.deliveryDate)}`,
    details.dedicationMessage && details.dedicationMessage.trim() !== ''
      ? `✍️ *Dedicatoria:* "${details.dedicationMessage.trim()}"`
      : '✍️ *Dedicatoria:* Sin dedicatoria por ahora',
    '',
    `💳 *Método de Pago:* ${details.paymentMethod.toUpperCase()}`
  );

  if (details.trackingUrl) {
    lines.push(`🔍 *Seguimiento en Vivo:* ${details.trackingUrl}`);
  }

  lines.push(
    '',
    'Adjunto el comprobante de pago para dar inicio a la preparación. ¡Muchas gracias por confiar en ROZIER! ✨'
  );

  return lines.join('\n');
}

/**
 * Genera el enlace de WhatsApp (wa.me) con el texto codificado
 */
export function createWhatsAppLink(phoneNumber: string, message: string): string {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}
