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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  orderCreated?: OrderCreatedData;
  timestamp: string;
}

const INITIAL_SUGGESTIONS = [
  '🌸 Ver catálogo y elegir arreglo',
  '🚚 Rastrear mi pedido',
  '🌹 Opciones para aniversario',
  '🎂 Arreglos para cumpleaños',
];

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '¡Hola! 🌸 Soy la asesora floral de **PETALIA**.\n\nEstoy aquí para acompañarte en cada detalle. ¿Qué deseas hacer hoy?\n\n1️⃣ **🌸 Ver catálogo y elegir arreglo**\n2️⃣ **🚚 Rastrear mi pedido**\n\nCuéntame qué buscas o escribe tu código de seguimiento (ejemplo: **PET-8492**).',
      timestamp: 'Ahora',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);

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
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.text || '¿Deseas que te brinde más detalles de alguno de nuestros arreglos? 🌸',
        orderCreated: data.orderCreated,
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
            'Disculpa, ocurrió un error de conexión momentáneo. Puedes contactar directamente a nuestro WhatsApp oficial: **+51 924 257 784** 🌸',
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
    <>
      {/* Botón Flotante Moderno */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
          {hasUnread && (
            <div className="hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-rose-100 text-xs text-stone-800 font-medium animate-bounce">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>¿Buscas un arreglo especial?</span>
            </div>
          )}

          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-400 text-white px-4 py-3.5 rounded-full shadow-xl shadow-rose-950/20 transition-all duration-300 transform hover:scale-105 active:scale-95"
            aria-label="Abrir Asistente Virtual PETALIA"
          >
            <div className="relative">
              <Sparkles className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-rose-600 rounded-full" />
            </div>
            <span className="text-xs font-bold tracking-wide">
              Asesora Virtual
            </span>
          </button>
        </div>
      )}

      {/* Ventana Desplegable del Chatbot */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-5 sm:right-5 z-50 w-full sm:w-[420px] h-[92vh] sm:h-[620px] max-h-[100vh] bg-white sm:rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header Elegante */}
          <div className="bg-gradient-to-r from-stone-900 via-neutral-900 to-stone-900 text-white p-4 flex items-center justify-between shadow-md border-b border-stone-800">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-950/40">
                <Flower2 className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-stone-900 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white">Asesora PETALIA</h3>
                  <span className="text-[10px] uppercase font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/60 px-1.5 py-0.2 rounded-full">
                    IA
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>En línea • Taller Floral Lima</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition"
              title="Cerrar chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-50/60 text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex-shrink-0 flex items-center justify-center text-white shadow-xs mt-0.5">
                      <Flower2 className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-2`}>
                    <div
                      className={`p-3.5 rounded-2xl shadow-xs ${
                        isUser
                          ? 'bg-stone-900 text-white rounded-br-xs font-normal'
                          : 'bg-white border border-stone-200/80 text-stone-700 rounded-bl-xs'
                      }`}
                    >
                      {renderFormattedText(msg.content)}
                    </div>

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

                        {/* Botón Prominente para Enviar Constancia por WhatsApp */}
                        <a
                          href={msg.orderCreated.whatsapp_url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-3 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs text-center"
                        >
                          <MessageCircle className="w-4 h-4 fill-white/20" />
                          <span>Enviar constancia por WhatsApp</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
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
                  La asesora está consultando el taller...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sugerencias Rápidas Iniciales */}
          {messages.length <= 2 && (
            <div className="p-2.5 bg-white border-t border-stone-100 flex gap-1.5 overflow-x-auto no-scrollbar">
              {INITIAL_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  onClick={() => handleSendMessage(sug)}
                  disabled={isLoading}
                  className="px-3 py-1 rounded-full bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 text-[11px] whitespace-nowrap transition border border-stone-200/70"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Barra de Entrada de Texto */}
          <div className="p-3 bg-white border-t border-stone-200/80 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu consulta o pide un arreglo..."
              disabled={isLoading}
              className="flex-1 bg-stone-100/80 border border-stone-200 rounded-2xl px-4 py-2.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-900 focus:bg-white transition"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputValue.trim()}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-md shadow-rose-950/20 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Enviar mensaje"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
