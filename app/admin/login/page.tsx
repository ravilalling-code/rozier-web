'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Flower2,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/admin/orders';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Por favor completa todos los campos requeridos.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Credenciales no válidas. Revisa usuario o contraseña.');
        setIsLoading(false);
        return;
      }

      // Redirección exitosa
      router.push(redirectPath);
      router.refresh();
    } catch (err: any) {
      setErrorMessage('Error de red o conexión al iniciar sesión.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-7 sm:p-9 shadow-2xl shadow-black/80 relative z-10">
      {/* Cabecera con Branding Petalia */}
      <div className="text-center space-y-3 pb-6 border-b border-neutral-800/80">
        <div className="flex justify-center">
          <Link href="/" title="Ir a la tienda">
            <img
              src="/images/logo.jpg"
              alt="PETALIA Logo"
              className="h-14 w-auto object-contain rounded-2xl shadow-xl shadow-black/50 border border-neutral-800/80 hover:opacity-90 transition"
            />
          </Link>
        </div>
        <div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Panel Administrativo</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-950/70 border border-rose-800/60 px-2 py-0.5 rounded-full">
              ADMIN
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Acceso exclusivo al taller y gestión floral de PETALIA
          </p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 bg-rose-950/60 border border-rose-800/70 text-rose-300 text-xs p-3.5 rounded-2xl animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Campo Usuario */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-neutral-300">
            Usuario de Administrador
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ej: admin"
              autoComplete="username"
              disabled={isLoading}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-rose-500 transition disabled:opacity-50"
            />
          </div>
        </div>

        {/* Campo Contraseña */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-neutral-300">
            Contraseña de Acceso
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
              disabled={isLoading}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-rose-500 transition disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300 transition"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Botón de Ingreso */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-400 text-white font-semibold py-3 rounded-xl shadow-lg shadow-rose-950/50 transition-all transform active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verificando credenciales...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Ingresar al Panel</span>
            </>
          )}
        </button>
      </form>

      {/* Footer de Seguridad */}
      <div className="mt-6 pt-5 border-t border-neutral-800/80 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
        <ShieldCheck className="w-3.5 h-3.5 text-rose-500/80" />
        <span>Sesión encriptada y protegida • Taller PETALIA</span>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-rose-500 selection:text-white antialiased">
      {/* Luces de fondo decorativas */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Botón Volver a la Tienda */}
      <div className="w-full max-w-md mb-6 flex justify-start">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Volver a la tienda pública</span>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            <p className="text-xs text-neutral-400">Cargando acceso seguro...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
