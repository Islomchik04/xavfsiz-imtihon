"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ROLLAR } from "@/lib/constants";
import { useTil, TILLAR } from "@/lib/i18n";
import { useTema } from "@/lib/theme";

const LINKLAR = [
  { href: "/dashboard", key: "nav_statistika", ikon: "📊", rollar: ["superadmin", "admin", "hujjatchi", "imtihonchi"] },
  { href: "/talabalar", key: "nav_talabalar", ikon: "🧑‍🎓", rollar: ["superadmin", "admin", "hujjatchi", "imtihonchi"] },
  { href: "/talabalar/yangi", key: "nav_yangi_talaba", ikon: "➕", rollar: ["admin", "hujjatchi", "superadmin"] },
  { href: "/imtihonlar", key: "nav_imtihonlar", ikon: "🗓️", rollar: ["hujjatchi", "imtihonchi", "superadmin"] },
  { href: "/hisobotlar", key: "nav_hisobotlar", ikon: "📈", rollar: ["superadmin", "admin", "hujjatchi", "imtihonchi"] },
  { href: "/kpi", key: "nav_kpi", ikon: "💰", rollar: ["superadmin"] },
  { href: "/kabinet", key: "nav_kabinet", ikon: "🎓", rollar: ["oqituvchi"] },
  { href: "/sozlamalar", key: "nav_sozlamalar", ikon: "⚙️", rollar: ["superadmin"] },
];

export default function Sidebar({ profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const { til, tilniOzgartirish, t } = useTil();
  const { tema, almashtirish } = useTema();

  const linklar = LINKLAR.filter((l) => l.rollar.includes(profile?.role));

  async function chiqish() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobil tepa panel */}
      <header className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-800">
            <img src="/logo.png" alt="" className="w-7 h-7 rounded-full object-cover" />
            <span>Xavfsiz Imtihon</span>
          </Link>
          <div className="flex items-center gap-2">
            <TemaTugmasi tema={tema} onBosish={almashtirish} />
            <button
              className="btn-secondary !px-3 !py-2"
              onClick={() => setOchiq((v) => !v)}
              aria-label={t("menyu")}
            >
              ☰
            </button>
          </div>
        </div>
        {ochiq && (
          <nav className="border-t border-slate-100 px-2 py-2 flex flex-col gap-0.5">
            {linklar.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOchiq(false)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  pathname === l.href ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{l.ikon}</span> {t(l.key)}
              </Link>
            ))}
            <TilTanlagich til={til} onOzgartirish={tilniOzgartirish} />
            <button
              onClick={chiqish}
              className="px-3 py-2.5 rounded-lg text-sm font-medium text-left text-rose-600 hover:bg-rose-50"
            >
              🚪 {t("chiqish")}
            </button>
          </nav>
        )}
      </header>

      {/* Desktop yon panel */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-20">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-100 font-bold text-slate-800">
          <img src="/logo.png" alt="" className="w-8 h-8 rounded-full object-cover" />
          <span>Xavfsiz Imtihon</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {linklar.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                pathname === l.href
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-base">{l.ikon}</span>
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2">
            <TilTanlagich til={til} onOzgartirish={tilniOzgartirish} kompakt />
            <TemaTugmasi tema={tema} onBosish={almashtirish} />
          </div>
          <div className="px-2">
            <div className="text-sm font-semibold text-slate-700 leading-tight truncate">
              {profile?.ism_familya}
            </div>
            <div className="text-xs text-slate-400 leading-tight">
              {ROLLAR[profile?.role]}
              {profile?.filiallar?.nomi ? ` · ${profile.filiallar.nomi}` : ""}
            </div>
          </div>
          <button onClick={chiqish} className="btn-secondary w-full !py-2 text-sm">
            {t("chiqish")}
          </button>
        </div>
      </aside>
    </>
  );
}

function TemaTugmasi({ tema, onBosish }) {
  return (
    <button
      onClick={onBosish}
      className="btn-secondary !px-3 !py-2 text-sm"
      title={tema === "tungi" ? "Kunduzgi rejim" : "Tungi rejim"}
    >
      {tema === "tungi" ? "☀️" : "🌙"}
    </button>
  );
}

function TilTanlagich({ til, onOzgartirish, kompakt }) {
  return (
    <select
      value={til}
      onChange={(e) => onOzgartirish(e.target.value)}
      className={`input !py-2 text-xs ${kompakt ? "flex-1" : ""}`}
    >
      {Object.entries(TILLAR).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </select>
  );
}
