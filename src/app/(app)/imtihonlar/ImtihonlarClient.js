"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { sanaKorinishi } from "@/lib/imtihonHisob";

export default function ImtihonlarClient({ foydalanuvchiId, imtihonlar, urinishlar }) {
  const router = useRouter();
  const [sana, setSana] = useState("");
  const [izoh, setIzoh] = useState("");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  const statistikaMap = useMemo(() => {
    const map = new Map();
    for (const u of urinishlar) {
      if (!map.has(u.imtihon_id)) {
        map.set(u.imtihon_id, { jami: 0, natijaChiqqan: 0, otgan: 0, otmagan: 0 });
      }
      const y = map.get(u.imtihon_id);
      y.jami += 1;
      const qismlar = [];
      if (u.nazariy_kerak) qismlar.push(u.nazariy_natija);
      if (u.amaliy_kerak) qismlar.push(u.amaliy_natija);
      const kutilmoqda = qismlar.some((q) => q === "kutilmoqda");
      const otmadi = qismlar.some((q) => q === "otmadi");
      if (!kutilmoqda) {
        y.natijaChiqqan += 1;
        if (otmadi) y.otmagan += 1;
        else y.otgan += 1;
      }
    }
    return map;
  }, [urinishlar]);

  async function yuborish(e) {
    e.preventDefault();
    setXato("");
    if (!sana) {
      setXato("Sanani kiriting");
      return;
    }
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("imtihonlar")
      .insert({ sana, izoh: izoh || null, yaratgan: foydalanuvchiId });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    setSana("");
    setIzoh("");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Imtihonlar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Avval shu yerda imtihon sessiyasini yarating, so'ng talaba sahifasida shu imtihonga biriktiring.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={yuborish} className="card space-y-4 h-fit">
          <h2 className="font-semibold text-slate-800">Yangi imtihon</h2>
          <div>
            <label className="label">Imtihon sanasi</label>
            <input className="input" type="date" value={sana} onChange={(e) => setSana(e.target.value)} required />
          </div>
          <div>
            <label className="label">Izoh (ixtiyoriy)</label>
            <input
              className="input"
              value={izoh}
              onChange={(e) => setIzoh(e.target.value)}
              placeholder="Masalan: Nazariy imtihon, DHM markazi"
            />
          </div>
          {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
          <button className="btn-primary w-full" disabled={yuklanmoqda}>
            {yuklanmoqda ? "Yaratilmoqda…" : "Imtihon yaratish"}
          </button>
        </form>

        <div className="card overflow-x-auto">
          <h2 className="font-semibold text-slate-800 mb-4">Mavjud imtihonlar</h2>
          {imtihonlar.length === 0 ? (
            <p className="text-sm text-slate-400">Hozircha imtihon yaratilmagan.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-medium">Sana</th>
                  <th className="pb-2 font-medium">Izoh</th>
                  <th className="pb-2 font-medium text-right">Talaba</th>
                  <th className="pb-2 font-medium text-right">O'tdi</th>
                  <th className="pb-2 font-medium text-right">O'tmadi</th>
                </tr>
              </thead>
              <tbody>
                {imtihonlar.map((i) => {
                  const s = statistikaMap.get(i.id) || { jami: 0, otgan: 0, otmagan: 0 };
                  return (
                    <tr key={i.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 font-medium text-slate-700">
                        <Link href={`/hisobotlar?imtihon=${i.id}`} className="hover:underline text-brand-700">
                          {sanaKorinishi(i.sana)}
                        </Link>
                      </td>
                      <td className="py-2.5 text-slate-500">{i.izoh || "—"}</td>
                      <td className="py-2.5 text-right">{s.jami}</td>
                      <td className="py-2.5 text-right text-emerald-600 font-medium">{s.otgan}</td>
                      <td className="py-2.5 text-right text-rose-600 font-medium">{s.otmagan}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
