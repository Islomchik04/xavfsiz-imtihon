"use client";

import { Fragment, useMemo, useState } from "react";
import StatTile from "@/components/StatTile";
import { oqituvchiBoyichaStatistika } from "@/lib/statistika";
import { oqituvchilarKpiHisoblash, oyKaliti, oyKorinishi, sanaKorinishi } from "@/lib/imtihonHisob";
import { OQITUVCHI_TURI } from "@/lib/constants";
import { useTil } from "@/lib/i18n";

function somKorinishi(son) {
  return new Intl.NumberFormat("uz-UZ").format(son) + " so'm";
}

export default function KabinetClient({ oqituvchi, talabalar, urinishlar }) {
  const { t } = useTil();

  // MUHIM: barcha hook'lar shartsiz, komponent boshida chaqirilishi kerak —
  // shu sabab "oqituvchi topilmadimi" tekshiruvi hook'lardan KEYIN turibdi.
  const meningStatistikam = useMemo(() => {
    if (!oqituvchi) return { jami: 0, otdi: 0, otmadi: 0, kutilmoqda: 0, foiz: null };
    const royxat = oqituvchiBoyichaStatistika(urinishlar, oqituvchi.turi);
    return royxat.find((r) => r.id === oqituvchi.id) || { jami: 0, otdi: 0, otmadi: 0, kutilmoqda: 0, foiz: null };
  }, [urinishlar, oqituvchi]);

  const oylar = useMemo(() => {
    const to_plam = new Set();
    for (const u of urinishlar) {
      if (u.imtihonlar?.sana) to_plam.add(oyKaliti(u.imtihonlar.sana));
    }
    return Array.from(to_plam).sort().reverse();
  }, [urinishlar]);

  const [tanlanganOy, setTanlanganOy] = useState(oylar[0] || oyKaliti(new Date().toISOString().slice(0, 10)));

  const oyUrinishlari = useMemo(
    () => urinishlar.filter((u) => u.imtihonlar?.sana && oyKaliti(u.imtihonlar.sana) === tanlanganOy),
    [urinishlar, tanlanganOy]
  );

  const kpiRoyxat = useMemo(
    () => (oqituvchi ? oqituvchilarKpiHisoblash(oyUrinishlari, [oqituvchi]) : []),
    [oyUrinishlari, oqituvchi]
  );
  const meningKpim = kpiRoyxat[0] || null;

  if (!oqituvchi) {
    return (
      <div className="card text-rose-600">
        O'qituvchi profili topilmadi. Iltimos superadminga murojaat qiling.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{oqituvchi.ism_familya}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{OQITUVCHI_TURI[oqituvchi.turi]} o'qituvchi kabineti</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label={t("jami_royxatga_olingan")} value={talabalar.length} accent="blue" />
        <StatTile label="Imtihondan o'tganlar" value={meningStatistikam.otdi} accent="emerald" />
        <StatTile label="O'tolmaganlar" value={meningStatistikam.otmadi} accent="rose" />
        <StatTile
          label="Bitta urinishda o'tish foizi"
          value={meningStatistikam.foiz === null ? "—" : `${meningStatistikam.foiz}%`}
          accent="amber"
          sub={`${meningStatistikam.kutilmoqda} ta natija kutilmoqda`}
        />
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-slate-800">{t("nav_kpi")}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Faqat sizga tegishli hisob. Haftalik (Dushanba–Yakshanba) alohida hisoblanadi.
            </p>
          </div>
          <select className="input !w-auto" value={tanlanganOy} onChange={(e) => setTanlanganOy(e.target.value)}>
            {oylar.length === 0 && <option value={tanlanganOy}>{oyKorinishi(tanlanganOy)}</option>}
            {oylar.map((o) => (
              <option key={o} value={o}>
                {oyKorinishi(o)}
              </option>
            ))}
          </select>
        </div>

        {!meningKpim ? (
          <p className="text-sm text-slate-400">Shu oyda natija chiqqan ma'lumot yo'q.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xl font-bold text-emerald-600">{somKorinishi(meningKpim.oy.mukofot)}</div>
                <div className="text-xs text-slate-400 mt-1">Mukofot</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xl font-bold text-rose-600">{somKorinishi(meningKpim.oy.jarima)}</div>
                <div className="text-xs text-slate-400 mt-1">Jarima</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xl font-bold text-slate-800">{somKorinishi(meningKpim.oy.sof)}</div>
                <div className="text-xs text-slate-400 mt-1">Sof ({oyKorinishi(tanlanganOy)})</div>
              </div>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="p-2 font-medium">Hafta</th>
                  <th className="p-2 font-medium text-right">O'tgan</th>
                  <th className="p-2 font-medium text-right">O'tmagan</th>
                  <th className="p-2 font-medium text-right">Foiz</th>
                  <th className="p-2 font-medium text-right">Mukofot</th>
                  <th className="p-2 font-medium text-right">Jarima</th>
                  <th className="p-2 font-medium text-right">Sof</th>
                </tr>
              </thead>
              <tbody>
                {meningKpim.haftalar.map((h) => (
                  <Fragment key={h.hafta}>
                    <tr className="border-b border-slate-50 last:border-0">
                      <td className="p-2 text-slate-600">
                        {sanaKorinishi(h.hafta)} – {sanaKorinishi(h.haftaOxiri)}
                      </td>
                      <td className="p-2 text-right text-emerald-600">{h.otgan}</td>
                      <td className="p-2 text-right text-rose-600">{h.otmagan}</td>
                      <td className="p-2 text-right text-slate-500">{Math.round(h.foiz * 100)}%</td>
                      <td className="p-2 text-right text-emerald-600">{somKorinishi(h.mukofot)}</td>
                      <td className="p-2 text-right text-rose-600">{somKorinishi(h.jarima)}</td>
                      <td className="p-2 text-right font-semibold text-slate-700">{somKorinishi(h.sof)}</td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
