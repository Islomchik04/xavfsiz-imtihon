"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ROLLAR } from "@/lib/constants";
import { useTil, TILLAR } from "@/lib/i18n";
import { useTema } from "@/lib/theme";

const LINKLAR = [
  { href: "/dashboard", key: "nav_statistika", ikon: "📊", rollar: ["superadmin", "admin", "hujjatchi", "imtihonchi"] },
  { href: "/talabalar", key: "nav_talabalar", ikon: "🧑‍🎓", rollar: ["superadmin", "admin", "hujjatchi", "imtihonchi"] },
  { href: "/talabalar/yangi", key: "nav_yangi_talaba", ikon: "➕", rollar: ["admin", "hujjatchi", "superadmin"] },
  { href: "/arizalar", key: "nav_arizalar", ikon: "📋", rollar: ["admin", "hujjatchi", "superadmin"] },
  { href: "/rad-etilganlar", key: "nav_rad_etilganlar", ikon: "🚫", rollar: ["superadmin", "admin", "hujjatchi", "imtihonchi"] },
  { href: "/amaliy-arizalar", key: "nav_amaliy_arizalar", ikon: "🚗", rollar: ["admin", "hujjatchi", "imtihonchi", "superadmin"] },
  { href: "/mustaqil-imtihonchilar", key: "nav_mustaqil_imtihonchilar", ikon: "📷", rollar: ["hujjatchi", "superadmin"] },
  { href: "/imtihonlar", key: "nav_imtihonlar", ikon: "🗓️", rollar: ["hujjatchi", "imtihonchi", "superadmin"] },
  { href: "/arxiv", key: "nav_arxiv", ikon: "🗄️", rollar: ["superadmin", "admin", "hujjatchi", "imtihonchi"] },
  { href: "/hisobotlar", key: "nav_hisobotlar", ikon: "📈", rollar: ["superadmin", "admin", "hujjatchi", "imtihonchi"] },
  { href: "/kpi", key: "nav_kpi", ikon: "💰", rollar: ["superadmin"] },
  { href: "/oqituvchilar", key: "nav_oqituvchilar", ikon: "👩‍🏫", rollar: ["admin"] },
  { href: "/kabinet", key: "nav_kabinet", ikon: "🎓", rollar: ["oqituvchi"] },
  { href: "/sozlamalar", key: "nav_sozlamalar", ikon: "⚙️", rollar: ["superadmin"] },
];

// Mobil pastki tab-bar'da bittada shuncha asosiy havola ko'rsatiladi, qolgani
// "Ko'proq" varag'iga tushadi — kichik ekranda hammasi sig'may ketmasligi
// uchun (barmoq bilan bosish qulay bo'lishi kerak).
const MOBIL_ASOSIY_SONI = 4;

