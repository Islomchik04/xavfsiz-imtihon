"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import StatTile from "@/components/StatTile";
import { oqituvchiBoyichaStatistika } from "@/lib/statistika";
import {
  oqituvchilarKpiHisoblash,
  oyKaliti,
  oyKorinishi,
  sanaKorinishi,
  qismHolati,
  qismBirUrinishdaOtganmi,
} from "@/lib/imtihonHisob";
import { OQITUVCHI_TURI } from "@/lib/constants";
import { useTil } from "@/lib/i18n";

const OQUVCHILAR_TABLARI = [
  { key: "otgan", label: "Imtihondan o'tganlar" },
  { key: "otolmagan", label: "Imtihondan o'tolmaganlar" },
  { key: "kirmagan", label: "Imtihonga kirmaganlar" },
  { key: "bir_urinishda", label: "Bir urinishda o'tganlar" },
];

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

  // "Mening o'quvchilarim" — har bir talabani, FAQAT shu o'qituvchi
  // o'qitadigan qism (nazariy yoki amaliy) bo'yicha 4 toifaga ajratadi.
  const [oquvchilarTab, setOquvchilarTab] = useState("otgan");
  const oquvchilarToifalari = useMemo(() => {
    if (!oqituvchi) return { otgan: [], otolmagan: [], kirmagan: [], bir_urinishda: [] };
    const urinishlarMap = new Map();
    for (const u of urinishlar) {
      if (!u.talaba_id) continue;
      if (!urinishlarMap.has(u.talaba_id)) urinishlarMap.set(u.talaba_id, []);
      urinishlarMap.get(u.talaba_id).push(u);
    }
    const natija = { otgan: [], otolmagan: [], kirmagan: [], bir_urinishda: [] };
    for (const t of talabalar) {
      const uT = urinishlarMap.get(t.id) || [];
      const holat = qismHolati(uT, oqituvchi.turi);
      natija[holat].push(t);
      if (qismBirUrinishdaOtganmi(uT, oqituvchi.turi)) natija.bir_urinishda.push(t);
    }
    return natija;
  }, [talabalar, urinishlar, oqituvchi]);

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

      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-1">Mening o'quvchilarim</h2>
        <p className="text-xs text-slate-400 mb-4">
          {OQITUVCHI_TURI[oqituvchi.turi]} sifatida siz o'qitadigan qism bo'yicha hisoblangan.
        </p>

        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto mb-4">
          {OQUVCHILAR_TABLARI.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setOquvchilarTab(tb.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
                oquvchilarTab === tb.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tb.label} ({oquvchilarToifalari[tb.key].length})
            </button>
          ))}
        </div>

        {oquvchilarToifalari[oquvchilarTab].length === 0 ? (
          <p className="text-sm text-slate-400">Bu toifada o'quvchi yo'q.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {oquvchilarToifalari[oquvchilarTab].map((t) => (
              <li key={t.id} className="py-2.5 flex justify-between items-center text-sm">
                <Link href={`/talabalar/${t.id}`} className="font-medium text-brand-700 hover:underline">
                  {t.ism_familya}
                </Link>
                <span className="text-xs text-slate-400">
                  {t.filiallar?.nomi} · {t.guruhlar?.nomi}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
