"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { telefonKorinishi } from "@/lib/telefon";

// Telegram bot orqali domlalar yuborgan "erkin/mustaqil o'quvchi" KPI
// so'rovlari — Hujjatchi/Superadmin rasmga qarab tasdiqlaydi (shu domlaga
// KPI yoziladi) yoki rad etadi. "kutilmoqda" holatida amallar tugmalari
// ko'rinadi, "tasdiqlangan" holatida esa faqat ma'lumot (tarix sifatida).
export default function MustaqilArizaKartochka({ ariza }) {
  const router = useRouter();
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const kutilmoqda = ariza.holati === "kutilmoqda";

  async function tasdiqlash() {
    setXato("");
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("erkin_arizani_tasdiqlash", { p_ariza_id: ariza.id });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    router.refresh();
  }

  async function radEtish() {
    if (!confirm(`"${ariza.ism_familya}" uchun so'rovni rad etasizmi?`)) return;
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("erkin_arizani_rad_etish", { p_ariza_id: ariza.id });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      {ariza.rasmUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ariza.rasmUrl}
          alt={ariza.ism_familya}
          className="w-full max-h-64 object-cover rounded-lg border border-slate-100"
        />
      )}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-slate-700">{ariza.ism_familya}</div>
          {kutilmoqda ? (
            <span className="badge bg-amber-100 text-amber-700 text-xs shrink-0">Kutilmoqda</span>
          ) : (
            <span className="badge bg-emerald-100 text-emerald-700 text-xs shrink-0">✓ Tasdiqlangan</span>
          )}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">
          Domla: {ariza.oqituvchilar?.ism_familya || "—"}
          {ariza.telefon ? ` · 📞 +998 ${telefonKorinishi(ariza.telefon)}` : ""}
          {ariza.urinish_raqami ? ` · ${ariza.urinish_raqami}-urinishda o'tgan` : ""}
        </div>
        <div className="text-xs text-slate-400">
          {kutilmoqda
            ? new Date(ariza.created_at).toLocaleString("uz-UZ")
            : `Tasdiqlangan: ${ariza.korib_chiqqan_vaqt ? new Date(ariza.korib_chiqqan_vaqt).toLocaleString("uz-UZ") : "—"}`}
        </div>
      </div>
      {ariza.izoh && <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{ariza.izoh}</div>}

      {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}

      {kutilmoqda && (
        <div className="flex gap-2">
          <button type="button" className="btn-primary flex-1" disabled={yuklanmoqda} onClick={tasdiqlash}>
            {yuklanmoqda ? "…" : "Tasdiqlash (KPI yozish)"}
          </button>
          <button type="button" className="btn-danger flex-1" disabled={yuklanmoqda} onClick={radEtish}>
            Rad etish
          </button>
        </div>
      )}
    </div>
  );
}
