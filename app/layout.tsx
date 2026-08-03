import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata = {
  title: "CRM Comissões",
  description: "Sistema de controle de comissões",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}