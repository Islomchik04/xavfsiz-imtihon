"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { IMTIHON_TURI, FORMA_083_LABEL, TOIFALAR } from "@/lib/constants";
import { guruhIdTop } from "@/lib/guruh";

// markaziyRol: hujjatchi va superadmin filialni o'zi tanlaydi (istalgan
// filialga talaba qo'sha oladi); admin faqat o'z filialiga qo'shadi.
export default function YangiTalabaForm({
  foydalanuvchiId,
  profile,
  filiallar,
  oqituvchilar, // [{id, ism_familya, turi, filiallar: [filial_id, ...]}]
  tahrirlanayotgan, // agar berilsa — tahrirlash rejimi (mavjud talabani yangilaydi)
}) {
  const router = useRouter();
  const markaziyRol = profile.role === "superadmin" || profile.role === "hujjatchi";
  const tahrirRejimi = Boolean(tahrirlanayotgan);

  const [filialId, setFilialId] = useState(
    tahrirlanayotgan?.filial_id || (markaziyRol ? "" : profile.filial_id)
  );
  const [ismFamilya, setIsmFamilya] = useState(tahrirlanayotgan?.ism_familya || "");
  const [toifa, setToifa] = useState(tahrirlanayotgan?.toifa || "");
  const [qarzdorlik, setQarzdorlik] = useState(
    tahrirlanayotgan ? (tahrirlanayotgan.qarzdorlik ? "bor" : "yoq") : "yoq"
  );
  const [qarzdorlikSummasi, setQarzdorlikSummasi] = useState(
    tahrirlanayotgan?.qarzdorlik_summasi != null ? String(tahrirlanayotgan.qarzdorlik_summasi) : ""
  );
  const [guruhRaqami, setGuruhRaqami] = useState(tahrirlanayotgan?.guruhlar?.nomi || "");
  const [forma083, setForma083] = useState(
    tahrirlanayotgan ? (tahrirlanayotgan.forma_083 ? "tayyor" : "tayyor_emas") : ""
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

  const nazariyOqituvchilar = useMemo(
    () =>
      oqituvchilar.filter(
        (o) => o.turi === "nazariy" && (o.filiallar || []).includes(filialId)
      ),
    [oqituvchilar, filialId]
  );
  const amaliyOqituvchilar = useMemo(
    () =>
      oqituvchilar.filter(
        (o) => o.turi === "amaliy" && (o.filiallar || []).includes(filialId)
      ),
    [oqituvchilar, filialId]
  );

  const nazariyKerak = imtihonTuri === "nazariy" || imtihonTuri === "ikkalasi";
  const amaliyKerak = imtihonTuri === "amaliy" || imtihonTuri === "ikkalasi";

  async function yuborish(e) {
    e.preventDefault();
    setXato("");

    if (!filialId || !guruhRaqami.trim() || !imtihonTuri || forma083 === "" || !toifa) {
      setXato("Barcha maydonlarni to'ldiring");
      return;
    }
    if (!/^\d+$/.test(guruhRaqami.trim())) {
      setXato("Guruh raqami faqat sonlardan iborat bo'lishi kerak");
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
    const qarzdorlikSoni = Number(qarzdorlikSummasi.replace(",", "."));
    if (qarzdorlik === "bor" && (!qarzdorlikSummasi.trim() || !(qarzdorlikSoni > 0))) {
      setXato("Qarzdorlik summasini kiriting (musbat son)");
      return;
    }

    setYuklanmoqda(true);
    const supabase = supabaseBrowser();

    let guruhId;
    try {
      guruhId = await guruhIdTop(supabase, guruhRaqami, filialId);
    } catch (err) {
      setYuklanmoqda(false);
      setXato(`Guruhni aniqlashda xatolik: ${err.message}`);
      return;
    }

    const maydonlar = {
      ism_familya: ismFamilya.trim(),
      toifa,
      qarzdorlik: qarzdorlik === "bor",
      qarzdorlik_summasi: qarzdorlik === "bor" ? qarzdorlikSoni : null,
      filial_id: filialId,
      guruh_id: guruhId,
      forma_083: forma083 === "tayyor",
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
      {markaziyRol && (
        <div>
          <label className="label">Filial</label>
          <select
            className="input"
            value={filialId}
            onChange={(e) => {
              setFilialId(e.target.value);
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
        <label className="label">Toifa</label>
        <select className="input" value={toifa} onChange={(e) => setToifa(e.target.value)} required>
          <option value="">Tanlang</option>
          {Object.entries(TOIFALAR).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Qarzdorlik</label>
        <div className="flex gap-3">
          {["yoq", "bor"].map((v) => (
            <label
              key={v}
              className={`flex-1 border rounded-xl px-4 py-2.5 text-center cursor-pointer text-sm font-medium ${
                qarzdorlik === v
                  ? v === "bor"
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-300 text-slate-600"
              }`}
            >
              <input
                type="radio"
                name="qarzdorlik"
                value={v}
                className="hidden"
                checked={qarzdorlik === v}
                onChange={(e) => setQarzdorlik(e.target.value)}
              />
              {v === "bor" ? "Qarzdorligi bor" : "Qarzdorligi yo'q"}
            </label>
          ))}
        </div>
        {qarzdorlik === "bor" && (
          <div className="mt-3">
            <label className="label">Qarzdorlik summasi (so'm)</label>
            <input
              className="input"
              type="text"
              inputMode="decimal"
              value={qarzdorlikSummasi}
              onChange={(e) => setQarzdorlikSummasi(e.target.value.replace(/[^\d.,]/g, ""))}
              placeholder="Masalan: 500000"
              required
            />
          </div>
        )}
      </div>

      <div>
        <label className="label">Int'alim guruhini yozing</label>
        <input
          className="input"
          type="text"
          inputMode="numeric"
          value={guruhRaqami}
          onChange={(e) => setGuruhRaqami(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="Masalan: 24"
          required
        />
        <p className="text-xs text-slate-400 mt-1">
          Faqat raqam kiriting. Bir xil raqamli guruhlar avtomatik bitta guruhga biriktiriladi.
        </p>
      </div>

      <div>
        <label className="label">083 forma</label>
        <div className="flex gap-3">
          {["tayyor", "tayyor_emas"].map((v) => (
            <label key={v} className={`flex-1 border rounded-xl px-4 py-2.5 text-center cursor-pointer text-sm font-medium ${
              forma083 === v ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600"
            }`}>
              <input type="radio" name="forma083" value={v} className="hidden" onChange={(e) => setForma083(e.target.value)} />
              {v === "tayyor" ? FORMA_083_LABEL.true : FORMA_083_LABEL.false}
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
          {filialId && nazariyOqituvchilar.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">Bu filialga biriktirilgan nazariy o'qituvchi yo'q — Sozlamalardan qo'shing.</p>
          )}
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
          {filialId && amaliyOqituvchilar.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">Bu filialga biriktirilgan amaliy o'qituvchi yo'q — Sozlamalardan qo'shing.</p>
          )}
        </div>
      )}

      {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}

      <button type="submit" className="btn-primary w-full" disabled={yuklanmoqda}>
        {yuklanmoqda ? "Saqlanmoqda…" : tahrirRejimi ? "O'zgarishlarni saqlash" : "Ro'yxatga olish"}
      </button>
    </form>
  );
}
