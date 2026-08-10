"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Faqat Superadmin uchun — talabani butunlay o'chiradi. DB darajasida
// talaba_imtihonlar qatorlari CASCADE bilan bog'langan, ya'ni talaba
// o'chirilsa uning barcha imtihon urinishlari/tarixi ham birga o'chib
// ketadi — shu sabab tasdiqlash matnida buni alohida ogohlantiramiz.
export default function TalabaniOchirish({ talabaId, ismFamilya }) {
  const router = useRouter();
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  async function ochirish() {
    const tasdiq = confirm(
      `"${ismFamilya}" talabasini butunlay o'chirmoqchimisiz?\n\nDIQQAT: bu talabaning barcha imtihon urinishlari va tarixi ham birga o'chib ketadi. Bu amalni orqaga qaytarib bo'lmaydi.`
    );
    if (!tasdiq) return;

    setYuklanmoqda(true);
    setXato("");
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("talabalar").delete().eq("id", talabaId);
    setYuklanmoqda(false);

    if (error) {
      setXato(error.message);
      return;
    }

    // Diqqat: har doim "/talabalar"ga emas — foydalanuvchi qaysi ro'yxatdan
    // (arizalar, amaliy arizalar, arxiv va h.k.) kelgan bo'lsa, o'chirgandan
    // keyin ham o'sha ro'yxatga qaytishi kerak, "Talabalar" bo'limiga emas.
    router.back();
  }

  return (
    <div className="mt-2">
      {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2 mb-2">{xato}</div>}
      <button
        type="button"
        onClick={ochirish}
        disabled={yuklanmoqda}
        className="text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline disabled:opacity-50"
      >
        {yuklanmoqda ? "O'chirilmoqda…" : "🗑 Talabani o'chirish"}
      </button>
    </div>
  );
}
