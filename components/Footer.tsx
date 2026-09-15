'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Mail, BookOpen } from 'lucide-react';

interface FooterProps {
  onOpenTracking?: () => void;
  whatsappNumber?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  logoUrl?: string;
}

export default function Footer({
  onOpenTracking,
  whatsappNumber = '51924257784',
  instagramUrl = 'https://instagram.com/rozier.pe',
  facebookUrl = 'https://facebook.com/rozier.pe',
  tiktokUrl = 'https://tiktok.com/@rozier.pe',
  logoUrl,
}: FooterProps) {
  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer
      className="bg-[#FBF4F6] py-14 md:py-18 px-6 md:px-12 lg:px-16 relative overflow-hidden w-full max-w-full"
      style={{
        backgroundImage: 'radial-gradient(#F0D5DC 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 md:gap-8">
          {/* COLUMNA 1 — Marca y Propuesta de Valor */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="relative shrink-0">
                <img
                  src={logoUrl || '/images/logo web.jpg'}
                  alt="ROZIER Isotipo Floral"
                  className="w-10 h-10 md:w-11 md:h-11 object-contain rounded-xl border border-rose-200/80 shadow-2xs group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/logo.jpg';
                  }}
                />
              </div>
              <span className="font-serif italic text-3xl md:text-4xl font-normal text-[var(--rose-600)] leading-none tracking-wide select-none group-hover:opacity-90 transition-opacity">
                ROZIER
              </span>
            </Link>

            <div className="text-sm text-[#686161] leading-relaxed max-w-sm space-y-2">
              <p className="font-serif italic text-[#4A4240] text-base font-normal">
                «La exclusividad de crear momentos inolvidables»
              </p>
              <p>
                Alta floristería de autor y diseño floral contemporáneo en Lima Metropolitana.
                Transformamos emociones en memorias vivas.
              </p>
              <p>
                Flores frescas de selección premium, entregas garantizadas en rangos horarios y
                empaques de lujo concebidos para emocionar.
              </p>
            </div>

            {/* Redes Sociales Outline */}
            <div className="flex items-center gap-4 pt-2">
              {/* Instagram */}
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram de ROZIER"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-900)] hover:text-[var(--rose-600)] transition-colors duration-150"
              >
                <svg
                  className="w-5 h-5 stroke-current fill-none stroke-[1.8]"
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>

              {/* Facebook */}
              <a
                href={facebookUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook de ROZIER"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-900)] hover:text-[var(--rose-600)] transition-colors duration-150"
              >
                <svg
                  className="w-5 h-5 stroke-current fill-none stroke-[1.8]"
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>

              {/* TikTok */}
              <a
                href={tiktokUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok de ROZIER"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-900)] hover:text-[var(--rose-600)] transition-colors duration-150"
              >
                <svg
                  className="w-5 h-5 stroke-current fill-none stroke-[1.8]"
                  viewBox="0 0 24 24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
              </a>
            </div>
          </div>

          {/* COLUMNA 2 — Cuenta */}
          <div className="lg:col-span-2">
            <h4 className="font-bold text-[var(--rose-600)] uppercase text-xs tracking-wider mb-4">
              MI CUENTA
            </h4>
            <ul className="space-y-2.5 text-sm text-[var(--ink-900)]">
              <li>
                <Link
                  href="/admin/login"
                  className="inline-block transition-all duration-150 ease-out hover:translate-x-1 hover:text-[var(--rose-600)]"
                >
                  Información personal
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenTracking?.()}
                  className="inline-block transition-all duration-150 ease-out hover:translate-x-1 hover:text-[var(--rose-600)] cursor-pointer"
                >
                  Mis Pedidos
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollTo('catalogo')}
                  className="inline-block transition-all duration-150 ease-out hover:translate-x-1 hover:text-[var(--rose-600)] cursor-pointer"
                >
                  Direcciones de entrega
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenTracking?.()}
                  className="inline-block transition-all duration-150 ease-out hover:translate-x-1 hover:text-[var(--rose-600)] cursor-pointer"
                >
                  Rastreo de envíos
                </button>
              </li>
            </ul>
          </div>

          {/* COLUMNA 3 — Políticas y Servicio */}
          <div className="lg:col-span-2">
            <h4 className="font-bold text-[var(--rose-600)] uppercase text-xs tracking-wider mb-4">
              POLÍTICAS
            </h4>
            <ul className="space-y-2.5 text-sm text-[var(--ink-900)]">
              <li>
                <span className="text-[var(--ink-900)]">Atención 24/7 en tienda web</span>
              </li>
              <li>
                <a
                  href={`https://wa.me/${whatsappNumber}?text=Hola%20ROZIER,%20deseo%20consultar%20sobre%20los%20T%C3%A9rminos%20y%20Condiciones.`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block transition-all duration-150 ease-out hover:translate-x-1 hover:text-[var(--rose-600)]"
                >
                  Términos y condiciones
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${whatsappNumber}?text=Hola%20ROZIER,%20deseo%20conocer%20las%20Pol%C3%ADticas%20de%20entrega%20y%20garant%C3%ADa.`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block transition-all duration-150 ease-out hover:translate-x-1 hover:text-[var(--rose-600)]"
                >
                  Políticas de entrega y garantía
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollTo('unfold-story')}
                  className="inline-block transition-all duration-150 ease-out hover:translate-x-1 hover:text-[var(--rose-600)] cursor-pointer"
                >
                  Sobre nosotros
                </button>
              </li>
              <li>
                <a
                  href={`https://wa.me/${whatsappNumber}?text=Hola%20ROZIER,%20deseo%20acceder%20al%20Libro%20de%20Reclamaciones%20virtual.`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 transition-all duration-150 ease-out hover:translate-x-1 hover:text-[var(--rose-600)]"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[var(--rose-600)]" />
                  <span>Libro de Reclamaciones</span>
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMNA 4 — Información y Contacto */}
          <div className="lg:col-span-2">
            <h4 className="font-bold text-[var(--rose-600)] uppercase text-xs tracking-wider mb-4">
              INFORMACIÓN
            </h4>
            <ul className="space-y-3 text-sm text-[var(--ink-900)]">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[var(--rose-600)] shrink-0 mt-0.5" />
                <span className="text-xs leading-snug">Atelier en Lima Metropolitana</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[var(--rose-600)] shrink-0 mt-0.5" />
                <a
                  href={`tel:+${whatsappNumber}`}
                  className="text-xs leading-snug hover:text-[var(--rose-600)] transition-colors"
                >
                  +51 987 654 321 / (01) 446 4666
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-[var(--rose-600)] shrink-0 mt-0.5" />
                <a
                  href="mailto:contacto@rozier.pe"
                  className="text-xs leading-snug hover:text-[var(--rose-600)] transition-colors"
                >
                  contacto@rozier.pe
                </a>
              </li>
              <li className="pt-1">
                <a
                  href={`https://wa.me/${whatsappNumber}?text=Hola%20ROZIER,%20deseo%20solicitar%20el%20Cat%C3%A1logo%20Corporativo.`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs font-semibold text-[var(--rose-600)] underline transition-all duration-150 ease-out hover:translate-x-1"
                >
                  Catálogo Corporativo →
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMNA 5 — Medios de Pago Confiables */}
          <div className="lg:col-span-2">
            <h4 className="font-bold text-[var(--rose-600)] uppercase text-xs tracking-wider mb-4">
              MEDIOS DE PAGO
            </h4>
            <div className="space-y-2">
              <span className="text-xs text-[#686161] block leading-tight">
                Transferencias directas y pasarelas 100% encriptadas:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {/* Yape */}
                <div
                  title="Yape Oficial"
                  className="p-1.5 rounded-md border border-rose-100/80 bg-[#742284] text-white shadow-none flex items-center justify-center h-7 px-2"
                >
                  <span className="font-extrabold text-[10px] tracking-tight">Yape</span>
                </div>

                {/* Plin */}
                <div
                  title="Plin Oficial"
                  className="p-1.5 rounded-md border border-rose-100/80 bg-[#00D2FF] text-white shadow-none flex items-center justify-center h-7 px-2"
                >
                  <span className="font-extrabold text-[10px] tracking-tight">Plin</span>
                </div>

                {/* BCP */}
                <div
                  title="BCP - Banco de Crédito"
                  className="p-1.5 rounded-md border border-rose-100/80 bg-[#002A8F] text-white shadow-none flex items-center justify-center h-7 px-2"
                >
                  <span className="font-extrabold text-[10px] tracking-tight">BCP</span>
                </div>

                {/* BBVA */}
                <div
                  title="BBVA Continental"
                  className="p-1.5 rounded-md border border-rose-100/80 bg-[#004481] text-white shadow-none flex items-center justify-center h-7 px-2"
                >
                  <span className="font-extrabold text-[10px] tracking-tight">BBVA</span>
                </div>

                {/* Interbank */}
                <div
                  title="Interbank"
                  className="p-1.5 rounded-md border border-rose-100/80 bg-white shadow-none flex items-center gap-1 h-7 px-2"
                >
                  <span className="w-2 h-2 rounded-xs bg-[#059669]" />
                  <span className="font-bold text-[#059669] text-[10px] tracking-tight">IBK</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra Inferior de Copyright */}
        <div className="border-t border-rose-200/50 mt-12 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-[#686161] gap-3 max-w-7xl mx-auto">
          <p className="text-center md:text-left">
            © 2026 ROZIER. Todos los derechos reservados.
          </p>
          <p className="text-center md:text-right font-light">
            La exclusividad de crear momentos inolvidables • Lima Metropolitana.
          </p>
        </div>
      </div>
    </footer>
  );
}
