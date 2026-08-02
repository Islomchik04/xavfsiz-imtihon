"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ROLLAR } from "@/lib/constants";

const HAMMA_UCHUN_LINKLAR = [
  { href: "/dashboard", label: "Statistika", rollar: ["superadmin", "admin", "hujjatchi", "imtihonchi"] },
  { href: "/talabalar", label: "Talabalar", rollar: ["superadmin", "admin", "hujjatchi", "imtihonchi"] },
  { href: "/talabalar/yangi", label: "+ Yangi talaba", rollar: ["admin", "superadmin"] },
  { href: "/imtihon", label: "Imtihon kunida", rollar: ["imtihonchi", "superadmin"] },
  { href: "/sozlamalar", label: "Sozlamalar", rollar: ["superadmin"] },
];

export default function Navbar({ profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menyu, setMenyu] = useState(false);

  const linklar = HAMMA_UCHUN_LINKLAR.filter((l) => l.rollar.includes(profile?.role));

  async function chiqish() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-800">
            <span className="text-xl">🛡️</span>
            <span className="hidden sm:inline">Xavfsiz Imtihon</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {linklar.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  pathname === l.href
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-slate-700 leading-tight">
                {profile?.ism_familya}
              </div>
              <div className="text-xs text-slate-400 leading-tight">
                {ROLLAR[profile?.role]}
                {profile?.filiallar?.nomi ? ` · ${profile.filiallar.nomi}` : ""}
              </div>
            </div>
            <button onClick={chiqish} className="btn-secondary !px-3 !py-2 text-sm">
              Chiqish
            </button>
            <button
              className="md:hidden btn-secondary !px-3 !py-2"
              onClick={() => setMenyu((v) => !v)}
              aria-label="Menyu"
            >
              ☰
            </button>
          </div>
        </div>

        {menyu && (
          <nav className="md:hidden pb-3 flex flex-col gap-1">
            {linklar.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenyu(false)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === l.href ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
