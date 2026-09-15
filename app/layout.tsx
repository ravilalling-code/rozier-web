import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: 'ROZIER | Alta Floristería — Lima Metropolitana',
  description: 'Alta floristería de autor y diseño floral contemporáneo en Lima Metropolitana. La exclusividad de crear momentos inolvidables.',
  metadataBase: new URL('https://rozier-web.vercel.app'),
  openGraph: {
    title: 'ROZIER | Alta Floristería — Lima Metropolitana',
    description: 'La exclusividad de crear momentos inolvidables. Arreglos florales exclusivos y delivery en Lima.',
    url: 'https://rozier-web.vercel.app',
    siteName: 'ROZIER',
    images: [
      {
        url: '/images/logo web.jpg',
        width: 800,
        height: 800,
        alt: 'ROZIER Alta Floristería Logo',
      },
    ],
    locale: 'es_PE',
    type: 'website',
  },
  icons: {
    icon: '/images/logo web.jpg',
    shortcut: '/images/logo web.jpg',
    apple: '/images/logo web.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased overflow-x-hidden max-w-[100vw] w-full`}
    >
      <body className="min-h-full flex flex-col bg-rose-50 text-ink-900 selection:bg-rose-500 selection:text-ink-900 font-sans overflow-x-hidden max-w-[100vw] w-full">
        {children}
        <FloatingWhatsApp />
      </body>
    </html>
  );
}
