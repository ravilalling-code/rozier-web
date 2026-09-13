'use client';

import { useState, useEffect } from 'react';
import { getStoreSettings, updateStoreSettings, DEFAULT_SETTINGS } from '@/lib/settings';
import { StoreSettings } from '@/lib/types';
import {
  Share2,
  MessageCircle,
  Video,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Store,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getStoreSettings();
        setSettings(data);
      } catch (err: any) {
        setErrorMsg('Error al cargar la configuración.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const updated = await updateStoreSettings(settings);
      setSettings(updated);
      setSuccessMsg('¡Enlaces de redes sociales y WhatsApp guardados con éxito!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg('Error al guardar la configuración: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Redes Sociales & Ajustes de Tienda
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-800 text-rose-400 border border-neutral-700">
              Público
            </span>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Configura los enlaces oficiales de Instagram, Facebook, TikTok y el WhatsApp del taller.
          </p>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-200 text-xs font-medium px-4 py-2.5 rounded-xl transition shadow-sm self-start sm:self-auto"
        >
          <Store className="w-4 h-4 text-emerald-400" />
          <span>Ver tienda pública</span>
          <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
        </a>
      </div>

      {/* Alertas */}
      {successMsg && (
        <div className="bg-emerald-950/70 border border-emerald-800/80 rounded-2xl p-4 flex items-center gap-3 text-emerald-300 text-xs shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-950/70 border border-rose-800/80 rounded-2xl p-4 flex items-center gap-3 text-rose-300 text-xs shadow-lg animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulario */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
          <p className="text-sm">Cargando configuración...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-neutral-800">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Presencia Digital & Redes Oficiales</h2>
                <p className="text-xs text-neutral-400">
                  Estos enlaces se mostrarán en el pie de página y botones de contacto de la tienda web.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* WhatsApp */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Número Oficial de WhatsApp (con código de país, ej: 51924257784)</span>
                </label>
                <input
                  type="text"
                  value={settings.whatsapp_number}
                  onChange={(e) =>
                    setSettings({ ...settings, whatsapp_number: e.target.value.replace(/\D/g, '') })
                  }
                  placeholder="51924257784"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition font-mono"
                  required
                />
                <p className="text-[11px] text-neutral-500">
                  Es el número donde los clientes envían sus pedidos y comprobantes de pago.
                </p>
              </div>

              {/* Instagram */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-2">
                  <svg className="w-4 h-4 fill-current text-pink-400" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <span>Perfil de Instagram</span>
                </label>
                <input
                  type="url"
                  value={settings.instagram_url}
                  onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                  placeholder="https://instagram.com/petalia.floral"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              {/* Facebook */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-2">
                  <svg className="w-4 h-4 fill-current text-blue-400" viewBox="0 0 24 24">
                    <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.667 5H18V0h-3.808C10.592 0 9 1.583 9 4.615V8z" />
                  </svg>
                  <span>Página de Facebook</span>
                </label>
                <input
                  type="url"
                  value={settings.facebook_url}
                  onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                  placeholder="https://facebook.com/petalia.pe"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              {/* TikTok */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-2">
                  <Video className="w-4 h-4 text-rose-400" />
                  <span>Perfil de TikTok</span>
                </label>
                <input
                  type="url"
                  value={settings.tiktok_url}
                  onChange={(e) => setSettings({ ...settings, tiktok_url: e.target.value })}
                  placeholder="https://tiktok.com/@petalia_flores"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-rose-950 transition active:scale-98 text-sm disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando cambios...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Configuración</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
