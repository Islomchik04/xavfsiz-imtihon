"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { IMTIHON_TURI } from "@/lib/constants";

export default function YangiTalabaForm({
  foydalanuvchiId,
  profile,
  filiallar,
  guruhlar,
  oqituvchilar,
  tahrirlanayotgan, // agar berilsa — tahrirlash rejimi (mavjud talabani yangilaydi)
}) {
  const router = useRouter();
  const superadmin = profile.role === "superadmin";
  const tahrirRejimi = Boolean(tahrirlanayotgan);

  const [filialId, setFilialId] = useState(
    tahrirlanayotgan?.filial_id || (superadmin ? "" : profile.filial_id)
  );
  const [ismFamilya, setIsmFamilya] = useState(tahrirlanayotgan?.ism_familya || "");
  const [guruhId, setGuruhId] = useState(tahrirlanayotgan?.guruh_id || "");
  const [forma083, setForma083] = useState(
    tahrirlanayotgan ? (tahrirlanayotgan.forma_083 ? "ha" : "yoq") : ""
  );
  const [imtihonTuri, setImtihonTuri] = useState(tahrirlanayotgan?.imtihon_turi || "");
  const [nazariyOqituvchiId, setNazariyOqituvchiId] = useState(
    tahrirlanayotgan?.nazariy_oqituvchi_id || ""
  );
  const [amaliyOqituvchiId, setAmaliyOqituvchiId] = useState(
    tahrirlanayotgan?.amaliy_oqituvchi_id || ""
  );
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  const filialGuruhlari = useMemo(
    () => guruhlar.filter((g) => g.filial_id === filialId),
    [guruhlar, filialId]
  );
  const nazariyOqituvchilar = useMemo(
    () => oqituvchilar.filter((o) => o.filial_id === filialId && o.turi === "nazariy"),
    [oqituvchilar, filialId]
  );
  const amaliyOqituvchilar = useMemo(
    () => oqituvchilar.filter((o) => o.filial_id === filialId && o.turi === "amaliy"),
    [oqituvchilar, filialId]
  );

  const nazariyKerak = imtihonTuri === "nazariy" || imtihonTuri === "ikkalasi";
  const amaliyKerak = imtihonTuri === "amaliy" || imtihonTuri === "ikkalasi";

  async function yuborish(e) {
    e.preventDefault();
    setXato("");

    if (!filialId || !guruhId || !imtihonTuri || forma083 === "") {
      setXato("Barcha maydonlarni to'ldiring");
      return;
    }
    if (nazariyKerak && !nazariyOqituvchiId) {
      setXato("Nazariy o'qituvchini tanlang");
      return;
    }
    if (amaliyKerak && !amaliyOqituvchiId) {
      setXato("Amaliy o'qituvchini tanlang");
      return;
    }

    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const maydonlar = {
      ism_familya: ismFamilya.trim(),
      filial_id: filialId,
      guruh_id: guruhId,
      forma_083: forma083 === "ha",
      imtihon_turi: imtihonTuri,
      nazariy_oqituvchi_id: nazariyKerak ? nazariyOqituvchiId : null,
      amaliy_oqituvchi_id: amaliyKerak ? amaliyOqituvchiId : null,
    };

    let natija;
    if (tahrirRejimi) {
      natija = await supabase
        .from("talabalar")
        .update(maydonlar)
        .eq("id", tahrirlanayotgan.id)
        .select("id")
        .single();
    } else {
      natija = await supabase
        .from("talabalar")
        .insert({ ...maydonlar, qoshgan: foydalanuvchiId })
        .select("id")
        .single();
    }

    setYuklanmoqda(false);

    if (natija.error) {
      setXato(natija.error.message);
      return;
    }

    router.push(`/talabalar/${natija.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={yuborish} className="card space-y-4">
      {superadmin && (
        <div>
          <label className="label">Filial</label>
          <select
            className="input"
            value={filialId}
            onChange={(e) => {
              setFilialId(e.target.value);
              setGuruhId("");
              setNazariyOqituvchiId("");
              setAmaliyOqituvchiId("");
            }}
            required
          >
            <option value="">Tanlang</option>
            {filiallar.map((f) => (
              <option key={f.id} value={f.id}>{f.nomi}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">Ism familya</label>
        <input
          className="input"
          value={ismFamilya}
          onChange={(e) => setIsmFamilya(e.target.value)}
          placeholder="Masalan: Aliyev Vali Aliyevich"
          required
        />
      </div>

      <div>
        <label className="label">Guruh</label>
        <select className="input" value={guruhId} onChange={(e) => setGuruhId(e.target.value)} required disabled={!filialId}>
          <option value="">Tanlang</option>
          {filialGuruhlari.map((g) => (
            <option key={g.id} value={g.id}>{g.nomi}</option>
          ))}
        </select>
        {filialId && filialGuruhlari.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">Bu filialda guruh yo'q — Sozlamalardan qo'shing.</p>
        )}
      </div>

      <div>
        <label className="label">083 forma</label>
        <div className="flex gap-3">
          {["ha", "yoq"].map((v) => (
            <label key={v} className={`flex-1 border rounded-xl px-4 py-2.5 text-center cursor-pointer text-sm font-medium ${
              forma083 === v ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600"
            }`}>
              <input type="radio" name="forma083" value={v} className="hidden" onChange={(e) => setForma083(e.target.value)} />
              {v === "ha" ? "Ha" : "Yo'q"}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Imtihon turi</label>
        <select className="input" value={imtihonTuri} onChange={(e) => setImtihonTuri(e.target.value)} required>
          <option value="">Tanlang</option>
          {Object.entries(IMTIHON_TURI).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {nazariyKerak && (
        <div>
          <label className="label">Nazariy o'qituvchi</label>
          <select className="input" value={nazariyOqituvchiId} onChange={(e) => setNazariyOqituvchiId(e.target.value)} required disabled={!filialId}>
            <option value="">Tanlang</option>
            {nazariyOqituvchilar.map((o) => (
              <option key={o.id} value={o.id}>{o.ism_familya}</option>
            ))}
          </select>
        </div>
      )}

      {amaliyKerak && (
        <div>
          <label className="label">Amaliy o'qituvchi</label>
          <select className="input" value={amaliyOqituvchiId} onChange={(e) => setAmaliyOqituvchiId(e.target.value)} required disabled={!filialId}>
            <option value="">Tanlang</option>
            {amaliyOqituvchilar.map((o) => (
              <option key={o.id} value={o.id}>{o.ism_familya}</option>
            ))}
          </select>
        </div>
      )}

      {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}

      <button type="submit" className="btn-primary w-full" disabled={yuklanmoqda}>
        {yuklanmoqda ? "Saqlanmoqda…" : tahrirRejimi ? "O'zgarishlarni saqlash" : "Ro'yxatga olish"}
      </button>
    </form>
  );
}