export default function Sidebar({ profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const { til, tilniOzgartirish, t } = useTil();
  const { tema, almashtirish } = useTema();

  const linklar = LINKLAR.filter((l) => l.rollar.includes(profile?.role));
  const asosiy = linklar.slice(0, MOBIL_ASOSIY_SONI);
  const qolgan = linklar.slice(MOBIL_ASOSIY_SONI);

  async function chiqish() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* ------------------------------- TELEFON ------------------------------- */}
      <header className="md:hidden bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-800">
            <img src="/logo.png" alt="" className="w-7 h-7 rounded-full object-cover" />
            <span>Xavfsiz Imtihon</span>
          </Link>
          <TemaTugmasi tema={tema} onBosish={almashtirish} />
        </div>
      </header>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${asosiy.length + (qolgan.length > 0 ? 1 : 0)}, minmax(0,1fr))` }}>
          {asosiy.map((l) => (
            <MobilTab key={l.href} href={l.href} ikon={l.ikon} label={t(l.key)} faol={pathname === l.href} />
          ))}
          {qolgan.length > 0 && (
            <button
              onClick={() => setOchiq(true)}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                ochiq || qolgan.some((l) => l.href === pathname) ? "text-brand-600" : "text-slate-500"
              }`}
            >
              <span className="text-lg leading-none">⋯</span>
              {t("koproq")}
            </button>
          )}
        </div>
      </nav>

      <AnimatePresence>
        {ochiq && (
          <div className="md:hidden">
            <motion.div
              className="fixed inset-0 bg-slate-900/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOchiq(false)}
            />
            <motion.div
              className="fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl p-4 space-y-1 shadow-2xl"
              style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
            >
              <div className="w-10 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-3" />
              {qolgan.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOchiq(false)}
                  className={`px-3 py-3 rounded-xl text-sm font-medium flex items-center gap-3 transition ${
                    pathname === l.href ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base">{l.ikon}</span> {t(l.key)}
                </Link>
              ))}
              <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <TilTanlagich til={til} onOzgartirish={tilniOzgartirish} />
                <button
                  onClick={chiqish}
                  className="w-full px-3 py-3 rounded-xl text-sm font-medium text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  🚪 {t("chiqish")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ------------------------------- PLANSHET ------------------------------- */}
      <aside className="hidden md:flex lg:hidden flex-col items-center fixed inset-y-0 left-0 w-20 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-20 py-4">
        <Link href="/dashboard" className="mb-4">
          <img src="/logo.png" alt="" className="w-9 h-9 rounded-full object-cover" />
        </Link>
        <nav className="flex-1 flex flex-col gap-1 w-full px-2.5 overflow-y-auto">
          {linklar.map((l) => (
            <RailTugma key={l.href} href={l.href} ikon={l.ikon} label={t(l.key)} faol={pathname === l.href} />
          ))}
        </nav>
        <div className="flex flex-col items-center gap-1.5 pt-2">
          <TemaTugmasi tema={tema} onBosish={almashtirish} />
          <button
            onClick={chiqish}
            title={t("chiqish")}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-lg transition hover:scale-105 active:scale-95"
          >
            🚪
          </button>
        </div>
      </aside>

      {/* ------------------------------- KOMPYUTER ------------------------------- */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-20">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800">
          <img src="/logo.png" alt="" className="w-8 h-8 rounded-full object-cover" />
          <span>Xavfsiz Imtihon</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {linklar.map((l) => (
            <DesktopHavola key={l.href} href={l.href} ikon={l.ikon} label={t(l.key)} faol={pathname === l.href} />
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
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

function MobilTab({ href, ikon, label, faol }) {
  return (
    <Link href={href} className="relative flex flex-col items-center justify-center gap-0.5 py-2">
      {faol && (
        <motion.span
          layoutId="mobil-faol-chiziq"
          className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-600"
          transition={{ type: "spring", damping: 24, stiffness: 300 }}
        />
      )}
      <span className={`text-lg leading-none transition-transform ${faol ? "scale-110" : ""}`}>{ikon}</span>
      <span className={`text-[11px] font-medium ${faol ? "text-brand-600" : "text-slate-500"}`}>{label}</span>
    </Link>
  );
}

function RailTugma({ href, ikon, label, faol }) {
  return (
    <Link href={href} title={label} className="relative flex items-center justify-center w-full h-12 rounded-xl group">
      {faol && (
        <motion.span
          layoutId="rail-faol-fon"
          className="absolute inset-0 rounded-xl bg-brand-50 dark:bg-brand-950/40"
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        />
      )}
      <span
        className={`relative text-lg transition-transform group-hover:scale-110 ${
          faol ? "scale-110" : "opacity-70 group-hover:opacity-100"
        }`}
      >
        {ikon}
      </span>
    </Link>
  );
}

function DesktopHavola({ href, ikon, label, faol }) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        faol ? "text-brand-700" : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      {faol && (
        <motion.span
          layoutId="desktop-faol-fon"
          className="absolute inset-0 rounded-xl bg-brand-50 dark:bg-brand-950/40"
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
        />
      )}
      <span className="relative text-base">{ikon}</span>
      <span className="relative">{label}</span>
    </Link>
  );
}

function TemaTugmasi({ tema, onBosish }) {
  return (
    <button
      onClick={onBosish}
      className="btn-secondary !px-3 !py-2 text-sm hover:scale-105 active:scale-95 transition-transform"
      title={tema === "tungi" ? "Kunduzgi rejim" : "Tungi rejim"}
    >
      <motion.span
        key={tema}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="inline-block"
      >
        {tema === "tungi" ? "☀️" : "🌙"}
      </motion.span>
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
