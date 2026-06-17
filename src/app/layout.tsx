import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ferretería Multicomercial — Gestión ChileCompra",
  description: "Gestión de Compras Ágiles y Licitaciones",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
