"use client";

import { Fragment, useMemo, useState } from "react";
import { oqituvchilarKpiHisoblash, oyKaliti, oyKorinishi, sanaKorinishi } from "@/lib/imtihonHisob";
import { OQITUVCHI_TURI } from "@/lib/constants";

function somKorinishi(son) {
  return new Intl.NumberFormat("uz-UZ").format(son) + " so'm";
}

export default function KpiClient({ urinishlar, oqituvchilar }) {
  const oylar = useMemo(() => {
    const to_plam = new Set();
    for (const u of urinishlar) {
      if (u.imtihonlar?.sana) to_plam.add(oyKaliti(u.imtihonlar.sana));
    }
    return Array.from(to_plam).sort().reverse();
  }, [urinishlar]);

  const [tanlanganOy, setTanlanganOy] = useState(oylar[0] || oyKaliti(new Date().toISOString().slice(0, 10)));
  const [ochiqId, setOchiqId] = useState(null);

  const oyUrinishlari = useMemo(
    () => urinishlar.filter((u) => u.imtihonlar?.sana && oyKaliti(u.imtihonlar.sana) === tanlanganOy),
    [urinishlar, tanlanganOy]
  );

  const kpiRoyxat = useMemo(
    () => oqituvchilarKpiHisoblash(oyUrinishlari, oqituvchilar),
    [oyUrinishlari, oqituvchilar]
  );

  const jamiSof = kpiRoyxat.reduce((s, r) => s + r.oy.sof, 0);
  const jamiMukofot = kpiRoyxat.reduce((s, r) => s + r.oy.mukofot, 0);
  const jamiJarima = kpiRoyxat.reduce((s, r) => s + r.oy.jarima, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">KPI / Maosh hisoboti</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Faqat Superadmin ko'radi. Har hafta (Dushanba–Yakshanba) alohida hisoblanadi, oylik yakun —
            haftalar yig'indisi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select className="input !w-auto" value={tanlanganOy} onChange={(e) => setTanlanganOy(e.target.value)}>
            {oylar.length === 0 && <option value={tanlanganOy}>{oyKorinishi(tanlanganOy)}</option>}
            {oylar.map((o) => (
              <option key={o} value={o}>
                {oyKorinishi(o)}
              </option>
            ))}
          </select>
          <a href={`/api/kpi-export?oy=${tanlanganOy}`} className="btn-primary">
            Excel yuklab olish
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card !py-4">
          <div className="text-2xl font-bold text-emerald-600">{somKorinishi(jamiMukofot)}</div>
          <div className="text-xs text-slate-400 mt-1">Jami mukofot</div>
        </div>
        <div className="card !py-4">
          <div className="text-2xl font-bold text-rose-600">{somKorinishi(jamiJarima)}</div>
          <div className="text-xs text-slate-400 mt-1">Jami jarima</div>
        </div>
        <div className="card !py-4">
          <div className="text-2xl font-bold text-slate-800">{somKorinishi(jamiSof)}</div>
          <div className="text-xs text-slate-400 mt-1">Sof jami ({oyKorinishi(tanlanganOy)})</div>
        </div>
      </div>

      {kpiRoyxat.length === 0 ? (
        <div className="card text-slate-400 text-sm">Shu oyda natija chiqqan ma'lumot yo'q.</div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100 bg-slate-50">
                <th className="p-3 font-medium">O'qituvchi</th>
                <th className="p-3 font-medium">Turi</th>
                <th className="p-3 font-medium text-right">O'tgan</th>
                <th className="p-3 font-medium text-right">O'tmagan</th>
                <th className="p-3 font-medium text-right">Mukofot</th>
                <th className="p-3 font-medium text-right">Jarima</th>
                <th className="p-3 font-medium text-right">Sof</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {kpiRoyxat.map((r) => (
                <Fragment key={r.oqituvchi.id}>
                  <tr
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setOchiqId(ochiqId === r.oqituvchi.id ? null : r.oqituvchi.id)}
                  >
                    <td className="p-3 font-medium text-slate-700">{r.oqituvchi.ism_familya}</td>
                    <td className="p-3 text-slate-500">{OQITUVCHI_TURI[r.oqituvchi.turi]}</td>
                    <td className="p-3 text-right text-emerald-600 font-medium">{r.oy.otgan}</td>
                    <td className="p-3 text-right text-rose-600 font-medium">{r.oy.otmagan}</td>
                    <td className="p-3 text-right text-emerald-600">{somKorinishi(r.oy.mukofot)}</td>
                    <td className="p-3 text-right text-rose-600">{somKorinishi(r.oy.jarima)}</td>
                    <td className="p-3 text-right font-bold text-slate-800">{somKorinishi(r.oy.sof)}</td>
                    <td className="p-3 text-slate-400 text-xs">
                      {ochiqId === r.oqituvchi.id ? "▲ yopish" : "▼ haftalar"}
                    </td>
                  </tr>
                  {ochiqId === r.oqituvchi.id && (
                    <tr>
                      <td colSpan={8} className="p-0 bg-slate-50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-slate-400 border-b border-slate-100">
                              <th className="p-2 pl-6 font-medium">Hafta</th>
                              <th className="p-2 font-medium text-right">O'tgan</th>
                              <th className="p-2 font-medium text-right">O'tmagan</th>
                              <th className="p-2 font-medium text-right">Foiz</th>
                              <th className="p-2 font-medium text-right">Jarima/dona</th>
                              <th className="p-2 font-medium text-right">Mukofot</th>
                              <th className="p-2 font-medium text-right">Jarima</th>
                              <th className="p-2 font-medium text-right pr-6">Sof</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.haftalar.map((h) => (
                              <tr key={h.hafta} className="border-b border-slate-100 last:border-0">
                                <td className="p-2 pl-6 text-slate-600">
                                  {sanaKorinishi(h.hafta)} – {sanaKorinishi(h.haftaOxiri)}
                                </td>
                                <td className="p-2 text-right text-emerald-600">{h.otgan}</td>
                                <td className="p-2 text-right text-rose-600">{h.otmagan}</td>
                                <td className="p-2 text-right text-slate-500">{Math.round(h.foiz * 100)}%</td>
                                <td className="p-2 text-right text-slate-500">
                                  {h.jarimaBir === 0 ? "—" : somKorinishi(h.jarimaBir)}
                                </td>
                                <td className="p-2 text-right text-emerald-600">{somKorinishi(h.mukofot)}</td>
                                <td className="p-2 text-right text-rose-600">{somKorinishi(h.jarima)}</td>
                                <td className="p-2 text-right font-semibold text-slate-700 pr-6">
                                  {somKorinishi(h.sof)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card bg-slate-50 border-slate-100 text-xs text-slate-500 leading-relaxed">
        <strong className="text-slate-600">Formula:</strong> Har o'tgan o'quvchi uchun 100 000 so'm mukofot.
        Haftalik o'tish darajasi ≥80% bo'lsa — o'tmaganlar uchun jarima yo'q. 50–80% oralig'ida — har bir
        o'tmagan uchun 50 000 so'm jarima. 50% dan past bo'lsa — har bir o'tmagan uchun 100 000 so'm (to'liq)
        jarima. Har hafta (Dushanba–Yakshanba) mustaqil hisoblanadi, oylik natija — shu oydagi barcha
        haftalar yig'indisi.
      </div>
    </div>
  );
}
