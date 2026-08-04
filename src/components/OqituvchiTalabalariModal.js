"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { TALABA_HOLATI, TALABA_HOLATI_RANG, TOIFALAR } from "@/lib/constants";
import { talabaHolati } from "@/lib/imtihonHisob";

// Hisobotlar va KPI sahifalarida bitta o'qituvchi ustiga bosilganda ochiladigan
// to'liq ekran popup — o'qituvchining BUTUN (davr bilan cheklanmagan)
// statistikasi hamda hozirda unga biriktirilgan barcha o'quvchilar ro'yxati
// (holati bilan), ism va holat bo'yicha filtrlash imkoniyati bilan.
export default function OqituvchiTalabalariModal({ oqituvchi, statistika, onYopish }) {
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [talabalar, setTalabalar] = useState([]);
  const [xato, setXato] = useState("");
  const [soz, setSoz] = useState("");
  const [holatFiltr, setHolatFiltr] = useState("");

  useEffect(() => {
    let bekorQilindi = false;
    async function yuklash() {
      setYuklanmoqda(true);
      setXato("");
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("talabalar")
        .select(
          `
          id, ism_familya, telefon, toifa, arxivlangan,
          filiallar(nomi), guruhlar(nomi),
          talaba_imtihonlar(nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija, created_at)
        `
        )
        .eq("nazariy_oqituvchi_id", oqituvchi.id)
        .order("ism_familya");
      if (bekorQilindi) return;
      setYuklanmoqda(false);
      if (error) {
        setXato(error.message);
        return;
      }
      setTalabalar((data || []).map((t) => ({ ...t, holat: talabaHolati(t.talaba_imtihonlar) })));
    }
    yuklash();
    return () => {
      bekorQilindi = true;
    };
  }, [oqituvchi.id]);

  const filtrlangan = useMemo(() => {
    const s = soz.trim().toLowerCase();
    return talabalar.filter((t) => {
      if (s && !t.ism_familya?.toLowerCase().includes(s)) return false;
      if (holatFiltr && t.holat !== holatFiltr) return false;
      return true;
    });
  }, [talabalar, soz, holatFiltr]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex justify-between items-center px-4 py-4 border-b border-slate-100 shrink-0">
        <div>
          <div className="font-semibold text-slate-800 text-base">{oqituvchi.ism_familya}</div>
          <div className="text-xs text-slate-400 mt-0.5">To'liq statistika va o'quvchilar ro'yxati</div>
        </div>
        <button
          type="button"
          onClick={onYopish}
          className="text-slate-400 hover:text-slate-600 text-3xl leading-none px-2"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card !py-3 text-center">
              <div className="text-xl font-bold text-slate-800">{statistika?.jami ?? 0}</div>
              <div className="text-xs text-slate-400 mt-0.5">Jami (nazariy)</div>
            </div>
            <div className="card !py-3 text-center">
              <div className="text-xl font-bold text-emerald-600">{statistika?.otdi ?? 0}</div>
              <div className="text-xs text-slate-400 mt-0.5">O'tdi</div>
            </div>
            <div className="card !py-3 text-center">
              <div className="text-xl font-bold text-rose-600">{statistika?.otmadi ?? 0}</div>
              <div className="text-xs text-slate-400 mt-0.5">O'tmadi</div>
            </div>
            <div className="card !py-3 text-center">
              <div className="text-xl font-bold text-slate-800">
                {statistika?.foiz != null ? `${statistika.foiz}%` : "—"}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">O'tish darajasi</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              className="input flex-1 min-w-[180px]"
              placeholder="O'quvchi ismi bo'yicha qidirish…"
              value={soz}
              onChange={(e) => setSoz(e.target.value)}
              autoFocus
            />
            <select className="input !w-auto" value={holatFiltr} onChange={(e) => setHolatFiltr(e.target.value)}>
              <option value="">Barcha holatlar</option>
              {Object.entries(TALABA_HOLATI).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {yuklanmoqda ? (
            <div className="text-sm text-slate-400 text-center py-6">Yuklanmoqda…</div>
          ) : xato ? (
            <div className="text-sm text-rose-600">{xato}</div>
          ) : filtrlangan.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-6">O'quvchi topilmadi</div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-slate-400">{filtrlangan.length} ta o'quvchi</div>
              {filtrlangan.map((t) => (
                <Link
                  key={t.id}
                  href={`/talabalar/${t.id}`}
                  className="card !py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                >
                  <div>
                    <div className="font-medium text-slate-700">{t.ism_familya}</div>
                    <div className="text-xs text-slate-400">
                      {TOIFALAR[t.toifa] || "—"} · {t.filiallar?.nomi} / {t.guruhlar?.nomi}
                      {t.arxivlangan && " · 🗄️ Arxivlangan"}
                    </div>
                  </div>
                  <span className={`badge shrink-0 ${TALABA_HOLATI_RANG[t.holat]}`}>{TALABA_HOLATI[t.holat]}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
