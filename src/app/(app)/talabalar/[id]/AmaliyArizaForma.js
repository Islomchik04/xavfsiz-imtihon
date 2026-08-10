"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Filial admini (yoki hujjatchi/imtihonchi/superadmin) nazariydan o'tgan,
// hujjati tayyor, hali amaliy imtihonga biriktirilmagan talabani "Amaliy
// imtihonga yuborish" arizasi bilan yuboradi. Bu to'g'ridan-to'g'ri
// biriktirish EMAS — ariza Hujjatchiga alohida ("Arizalar" bo'limi, "Amaliy
// imtihon so'rovlari") ko'rinadi, u tasdiqlashi/rad etishi kerak.
export default function AmaliyArizaForma({ talabaId, amaliyTayyormi, mavjudAriza, yuborishRuxsat }) {
  const router = useRouter();
  const [izoh, setIzoh] = useState("");
  const [ochiq, setOchiq] = useState(false);
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  if (mavjudAriza && mavjudAriza.holati === "kutilmoqda") {
    return (
      <div className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
        ⏳ Amaliy imtihonga yuborish so'rovi yuborilgan — Hujjatchi ko'rib chiqmoqda.
      </div>
    );
  }

  if (!amaliyTayyormi || !yuborishRuxsat) return null;

  async function yuborish() {
    setXato("");
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("amaliy_ariza_yuborish", {
      p_talaba_id: talabaId,
      p_izoh: izoh.trim() || null,
    });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    setOchiq(false);
    setIzoh("");
    router.refresh();
  }

  return (
    <div className="border-2 border-dashed border-emerald-300 bg-emerald-50 rounded-xl p-4 space-y-3">
      {mavjudAriza && mavjudAriza.holati === "rad_etildi" && (
        <div className="text-xs text-rose-600 bg-rose-100 rounded-lg px-3 py-2">
          Oldingi so'rov rad etilgan{mavjudAriza.izoh ? `: ${mavjudAriza.izoh}` : ""}. Qayta yuborishingiz mumkin.
        </div>
      )}
      <div className="text-sm font-semibold text-emerald-800">
        ✓ Nazariydan o'tgan — amaliy imtihonga yuborish mumkin
      </div>
      {!ochiq ? (
        <button type="button" className="btn-primary w-full" onClick={() => setOchiq(true)}>
          Amaliy imtihonga yuborish (ariza)
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            className="input"
            rows={2}
            placeholder="Izoh (ixtiyoriy)"
            value={izoh}
            onChange={(e) => setIzoh(e.target.value)}
          />
          {xato && <div className="text-sm text-rose-600 bg-rose-100 rounded-lg px-3 py-2">{xato}</div>}
          <div className="flex gap-2">
            <button type="button" className="btn-primary flex-1" disabled={yuklanmoqda} onClick={yuborish}>
              {yuklanmoqda ? "Yuborilmoqda…" : "Tasdiqlash va yuborish"}
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
