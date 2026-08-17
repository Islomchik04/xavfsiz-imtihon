"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { OQITUVCHI_TURI } from "@/lib/constants";
import { telefonKorinishi, telefonNormallash } from "@/lib/telefon";

// Filial admini uchun o'qituvchilar bo'limi — Sozlamalar > O'qituvchilar
// (superadmin-only) bilan bir xil g'oyada, lekin faqat o'z filialiga
// tegishli o'qituvchilar bilan cheklangan (admin_oqituvchi_* RPC'lari orqali
// — 0026-migratsiya). Filiallar tanlash yo'q (har doim o'zining filialiga),
// login berish ham yo'q (bu hali ham faqat superadmin ixtiyorida).
export default function OqituvchilarClient({ boshlangichOqituvchilar }) {
  const router = useRouter();
  const oqituvchilar = boshlangichOqituvchilar;
  const [ismFamilya, setIsmFamilya] = useState("");
  const [turi, setTuri] = useState("");
  const [telefon, setTelefon] = useState("");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [tahrirId, setTahrirId] = useState(null);

  async function qoshish(e) {
    e.preventDefault();
    setXato("");
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("admin_oqituvchi_qoshish", {
      p_ism_familya: ismFamilya.trim(),
      p_turi: turi,
      p_telefon: telefon.trim() ? telefonNormallash(telefon) : null,
    });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    setIsmFamilya("");
    setTuri("");
    setTelefon("");
    router.refresh();
  }

  async function faollikniOzgartirish(id, faol) {
    const supabase = supabaseBrowser();
    await supabase.rpc("admin_oqituvchi_faollik", { p_oqituvchi_id: id, p_faol: !faol });
    router.refresh();
  }

  async function ochirish(id, ismFamilya) {
    const tasdiq = confirm(`"${ismFamilya}" o'qituvchini filialingizdan o'chirmoqchimisiz?`);
    if (!tasdiq) return;
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("admin_oqituvchi_ochirish", { p_oqituvchi_id: id });
    if (error) {
      alert(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={qoshish} className="card space-y-4 h-fit">
        <h2 className="font-semibold text-slate-800">Yangi o'qituvchi</h2>
        <div>
          <label className="label">Ism familya</label>
          <input className="input" value={ismFamilya} onChange={(e) => setIsmFamilya(e.target.value.toUpperCase())} required />
        </div>
        <div>
          <label className="label">Turi</label>
          <select className="input" value={turi} onChange={(e) => setTuri(e.target.value)} required>
            <option value="">Tanlang</option>
            {Object.entries(OQITUVCHI_TURI).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Telefon (ixtiyoriy)</label>
          <div className="flex items-stretch">
            <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-white text-slate-500 text-[15px]">
              +998
            </span>
            <input
              className="input rounded-l-none"
              type="tel"
              inputMode="numeric"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              placeholder="91 234 56 78"
            />
          </div>
        </div>
        {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
        <button className="btn-primary w-full" disabled={yuklanmoqda}>
          {yuklanmoqda ? "Qo'shilmoqda…" : "Qo'shish"}
        </button>
      </form>

      <div className="card overflow-x-auto hidden md:block">
        <h2 className="font-semibold text-slate-800 mb-4">
          O'qituvchilar <span className="text-sm font-normal text-slate-500">({oqituvchilar.length} ta)</span>
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="pb-2 font-medium">Ism</th>
              <th className="pb-2 font-medium">Turi</th>
              <th className="pb-2 font-medium">Telefon</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {oqituvchilar.map((o) => (
              <OqituvchiQatori
                key={o.id}
                oqituvchi={o}
                tahrirlanmoqda={tahrirId === o.id}
                onTahrirBoshlash={() => setTahrirId(o.id)}
                onTahrirYopish={() => setTahrirId(null)}
                onFaollikniOzgartirish={() => faollikniOzgartirish(o.id, o.faol)}
                onOchirish={() => ochirish(o.id, o.ism_familya)}
                onYangilandi={() => router.refresh()}
              />
            ))}
            {oqituvchilar.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  Hali o'qituvchi qo'shilmagan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card md:hidden">
        <h2 className="font-semibold text-slate-800 mb-4">
          O'qituvchilar <span className="text-sm font-normal text-slate-500">({oqituvchilar.length} ta)</span>
        </h2>
        {oqituvchilar.length === 0 && <div className="text-sm text-slate-400">Hali o'qituvchi qo'shilmagan</div>}
        <div className="space-y-3 xi-stagger">
          {oqituvchilar.map((o) => (
            <div key={o.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-700">{o.ism_familya}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {OQITUVCHI_TURI[o.turi]}
                    {o.telefon ? ` · +998 ${telefonKorinishi(o.telefon)}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => faollikniOzgartirish(o.id, o.faol)}
                  className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                    o.faol ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {o.faol ? "Faol" : "Faolsiz"}
                </button>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50 dark:border-slate-800">
                <button
                  onClick={() => setTahrirId(tahrirId === o.id ? null : o.id)}
                  className="text-xs font-medium text-brand-600"
                >
                  Tahrirlash
                </button>
                <button
                  onClick={() => ochirish(o.id, o.ism_familya)}
                  className="ml-auto text-xs font-medium text-rose-600"
                >
                  O'chirish
                </button>
              </div>
              {tahrirId === o.id && (
                <div className="mt-3">
                  <OqituvchiTahrirForma
                    oqituvchi={o}
                    onBekor={() => setTahrirId(null)}
                    onSaqlandi={() => {
                      setTahrirId(null);
                      router.refresh();
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OqituvchiQatori({
  oqituvchi: o,
  tahrirlanmoqda,
  onTahrirBoshlash,
  onTahrirYopish,
  onFaollikniOzgartirish,
  onOchirish,
  onYangilandi,
}) {
  return (
    <>
      <tr className="border-b border-slate-50 last:border-0">
        <td className="py-2.5 font-medium text-slate-700">{o.ism_familya}</td>
        <td className="py-2.5 text-slate-500">{OQITUVCHI_TURI[o.turi]}</td>
        <td className="py-2.5 text-slate-500">{o.telefon ? `+998 ${telefonKorinishi(o.telefon)}` : "—"}</td>
        <td className="py-2.5 text-right whitespace-nowrap">
          <button onClick={onTahrirBoshlash} className="text-xs font-medium text-brand-600 hover:underline mr-3">
            Tahrirlash
          </button>
          <button
            onClick={onFaollikniOzgartirish}
            className={`text-xs font-medium px-2.5 py-1 rounded-full mr-3 ${
              o.faol ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {o.faol ? "Faol" : "Faolsiz"}
          </button>
          <button onClick={onOchirish} className="text-xs font-medium text-rose-600 hover:underline">
            O'chirish
          </button>
        </td>
      </tr>
      {tahrirlanmoqda && (
        <tr>
          <td colSpan={4} className="pb-4">
            <OqituvchiTahrirForma
              oqituvchi={o}
              onBekor={onTahrirYopish}
              onSaqlandi={() => {
                onTahrirYopish();
                onYangilandi();
              }}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function OqituvchiTahrirForma({ oqituvchi, onBekor, onSaqlandi }) {
  const [ismFamilya, setIsmFamilya] = useState(oqituvchi.ism_familya);
  const [turi, setTuri] = useState(oqituvchi.turi);
  const [telefon, setTelefon] = useState(oqituvchi.telefon ? telefonKorinishi(oqituvchi.telefon) : "");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  async function saqlash(e) {
    e.preventDefault();
    setXato("");
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("admin_oqituvchi_tahrirlash", {
      p_oqituvchi_id: oqituvchi.id,
      p_ism_familya: ismFamilya.trim(),
      p_turi: turi,
      p_telefon: telefon.trim() ? telefonNormallash(telefon) : null,
    });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    onSaqlandi();
  }

  return (
    <form onSubmit={saqlash} className="bg-slate-50 rounded-xl p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Ism familya</label>
          <input className="input" value={ismFamilya} onChange={(e) => setIsmFamilya(e.target.value.toUpperCase())} required />
        </div>
        <div>
          <label className="label">Turi</label>
          <select className="input" value={turi} onChange={(e) => setTuri(e.target.value)} required>
            {Object.entries(OQITUVCHI_TURI).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Telefon (ixtiyoriy)</label>
        <div className="flex items-stretch">
          <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-white text-slate-500 text-[15px]">
            +998
          </span>
          <input
            className="input rounded-l-none"
            type="tel"
            inputMode="numeric"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            placeholder="91 234 56 78"
          />
        </div>
      </div>
      {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={yuklanmoqda}>
          {yuklanmoqda ? "Saqlanmoqda…" : "Saqlash"}
        </button>
        <button type="button" onClick={onBekor} className="btn-secondary">
          Bekor qilish
        </button>
      </div>
    </form>
  );
}
