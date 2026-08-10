"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { IMTIHON_TURI, FORMA_083_LABEL, TOIFALAR } from "@/lib/constants";
import { guruhIdTop } from "@/lib/guruh";
import { telefonNormallash, telefonKorinishi } from "@/lib/telefon";
import { sanaKorinishi } from "@/lib/imtihonHisob";

// markaziyRol: hujjatchi va superadmin filialni o'zi tanlaydi (istalgan
// filialga talaba qo'sha oladi); admin faqat o'z filialiga qo'shadi.
export default function YangiTalabaForm({
  foydalanuvchiId,
  profile,
  filiallar,
  oqituvchilar, // [{id, ism_familya, turi, filiallar: [filial_id, ...]}]
  imtihonlar = [], // [{id, sana, izoh}] — hali yakunlanmagan imtihonlar, "so'ralgan imtihon" tanlash uchun
  tahrirlanayotgan, // agar berilsa — tahrirlash rejimi (mavjud talabani yangilaydi)
}) {
  const router = useRouter();
  const markaziyRol = profile.role === "superadmin" || profile.role === "hujjatchi";
  const tahrirRejimi = Boolean(tahrirlanayotgan);

  const [filialId, setFilialId] = useState(
    tahrirlanayotgan?.filial_id || (markaziyRol ? "" : profile.filial_id)
  );
  const [ismFamilya, setIsmFamilya] = useState(tahrirlanayotgan?.ism_familya || "");
  const [telefon, setTelefon] = useState(
    tahrirlanayotgan?.telefon ? telefonKorinishi(tahrirlanayotgan.telefon) : ""
  );
  const [intalimId, setIntalimId] = useState(tahrirlanayotgan?.intalim_id || "");
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
  const [istalganImtihonId, setIstalganImtihonId] = useState(
    tahrirlanayotgan?.istalgan_imtihon_id || ""
  );
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  // Superadmin uchun filial-o'qituvchi biriktirmasi cheklovi qo'llanilmaydi —
  // superadmin istalgan o'qituvchini istalgan talabaga biriktira oladi
  // (hattoki o'sha o'qituvchi shu filialga rasmiy ravishda biriktirilmagan
  // bo'lsa ham). Admin/Hujjatchi uchun esa faqat shu filialga biriktirilgan
  // o'qituvchilar ko'rinadi.
  const superadminRol = profile.role === "superadmin";
  const nazariyOqituvchilar = useMemo(
    () =>
      oqituvchilar.filter(
        (o) => o.turi === "nazariy" && (superadminRol || (o.filiallar || []).includes(filialId))
      ),
    [oqituvchilar, filialId, superadminRol]
  );
  const expressToifa = toifa === "express";
  // Diqqat: Express toifadagi talabalarga ham o'qituvchi biriktirish mumkin
  // (ixtiyoriy) — lekin ular KPI hisobiga HECH QACHON kirmaydi (bu qoida
  // talaba.toifa === "express" tekshiruvi orqali imtihonHisob.js va
  // statistika.js darajasida ta'minlanadi, oqituvchi biriktirilgan-
  // biriktirilmaganidan qat'i nazar).
  const oqituvchiTanlanadi = imtihonTuri === "nazariy" || imtihonTuri === "ikkalasi";

  async function yuborish(e) {
    e.preventDefault();
    setXato("");

    if (!filialId || (!expressToifa && !guruhRaqami.trim()) || !imtihonTuri || !toifa) {
      setXato("Barcha maydonlarni to'ldiring");
      return;
    }
    const telefonNormal = telefonNormallash(telefon);
    if (telefonNormal.length !== 9) {
      setXato("Telefon raqamini to'liq kiriting (9 xonali, masalan: 91 234 56 78)");
      return;
    }
    if (!expressToifa && !/^\d+$/.test(guruhRaqami.trim())) {
      setXato("Guruh raqami faqat sonlardan iborat bo'lishi kerak");
      return;
    }
    const qarzdorlikSoni = Number(qarzdorlikSummasi.replace(",", "."));
    if (qarzdorlik === "bor" && (!qarzdorlikSummasi.trim() || !(qarzdorlikSoni > 0))) {
      setXato("Qarzdorlik summasini kiriting (musbat son)");
      return;
    }

    const supabase = supabaseBrowser();

    // Bir xil ism+telefon bilan FAOL (arxivlanmagan) talaba allaqachon
    // borligini tekshiramiz — bu QATTIQ cheklov emas (ba'zi filiallarda
    // umumiy/vaqtinchalik telefon raqamlari ishlatiladi), shuning uchun
    // topilsa ogohlantirib, foydalanuvchi tasdiqlasa davom etamiz. Faqat
    // yangi talaba qo'shishda tekshiramiz — tahrirlashda talabaning o'zini
    // o'ziga qarshi taqqoslamaslik uchun.
    if (!tahrirRejimi) {
      const { data: mavjudlar } = await supabase
        .from("talabalar")
        .select("id, ism_familya")
        .eq("telefon", telefonNormal)
        .eq("arxivlangan", false)
        .ilike("ism_familya", ismFamilya.trim());
      if (mavjudlar && mavjudlar.length > 0) {
        const davomEtish = window.confirm(
          `Diqqat! "${mavjudlar[0].ism_familya}" ismli, shu telefon raqami (+998 ${telefonKorinishi(
            telefonNormal
          )}) bilan talaba allaqachon ro'yxatda bor.\n\nBaribir yangi talaba sifatida qo'shishni davom ettirasizmi?`
        );
        if (!davomEtish) return;
      }
    }

    setYuklanmoqda(true);

    let guruhId = null;
    if (!expressToifa) {
      try {
        guruhId = await guruhIdTop(supabase, guruhRaqami, filialId);
      } catch (err) {
        setYuklanmoqda(false);
        setXato(`Guruhni aniqlashda xatolik: ${err.message}`);
        return;
      }
    }

    const maydonlar = {
      ism_familya: ismFamilya.trim(),
      telefon: telefonNormal,
      intalim_id: intalimId.trim() || null,
      toifa,
      qarzdorlik: qarzdorlik === "bor",
      qarzdorlik_summasi: qarzdorlik === "bor" ? qarzdorlikSoni : null,
      filial_id: filialId,
      guruh_id: guruhId,
      forma_083: forma083 === "tayyor",
      imtihon_turi: imtihonTuri,
      nazariy_oqituvchi_id: oqituvchiTanlanadi && nazariyOqituvchiId ? nazariyOqituvchiId : null,
      istalgan_imtihon_id: istalganImtihonId || null,
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
        <label className="label">Telefon raqami</label>
        <div className="flex items-stretch">
          <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-[15px]">
            +998
          </span>
          <input
            className="input rounded-l-none"
            type="tel"
            inputMode="numeric"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            placeholder="91 234 56 78"
            required
          />
        </div>
      </div>

      <div>
        <label className="label">Int'alim ID (ixtiyoriy)</label>
        <input
          className="input"
          type="text"
          value={intalimId}
          onChange={(e) => setIntalimId(e.target.value)}
          placeholder="Masalan: 1234567"
        />
        <p className="text-xs text-slate-400 mt-1">
          Kiritilsa, talabani keyinchalik shu ID orqali ham qidirish mumkin bo'ladi.
        </p>
      </div>

      <div>
        <label className="label">Toifa</label>
        <select
          className="input"
          value={toifa}
          onChange={(e) => setToifa(e.target.value)}
          required
        >
          <option value="">Tanlang</option>
          {Object.entries(TOIFALAR).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {expressToifa && (
          <p className="text-xs text-slate-400 mt-1">
            Express toifadagi talabalar guruhga biriktirilmaydi. O'qituvchi ixtiyoriy ravishda biriktirilishi
            mumkin, lekin KPI hisobiga hech qachon kirmaydi.
          </p>
        )}
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

      {!expressToifa && (
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
            Faqat raqam kiriting. Bir xil raqamli guruhlar — boshqa filiallardan bo'lsa ham —
            avtomatik bitta guruhga biriktiriladi.
          </p>
        </div>
      )}

      <div>
        <label className="label">083 forma (ixtiyoriy)</label>
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

      <div>
        <label className="label">Qaysi imtihon uchun (ixtiyoriy)</label>
        <select
          className="input"
          value={istalganImtihonId}
          onChange={(e) => setIstalganImtihonId(e.target.value)}
        >
          <option value="">Tanlanmagan</option>
          {imtihonlar.map((i) => (
            <option key={i.id} value={i.id}>
              {sanaKorinishi(i.sana)} {i.izoh ? `— ${i.izoh}` : ""}
            </option>
          ))}
        </select>
        {imtihonlar.length === 0 ? (
          <p className="text-xs text-slate-400 mt-1">Hozircha yaratilgan imtihon yo'q.</p>
        ) : (
          <p className="text-xs text-slate-400 mt-1">
            Talaba shu imtihonga yuborilishini xohlasangiz tanlang — hujjatchi hujjatni tayyorlashda buni ko'radi.
          </p>
        )}
      </div>

      {oqituvchiTanlanadi && (
        <div>
          <label className="label">Nazariy o'qituvchi{expressToifa ? " (ixtiyoriy, KPI hisobiga kirmaydi)" : ""}</label>
          <select
            className="input"
            value={nazariyOqituvchiId}
            onChange={(e) => setNazariyOqituvchiId(e.target.value)}
            disabled={!superadminRol && !filialId}
          >
            <option value="">Yo'q (biriktirilmagan)</option>
            {nazariyOqituvchilar.map((o) => (
              <option key={o.id} value={o.id}>{o.ism_familya}</option>
            ))}
          </select>
          {(superadminRol || filialId) && nazariyOqituvchilar.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              {superadminRol
                ? "Tizimda faol nazariy o'qituvchi yo'q — Sozlamalardan qo'shing."
                : "Bu filialga biriktirilgan nazariy o'qituvchi yo'q — Sozlamalardan qo'shing."}
            </p>
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
