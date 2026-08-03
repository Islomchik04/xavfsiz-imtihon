"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { sanaKorinishi } from "@/lib/imtihonHisob";
import { FORMA_083_LABEL } from "@/lib/constants";

export default function HujjatchiForm({ talaba, imtihonlar }) {
  const router = useRouter();
  const [hujjatForma083, setHujjatForma083] = useState(talaba.forma_083);
  const [tasdiqnoma, setTasdiqnoma] = useState(false);
  const [imtihonVaraqasi, setImtihonVaraqasi] = useState(false);
  const [imtihonId, setImtihonId] = useState("");
  const [izoh, setIzoh] = useState("");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  if (!imtihonlar || imtihonlar.length === 0) {
    return (
      <div className="text-sm text-slate-500">
        Hozircha yaratilgan imtihon yo'q. Avval{" "}
        <Link href="/imtihonlar" className="text-brand-600 hover:underline">
          Imtihonlar
        </Link>{" "}
        sahifasida imtihon yarating, keyin bu yerga qayting.
      </div>
    );
  }

  if (talaba.qarzdorlik) {
    return (
      <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 space-y-1">
        <p className="font-semibold">⚠️ Bu talabada qarzdorlik bor — imtihonchilar safiga qo'shib bo'lmaydi</p>
        <p>
          Qarzdorlik summasi:{" "}
          <span className="font-semibold">
            {talaba.qarzdorlik_summasi != null
              ? `${Number(talaba.qarzdorlik_summasi).toLocaleString("uz-UZ")} so'm`
              : "—"}
          </span>
        </p>
        <p className="text-rose-600">
          Talaba imtihonchilar safiga qo'shilishi uchun avval qarzdorlikni yopib, "Asosiy ma'lumotlar"
          bo'limidan qarzdorlik holatini "Qarzdorligi yo'q" ga o'zgartiring.
        </p>
      </div>
    );
  }

  async function yuborish(e) {
    e.preventDefault();
    setXato("");

    if (!tasdiqnoma || !imtihonVaraqasi || !hujjatForma083 || !imtihonId) {
      setXato("Imtihonga qo'shish uchun tasdiqnoma, imtihon varaqasi, 083 forma va imtihon tanlanishi shart");
      return;
    }

    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("hujjatga_tayyorlash", {
      p_talaba_id: talaba.id,
      p_imtihon_id: imtihonId,
      p_hujjat_forma_083: hujjatForma083,
      p_tasdiqnoma: tasdiqnoma,
      p_imtihon_varaqasi: imtihonVaraqasi,
      p_izoh: izoh || null,
    });

    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    router.push("/talabalar");
    router.refresh();
  }

  return (
    <form onSubmit={yuborish} className="space-y-4">
      <Toggle
        label="083 forma"
        qiymat={hujjatForma083}
        onChange={setHujjatForma083}
        haLabel={FORMA_083_LABEL[true]}
        yoqLabel={FORMA_083_LABEL[false]}
      />
      <Toggle label="Tasdiqnoma bor" qiymat={tasdiqnoma} onChange={setTasdiqnoma} />
      <Toggle label="Imtihon varaqasi bor" qiymat={imtihonVaraqasi} onChange={setImtihonVaraqasi} />

      <div>
        <label className="label">Imtihonga biriktirish</label>
        <select className="input" value={imtihonId} onChange={(e) => setImtihonId(e.target.value)} required>
          <option value="">Tanlang</option>
          {imtihonlar.map((i) => (
            <option key={i.id} value={i.id}>
              {sanaKorinishi(i.sana)} {i.izoh ? `— ${i.izoh}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Izoh (ixtiyoriy)</label>
        <textarea className="input" rows={2} value={izoh} onChange={(e) => setIzoh(e.target.value)} />
      </div>

      {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}

      <button type="submit" className="btn-success w-full" disabled={yuklanmoqda}>
        {yuklanmoqda ? "Saqlanmoqda…" : "Imtihonchilar safiga qo'shish"}
      </button>
    </form>
  );
}

function Toggle({ label, qiymat, onChange, haLabel = "Ha", yoqLabel = "Yo'q" }) {
  return (
    <div className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${qiymat ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}
        >
          {haLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!qiymat ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500"}`}
        >
          {yoqLabel}
        </button>
      </div>
    </div>
  );
}
