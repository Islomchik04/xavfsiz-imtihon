"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function HujjatchiForm({ talaba }) {
  const router = useRouter();
  const [hujjatForma083, setHujjatForma083] = useState(talaba.forma_083);
  const [tasdiqnoma, setTasdiqnoma] = useState(false);
  const [imtihonVaraqasi, setImtihonVaraqasi] = useState(false);
  const [imtihonSanasi, setImtihonSanasi] = useState("");
  const [izoh, setIzoh] = useState("");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  async function yuborish(e) {
    e.preventDefault();
    setXato("");

    if (!tasdiqnoma || !imtihonVaraqasi || !imtihonSanasi) {
      setXato("Imtihonga qo'shish uchun tasdiqnoma, imtihon varaqasi va imtihon sanasi to'ldirilishi shart");
      return;
    }

    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("talabalar")
      .update({
        hujjat_forma_083: hujjatForma083,
        tasdiqnoma,
        imtihon_varaqasi: imtihonVaraqasi,
        imtihon_sanasi: imtihonSanasi,
        hujjat_izoh: izoh || null,
        hujjat_tayyor: true,
      })
      .eq("id", talaba.id);

    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={yuborish} className="space-y-4">
      <Toggle label="083 forma bor" qiymat={hujjatForma083} onChange={setHujjatForma083} />
      <Toggle label="Tasdiqnoma bor" qiymat={tasdiqnoma} onChange={setTasdiqnoma} />
      <Toggle label="Imtihon varaqasi bor" qiymat={imtihonVaraqasi} onChange={setImtihonVaraqasi} />

      <div>
        <label className="label">Imtihon sanasi</label>
        <input
          type="date"
          className="input"
          value={imtihonSanasi}
          onChange={(e) => setImtihonSanasi(e.target.value)}
          required
        />
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

function Toggle({ label, qiymat, onChange }) {
  return (
    <div className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${qiymat ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}
        >
          Ha
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!qiymat ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-500"}`}
        >
          Yo'q
        </button>
      </div>
    </div>
  );
}
