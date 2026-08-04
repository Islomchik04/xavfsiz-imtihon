"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Faqat superadmin uchun — odatda arxivlash/arxivdan chiqarish avtomatik
// (amaliy natija o'tdi/o'tmadi bo'yicha) ishlaydi, lekin istisno holatlar
// uchun superadmin qo'lda ham arxivdan chiqara oladi.
export default function ArxivdanChiqarish({ talabaId }) {
  const router = useRouter();
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  async function chiqarish() {
    if (!confirm("Bu talabani arxivdan chiqarishni tasdiqlaysizmi? U qaytadan \"Talabalar\" ro'yxatida ko'rinadi.")) return;
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("talaba_arxiv_holatini_ozgartirish", {
      p_talaba_id: talabaId,
      p_arxivlangan: false,
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
      onClick={chiqarish}
      className="btn-secondary !py-1.5 !px-3 !text-xs disabled:opacity-50"
    >
      {yuklanmoqda ? "…" : "Arxivdan chiqarish"}
    </button>
  );
}
