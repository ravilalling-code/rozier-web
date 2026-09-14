'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Flower2,
  Package,
  ShoppingBag,
  TrendingDown,
  ExternalLink,
  Menu,
  X,
  Sparkles,
  Store,
  ChevronRight,
  LogOut,
  Share2,
  Heart,
} from 'lucide-react';

const navigationItems = [
  {
    name: 'Catálogo & Productos',
    href: '/admin/products',
    icon: Package,
    description: 'Precios, stock y fotos',
  },
  {
    name: 'Ventas & CRM',
    href: '/admin/orders',
    icon: ShoppingBag,
    description: 'Pedidos, vouchers y clientes',
  },
  {
    name: 'Clientes & Fechas',
    href: '/admin/customers',
    icon: Heart,
    description: 'Fidelización y aniversarios',
  },
  {
    name: 'Gastos & Finanzas',
    href: '/admin/expenses',
    icon: TrendingDown,
    description: 'Flujo de caja y balance',
  },
  {
    name: 'Redes & Ajustes',
    href: '/admin/settings',
    icon: Share2,
    description: 'Instagram, TikTok y WhatsApp',
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Si es la página de login, no mostrar la estructura del panel de administración
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {
      // Continuar con redirección
    }
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col lg:flex-row antialiased">
      {/* Mobile Top Navbar */}
      <div className="lg:hidden sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link href="/admin/products" className="flex items-center gap-2">
            <img
              src="/images/logo.jpg"
              alt="PETALIA Logo"
              className="h-8 w-auto object-contain rounded-lg shadow-md"
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 bg-rose-950/60 border border-rose-800/50 px-1.5 py-0.5 rounded-full">
              Admin
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white bg-neutral-800 px-2.5 py-1.5 rounded-lg transition"
            title="Ver Tienda Pública"
          >
            <Store className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Tienda</span>
          </Link>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Drawer in mobile, static in desktop) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-neutral-900 border-r border-neutral-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex flex-col h-full">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-6 border-b border-neutral-800/80">
            <div className="flex items-center gap-3">
              <Link href="/admin/products" className="flex items-center gap-2.5 group">
                <img
                  src="/images/logo.jpg"
                  alt="PETALIA Logo"
                  className="h-10 w-auto object-contain rounded-xl shadow-lg shadow-black/40 group-hover:opacity-90 transition"
                />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 bg-rose-950/70 border border-rose-800/60 px-1.5 py-0.5 rounded-full">
                  PRO
                </span>
              </Link>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav items */}
          <nav className="mt-6 flex-1 space-y-1.5">
            <p className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Gestión Principal
            </p>
            {navigationItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700/60'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg transition ${
                        isActive
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-neutral-800/60 text-neutral-400 group-hover:text-neutral-200 group-hover:bg-neutral-700/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block">{item.name}</span>
                      <span className="block text-[11px] text-neutral-400 font-normal">
                        {item.description}
                      </span>
                    </div>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-rose-400" />}
                </Link>
              );
            })}
          </nav>

          {/* Direct Store Button & Footer status */}
          <div className="pt-4 border-t border-neutral-800/80 space-y-3">
            <Link
              href="/"
              target="_blank"
              className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-300 transition group text-sm font-medium shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4 text-emerald-400" />
                <span>Ver Tienda Pública</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition" />
            </Link>

            <div className="bg-neutral-950/60 rounded-xl p-3 border border-neutral-800/50">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-neutral-300">WhatsApp Conectado</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">+51 924 257 784</p>
            </div>

            {/* Botón Cerrar Sesión */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400 hover:bg-rose-950/30 hover:border-rose-800/40 transition group text-xs font-semibold"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="w-4 h-4 text-neutral-500 group-hover:text-rose-400 transition" />
                <span>Cerrar Sesión</span>
              </div>
              <span className="text-[10px] text-neutral-600 group-hover:text-rose-400/80">admin</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-neutral-950 flex flex-col min-h-screen">
        {/* Desktop Top Header Bar */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3.5 border-b border-neutral-800/70 bg-neutral-900/40 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-neutral-300">Florería PETALIA</span>
            <span className="text-neutral-600">•</span>
            <span>Panel de Control Operativo</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-950/80 to-emerald-900/60 hover:from-emerald-900/90 hover:to-emerald-800/80 border border-emerald-700/60 text-emerald-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition active:scale-98 group"
              title="Abrir tienda pública en nueva pestaña"
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ver tienda pública</span>
              <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 transition" />
            </Link>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
