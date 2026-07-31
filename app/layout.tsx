import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Comissões",
  description: "Sistema de gestão de comissões",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}