'use client';

import { Truck, Clock, Flower2, Heart, ShieldCheck, Headphones } from 'lucide-react';

const TRUST_ITEMS = [
  {
    icon: Truck,
    title: 'Entrega Hoy Mismo',
    desc: 'Envíos el mismo día en Lima Metropolitana.',
  },
  {
    icon: Clock,
    title: 'Horario en Rangos',
    desc: 'Mañana, tarde o noche garantizada.',
  },
  {
    icon: Flower2,
    title: 'Flores Frescas',
    desc: 'Selección premium de exportación.',
  },
  {
    icon: Heart,
    title: 'Wow Garantizado',
    desc: 'Tu detalle creará un recuerdo eterno.',
  },
  {
    icon: ShieldCheck,
    title: 'Compra Segura',
    desc: 'Yape, Plin y transferencias directas.',
  },
  {
    icon: Headphones,
    title: 'Atención Dedicada',
    desc: 'Seguimiento continuo de tu detalle.',
  },
];

export default function TrustBar() {
  return (
    <section className="border-t border-rose-100/80 bg-white py-6 md:py-8 shadow-xs relative z-10">
      <div className="max-w-6xl mx-auto px-4">
        {/* Desktop: 6 columnas con separadores delgados / Mobile: carrusel táctil horizontal con snap */}
        <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-4 lg:grid lg:grid-cols-6 lg:gap-0 lg:divide-x lg:divide-rose-100">
          {TRUST_ITEMS.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div
                key={idx}
                className="snap-start shrink-0 min-w-[210px] sm:min-w-[230px] lg:min-w-0 lg:shrink flex items-center lg:flex-col lg:items-center lg:text-center gap-3 px-3 py-1"
              >
                {/* Contenedor concéntrico: rounded-lg con radio interior concéntrico */}
                <div className="w-10 h-10 rounded-lg bg-[var(--rose-100)] flex items-center justify-center shrink-0 text-rose-600 shadow-2xs border border-warm-100">
                  <IconComponent className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink-900 tracking-tight">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-warm-500 leading-tight mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
