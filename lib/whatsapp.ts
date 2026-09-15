/**
 * Generador de plantillas de mensajes para WhatsApp — ROZIER Alta Floristería
 */

import { formatLocalDate } from './format';

export const DEFAULT_WHATSAPP_NUMBER = '51924257784';

export interface ExtraItem {
  name: string;
  price: number;
  quantity?: number;
}

export interface OrderItemSummary {
  name: string;
  quantity: number;
  price?: number;
}

export interface OrderWhatsAppDetails {
  trackingCode: string;
  customerName?: string;
  customerPhone?: string;
  productName?: string;
  products?: OrderItemSummary[];
  recipientName: string;
  deliveryAddress: string;
  deliveryDistrict?: string;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  totalAmount: number;
  paymentMethod: string;
  dedicationMessage?: string;
  extraItems?: ExtraItem[];
  trackingUrl?: string;
}

/**
 * Genera el mensaje oficial para WhatsApp de confirmación de pedido
 */
export function generateOrderWhatsAppMessage(details: OrderWhatsAppDetails): string {
  const lines: string[] = [
    '🌸 *NUEVO PEDIDO CONFIRMADO — ROZIER* 🌸',
    '',
    `🏷️ *Código de Orden:* ${details.trackingCode}`,
  ];

  if (details.customerName) {
    lines.push(`👤 *Comprador:* ${details.customerName}${details.customerPhone ? ` (${details.customerPhone})` : ''}`);
  }

  // 1. Producto floral
  if (details.products && details.products.length > 0) {
    lines.push('📦 *Producto Floral:*');
    details.products.forEach((p) => {
      const priceStr = p.price !== undefined ? ` - S/ ${(p.price * p.quantity).toFixed(2)}` : '';
      lines.push(`  • ${p.name} (x${p.quantity})${priceStr}`);
    });
  } else if (details.productName) {
    lines.push(`📦 *Producto Floral:* ${details.productName}`);
  }

  // 2. Toques especiales
  if (details.extraItems && details.extraItems.length > 0) {
    lines.push('✨ *Toques Especiales:*');
    details.extraItems.forEach((item) => {
      lines.push(`  • ${item.name} (${item.quantity || 1}x S/ ${Number(item.price).toFixed(2)})`);
    });
  }

  // 3. Destinatario, Dirección y Distrito
  lines.push(`🎁 *Destinatario:* ${details.recipientName}`);
  const addressAndDistrict = details.deliveryDistrict
    ? `${details.deliveryAddress} (${details.deliveryDistrict})`
    : details.deliveryAddress;
  lines.push(`📍 *Dirección y Distrito:* ${addressAndDistrict}`);

  if (details.deliveryDate) {
    lines.push(`📅 *Fecha de Entrega:* ${formatLocalDate(details.deliveryDate)}${details.deliveryTimeSlot ? ` (${details.deliveryTimeSlot})` : ''}`);
  }

  // 4. Dedicatoria de la tarjeta
  const cleanDedication = details.dedicationMessage?.trim();
  lines.push(
    cleanDedication && cleanDedication !== '' && cleanDedication.toLowerCase() !== 'sin dedicatoria'
      ? `✍️ *Dedicatoria de la Tarjeta:* "${cleanDedication}"`
      : '✍️ *Dedicatoria de la Tarjeta:* Sin dedicatoria'
  );

  // 5. Monto total en S/ y método de pago
  lines.push('');
  lines.push(`💰 *Monto Total:* S/ ${details.totalAmount.toFixed(2)}`);
  lines.push(`💳 *Método de Pago:* ${details.paymentMethod.toUpperCase()}`);

  if (details.trackingUrl) {
    lines.push(`🔍 *Rastreo en Vivo:* ${details.trackingUrl}`);
  }

  lines.push(
    '',
    'Adjunto mi comprobante de pago para validar la orden y dar inicio a la preparación. ¡Muchas gracias por elegir ROZIER! ✨'
  );

  return lines.join('\n');
}

/**
 * Genera el enlace de WhatsApp (wa.me) con el número oficial y texto codificado
 */
export function createWhatsAppLink(phoneNumber?: string | null, message: string = ''): string {
  const rawNum = phoneNumber && phoneNumber.trim() !== '' ? phoneNumber : DEFAULT_WHATSAPP_NUMBER;
  const cleanNumber = rawNum.replace(/\D/g, '');
  return `https://wa.me/${cleanNumber}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
