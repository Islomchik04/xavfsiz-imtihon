"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { NATIJA, NATIJA_RANG } from "@/lib/constants";
import { qaytaBiriktirishKerakmi, sanaKorinishi } from "@/lib/imtihonHisob";

export default function NatijaForm({ talaba, urinishlar, natijaTahrirRuxsat, qaytaBiriktirishRuxsat, imtihonlar }) {
  if (!urinishlar || urinishlar.length === 0) {
    return <p className="text-sm text-slate-400">Bu talaba hali birorta imtihonga biriktirilmagan.</p>;
  }

  const tartiblangan = [...urinishlar].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  const qayta = qaytaBiriktirishRuxsat ? qaytaBiriktirishKerakmi(urinishlar) : null;

  return (
    <div className="space-y-4">
      {tartiblangan.map((u, idx) => (
        <UrinishKartochka
          key={u.id}
          urinish={u}
          eskimi={idx > 0}
          tahrirRuxsat={natijaTahrirRuxsat && idx === 0}
        />
      ))}

      {qayta && (
        <QaytaBiriktirishForma talabaId={talaba.id} standart={qayta} imtihonlar={imtihonlar} />
      )}
    </div>
  );
}

function UrinishKartochka({ urinish, eskimi, tahrirRuxsat }) {
  const router = useRouter();
  const [yuklanmoqdaMaydon, setYuklanmoqdaMaydon] = useState(null);

  async function belgilash(maydon, qiymat) {
    setYuklanmoqdaMaydon(maydon);
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("talaba_imtihonlar").update({ [maydon]: qiymat }).eq("id", urinish.id);
    setYuklanmoqdaMaydon(null);
    if (!error) router.refresh();
  }

  return (
    <div className={`border rounded-xl p-4 ${eskimi ? "border-slate-100 opacity-70" : "border-slate-200"}`}>
      <div className="text-sm font-semibold text-slate-700 mb-3">
        {sanaKorinishi(urinish.imtihonlar?.sana)}
        {urinish.imtihonlar?.izoh ? ` — ${urinish.imtihonlar.izoh}` : ""}
        {eskimi && <span className="ml-2 text-xs font-normal text-slate-400">(oldingi urinish)</span>}
      </div>
      <div className="space-y-3">
        {urinish.nazariy_kerak && (
          <NatijaQatori
            sarlavha="Nazariy"
            natija={urinish.nazariy_natija}
            belgilagan={urinish.nazariy_belgilagan_profil?.ism_familya}
            vaqt={urinish.nazariy_belgilangan_vaqt}
            tahrirRuxsat={tahrirRuxsat}
            yuklanmoqda={yuklanmoqdaMaydon === "nazariy_natija"}
            onBelgilash={(q) => belgilash("nazariy_natija", q)}
          />
        )}
        {urinish.amaliy_kerak && (
          <NatijaQatori
            sarlavha="Amaliy"
            natija={urinish.amaliy_natija}
            belgilagan={urinish.amaliy_belgilagan_profil?.ism_familya}
            vaqt={urinish.amaliy_belgilangan_vaqt}
            tahrirRuxsat={tahrirRuxsat}
            yuklanmoqda={yuklanmoqdaMaydon === "amaliy_natija"}
            onBelgilash={(q) => belgilash("amaliy_natija", q)}
          />
        )}
      </div>
    </div>
  );
}

function NatijaQatori({ sarlavha, natija, belgilagan, vaqt, tahrirRuxsat, yuklanmoqda, onBelgilash }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-slate-700">{sarlavha}</span>
        <span className={`badge ${NATIJA_RANG[natija] || "bg-slate-100 text-slate-600"}`}>
          {NATIJA[natija]}
        </span>
      </div>
      {tahrirRuxsat && natija === "kutilmoqda" && (
        <div className="flex gap-2">
          <button type="button" disabled={yuklanmoqda} onClick={() => onBelgilash("otdi")} className="btn-success flex-1 !py-2.5">
            O'TDI
          </button>
          <button type="button" disabled={yuklanmoqda} onClick={() => onBelgilash("otmadi")} className="btn-danger flex-1 !py-2.5">
            O'TMADI
          </button>
        </div>
      )}
      {belgilagan && (
        <div className="text-xs text-slate-400 mt-1">
          Belgiladi: {belgilagan} {vaqt ? `· ${new Date(vaqt).toLocaleString("uz-UZ")}` : ""}
        </div>
      )}
    </div>
  );
}

function QaytaBiriktirishForma({ talabaId, standart, imtihonlar }) {
  const router = useRouter();
  const [imtihonId, setImtihonId] = useState("");
  const [nazariyKerak, setNazariyKerak] = useState(standart.nazariyKerak);
  const [amaliyKerak, setAmaliyKerak] = useState(standart.amaliyKerak);
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  async function yuborish(e) {
    e.preventDefault();
    setXato("");
    if (!imtihonId) {
      setXato("Imtihonni tanlang");
      return;
    }
    if (!nazariyKerak && !amaliyKerak) {
      setXato("Kamida bittasi tanlanishi kerak");
      return;
    }
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("imtihonga_biriktirish", {
      p_talaba_id: talabaId,
      p_imtihon_id: imtihonId,
      p_nazariy_kerak: nazariyKerak,
      p_amaliy_kerak: amaliyKerak,
    });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    router.push("/talabalar");
    router.refresh();
  }

  return (
    <form onSubmit={yuborish} className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl p-4 space-y-3">
      <div className="text-sm font-semibold text-amber-800">
        Natija yakunlanmagan — qayta imtihonga biriktirish
      </div>
      <div className="flex gap-4 text-sm">
        {standart.nazariyKerak && (
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={nazariyKerak} onChange={(e) => setNazariyKerak(e.target.checked)} />
            Nazariy
          </label>
        )}
        {standart.amaliyKerak && (
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={amaliyKerak} onChange={(e) => setAmaliyKerak(e.target.checked)} />
            Amaliy
          </label>
        )}
      </div>
      <select className="input" value={imtihonId} onChange={(e) => setImtihonId(e.target.value)} required>
        <option value="">Yangi imtihonni tanlang</option>
        {imtihonlar.map((i) => (
          <option key={i.id} value={i.id}>
            {sanaKorinishi(i.sana)} {i.izoh ? `— ${i.izoh}` : ""}
          </option>
        ))}
      </select>
      {xato && <div className="text-sm text-rose-600 bg-rose-100 rounded-lg px-3 py-2">{xato}</div>}
      <button type="submit" className="btn-primary w-full" disabled={yuklanmoqda}>
        {yuklanmoqda ? "Biriktirilmoqda…" : "Yangi imtihonga biriktirish"}
      </button>
    </form>
  );
}
