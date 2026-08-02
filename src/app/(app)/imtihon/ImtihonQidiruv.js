"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { IMTIHON_TURI, NATIJA } from "@/lib/constants";

const SELECT = `
  id, ism_familya, imtihon_turi, imtihon_sanasi, nazariy_natija, amaliy_natija,
  filiallar(nomi), guruhlar(nomi),
  nazariy_oqituvchilar:oqituvchilar!nazariy_oqituvchi_id(ism_familya),
  amaliy_oqituvchilar:oqituvchilar!amaliy_oqituvchi_id(ism_familya)
`;

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
        .from("talabalar")
        .select(SELECT)
        .eq("hujjat_tayyor", true)
        .ilike("ism_familya", `%${soz.trim()}%`)
        .order("ism_familya")
        .limit(20);
      setNatijalar(data || []);
      setQidirilmoqda(false);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [soz]);

  function yangilaTalaba(id, oz) {
    setNatijalar((royxat) => royxat.map((t) => (t.id === id ? { ...t, ...oz } : t)));
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
          Topilmadi. Hujjati hali tayyor bo'lmagan talabalar bu yerda ko'rinmaydi.
        </p>
      )}

      <div className="space-y-4">
        {natijalar.map((t) => (
          <TalabaKartochka key={t.id} talaba={t} onYangilash={(oz) => yangilaTalaba(t.id, oz)} />
        ))}
      </div>
    </div>
  );
}

function TalabaKartochka({ talaba, onYangilash }) {
  const [yuklanmoqdaMaydon, setYuklanmoqdaMaydon] = useState(null);

  async function belgilash(maydon, qiymat) {
    setYuklanmoqdaMaydon(maydon);
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("talabalar").update({ [maydon]: qiymat }).eq("id", talaba.id);
    setYuklanmoqdaMaydon(null);
    if (!error) onYangilash({ [maydon]: qiymat });
  }

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="text-lg font-bold text-slate-800">{talaba.ism_familya}</div>
          <div className="text-sm text-slate-400">
            {talaba.filiallar?.nomi} · {talaba.guruhlar?.nomi} · {IMTIHON_TURI[talaba.imtihon_turi]}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {talaba.imtihon_turi !== "amaliy" && (
          <NatijaTugmalari
            sarlavha="Nazariy"
            oqituvchi={talaba.nazariy_oqituvchilar?.ism_familya}
            natija={talaba.nazariy_natija}
            yuklanmoqda={yuklanmoqdaMaydon === "nazariy_natija"}
            onBelgilash={(q) => belgilash("nazariy_natija", q)}
          />
        )}
        {talaba.imtihon_turi !== "nazariy" && (
          <NatijaTugmalari
            sarlavha="Amaliy"
            oqituvchi={talaba.amaliy_oqituvchilar?.ism_familya}
            natija={talaba.amaliy_natija}
            yuklanmoqda={yuklanmoqdaMaydon === "amaliy_natija"}
            onBelgilash={(q) => belgilash("amaliy_natija", q)}
          />
        )}
      </div>
    </div>
  );
}

function NatijaTugmalari({ sarlavha, oqituvchi, natija, yuklanmoqda, onBelgilash }) {
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
          disabled={yuklanmoqda}
          onClick={() => onBelgilash("otdi")}
          className={`flex-1 !py-4 !text-base btn ${
            natija === "otdi" ? "bg-emerald-600 text-white" : "bg-white border border-emerald-300 text-emerald-700"
          }`}
        >
          O'TDI
        </button>
        <button
          disabled={yuklanmoqda}
          onClick={() => onBelgilash("otmadi")}
          className={`flex-1 !py-4 !text-base btn ${
            natija === "otmadi" ? "bg-rose-600 text-white" : "bg-white border border-rose-300 text-rose-700"
          }`}
        >
          O'TMADI
        </button>
      </div>
    </div>
  );
}
