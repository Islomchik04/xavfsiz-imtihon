"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { sanaKorinishi } from "@/lib/imtihonHisob";

// Nazariydan o'tgan, hali amaliy imtihonga biriktirilmagan talaba —
// Hujjatchi/Imtihonchi/Superadmin bu yerdan TO'G'RIDAN-TO'G'RI (ariza
// kutmasdan) tanlangan imtihonga biriktirishi mumkin (amaliyga_otkazish
// RPC'si — huquqlari ular uchun allaqachon ochiq).
export default function TayyorTalabaKartochka({ talaba, aktivImtihonlar }) {
  const router = useRouter();
  const [imtihonId, setImtihonId] = useState("");
  const [ochiq, setOchiq] = useState(false);
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  async function biriktirish() {
    if (!imtihonId) {
      setXato("Imtihonni tanlang");
      return;
    }
    setXato("");
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("amaliyga_otkazish", {
      p_talaba_id: talaba.id,
      p_imtihon_id: imtihonId,
      p_amaliy_oqituvchi_id: null,
    });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <div>
        <Link href={`/talabalar/${talaba.id}`} className="font-semibold text-brand-700 hover:underline">
          {talaba.ism_familya}
        </Link>
        <div className="text-xs text-slate-400 mt-0.5">
          {talaba.filiallar?.nomi} / {talaba.guruhlar?.nomi}
          {talaba.intalim_id ? ` · ID: ${talaba.intalim_id}` : ""}
        </div>
      </div>

      {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}

      {!ochiq ? (
        <button type="button" className="btn-primary w-full" disabled={yuklanmoqda} onClick={() => setOchiq(true)}>
          Amaliy imtihonga biriktirish
        </button>
      ) : (
        <div className="space-y-2">
          <select className="input" value={imtihonId} onChange={(e) => setImtihonId(e.target.value)}>
            <option value="">Imtihonni tanlang</option>
            {aktivImtihonlar.map((i) => (
              <option key={i.id} value={i.id}>
                {sanaKorinishi(i.sana)} {i.izoh ? `— ${i.izoh}` : ""}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1" disabled={yuklanmoqda} onClick={biriktirish}>
              {yuklanmoqda ? "Yuborilmoqda…" : "Tasdiqlash"}
            </button>
            <button type="button" className="btn flex-1" disabled={yuklanmoqda} onClick={() => setOchiq(false)}>
              Bekor qilish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
