"use client";
import Link from "next/link";
import { useState } from "react";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-primary text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="font-bold text-lg">
          💰 CRM Comissões
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex gap-6 text-sm">
          <Link href="/" className="hover:underline">Dashboard</Link>
          <Link href="/propostas" className="hover:underline">Propostas</Link>
          <Link href="/propostas/nova" className="hover:underline">+ Nova Proposta</Link>
          <Link href="/comissoes" className="hover:underline">Comissões Mensais</Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen(!open)}>
          ☰
        </button>
      </div>

      {open && (
        <div className="md:hidden px-4 pb-3 flex flex-col gap-2 text-sm">
          <Link href="/" onClick={() => setOpen(false)}>Dashboard</Link>
          <Link href="/propostas" onClick={() => setOpen(false)}>Propostas</Link>
          <Link href="/propostas/nova" onClick={() => setOpen(false)}>+ Nova Proposta</Link>
          <Link href="/comissoes" onClick={() => setOpen(false)}>Comissões Mensais</Link>
        </div>
      )}
    </nav>
  );
}