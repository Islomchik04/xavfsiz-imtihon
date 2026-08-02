"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { sanaKorinishi } from "@/lib/imtihonHisob";
import { NATIJA } from "@/lib/constants";
import { otdiEffekti } from "@/lib/effektlar";

export default function ImtihonTafsilotClient({ imtihon, boshlangichUrinishlar, natijaBelgilashRuxsat, sabablar }) {
  const [urinishlar, setUrinishlar] = useState(boshlangichUrinishlar);
  const [soz, setSoz] = useState("");

  const filtrlangan = useMemo(() => {
    const s = soz.trim().toLowerCase();
    if (!s) return urinishlar;
    return urinishlar.filter((u) => u.talabalar?.ism_familya?.toLowerCase().includes(s));
  }, [urinishlar, soz]);

  function yangilaUrinish(id, oz) {
    setUrinishlar((royxat) => royxat.map((u) => (u.id === id ? { ...u, ...oz } : u)));
  }

  const jami = urinishlar.length;
  const natijaChiqqan = urinishlar.filter((u) => {
    const qismlar = [];
    if (u.nazariy_kerak) qismlar.push(u.nazariy_natija);
    if (u.amaliy_kerak) qismlar.push(u.amaliy_natija);
    return !qismlar.some((q) => q === "kutilmoqda");
  }).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/imtihonlar" className="text-sm text-brand-600 hover:underline">
            ← Imtihonlar
          </Link>
          <h1 className="text-xl font-bold text-slate-800 mt-1">{sanaKorinishi(imtihon.sana)}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {imtihon.izoh ? `${imtihon.izoh} · ` : ""}
            {natijaChiqqan}/{jami} ta natija chiqqan
          </p>
        </div>
      </div>

      <div className="relative">
        <img
          src="/logo.png"
          alt=""
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full object-cover pointer-events-none"
        />
        <input
          className="input !pl-12 !text-lg !py-4"
          placeholder="Ism familyani kiriting…"
          value={soz}
          onChange={(e) => setSoz(e.target.value)}
          autoFocus
        />
      </div>

      {jami === 0 ? (
        <div className="card text-sm text-slate-400">Bu imtihonga hali talaba biriktirilmagan.</div>
      ) : filtrlangan.length === 0 ? (
        <div className="card text-sm text-slate-400">Hech narsa topilmadi.</div>
      ) : (
        <div className="space-y-4">
          {filtrlangan.map((u) => (
            <UrinishKartochka
              key={u.id}
              urinish={u}
              tahrirRuxsat={natijaBelgilashRuxsat}
              sabablar={sabablar}
              onYangilash={(oz) => yangilaUrinish(u.id, oz)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UrinishKartochka({ urinish, tahrirRuxsat, sabablar, onYangilash }) {
  const [yuklanmoqdaMaydon, setYuklanmoqdaMaydon] = useState(null);
  const talaba = urinish.talabalar;

  async function belgilash(natijaMaydon, natijaQiymat, sababMaydon, sababQiymat) {
    setYuklanmoqdaMaydon(natijaMaydon);
    const supabase = supabaseBrowser();
    const oz = { [natijaMaydon]: natijaQiymat };
    if (sababMaydon) oz[sababMaydon] = sababQiymat;
    const { error } = await supabase.from("talaba_imtihonlar").update(oz).eq("id", urinish.id);
    setYuklanmoqdaMaydon(null);
    if (!error) {
      onYangilash(oz);
      if (natijaQiymat === "otdi") otdiEffekti();
    }
  }

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="text-lg font-bold text-slate-800">{talaba.ism_familya}</div>
          <div className="text-sm text-slate-400">
            {talaba.filiallar?.nomi} · {talaba.guruhlar?.nomi}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {urinish.nazariy_kerak && (
          <NatijaTugmalari
            sarlavha="Nazariy"
            oqituvchi={talaba.nazariy_oqituvchilar?.ism_familya}
            natija={urinish.nazariy_natija}
            sababId={urinish.nazariy_sabab_id}
            sabablar={sabablar}
            tahrirRuxsat={tahrirRuxsat}
            yuklanmoqda={yuklanmoqdaMaydon === "nazariy_natija"}
            onBelgilash={(q, sababId) => belgilash("nazariy_natija", q, "nazariy_sabab_id", sababId ?? null)}
          />
        )}
        {urinish.amaliy_kerak && (
          <NatijaTugmalari
            sarlavha="Amaliy"
            oqituvchi={talaba.amaliy_oqituvchilar?.ism_familya}
            natija={urinish.amaliy_natija}
            sababId={urinish.amaliy_sabab_id}
            sabablar={sabablar}
            tahrirRuxsat={tahrirRuxsat}
            yuklanmoqda={yuklanmoqdaMaydon === "amaliy_natija"}
            onBelgilash={(q, sababId) => belgilash("amaliy_natija", q, "amaliy_sabab_id", sababId ?? null)}
          />
        )}
      </div>
    </div>
  );
}

function NatijaTugmalari({ sarlavha, oqituvchi, natija, sababId, sabablar, tahrirRuxsat, yuklanmoqda, onBelgilash }) {
  const yakunlangan = natija !== "kutilmoqda";
  const [boshqaTanlanmoqda, setBoshqaTanlanmoqda] = useState(false);
  const [tanlanganSabab, setTanlanganSabab] = useState("");

  const joriySabab = sababId ? sabablar.find((s) => s.id === sababId)?.matn : null;

  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="text-sm font-semibold text-slate-700">{sarlavha}</span>
          {oqituvchi && <span className="text-xs text-slate-400 ml-2">{oqituvchi}</span>}
        </div>
        <span className="text-xs font-medium text-slate-500">
          {NATIJA[natija]}
          {joriySabab && ` — ${joriySabab}`}
        </span>
      </div>
      {tahrirRuxsat ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={yuklanmoqda || yakunlangan}
              onClick={() => onBelgilash("otdi")}
              className={`!py-4 !text-base btn ${
                natija === "otdi" ? "bg-emerald-600 text-white" : "bg-white border border-emerald-300 text-emerald-700"
              } disabled:opacity-50`}
            >
              O'TDI
            </button>
            <button
              disabled={yuklanmoqda || yakunlangan}
              onClick={() => onBelgilash("otmadi")}
              className={`!py-4 !text-base btn ${
                natija === "otmadi" ? "bg-rose-600 text-white" : "bg-white border border-rose-300 text-rose-700"
              } disabled:opacity-50`}
            >
              O'TMADI
            </button>
            <button
              disabled={yuklanmoqda || yakunlangan}
              onClick={() => onBelgilash("kelmadi")}
              className={`!py-2.5 !text-sm btn ${
                natija === "kelmadi" ? "bg-amber-500 text-white" : "bg-white border border-amber-300 text-amber-700"
              } disabled:opacity-50`}
            >
              KELMADI
            </button>
            <button
              disabled={yuklanmoqda || yakunlangan}
              onClick={() => setBoshqaTanlanmoqda((v) => !v)}
              className={`!py-2.5 !text-sm btn ${
                natija === "boshqa" ? "bg-violet-500 text-white" : "bg-white border border-violet-300 text-violet-700"
              } disabled:opacity-50`}
            >
              BOSHQA
            </button>
          </div>
          {boshqaTanlanmoqda && !yakunlangan && (
            <div className="flex gap-2 items-center bg-white border border-violet-200 rounded-lg p-2">
              <select
                className="input !py-1.5 !text-sm flex-1"
                value={tanlanganSabab}
                onChange={(e) => setTanlanganSabab(e.target.value)}
              >
                <option value="">Sababni tanlang…</option>
                {sabablar.map((s) => (
                  <option key={s.id} value={s.id}>{s.matn}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!tanlanganSabab || yuklanmoqda}
                onClick={() => {
                  onBelgilash("boshqa", tanlanganSabab);
                  setBoshqaTanlanmoqda(false);
                }}
                className="btn-primary !py-1.5 !text-sm shrink-0 disabled:opacity-50"
              >
                Tasdiqlash
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
