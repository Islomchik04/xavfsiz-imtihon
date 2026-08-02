"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { sanaKorinishi } from "@/lib/imtihonHisob";
import { NATIJA } from "@/lib/constants";
import { otdiEffekti } from "@/lib/effektlar";

export default function ImtihonTafsilotClient({ imtihon, boshlangichUrinishlar, natijaBelgilashRuxsat }) {
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
              onYangilash={(oz) => yangilaUrinish(u.id, oz)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UrinishKartochka({ urinish, tahrirRuxsat, onYangilash }) {
  const [yuklanmoqdaMaydon, setYuklanmoqdaMaydon] = useState(null);
  const talaba = urinish.talabalar;

  async function belgilash(maydon, qiymat) {
    setYuklanmoqdaMaydon(maydon);
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("talaba_imtihonlar")
      .update({ [maydon]: qiymat })
      .eq("id", urinish.id);
    setYuklanmoqdaMaydon(null);
    if (!error) {
      onYangilash({ [maydon]: qiymat });
      if (qiymat === "otdi") otdiEffekti();
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
            tahrirRuxsat={tahrirRuxsat}
            yuklanmoqda={yuklanmoqdaMaydon === "nazariy_natija"}
            onBelgilash={(q) => belgilash("nazariy_natija", q)}
          />
        )}
        {urinish.amaliy_kerak && (
          <NatijaTugmalari
            sarlavha="Amaliy"
            oqituvchi={talaba.amaliy_oqituvchilar?.ism_familya}
            natija={urinish.amaliy_natija}
            tahrirRuxsat={tahrirRuxsat}
            yuklanmoqda={yuklanmoqdaMaydon === "amaliy_natija"}
            onBelgilash={(q) => belgilash("amaliy_natija", q)}
          />
        )}
      </div>
    </div>
  );
}

function NatijaTugmalari({ sarlavha, oqituvchi, natija, tahrirRuxsat, yuklanmoqda, onBelgilash }) {
  const yakunlangan = natija !== "kutilmoqda";
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="text-sm font-semibold text-slate-700">{sarlavha}</span>
          {oqituvchi && <span className="text-xs text-slate-400 ml-2">{oqituvchi}</span>}
        </div>
        <span className="text-xs font-medium text-slate-500">{NATIJA[natija]}</span>
      </div>
      {tahrirRuxsat ? (
        <div className="flex gap-2">
          <button
            disabled={yuklanmoqda || yakunlangan}
            onClick={() => onBelgilash("otdi")}
            className={`flex-1 !py-4 !text-base btn ${
              natija === "otdi" ? "bg-emerald-600 text-white" : "bg-white border border-emerald-300 text-emerald-700"
            } disabled:opacity-50`}
          >
            O'TDI
          </button>
          <button
            disabled={yuklanmoqda || yakunlangan}
            onClick={() => onBelgilash("otmadi")}
            className={`flex-1 !py-4 !text-base btn ${
              natija === "otmadi" ? "bg-rose-600 text-white" : "bg-white border border-rose-300 text-rose-700"
            } disabled:opacity-50`}
          >
            O'TMADI
          </button>
        </div>
      ) : null}
    </div>
  );
}
