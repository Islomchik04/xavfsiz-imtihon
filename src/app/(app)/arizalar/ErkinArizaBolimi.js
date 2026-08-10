"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { telefonKorinishi } from "@/lib/telefon";

// Telegram bot orqali domlalar yuborgan "erkin/mustaqil o'quvchi" KPI
// so'rovlari — Hujjatchi/Superadmin rasmga qarab tasdiqlaydi (shu domlaga
// KPI yoziladi) yoki rad etadi.
export default function ErkinArizaBolimi({ arizalar }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-800">📷 Mustaqil o'quvchilar (Telegram bot)</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Domlalar Telegram bot orqali yuborgan, o'zi mustaqil imtihon topshirgan o'quvchilar uchun KPI so'rovlari.
        </p>
      </div>
      {arizalar.length === 0 ? (
        <div className="card text-sm text-slate-400">Hozircha so'rov yo'q.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 xi-stagger">
          {arizalar.map((a) => (
            <ErkinArizaKartochka key={a.id} ariza={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function ErkinArizaKartochka({ ariza }) {
  const router = useRouter();
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

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
        <div className="font-semibold text-slate-700">{ariza.ism_familya}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          Domla: {ariza.oqituvchilar?.ism_familya || "—"}
          {ariza.telefon ? ` · 📞 +998 ${telefonKorinishi(ariza.telefon)}` : ""}
          {ariza.urinish_raqami ? ` · ${ariza.urinish_raqami}-urinishda o'tgan` : ""}
        </div>
        <div className="text-xs text-slate-400">{new Date(ariza.created_at).toLocaleString("uz-UZ")}</div>
      </div>
      {ariza.izoh && <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{ariza.izoh}</div>}

      {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}

      <div className="flex gap-2">
        <button type="button" className="btn-primary flex-1" disabled={yuklanmoqda} onClick={tasdiqlash}>
          {yuklanmoqda ? "…" : "Tasdiqlash (KPI yozish)"}
        </button>
        <button type="button" className="btn-danger flex-1" disabled={yuklanmoqda} onClick={radEtish}>
          Rad etish
        </button>
      </div>
    </div>
  );
}
