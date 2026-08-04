"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Faqat superadmin uchun — arxiv holati odatda avtomatik (amaliy natija
// o'tdi/o'tmadi bo'yicha) boshqariladi, lekin superadmin bu yerdan qo'lda
// ham arxivlashi/arxivdan chiqarishi mumkin.
export default function ArxivBoshqaruvi({ talabaId, arxivlanganmi }) {
  const router = useRouter();
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  async function ozgartirish() {
    const yangi = !arxivlanganmi;
    const savol = yangi
      ? "Bu talabani arxivga o'tkazishni tasdiqlaysizmi? U \"Talabalar\" ro'yxatida ko'rinmay qoladi."
      : "Bu talabani arxivdan chiqarishni tasdiqlaysizmi? U qaytadan \"Talabalar\" ro'yxatida ko'rinadi.";
    if (!confirm(savol)) return;
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("talaba_arxiv_holatini_ozgartirish", {
      p_talaba_id: talabaId,
      p_arxivlangan: yangi,
    });
    setYuklanmoqda(false);
    if (error) {
      alert(`Xatolik: ${error.message}`);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={yuklanmoqda}
      onClick={ozgartirish}
      className="text-xs text-slate-400 hover:text-slate-600 hover:underline disabled:opacity-50"
    >
      {yuklanmoqda ? "…" : arxivlanganmi ? "Arxivdan chiqarish" : "Arxivga o'tkazish"}
    </button>
  );
}
