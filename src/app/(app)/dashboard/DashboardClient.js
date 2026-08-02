"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StatTile from "@/components/StatTile";
import {
  umumiyStatistika,
  filialBoyichaStatistika,
  oqituvchiBoyichaStatistika,
  oqituvchilarReytingi,
} from "@/lib/statistika";
import { haftaBoshi, oyKaliti, oyKorinishi, sanaKorinishi } from "@/lib/imtihonHisob";
import { useTil } from "@/lib/i18n";

const DAVRLAR = [
  { key: "hammasi", label: "hammasi" },
  { key: "kun", label: "davr_kunlik" },
  { key: "hafta", label: "davr_haftalik" },
  { key: "oy", label: "davr_oylik" },
];

export default function DashboardClient({ profile, talabalar, urinishlar, barchaFiliallarniKorish }) {
  const { t } = useTil();
  const [davr, setDavr] = useState("hammasi");

  const bugun = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const joriyHafta = haftaBoshi(bugun);
  const joriyOy = oyKaliti(bugun);

  const davrFiltrlanganUrinishlar = useMemo(() => {
    if (davr === "hammasi") return urinishlar;
    return urinishlar.filter((u) => {
      const sana = u.imtihonlar?.sana;
      if (!sana) return false;
      if (davr === "kun") return sana === bugun;
      if (davr === "hafta") return haftaBoshi(sana) === joriyHafta;
      if (davr === "oy") return oyKaliti(sana) === joriyOy;
      return true;
    });
  }, [urinishlar, davr, bugun, joriyHafta, joriyOy]);

  const stat = umumiyStatistika(talabalar, davrFiltrlanganUrinishlar);
  const filiallar = filialBoyichaStatistika(talabalar, davrFiltrlanganUrinishlar);
  const nazariyOqituvchilar = oqituvchiBoyichaStatistika(davrFiltrlanganUrinishlar, "nazariy");
  const amaliyOqituvchilar = oqituvchiBoyichaStatistika(davrFiltrlanganUrinishlar, "amaliy");

  // --- Oy va imtihon kuni bo'yicha reyting (har doim umumiy ma'lumotdan) ------
  const oyReytingi = oqituvchilarReytingi(urinishlar, (u) => {
    const sana = u.imtihonlar?.sana;
    return sana && oyKaliti(sana) === joriyOy ? joriyOy : null;
  });
  const joriyOyNatija = oyReytingi.get(joriyOy) || { top: [], engKopYiqilgan: null };

  const kunReytingi = oqituvchilarReytingi(urinishlar, (u) => u.imtihonlar?.sana || null);
  const sanalar = Array.from(kunReytingi.keys()).sort().reverse();
  const oxirgiSana = sanalar[0];
  const oxirgiSanaNatija = oxirgiSana ? kunReytingi.get(oxirgiSana) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{t("sarlavha_statistika")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {profile.role === "admin"
              ? `${profile.filiallar?.nomi || ""} filiali bo'yicha umumiy holat`
              : "Barcha filiallar bo'yicha umumiy holat"}
          </p>
        </div>
        <Link href="/hisobotlar" className="btn-secondary">
          {t("batafsil_hisobotlar")} →
        </Link>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {DAVRLAR.map((d) => (
          <button
            key={d.key}
            onClick={() => setDavr(d.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              davr === d.key ? "bg-white shadow-sm text-brand-700" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t(d.label)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label={t("jami_royxatga_olingan")} value={stat.jami} accent="blue" />
        <StatTile
          label={t("hujjat_tayyor")}
          value={stat.hujjatTayyor}
          accent="amber"
          sub={`${stat.hujjatKutilmoqda} ta kutilmoqda`}
        />
        <StatTile
          label="Nazariy: o'tdi"
          value={stat.nazariy.otdi}
          accent="emerald"
          sub={`${stat.nazariy.otmadi || 0} o'tmadi · ${(stat.nazariy.kelmadi || 0) + (stat.nazariy.boshqa || 0)} kelmadi/boshqa · ${stat.nazariy.kutilmoqda || 0} kutilmoqda`}
        />
        <StatTile
          label="Amaliy: o'tdi"
          value={stat.amaliy.otdi}
          accent="emerald"
          sub={`${stat.amaliy.otmadi || 0} o'tmadi · ${(stat.amaliy.kelmadi || 0) + (stat.amaliy.boshqa || 0)} kelmadi/boshqa · ${stat.amaliy.kutilmoqda || 0} kutilmoqda`}
        />
      </div>

      {barchaFiliallarniKorish && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold text-slate-800 mb-1">TOP-3 o'qituvchi — {oyKorinishi(joriyOy)}</h2>
            <p className="text-xs text-slate-400 mb-4">Shu oyda eng ko'p talabasini o'tkazgan o'qituvchilar</p>
            <ReytingRoyxati royxat={joriyOyNatija.top} />
            {joriyOyNatija.engKopYiqilgan && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="text-slate-500">{t("eng_kop_yiqilgan")}</span>
                <span className="font-medium text-rose-600">
                  {joriyOyNatija.engKopYiqilgan.ism} · {joriyOyNatija.engKopYiqilgan.otmadi} ta
                </span>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="font-semibold text-slate-800 mb-1">
              TOP-3 o'qituvchi — {oxirgiSana ? sanaKorinishi(oxirgiSana) : "so'nggi imtihon kuni"}
            </h2>
            <p className="text-xs text-slate-400 mb-4">Eng so'nggi natija chiqqan imtihon kuni bo'yicha</p>
            {oxirgiSanaNatija ? (
              <>
                <ReytingRoyxati royxat={oxirgiSanaNatija.top} />
                {oxirgiSanaNatija.engKopYiqilgan && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                    <span className="text-slate-500">{t("eng_kop_yiqilgan")}</span>
                    <span className="font-medium text-rose-600">
                      {oxirgiSanaNatija.engKopYiqilgan.ism} · {oxirgiSanaNatija.engKopYiqilgan.otmadi} ta
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400">Hali natija chiqmagan</p>
            )}
          </div>
        </div>
      )}

      {barchaFiliallarniKorish && filiallar.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="font-semibold text-slate-800 mb-4">Filiallar bo'yicha</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="pb-2 font-medium">Filial</th>
                <th className="pb-2 font-medium text-right">Jami</th>
                <th className="pb-2 font-medium text-right">Hujjat tayyor</th>
                <th className="pb-2 font-medium text-right">O'tdi</th>
                <th className="pb-2 font-medium text-right">O'tmadi</th>
              </tr>
            </thead>
            <tbody>
              {filiallar.map((f) => (
                <tr key={f.nomi} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium text-slate-700">{f.nomi}</td>
                  <td className="py-2.5 text-right">{f.jami}</td>
                  <td className="py-2.5 text-right">{f.hujjatTayyor}</td>
                  <td className="py-2.5 text-right text-emerald-600 font-medium">{f.otdi}</td>
                  <td className="py-2.5 text-right text-rose-600 font-medium">{f.otmadi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <OqituvchiJadval sarlavha="Nazariy o'qituvchilar" royxat={nazariyOqituvchilar} />
        <OqituvchiJadval sarlavha="Amaliy o'qituvchilar" royxat={amaliyOqituvchilar} />
      </div>
    </div>
  );
}

function ReytingRoyxati({ royxat }) {
  if (!royxat || royxat.length === 0) {
    return <p className="text-sm text-slate-400">Hali natija yo'q</p>;
  }
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <div className="space-y-2">
      {royxat.map((o, i) => (
        <div key={o.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{medal[i] || `${i + 1}.`}</span>
            <span className="font-medium text-slate-700">{o.ism}</span>
          </div>
          <div className="text-sm text-slate-500">
            <span className="text-emerald-600 font-semibold">{o.otdi} o'tdi</span>
            {o.otmadi > 0 && <span className="text-rose-500 ml-2">{o.otmadi} o'tmadi</span>}
            <span className="ml-2 text-slate-400">{o.foiz}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OqituvchiJadval({ sarlavha, royxat }) {
  return (
    <div className="card overflow-x-auto">
      <h2 className="font-semibold text-slate-800 mb-4">{sarlavha}</h2>
      {royxat.length === 0 ? (
        <p className="text-sm text-slate-400">Ma'lumot yo'q</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="pb-2 font-medium">O'qituvchi</th>
              <th className="pb-2 font-medium text-right">O'quvchi</th>
              <th className="pb-2 font-medium text-right">O'tgan</th>
              <th className="pb-2 font-medium text-right">Foiz</th>
            </tr>
          </thead>
          <tbody>
            {royxat.map((o) => (
              <tr key={o.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 font-medium text-slate-700">{o.ism}</td>
                <td className="py-2.5 text-right">{o.jami}</td>
                <td className="py-2.5 text-right text-emerald-600 font-medium">{o.otdi}</td>
                <td className="py-2.5 text-right text-slate-500">
                  {o.foiz === null ? "—" : `${o.foiz}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
