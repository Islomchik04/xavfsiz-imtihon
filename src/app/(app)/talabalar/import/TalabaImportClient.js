"use client";

import { useState } from "react";
import Link from "next/link";

export default function TalabaImportClient({ profile, filiallar }) {
  const markaziyRol = profile.role === "superadmin" || profile.role === "hujjatchi";
  const [filialId, setFilialId] = useState(markaziyRol ? "" : profile.filial_id);
  const [fayl, setFayl] = useState(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");
  const [natija, setNatija] = useState(null);

  const filialTanlangan = Boolean(filialId);
  const shablonHavola = filialTanlangan
    ? `/api/talabalar-shablon?filialId=${encodeURIComponent(filialId)}`
    : null;

  async function importQilish(e) {
    e.preventDefault();
    setXato("");
    setNatija(null);
    if (!filialId) {
      setXato("Filialni tanlang");
      return;
    }
    if (!fayl) {
      setXato("Excel faylni tanlang");
      return;
    }

    setYuklanmoqda(true);
    const forma = new FormData();
    forma.append("fayl", fayl);
    forma.append("filialId", filialId);

    const javob = await fetch("/api/talabalar-import", { method: "POST", body: forma });
    const data = await javob.json();
    setYuklanmoqda(false);

    if (!javob.ok) {
      setXato(data.xato || "Xatolik yuz berdi");
      return;
    }
    setNatija(data);
    setFayl(null);
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-xl leading-none">1️⃣</span>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-800 mb-1">Shablonni yuklab oling</h2>
            <p className="text-sm text-slate-500 mb-3">
              Shablonda ustunlar tayyor, ba'zi katakchalarda (Toifa, 083 forma, Imtihon turi, O'qituvchi)
              tanlash uchun ro'yxat (dropdown) ham bor — 2-qator namuna, uni har doim o'tkazib yuboramiz.
            </p>

            {markaziyRol && (
              <div className="mb-3 max-w-xs">
                <label className="label">Filial</label>
                <select className="input" value={filialId} onChange={(e) => setFilialId(e.target.value)}>
                  <option value="">Tanlang</option>
                  {filiallar.map((f) => (
                    <option key={f.id} value={f.id}>{f.nomi}</option>
                  ))}
                </select>
              </div>
            )}

            {filialTanlangan ? (
              <a href={shablonHavola} className="btn-secondary">
                📥 Shablonni yuklab olish (.xlsx)
              </a>
            ) : (
              <p className="text-xs text-amber-600">Avval filialni tanlang — shablon shu filial o'qituvchilariga moslanadi.</p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={importQilish} className="card space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-xl leading-none">2️⃣</span>
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="font-semibold text-slate-800 mb-1">To'ldirilgan faylni yuklang</h2>
              <p className="text-sm text-slate-500">Faqat .xlsx formatidagi fayl qabul qilinadi.</p>
            </div>
            <input
              className="input"
              type="file"
              accept=".xlsx"
              onChange={(e) => setFayl(e.target.files?.[0] || null)}
            />
            {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={yuklanmoqda || !fayl}>
              {yuklanmoqda ? "Import qilinmoqda…" : "Import qilish"}
            </button>
          </div>
        </div>
      </form>

      {natija && <NatijaKartochkasi natija={natija} />}
    </div>
  );
}

function NatijaKartochkasi({ natija }) {
  const hammasiMuvaffaqiyatli = natija.xatolar.length === 0 && natija.muvaffaqiyatli > 0;
  return (
    <div className={`card border-2 ${hammasiMuvaffaqiyatli ? "border-emerald-200" : "border-amber-200"}`}>
      <h2 className="font-semibold text-slate-800 mb-3">Import natijasi</h2>
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="bg-slate-50 rounded-xl px-4 py-2.5">
          <div className="text-xl font-bold text-slate-800">{natija.jami}</div>
          <div className="text-xs text-slate-400">Jami qator</div>
        </div>
        <div className="bg-emerald-50 rounded-xl px-4 py-2.5">
          <div className="text-xl font-bold text-emerald-600">{natija.muvaffaqiyatli}</div>
          <div className="text-xs text-slate-400">Muvaffaqiyatli qo'shildi</div>
        </div>
        <div className="bg-rose-50 rounded-xl px-4 py-2.5">
          <div className="text-xl font-bold text-rose-600">{natija.xatolar.length}</div>
          <div className="text-xs text-slate-400">Xatolik</div>
        </div>
      </div>

      {natija.muvaffaqiyatli > 0 && (
        <Link href="/talabalar" className="btn-primary inline-block mb-4">
          Talabalar ro'yxatini ko'rish
        </Link>
      )}

      {natija.xatolar.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-rose-700 mb-2">Xatoliklar — shu qatorlarni tuzatib qayta yuklang</h3>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {natija.xatolar.map((x, i) => (
              <div key={i} className="text-sm bg-rose-50 rounded-lg px-3 py-2">
                <span className="font-medium text-rose-700">{x.qator}-qator ({x.ism}):</span>{" "}
                <span className="text-rose-600">{x.sabab}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
