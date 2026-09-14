import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PETALIA | Diseño Floral & Decoraciones de Alta Gama",
  description: "Florería de alta gama en Lima y Callao. Arreglos florales exclusivos, boxes de rosas, ramos y detalles para toda ocasión. Pedidos directos y delivery coordinado.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-rose-50 text-ink-900 selection:bg-rose-500 selection:text-ink-900">
        {children}
      </body>
    </html>
  );
}
