"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Yangi talaba arizasini (hali hujjat tayyor bo'lmagan) rad etish tugmasi —
// bosilganda sabab (umumiy "sabablar" ro'yxatidan) va ixtiyoriy izoh so'raydi,
// so'ng talaba_arizasini_rad_etish RPC'sini chaqiradi. Hujjatchi/Superadmin
// uchun ko'rinadi (sahifada radEtishRuxsat orqali tekshiriladi).
export default function ArizaRadEtishTugmasi({ talabaId, sabablar }) {
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [sababId, setSababId] = useState("");
  const [izoh, setIzoh] = useState("");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  function ochish() {
    setSababId("");
    setIzoh("");
    setXato("");
    setOchiq(true);
  }

  function yopish() {
    setOchiq(false);
    setSababId("");
    setIzoh("");
    setXato("");
  }

  async function radEtish() {
    if (!sababId) {
      setXato("Rad etish sababini tanlang");
      return;
    }
    setXato("");
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("talaba_arizasini_rad_etish", {
      p_talaba_id: talabaId,
      p_sabab_id: sababId,
      p_izoh: izoh.trim() || null,
    });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    yopish();
    router.refresh();
  }

  if (!ochiq) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          ochish();
        }}
        className="btn-secondary !py-1.5 !px-3 !text-xs !text-rose-600 !border-rose-200 hover:!bg-rose-50 shrink-0"
      >
        Rad etish
      </button>
    );
  }

  return (
    <div
      className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 space-y-2 w-full sm:max-w-xs"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <select
        className="input !py-1.5 !text-xs"
        value={sababId}
        onChange={(e) => setSababId(e.target.value)}
        autoFocus
      >
        <option value="">Rad etish sababi…</option>
        {sabablar.map((s) => (
          <option key={s.id} value={s.id}>
            {s.matn}
          </option>
        ))}
      </select>
      <textarea
        className="input !py-1.5 !text-xs"
        rows={2}
        placeholder="Izoh (ixtiyoriy)"
        value={izoh}
        onChange={(e) => setIzoh(e.target.value)}
      />
      {xato && <div className="text-xs text-rose-600">{xato}</div>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={yuklanmoqda}
          onClick={radEtish}
          className="btn-primary !py-1.5 !text-xs flex-1 !bg-rose-600 hover:!bg-rose-700 disabled:opacity-50"
        >
          {yuklanmoqda ? "…" : "Tasdiqlash"}
        </button>
        <button
          type="button"
          disabled={yuklanmoqda}
          onClick={yopish}
          className="btn !py-1.5 !text-xs flex-1"
        >
          Bekor
        </button>
      </div>
    </div>
  );
}
