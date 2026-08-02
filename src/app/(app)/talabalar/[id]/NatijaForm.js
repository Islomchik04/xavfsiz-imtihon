"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { NATIJA } from "@/lib/constants";

export default function NatijaForm({ talaba, tahrirRuxsat }) {
  const router = useRouter();
  const [yuklanmoqdaMaydon, setYuklanmoqdaMaydon] = useState(null);
  const [xato, setXato] = useState("");

  async function belgilash(maydon, qiymat) {
    setXato("");
    setYuklanmoqdaMaydon(maydon);
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("talabalar")
      .update({ [maydon]: qiymat })
      .eq("id", talaba.id);
    setYuklanmoqdaMaydon(null);
    if (error) {
      setXato(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {talaba.imtihon_turi !== "amaliy" && (
        <NatijaQatori
          sarlavha="Nazariy"
          oqituvchi={talaba.nazariy_oqituvchilar?.ism_familya}
          natija={talaba.nazariy_natija}
          belgilagan={talaba.nazariy_belgilagan_profil?.ism_familya}
          vaqt={talaba.nazariy_belgilangan_vaqt}
          tahrirRuxsat={tahrirRuxsat}
          yuklanmoqda={yuklanmoqdaMaydon === "nazariy_natija"}
          onBelgilash={(qiymat) => belgilash("nazariy_natija", qiymat)}
        />
      )}
      {talaba.imtihon_turi !== "nazariy" && (
        <NatijaQatori
          sarlavha="Amaliy"
          oqituvchi={talaba.amaliy_oqituvchilar?.ism_familya}
          natija={talaba.amaliy_natija}
          belgilagan={talaba.amaliy_belgilagan_profil?.ism_familya}
          vaqt={talaba.amaliy_belgilangan_vaqt}
          tahrirRuxsat={tahrirRuxsat}
          yuklanmoqda={yuklanmoqdaMaydon === "amaliy_natija"}
          onBelgilash={(qiymat) => belgilash("amaliy_natija", qiymat)}
        />
      )}
      {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
    </div>
  );
}

function NatijaQatori({ sarlavha, oqituvchi, natija, belgilagan, vaqt, tahrirRuxsat, yuklanmoqda, onBelgilash }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-medium text-slate-800">{sarlavha}</div>
          {oqituvchi && <div className="text-xs text-slate-400 mt-0.5">O'qituvchi: {oqituvchi}</div>}
        </div>
        <span
          className={`badge ${
            natija === "otdi"
              ? "bg-emerald-100 text-emerald-700"
              : natija === "otmadi"
              ? "bg-rose-100 text-rose-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {NATIJA[natija]}
        </span>
      </div>

      {tahrirRuxsat && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={yuklanmoqda}
            onClick={() => onBelgilash("otdi")}
            className="btn-success flex-1 !py-3 text-base"
          >
            O'TDI
          </button>
          <button
            type="button"
            disabled={yuklanmoqda}
            onClick={() => onBelgilash("otmadi")}
            className="btn-danger flex-1 !py-3 text-base"
          >
            O'TMADI
          </button>
        </div>
      )}

      {belgilagan && (
        <div className="text-xs text-slate-400 mt-2">
          Belgiladi: {belgilagan} {vaqt ? `· ${new Date(vaqt).toLocaleString("uz-UZ")}` : ""}
        </div>
      )}
    </div>
  );
}
