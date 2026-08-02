"use client";

import { useEffect, useMemo, useState } from "react";
import { davrBoyichaStatistika } from "@/lib/statistika";
import { haftaBoshi, haftaOxiri, oyKaliti, oyKorinishi, sanaKorinishi } from "@/lib/imtihonHisob";

const TABLAR = [
  { key: "kun", label: "Imtihon kuni bo'yicha" },
  { key: "hafta", label: "Haftalik" },
  { key: "oy", label: "Oylik" },
];

export default function HisobotlarClient({ urinishlar, boshlangichImtihonId }) {
  const [tab, setTab] = useState("kun");

  const boshlangichSana = useMemo(() => {
    if (!boshlangichImtihonId) return null;
    const topilgan = urinishlar.find((u) => u.imtihonlar?.id === boshlangichImtihonId);
    return topilgan?.imtihonlar?.sana || null;
  }, [urinishlar, boshlangichImtihonId]);

  const kunlik = useMemo(
    () => davrBoyichaStatistika(urinishlar, (u) => u.imtihonlar?.sana || null, sanaKorinishi),
    [urinishlar]
  );
  const haftalik = useMemo(
    () =>
      davrBoyichaStatistika(
        urinishlar,
        (u) => (u.imtihonlar?.sana ? haftaBoshi(u.imtihonlar.sana) : null),
        (kalit) => `${sanaKorinishi(kalit)} — ${sanaKorinishi(haftaOxiri(kalit))}`
      ),
    [urinishlar]
  );
  const oylik = useMemo(
    () =>
      davrBoyichaStatistika(
        urinishlar,
        (u) => (u.imtihonlar?.sana ? oyKaliti(u.imtihonlar.sana) : null),
        oyKorinishi
      ),
    [urinishlar]
  );

  const royxat = tab === "kun" ? kunlik : tab === "hafta" ? haftalik : oylik;

  const [tanlangan, setTanlangan] = useState(boshlangichSana);
  useEffect(() => {
    if (tab === "kun" && boshlangichSana) setTanlangan(boshlangichSana);
    else setTanlangan(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const tanlanganYozuv = royxat.find((r) => r.kalit === tanlangan) || royxat[0] || null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Hisobotlar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Imtihon kuni, hafta va oy bo'yicha natijalar hamda o'qituvchilar reytingi.
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABLAR.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? "bg-white shadow-sm text-brand-700" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {royxat.length === 0 ? (
        <div className="card text-slate-400 text-sm">Hali natija chiqqan ma'lumot yo'q.</div>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <div className="card !p-2 h-fit max-h-[70vh] overflow-y-auto">
            {royxat.map((r) => (
              <button
                key={r.kalit}
                onClick={() => setTanlangan(r.kalit)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition ${
                  (tanlanganYozuv?.kalit === r.kalit)
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{r.korinish}</span>
                  <span className="text-xs text-slate-400">{r.jami} ta</span>
                </div>
              </button>
            ))}
          </div>

          {tanlanganYozuv && <BatafsilPanel yozuv={tanlanganYozuv} />}
        </div>
      )}
    </div>
  );
}

function BatafsilPanel({ yozuv }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="card !py-4">
          <div className="text-2xl font-bold text-slate-800">{yozuv.jami}</div>
          <div className="text-xs text-slate-400 mt-1">Jami natija</div>
        </div>
        <div className="card !py-4">
          <div className="text-2xl font-bold text-emerald-600">{yozuv.otgan}</div>
          <div className="text-xs text-slate-400 mt-1">O'tdi</div>
        </div>
        <div className="card !py-4">
          <div className="text-2xl font-bold text-rose-600">{yozuv.otmagan}</div>
          <div className="text-xs text-slate-400 mt-1">O'tmadi ({yozuv.foiz}% o'tish darajasi)</div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-1">TOP-3 o'qituvchi</h2>
        <p className="text-xs text-slate-400 mb-4">{yozuv.korinish}</p>
        {yozuv.top.length === 0 ? (
          <p className="text-sm text-slate-400">Ma'lumot yo'q</p>
        ) : (
          <div className="space-y-2">
            {yozuv.top.map((o, i) => (
              <div key={o.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{["🥇", "🥈", "🥉"][i] || `${i + 1}.`}</span>
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
        )}
        {yozuv.engKopYiqilgan && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">Eng ko'p yiqilgan o'qituvchi</span>
            <span className="font-medium text-rose-600">
              {yozuv.engKopYiqilgan.ism} · {yozuv.engKopYiqilgan.otmadi} ta
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
