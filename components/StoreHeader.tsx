'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  User,
  ShoppingBag,
  Menu,
  X,
  ChevronDown,
  Truck,
  Flower2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Category } from '@/lib/types';

interface StoreHeaderProps {
  isScrolled: boolean;
  cartCount: number;
  onOpenCart: () => void;
  onOpenTracking: () => void;
  onSelectCategory: (slug: string) => void;
  categories: Category[];
  logoUrl?: string;
}

export default function StoreHeader({
  isScrolled,
  cartCount,
  onOpenCart,
  onOpenTracking,
  onSelectCategory,
  categories,
  logoUrl = '/images/logo web.jpg',
}: StoreHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);
  const [occasionsMenuOpen, setOccasionsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const collectionRef = useRef<HTMLDivElement>(null);
  const occasionsRef = useRef<HTMLDivElement>(null);

  // Cerrar submenús al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (collectionRef.current && !collectionRef.current.contains(e.target as Node)) {
        setCollectionMenuOpen(false);
      }
      if (occasionsRef.current && !occasionsRef.current.contains(e.target as Node)) {
        setOccasionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategoryClick = (slug: string) => {
    onSelectCategory(slug);
    setCollectionMenuOpen(false);
    setOccasionsMenuOpen(false);
    setMobileMenuOpen(false);
    const catSection = document.getElementById('catalogo');
    if (catSection) {
      catSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 w-full max-w-full z-50 h-20 flex items-center justify-between px-4 sm:px-6 md:px-12 transition-all duration-300 ease-out ${
          isScrolled
            ? 'bg-[#F6E2E6]/95 backdrop-blur-md shadow-sm border-b border-rose-200/80 text-[#2A2422]'
            : 'bg-transparent text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]'
        }`}
      >
        {/* EXTREMO IZQUIERDO MOBILE: Botón Hamburguesa (<lg) */}
        <div className="flex lg:hidden items-center shrink-0 w-10">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menú principal"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isScrolled
                ? 'hover:bg-rose-200/60 text-[#2A2422]'
                : 'hover:bg-white/20 text-white'
            }`}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* IDENTIDAD: Isotipo floral + Wordmark ROZIER (Centrado en mobile, izquierda en desktop) */}
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-3 group shrink-0 lg:mr-auto justify-center"
        >
          <div className="relative">
            <img
              src={logoUrl || '/images/logo web.jpg'}
              alt="ROZIER"
              className={`h-10 sm:h-11 md:h-12 w-auto object-contain rounded-xl transition-all duration-300 shadow-xs border ${
                isScrolled ? 'border-rose-200/80 shadow-2xs' : 'border-white/30 drop-shadow-md'
              }`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/logo.jpg';
              }}
            />
          </div>
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <span
              className={`font-serif tracking-[0.2em] font-normal text-lg sm:text-xl md:text-2xl transition-colors ${
                isScrolled ? 'text-[#2A2422]' : 'text-white'
              }`}
            >
              ROZIER
            </span>
            <span
              className={`text-[8px] sm:text-[9px] uppercase tracking-[0.25em] font-medium -mt-1 font-sans transition-colors ${
                isScrolled ? 'text-[#685D5A]' : 'text-white/85'
              }`}
            >
              ALTA FLORISTERÍA
            </span>
          </div>
        </Link>

        {/* NAVEGACIÓN DESKTOP */}
        <nav className="hidden lg:flex items-center gap-7 xl:gap-9 font-semibold text-base xl:text-lg tracking-normal mx-auto">
          {/* Submenú COLECCIONES */}
          <div
            ref={collectionRef}
            className="relative"
            onMouseEnter={() => setCollectionMenuOpen(true)}
            onMouseLeave={() => setCollectionMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => setCollectionMenuOpen(!collectionMenuOpen)}
              className={`flex items-center gap-1.5 py-2 hover:opacity-80 transition cursor-pointer font-semibold text-base xl:text-lg ${
                isScrolled ? 'text-[#2A2422]' : 'text-white'
              }`}
            >
              <span>Colección</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isScrolled ? 'text-[#2A2422]' : 'text-white'
                } ${
                  collectionMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {collectionMenuOpen && (
              <div className="absolute top-full left-0 pt-2 z-50">
                <div
                  className="rounded-lg shadow-xl bg-white p-3 border border-rose-200/80 min-w-[210px] space-y-1 animate-in fade-in"
                  style={{
                    animation: 'popoverFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  }}
                >
                  <button
                    onClick={() => handleCategoryClick('todos')}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-[#2A2422] hover:bg-rose-100/60 rounded-sm transition flex items-center justify-between"
                  >
                    <span>Todos los Diseños</span>
                    <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                  <div className="h-px bg-warm-100 my-1" />
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.slug)}
                      className="w-full text-left px-3 py-1.5 text-xs text-warm-500 hover:text-ink-900 hover:bg-rose-50 rounded-sm transition"
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submenú OCASIONES */}
          <div
            ref={occasionsRef}
            className="relative"
            onMouseEnter={() => setOccasionsMenuOpen(true)}
            onMouseLeave={() => setOccasionsMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => setOccasionsMenuOpen(!occasionsMenuOpen)}
              className={`flex items-center gap-1.5 py-2 hover:opacity-80 transition cursor-pointer font-semibold text-base xl:text-lg ${
                isScrolled ? 'text-[#2A2422]' : 'text-white'
              }`}
            >
              <span>Ocasiones</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isScrolled ? 'text-[#2A2422]' : 'text-white'
                } ${
                  occasionsMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {occasionsMenuOpen && (
              <div className="absolute top-full left-0 pt-2 z-50">
                <div
                  className="rounded-lg shadow-xl bg-white p-3 border border-rose-200/80 min-w-[220px] space-y-1 animate-in fade-in"
                  style={{
                    animation: 'popoverFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  }}
                >
                  <button
                    onClick={() => handleCategoryClick('box')}
                    className="w-full text-left px-3 py-1.5 text-xs text-ink-900 hover:bg-rose-50 rounded-sm transition flex items-center gap-2"
                  >
                    <span>🌹 Amor & Romance</span>
                  </button>
                  <button
                    onClick={() => handleCategoryClick('girasoles')}
                    className="w-full text-left px-3 py-1.5 text-xs text-ink-900 hover:bg-rose-50 rounded-sm transition flex items-center gap-2"
                  >
                    <span>🌻 Cumpleaños Exclusivo</span>
                  </button>
                  <button
                    onClick={() => handleCategoryClick('ramos')}
                    className="w-full text-left px-3 py-1.5 text-xs text-ink-900 hover:bg-rose-50 rounded-sm transition flex items-center gap-2"
                  >
                    <span>💐 Aniversario Inolvidable</span>
                  </button>
                  <button
                    onClick={() => handleCategoryClick('detalles')}
                    className="w-full text-left px-3 py-1.5 text-xs text-ink-900 hover:bg-rose-50 rounded-sm transition flex items-center gap-2"
                  >
                    <span>🎁 Para Él & Distinción</span>
                  </button>
                  <div className="h-px bg-warm-100 my-1" />
                  <button
                    onClick={() => handleScrollToSection('ocasiones')}
                    className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-100/50 rounded-sm transition"
                  >
                    Ver Ocasiones Destacadas ↓
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => handleScrollToSection('catalogo')}
            className={`hover:opacity-80 transition cursor-pointer font-semibold text-base xl:text-lg ${
              isScrolled ? 'text-[#2A2422]' : 'text-white'
            }`}
          >
            Catálogo
          </button>

          <button
            onClick={() => handleScrollToSection('unfold-story')}
            className={`hover:opacity-80 transition cursor-pointer font-semibold text-base xl:text-lg ${
              isScrolled ? 'text-[#2A2422]' : 'text-white'
            }`}
          >
            Nosotros
          </button>

          <button
            onClick={onOpenTracking}
            className={`flex items-center gap-2 hover:opacity-80 transition cursor-pointer font-semibold text-base xl:text-lg ${
              isScrolled ? 'text-[#2A2422]' : 'text-white'
            }`}
          >
            <Truck className="w-5 h-5 text-rose-600" />
            <span>Rastreo</span>
          </button>
        </nav>

        {/* EXTREMO DERECHO: ShoppingBag en Mobile, Search + Admin + ShoppingBag en Desktop */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">
          {/* Botón Buscar (Desktop) */}
          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Buscar productos"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isScrolled
                  ? 'hover:bg-rose-200/60 text-[#2A2422]'
                  : 'hover:bg-white/20 text-white'
              }`}
            >
              <Search className="w-6 h-6" />
            </button>

            {searchOpen && (
              <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-xl p-2.5 border border-warm-100 animate-popover z-50 text-ink-900">
                <input
                  type="text"
                  placeholder="Buscar arreglos, rosas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearchOpen(false);
                      handleScrollToSection('catalogo');
                    }
                  }}
                  autoFocus
                  className="w-full text-xs px-3 py-2 bg-rose-50/50 rounded-lg border border-warm-100 focus:outline-rose-500 text-[#2A2422]"
                />
              </div>
            )}
          </div>

          {/* Botón Admin / Usuario (Desktop) */}
          <Link
            href="/admin/products"
            title="Panel de Administración"
            className={`hidden lg:flex w-10 h-10 rounded-full items-center justify-center transition-all ${
              isScrolled
                ? 'hover:bg-rose-200/60 text-[#2A2422]'
                : 'hover:bg-white/20 text-white'
            }`}
          >
            <User className="w-6 h-6" />
          </Link>

          {/* Botón ShoppingBag con Badge Dinámico (Extremo derecho en mobile y desktop) */}
          <button
            type="button"
            onClick={onOpenCart}
            aria-label="Ver carrito"
            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isScrolled
                ? 'hover:bg-rose-200/60 text-[#2A2422]'
                : 'hover:bg-white/20 text-white'
            }`}
          >
            <ShoppingBag className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent-carmine text-white text-[11px] font-bold h-5 w-5 rounded-full flex items-center justify-center tabular-nums shadow-xs">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* DRAWER LATERAL MOBILE */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop con Blur */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-ink-950/60 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Contenedor Drawer animado con cubic-bezier(0.16, 1, 0.3, 1) */}
          <div
            className="relative w-full max-w-xs sm:max-w-sm bg-[#F6E2E6] h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto border-l border-rose-200/80 animate-spring-drawer text-[#2A2422]"
          >
            {/* Header Drawer */}
            <div className="flex items-center justify-between pb-5 border-b border-warm-100">
              <div className="flex items-center gap-2.5">
                <img
                  src={logoUrl || '/images/logo web.jpg'}
                  alt="ROZIER"
                  className="h-9 w-auto rounded-lg object-contain shadow-2xs"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/logo.jpg';
                  }}
                />
                <div>
                  <h3 className="font-serif text-lg font-bold text-ink-900 tracking-wider">
                    ROZIER
                  </h3>
                  <p className="text-[10px] text-warm-500 uppercase tracking-widest">
                    ALTA FLORISTERÍA
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-white text-ink-900 flex items-center justify-center shadow-2xs hover:bg-rose-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Buscador Rápido en Mobile */}
            <div className="pt-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar en el catálogo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setMobileMenuOpen(false);
                      handleScrollToSection('catalogo');
                    }
                  }}
                  className="w-full text-xs pl-8 pr-3 py-2.5 bg-white rounded-xl border border-rose-200/80 focus:outline-rose-500 text-[#2A2422] shadow-2xs placeholder:text-warm-500"
                />
                <Search className="w-3.5 h-3.5 text-warm-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Links de Navegación */}
            <div className="py-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-rose-600 tracking-widest block px-2">
                  Navegación
                </span>
                <button
                  onClick={() => handleCategoryClick('todos')}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-white/80 rounded-lg transition"
                >
                  Todos los Diseños
                </button>
                <button
                  onClick={() => handleScrollToSection('ocasiones')}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-white/80 rounded-lg transition"
                >
                  Ocasiones más Solicitadas
                </button>
                <button
                  onClick={() => handleScrollToSection('catalogo')}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-white/80 rounded-lg transition"
                >
                  Catálogo Completo
                </button>
                <button
                  onClick={() => handleScrollToSection('unfold-story')}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-white/80 rounded-lg transition"
                >
                  Nuestra Historia
                </button>
              </div>

              <div className="space-y-1 pt-2 border-t border-warm-100">
                <span className="text-[10px] uppercase font-bold text-rose-600 tracking-widest block px-2">
                  Líneas Florales
                </span>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.slug)}
                    className="w-full text-left px-3 py-1.5 text-xs text-warm-500 hover:text-ink-900 hover:bg-white/60 rounded-md transition"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Drawer */}
            <div className="pt-4 border-t border-warm-100 space-y-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenTracking();
                }}
                className="w-full btn-tactile flex items-center justify-center gap-2 bg-white text-ink-900 border border-warm-100 font-semibold py-2.5 px-4 rounded-xl text-xs shadow-xs hover:bg-rose-50"
              >
                <Truck className="w-4 h-4 text-rose-600" />
                <span>Rastrear mi pedido</span>
              </button>

              <Link
                href="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center block text-[11px] text-warm-500 hover:text-ink-900 py-1"
              >
                Acceso Administrativo (ROZIER CRM)
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
