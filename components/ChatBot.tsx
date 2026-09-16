'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Flower2,
  CheckCircle2,
  Truck,
  Heart,
  ExternalLink,
  Loader2,
  ArrowRight,
  RefreshCw,
  Gift,
  Copy,
  Check,
  Download,
  QrCode,
} from 'lucide-react';
import { formatLocalDate } from '@/lib/format';

interface OrderCreatedData {
  id?: string;
  tracking_code?: string;
  product_name: string;
  customer_name?: string;
  recipient_name: string;
  phone: string;
  delivery_address: string;
  delivery_date: string;
  dedication_message?: string;
  amount: number;
  payment_method?: string;
  whatsapp_url: string;
}

interface RecommendedProduct {
  id?: string;
  name: string;
  price: number;
  image_url: string;
  category?: string;
  description?: string;
}

interface RecommendedAddon {
  id?: string;
  name: string;
  price: number;
  image_url?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  orderCreated?: OrderCreatedData;
  recommendedProducts?: RecommendedProduct[];
  recommendedAddons?: RecommendedAddon[];
  quickReplies?: string[];
  timestamp: string;
}

const INITIAL_SUGGESTIONS = [
  '🌸 Recomiéndame un arreglo floral',
  '🌹 Arreglos para aniversario o amor',
  '🎂 Opciones para cumpleaños',
  '🍫 ¿Qué toques especiales o complementos tienen?',
  '🚚 Cobertura y delivery en Lima',
  '💜 Pagar con Yape / Plin',
  '🔎 Rastrear mi pedido',
];

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<RecommendedProduct | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '¡Hola! 🌸 Soy tu Concierge Floral de **ROZIER**.\n\nEstoy aquí para acompañarte a seleccionar o diseñar el arreglo perfecto para esa persona especial. La exclusividad de crear momentos inolvidables. ¿En qué detalle puedo complacerte hoy?\n\n✨ **1. Recomendarte arreglos según la ocasión** (Aniversario, Amor, Cumpleaños, etc.)\n🍫 **2. Añadir un Toque Especial** (Chocolates Ferrero, Peluches, Vinos o Globos)\n🚚 **3. Rastrear tu pedido en tiempo real** (con tu código ej. **ROZ-8492**)\n💜 **4. Consultar métodos de pago y delivery** en Lima Metropolitana',
      timestamp: 'Ahora',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Escuchar cuando el drawer del carrito se abre o cierra para ocultar la Asesora
  useEffect(() => {
    const checkCartState = () => {
      const isBodyCartOpen = typeof document !== 'undefined' && document.body.classList.contains('cart-drawer-open');
      setIsCartOpen(isBodyCartOpen);
    };

    checkCartState();

    const handleCartToggle = (e: any) => {
      setIsCartOpen(Boolean(e.detail?.isOpen));
    };

    window.addEventListener('rozier:cart-toggle', handleCartToggle);

    const observer = new MutationObserver(() => {
      checkCartState();
    });

    if (typeof document !== 'undefined' && document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    return () => {
      window.removeEventListener('rozier:cart-toggle', handleCartToggle);
      observer.disconnect();
    };
  }, []);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText('924257784');
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  /**
   * Flujo Secuencial Estricto al pulsar [ Elegir este diseño ]
   */
  const handleSelectProduct = (prod: RecommendedProduct) => {
    setSelectedProduct(prod);

    // 1. Mensaje del usuario seleccionando el producto
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: `Deseo elegir el diseño ${prod.name} (S/ ${Number(prod.price).toFixed(2)})`,
      timestamp: new Date().toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    // 2. Paso Inmediato Siguiente (estricto según requerimiento):
    // "Excelente elección. Para coordinar la entrega exclusiva de tu [Nombre del Producto], indícame tu Nombre y Teléfono de contacto."
    const assistantPrompt: Message = {
      id: `assistant-${Date.now() + 1}`,
      role: 'assistant',
      content: `Excelente elección. Para coordinar la entrega exclusiva de tu **${prod.name}**, indícame tu Nombre y Teléfono de contacto.`,
      timestamp: new Date().toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMsg, assistantPrompt]);
    setTimeout(() => {
      scrollToBottom();
      inputRef.current?.focus();
    }, 100);
  };

  /**
   * Limpia descripciones y líneas redundantes cuando ya existen tarjetas visuales del producto
   */
  const cleanRedundantProductText = (content: string, prods?: RecommendedProduct[]) => {
    let text = content
      .replace(/\[MOSTRAR_QR_YAPE\]/gi, '')
      .replace(/\[PRODUCTO:\s*[^|\]]+\s*\|\s*([^|\]]+)\s*\|\s*([^\]]+)\]/gi, '')
      .replace(/\[ADDON:\s*[^|\]]+\s*\|\s*[^|\]]+(?:\s*\|\s*[^\]]+)?\]/gi, '');

    if (prods && prods.length > 0) {
      const lines = text.split('\n');
      const filtered = lines.filter((line) => {
        const trimmed = line.trim().toLowerCase();
        if (!trimmed) return false;
        return !prods.some((p) => {
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
      text = filtered.join('\n');
    }

    const trimmed = text.trim();
    if (!trimmed && prods && prods.length > 0) {
      return 'He seleccionado estas opciones exclusivas para ti 🌸:';
    }

    return trimmed;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Filtrar el mensaje de bienvenida y formatear historial para la API
      const apiMessages = newMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          selectedProduct: selectedProduct
            ? {
                id: selectedProduct.id,
                name: selectedProduct.name,
                price: selectedProduct.price,
              }
            : undefined,
        }),
      });

      const data = await res.json();

      // Extraer si llegaron productos recomendados directos o en texto
      const recProds: RecommendedProduct[] = data.recommendedProducts || [];
      const recAddons: RecommendedAddon[] = data.recommendedAddons || [];
      const qReplies: string[] = data.quickReplies || [];

      // Si vienen etiquetas en el texto que no hayan sido parseadas
      const rawText = data.text || '';
      if (recProds.length === 0) {
        const prodTagRegex = /\[PRODUCTO:\s*([^|\]]+)\s*\|\s*([^|\]]+)\s*\|\s*([^\]]+)\]/gi;
        let match;
        while ((match = prodTagRegex.exec(rawText)) !== null) {
          recProds.push({
            name: match[1].trim(),
            price: parseFloat(match[2].replace(/[^\d.]/g, '')) || 0,
            image_url: match[3].trim(),
          });
        }
      }

      // Deduplicar productos para garantizar que cada diseño se renderice UNA SOLA VEZ
      const seenProdMap = new Map<string, RecommendedProduct>();
      recProds.forEach((p) => {
        const key = p.name.trim().toLowerCase();
        if (key && !seenProdMap.has(key)) {
          seenProdMap.set(key, p);
        }
      });
      const uniqueProds = Array.from(seenProdMap.values());

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: rawText || '¿Deseas que te brinde más detalles de alguno de nuestros arreglos? 🌸',
        orderCreated: data.orderCreated,
        recommendedProducts: uniqueProds.length > 0 ? uniqueProds : undefined,
        recommendedAddons: recAddons.length > 0 ? recAddons : undefined,
        quickReplies: qReplies.length > 0 ? qReplies : undefined,
        timestamp: new Date().toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error enviando mensaje al chatbot:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            'Disculpa, ocurrió un error de conexión momentáneo. Puedes contactar directamente a nuestro WhatsApp oficial de ROZIER: **+51 924 257 784** 🌸',
          timestamp: 'Ahora',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Renderizador básico de markdown para negritas y saltos de línea
  const renderFormattedText = (content: string) => {
    return content.split('\n').map((line, idx) => {
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      // Reemplazo simple de **negrita**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className="mb-1 leading-relaxed">
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-semibold text-stone-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div
      className={`rozier-chatbot-container transition-all duration-300 ${
        isCartOpen ? 'hidden opacity-0 pointer-events-none -translate-y-4' : ''
      }`}
    >
      {/* Botón Flotante Moderno Palo Rosa & Alta Gama */}
      {!isOpen && (
        <div
          className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2 transition-all duration-300 ${
            isCartOpen ? 'hidden opacity-0 pointer-events-none -translate-y-4' : ''
          }`}
        >
          {hasUnread && (
            <div className="hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md border border-[#E8B4B8] text-xs text-[#1A1A1A] font-medium animate-bounce">
              <span className="w-2 h-2 rounded-full bg-[#D49A9E] animate-ping" />
              <span>¿Buscas un arreglo especial?</span>
            </div>
          )}

          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center justify-center w-12 h-12 md:w-auto md:h-auto md:px-4 md:py-3.5 bg-[#1A1A1A] hover:bg-[#D49A9E] text-white hover:text-[#1A1A1A] rounded-full shadow-lg shadow-black/20 border border-[#D49A9E]/60 transition-all duration-300 transform hover:scale-105 active:scale-[0.98] shrink-0"
            aria-label="Abrir Concierge Virtual ROZIER"
            title="Concierge ROZIER"
          >
            <div className="relative flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#E8B4B8] group-hover:text-[#1A1A1A] animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#D49A9E] border-2 border-[#1A1A1A] rounded-full" />
            </div>
            <span className="hidden md:inline-block text-xs font-bold tracking-wide ml-2.5">
              Asesora ROZIER
            </span>
          </button>
        </div>
      )}

      {/* Ventana Desplegable del Chatbot */}
      {isOpen && (
        <div
          className={`fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-4 sm:right-4 md:bottom-6 md:right-6 z-50 w-full sm:w-[400px] md:w-[420px] max-w-full h-[90vh] sm:h-[600px] max-h-[100dvh] bg-white sm:rounded-2xl shadow-2xl border border-[#EFEAE9] card-editorial flex flex-col overflow-hidden animate-spring-modal ${
            isCartOpen ? 'hidden opacity-0 pointer-events-none -translate-y-4' : ''
          }`}
        >
          {/* Header Elegante Alta Gama */}
          <div className="bg-[#111111] text-white p-4 flex items-center justify-between shadow-md border-b border-[#1A1A1A]">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-lg bg-[#F9ECEE] text-[#D49A9E] border border-[#E8B4B8] flex items-center justify-center shadow-xs">
                <Flower2 className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#D49A9E] border-2 border-[#111111] rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white tracking-tight">Concierge ROZIER</h3>
                  <span className="text-[10px] uppercase font-semibold bg-[#F9ECEE] text-[#C94A58] border border-[#E8B4B8]/40 px-1.5 py-0.2 rounded-md">
                    IA
                  </span>
                </div>
                <p className="text-[11px] text-[#686161] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8B4B8] animate-pulse" />
                  <span className="text-stone-300">En línea • ROZIER, Alta Floristería Lima</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="btn-tactile p-1.5 text-stone-300 hover:text-white rounded-lg hover:bg-[#1A1A1A]"
              title="Cerrar chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FDF7F7] text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-xl bg-[#F9ECEE] text-[#D49A9E] border border-[#E8B4B8] flex-shrink-0 flex items-center justify-center shadow-2xs mt-0.5">
                      <Flower2 className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-2`}>
                    <div
                      className={`p-3.5 rounded-2xl shadow-xs ${
                        isUser
                          ? 'bg-[#1A1A1A] text-white rounded-br-xs font-normal'
                          : 'bg-white border border-[#EFEAE9] text-[#1A1A1A] rounded-bl-xs'
                      }`}
                    >
                      {renderFormattedText(
                        cleanRedundantProductText(
                          msg.content,
                          msg.recommendedProducts
                        )
                      )}
                    </div>

                    {/* Tarjeta Visual Interactiva con QR de Yape */}
                    {!isUser &&
                      (msg.content.includes('[MOSTRAR_QR_YAPE]') ||
                        msg.content.toLowerCase().includes('qr de yape') ||
                        msg.content.toLowerCase().includes('código qr') ||
                        msg.content.toLowerCase().includes('pagar con yape') ||
                        msg.content.toLowerCase().includes('pagar con plin') ||
                        (msg.orderCreated && (msg.orderCreated.payment_method === 'yape' || msg.orderCreated.payment_method === 'plin'))) && (
                        <div className="bg-gradient-to-br from-purple-950 via-neutral-900 to-stone-950 text-white rounded-2xl p-4 border border-purple-800/60 shadow-lg space-y-3 animate-in fade-in">
                          <div className="flex items-center justify-between border-b border-purple-800/40 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-xs shadow">
                                Y
                              </div>
                              <div>
                                <h4 className="font-bold text-xs text-purple-200">QR Oficial Yape / Plin</h4>
                                <p className="text-[10px] text-purple-300/80">ROZIER • Alta Floristería</p>
                              </div>
                            </div>
                            <span className="text-[10px] bg-purple-900/80 text-purple-300 border border-purple-700 px-2 py-0.5 rounded-full font-semibold">
                              0% Comisión
                            </span>
                          </div>

                          <div className="flex flex-col items-center bg-white rounded-xl p-3 shadow-inner">
                            <img
                              src="/images/qr-yape.png"
                              alt="QR de Pago Yape ROZIER"
                              className="w-44 h-44 object-contain rounded-lg"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/qr-yape.png';
                              }}
                            />
                            <p className="text-[10px] text-stone-500 font-medium mt-1">
                              Escanea desde tu app Yape o Plin
                            </p>
                          </div>

                          {/* Número telefónico copiable con 1 clic */}
                          <div className="bg-purple-950/80 rounded-xl p-2.5 border border-purple-800/60 flex items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] text-purple-300 block">Número de celular:</span>
                              <span className="font-mono font-bold text-white text-xs tracking-wider">
                                924 257 784
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleCopyPhone}
                              className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition active:scale-95"
                              title="Copiar número de Yape"
                            >
                              {copiedPhone ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-300" />
                                  <span>¡Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Botón Descargar QR */}
                          <a
                            href="/images/qr-yape.png"
                            download="qr-yape-rozier.png"
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-2 rounded-xl text-xs shadow transition active:scale-98"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Descargar QR en mi celular</span>
                          </a>
                        </div>
                      )}

                    {/* Tarjeta Destacada de Pedido Creado */}
                    {msg.orderCreated && (
                      <div className="bg-gradient-to-br from-emerald-50 to-stone-50 border border-emerald-200 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                            <Gift className="w-4 h-4 text-emerald-600" />
                            <span>Pedido Generado</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            Pendiente de pago
                          </span>
                        </div>

                        {msg.orderCreated.tracking_code && (
                          <div className="flex justify-between items-center bg-rose-50/80 p-2 rounded-xl border border-rose-200/80 text-[11px]">
                            <span className="text-stone-600 font-semibold flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-rose-500" />
                              Código de Seguimiento:
                            </span>
                            <a
                              href={`/?track=${msg.orderCreated.tracking_code}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono font-bold text-rose-600 hover:underline flex items-center gap-1"
                              title="Ver en rastreador web"
                            >
                              <span>{msg.orderCreated.tracking_code}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        <div className="space-y-1.5 text-[11px] text-stone-700">
                          <div className="flex justify-between items-baseline">
                            <span className="text-stone-500">Arreglo:</span>
                            <span className="font-bold text-stone-900 text-xs">
                              {msg.orderCreated.product_name}
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-stone-500">Total a pagar:</span>
                            <span className="font-bold text-rose-600 font-mono text-sm">
                              S/ {Number(msg.orderCreated.amount).toFixed(2)}
                            </span>
                          </div>
                          {msg.orderCreated.customer_name && (
                            <div className="flex justify-between items-baseline">
                              <span className="text-stone-500">Comprador:</span>
                              <span className="font-medium text-stone-800">
                                {msg.orderCreated.customer_name} {msg.orderCreated.phone ? `(${msg.orderCreated.phone})` : ''}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-baseline">
                            <span className="text-stone-500">Destinatario:</span>
                            <span className="font-medium text-stone-800">
                              {msg.orderCreated.recipient_name}
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-stone-500">Fecha entrega:</span>
                            <span className="font-medium text-stone-800">
                              {formatLocalDate(msg.orderCreated.delivery_date)}
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-stone-500">Dirección:</span>
                            <span className="font-medium text-stone-800 truncate max-w-[180px]">
                              {msg.orderCreated.delivery_address}
                            </span>
                          </div>
                          {msg.orderCreated.dedication_message && (
                            <div className="pt-1 text-stone-600 italic border-t border-emerald-100">
                              &ldquo;{msg.orderCreated.dedication_message}&rdquo;
                            </div>
                          )}
                        </div>

                        {/* Botón Prominente para Enviar Comprobante por WhatsApp */}
                        <a
                          href={msg.orderCreated.whatsapp_url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold py-3 px-3 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs text-center border border-emerald-400/30"
                        >
                          <MessageCircle className="w-4 h-4 fill-white/80" />
                          <span>Enviar Comprobante a WhatsApp</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* TARJETAS VISUALES DE ARREGLOS RECOMENDADOS */}
                    {!isUser && msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                      <div className="space-y-2.5 pt-1 animate-in fade-in">
                        <div className="text-[11px] font-semibold text-rose-800 flex items-center gap-1.5 px-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Diseños Florales Sugeridos:</span>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {msg.recommendedProducts.map((prod, pIdx) => (
                            <div
                              key={pIdx}
                              className="bg-white rounded-2xl border border-warm-200/90 p-3 shadow-xs hover:shadow-md transition-all space-y-2.5 overflow-hidden group"
                            >
                              <div className="relative w-full h-36 rounded-xl overflow-hidden bg-rose-50 border border-warm-100">
                                <img
                                  src={prod.image_url || '/images/logo web.jpg'}
                                  alt={prod.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/images/logo web.jpg';
                                  }}
                                />
                                <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                  ROZIER
                                </span>
                              </div>

                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-bold text-xs text-ink-900 leading-snug">
                                    {prod.name}
                                  </h4>
                                  {prod.description && (
                                    <p className="text-[10px] text-warm-500 line-clamp-1 mt-0.5">
                                      {prod.description}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-bold font-mono text-rose-600 tabular-nums">
                                    S/ {Number(prod.price).toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSelectProduct(prod)}
                                className="w-full bg-ink-900 hover:bg-rose-600 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>Elegir este diseño</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TARJETAS DE TOQUES ESPECIALES / COMPLEMENTOS */}
                    {!isUser && msg.recommendedAddons && msg.recommendedAddons.length > 0 && (
                      <div className="space-y-2 pt-1 animate-in fade-in">
                        <div className="text-[11px] font-semibold text-amber-800 flex items-center gap-1.5 px-0.5">
                          <Gift className="w-3.5 h-3.5 text-amber-600" />
                          <span>Toques Especiales Disponibles:</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {msg.recommendedAddons.map((addon, aIdx) => (
                            <div
                              key={aIdx}
                              className="bg-warm-50/90 rounded-xl border border-warm-200/80 p-2.5 flex items-center justify-between gap-2.5 shadow-2xs"
                            >
                              {addon.image_url && (
                                <img
                                  src={addon.image_url}
                                  alt={addon.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-warm-200 shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h5 className="text-[11px] font-bold text-ink-900 truncate">
                                  {addon.name}
                                </h5>
                                <span className="text-[10px] font-semibold font-mono text-amber-700">
                                  + S/ {Number(addon.price).toFixed(2)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSendMessage(
                                    `Sí, deseo agregar el toque especial: ${addon.name} (S/ ${Number(addon.price).toFixed(2)})`
                                  );
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white border border-warm-200 hover:bg-rose-50 text-[10px] font-semibold text-ink-900 transition shadow-2xs"
                              >
                                Añadir
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* BOTONES INTERACTIVOS DE RESPUESTA RÁPIDA (EMBUDO AGILIZADO) */}
                    {!isUser && msg.quickReplies && msg.quickReplies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1.5 animate-in fade-in">
                        {msg.quickReplies.map((qr, qIdx) => (
                          <button
                            key={qIdx}
                            type="button"
                            onClick={() => handleSendMessage(qr)}
                            className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-ink-900 text-xs font-semibold shadow-2xs transition transform active:scale-95 text-left"
                          >
                            {qr}
                          </button>
                        ))}
                      </div>
                    )}

                    <span
                      className={`block text-[10px] text-stone-400 ${
                        isUser ? 'text-right' : 'text-left pl-1'
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Indicador de Escritura */}
            {isLoading && (
              <div className="flex items-center gap-2 text-stone-500 pl-9 pt-1">
                <div className="w-6 h-6 rounded-full bg-stone-200/80 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                </div>
                <span className="text-[11px] italic text-stone-400">
                  La asesora está consultando disponibilidad...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias Rápidas Iniciales */}
          {messages.length <= 2 && (
            <div className="p-2.5 bg-white border-t border-[#EFEAE9] flex gap-1.5 overflow-x-auto no-scrollbar">
              {INITIAL_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  onClick={() => handleSendMessage(sug)}
                  disabled={isLoading}
                  className="btn-tactile px-3 py-1 rounded-full bg-[#F9ECEE] hover:bg-[#F3E0E3] text-[#686161] hover:text-[#1A1A1A] text-[11px] whitespace-nowrap border border-[#EFEAE9]"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Barra de Entrada de Texto */}
          <div className="p-3 bg-white border-t border-[#EFEAE9] flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta o pide un arreglo..."
              disabled={isLoading}
              className="flex-1 bg-[#FDF7F7] border border-[#EFEAE9] rounded-lg px-4 py-2.5 text-xs text-[#1A1A1A] placeholder:text-[#686161] focus:outline-none focus:border-[#D49A9E] focus:bg-white transition"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputValue.trim()}
              className="btn-tactile p-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#D49A9E] text-white hover:text-[#1A1A1A] shadow-md border border-[#1A1A1A] hover:border-[#D49A9E] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Enviar mensaje"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
