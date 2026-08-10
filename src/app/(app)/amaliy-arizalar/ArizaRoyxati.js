"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { sanaKorinishi } from "@/lib/imtihonHisob";

// Filial admini (yoki hujjatchi/imtihonchi/superadmin) yuborgan "Amaliy
// imtihonga yuborish" so'rovlari ro'yxati. Hujjatchi/imtihonchi/superadmin
// bu yerdan tasdiqlaydi (imtihon tanlab) yoki rad etadi.
export default function ArizaRoyxati({ arizalar, aktivImtihonlar }) {
  if (arizalar.length === 0) {
    return <div className="card text-sm text-slate-400">Hozircha so'rov yo'q.</div>;
  }
  return (
    <div className="space-y-3 xi-stagger">
      {arizalar.map((a) => (
        <ArizaKartochka key={a.id} ariza={a} aktivImtihonlar={aktivImtihonlar} />
      ))}
    </div>
  );
}

function ArizaKartochka({ ariza, aktivImtihonlar }) {
  const router = useRouter();
  const talaba = ariza.talabalar;
  const [imtihonId, setImtihonId] = useState("");
  const [ochiq, setOchiq] = useState(false);
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  async function tasdiqlash() {
    if (!imtihonId) {
      setXato("Imtihonni tanlang");
      return;
    }
    setXato("");
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("amaliy_arizani_tasdiqlash", {
      p_ariza_id: ariza.id,
      p_imtihon_id: imtihonId,
    });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    router.refresh();
  }

  async function radEtish() {
    if (!confirm(`${talaba?.ism_familya} uchun amaliy imtihon so'rovini rad etasizmi?`)) return;
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("amaliy_arizani_rad_etish", { p_ariza_id: ariza.id });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/talabalar/${talaba?.id}`} className="font-semibold text-brand-700 hover:underline">
            {talaba?.ism_familya}
          </Link>
          <div className="text-xs text-slate-400 mt-0.5">
            {talaba?.filiallar?.nomi} / {talaba?.guruhlar?.nomi}
            {talaba?.intalim_id ? ` · ID: ${talaba.intalim_id}` : ""}
          </div>
        </div>
        <span className="badge bg-amber-100 text-amber-700 text-xs shrink-0">Kutilmoqda</span>
      </div>
      <div className="text-xs text-slate-400">
        So'ragan: {ariza.soragan_profil?.ism_familya || "—"} · {new Date(ariza.created_at).toLocaleDateString("uz-UZ")}
      </div>
      {ariza.izoh && <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{ariza.izoh}</div>}

      {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}

      {!ochiq ? (
        <div className="flex gap-2">
          <button type="button" className="btn-primary flex-1" disabled={yuklanmoqda} onClick={() => setOchiq(true)}>
            Tasdiqlash
          </button>
          <button type="button" className="btn-danger flex-1" disabled={yuklanmoqda} onClick={radEtish}>
            Rad etish
          </button>
        </div>
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
            <button type="button" className="btn-primary flex-1" disabled={yuklanmoqda} onClick={tasdiqlash}>
              {yuklanmoqda ? "Yuborilmoqda…" : "Shu imtihonga biriktirish"}
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
