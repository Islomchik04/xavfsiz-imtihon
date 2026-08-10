"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Rad etilgan arizani qaytarish (bekor qilish) tugmasi — faqat Superadmin
// ko'radi. talaba_arizasini_qaytarish RPC'sini chaqiradi, talaba yana
// "kutilmoqda" ro'yxatiga qaytadi.
export default function QaytarishTugmasi({ talabaId }) {
  const router = useRouter();
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  async function qaytarish() {
    setXato("");
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("talaba_arizasini_qaytarish", { p_talaba_id: talabaId });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={yuklanmoqda}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          qaytarish();
        }}
        className="btn-secondary !py-1.5 !px-3 !text-xs shrink-0 disabled:opacity-50"
      >
        {yuklanmoqda ? "…" : "Qaytarish"}
      </button>
      {xato && <div className="text-xs text-rose-600">{xato}</div>}
    </div>
  );
}
