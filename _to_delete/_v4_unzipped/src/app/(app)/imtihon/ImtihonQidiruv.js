"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { NATIJA } from "@/lib/constants";
import { sanaKorinishi } from "@/lib/imtihonHisob";

const SELECT = `
  id, nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija,
  imtihonlar(sana),
  talabalar!inner(
    id, ism_familya,
    filiallar(nomi), guruhlar(nomi),
    nazariy_oqituvchilar:oqituvchilar!nazariy_oqituvchi_id(ism_familya),
    amaliy_oqituvchilar:oqituvchilar!amaliy_oqituvchi_id(ism_familya)
  )
`;

// Faqat hali natijasi chiqmagan (kamida bitta kerakli qismi "kutilmoqda")
// urinishlarni qidirish natijasida ko'rsatamiz.
const KUTILAYOTGAN_FILTR =
  "and(nazariy_kerak.eq.true,nazariy_natija.eq.kutilmoqda),and(amaliy_kerak.eq.true,amaliy_natija.eq.kutilmoqda)";

export default function ImtihonQidiruv() {
  const [soz, setSoz] = useState("");
  const [natijalar, setNatijalar] = useState([]);
  const [qidirilmoqda, setQidirilmoqda] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (soz.trim().length < 2) {
      setNatijalar([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setQidirilmoqda(true);
      const supabase = supabaseBrowser();
      const { data } = await supabase
        .from("talaba_imtihonlar")
        .select(SELECT)
        .ilike("talabalar.ism_familya", `%${soz.trim()}%`)
        .or(KUTILAYOTGAN_FILTR)
        .order("ism_familya", { foreignTable: "talabalar" })
        .limit(20);
      setNatijalar(data || []);
      setQidirilmoqda(false);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [soz]);

  function yangilaUrinish(id, oz) {
    setNatijalar((royxat) => royxat.map((u) => (u.id === id ? { ...u, ...oz } : u)));
  }

  return (
    <div className="space-y-4">
      <input
        className="input !text-lg !py-4"
        placeholder="Ism familyani kiriting…"
        value={soz}
        onChange={(e) => setSoz(e.target.value)}
        autoFocus
      />

      {qidirilmoqda && <p className="text-sm text-slate-400">Qidirilmoqda…</p>}

      {!qidirilmoqda && soz.trim().length >= 2 && natijalar.length === 0 && (
        <p className="text-sm text-slate-400">
          Topilmadi. Hujjati tayyor bo'lmagan yoki natijasi chiqib bo'lgan talabalar bu yerda ko'rinmaydi.
        </p>
      )}

      <div className="space-y-4">
        {natijalar.map((u) => (
          <UrinishKartochka key={u.id} urinish={u} onYangilash={(oz) => yangilaUrinish(u.id, oz)} />
        ))}
      </div>
    </div>
  );
}

function UrinishKartochka({ urinish, onYangilash }) {
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
    if (!error) onYangilash({ [maydon]: qiymat });
  }

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="text-lg font-bold text-slate-800">{talaba.ism_familya}</div>
          <div className="text-sm text-slate-400">
            {talaba.filiallar?.nomi} · {talaba.guruhlar?.nomi}
            {urinish.imtihonlar?.sana && <> · {sanaKorinishi(urinish.imtihonlar.sana)}</>}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {urinish.nazariy_kerak && (
          <NatijaTugmalari
            sarlavha="Nazariy"
            oqituvchi={talaba.nazariy_oqituvchilar?.ism_familya}
            natija={urinish.nazariy_natija}
            yakunlangan={urinish.nazariy_natija !== "kutilmoqda"}
            yuklanmoqda={yuklanmoqdaMaydon === "nazariy_natija"}
            onBelgilash={(q) => belgilash("nazariy_natija", q)}
          />
        )}
        {urinish.amaliy_kerak && (
          <NatijaTugmalari
            sarlavha="Amaliy"
            oqituvchi={talaba.amaliy_oqituvchilar?.ism_familya}
            natija={urinish.amaliy_natija}
            yakunlangan={urinish.amaliy_natija !== "kutilmoqda"}
            yuklanmoqda={yuklanmoqdaMaydon === "amaliy_natija"}
            onBelgilash={(q) => belgilash("amaliy_natija", q)}
          />
        )}
      </div>
    </div>
  );
}

function NatijaTugmalari({ sarlavha, oqituvchi, natija, yakunlangan, yuklanmoqda, onBelgilash }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="flex justify-between items-center mb-2">
        <div>
          <span className="text-sm font-semibold text-slate-700">{sarlavha}</span>
          {oqituvchi && <span className="text-xs text-slate-400 ml-2">{oqituvchi}</span>}
        </div>
        <span className="text-xs font-medium text-slate-500">{NATIJA[natija]}</span>
      </div>
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
    </div>
  );
}
