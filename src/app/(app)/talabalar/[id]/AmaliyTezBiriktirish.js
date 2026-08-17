"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { sanaKorinishi } from "@/lib/imtihonHisob";

// Imtihonchi/Superadmin uchun — talaba profilida BIR HARAKATDA amaliy
// imtihonga biriktirish VA darhol natijasini belgilash. Odatda bu ikki
// bosqichda qilinardi (avval "Amaliy arizalar" bo'limida yoki shu yerdagi
// "Amaliy imtihonga yuborish (ariza)" orqali biriktirish, keyin natija
// chiqqach qaytib kelib belgilash) — bu forma ularni bitta amalga
// birlashtiradi: avval amaliyga_otkazish RPC'si bilan yangi urinish
// yaratiladi, so'ng o'sha zahoti o'sha urinishga natija yoziladi (xuddi
// NatijaForm.js'dagi UrinishKartochka bilan bir xil update shakli bilan —
// talaba_imtihonlar_update_guard trigger'i buni imtihonchi/superadmin
// uchun ruxsat beradi va belgilagan/belgilangan_vaqt'ni avtomatik to'ldiradi).
export default function AmaliyTezBiriktirish({ talabaId, imtihonlar }) {
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [imtihonId, setImtihonId] = useState("");
  const [natija, setNatija] = useState("otdi");
  const [raqam, setRaqam] = useState("1");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  if (!imtihonlar || imtihonlar.length === 0) return null;

  async function yuborish(e) {
    e.preventDefault();
    if (!imtihonId) {
      setXato("Imtihonni tanlang");
      return;
    }
    setXato("");
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();

    const { data: urinishId, error: biriktirishXato } = await supabase.rpc("amaliyga_otkazish", {
      p_talaba_id: talabaId,
      p_imtihon_id: imtihonId,
      p_amaliy_oqituvchi_id: null,
    });
    if (biriktirishXato) {
      setYuklanmoqda(false);
      setXato(biriktirishXato.message);
      return;
    }

    const oz = {
      amaliy_natija: natija,
      amaliy_urinish_raqami: natija === "otdi" ? Math.max(1, parseInt(raqam, 10) || 1) : null,
    };
    const { error: natijaXato } = await supabase.from("talaba_imtihonlar").update(oz).eq("id", urinishId);
    setYuklanmoqda(false);
    if (natijaXato) {
      // Biriktirish o'zi muvaffaqiyatli bo'ldi (talaba imtihonga biriktirildi),
      // faqat natija yozishda xatolik chiqdi — buni foydalanuvchiga aniq
      // aytamiz va ro'yxatni yangilaymiz, u NatijaForm orqali qo'lda ham
      // belgilay oladi.
      setXato(`Imtihonga biriktirildi, lekin natija belgilanmadi: ${natijaXato.message}`);
      router.refresh();
      return;
    }

    setOchiq(false);
    setImtihonId("");
    setNatija("otdi");
    setRaqam("1");
    router.refresh();
  }

  return (
    <div className="border-2 border-dashed border-brand-300 bg-brand-50 rounded-xl p-4 space-y-3">
      {!ochiq ? (
        <button type="button" className="btn-primary w-full" onClick={() => setOchiq(true)}>
          ⚡ Amaliy imtihonga biriktirish + natija belgilash
        </button>
      ) : (
        <form onSubmit={yuborish} className="space-y-3">
          <div className="text-sm font-semibold text-brand-800">
            Yangi amaliy urinish — biriktirish va natijani bir vaqtning o'zida belgilash
          </div>
          <select className="input" value={imtihonId} onChange={(e) => setImtihonId(e.target.value)} required>
            <option value="">Imtihonni tanlang</option>
            {imtihonlar.map((i) => (
              <option key={i.id} value={i.id}>
                {sanaKorinishi(i.sana)} {i.izoh ? `— ${i.izoh}` : ""}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNatija("otdi")}
              className={`flex-1 !py-2.5 btn ${natija === "otdi" ? "bg-emerald-700 text-white" : "btn-success"}`}
            >
              O'TDI
            </button>
            <button
              type="button"
              onClick={() => setNatija("otmadi")}
              className={`flex-1 !py-2.5 btn ${natija === "otmadi" ? "bg-rose-700 text-white" : "btn-danger"}`}
            >
              O'TMADI
            </button>
          </div>
          {natija === "otdi" && (
            <input
              type="number"
              min={1}
              step={1}
              className="input"
              value={raqam}
              onChange={(e) => setRaqam(e.target.value)}
              placeholder="Necha-urinishda o'tdi?"
            />
          )}
          {xato && <div className="text-sm text-rose-600 bg-rose-100 rounded-lg px-3 py-2">{xato}</div>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1" disabled={yuklanmoqda}>
              {yuklanmoqda ? "Bajarilmoqda…" : "Tasdiqlash"}
            </button>
            <button type="button" className="btn flex-1" disabled={yuklanmoqda} onClick={() => setOchiq(false)}>
              Bekor qilish
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
