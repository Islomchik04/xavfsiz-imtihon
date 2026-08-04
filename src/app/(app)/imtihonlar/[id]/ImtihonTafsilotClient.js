"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabase/client";
import { sanaKorinishi } from "@/lib/imtihonHisob";
import { NATIJA, IMTIHON_HOLATI, IMTIHON_HOLATI_RANG } from "@/lib/constants";
import { otdiEffekti } from "@/lib/effektlar";

export default function ImtihonTafsilotClient({
  imtihon,
  boshlangichUrinishlar,
  natijaBelgilashRuxsat,
  biriktirishRuxsat,
  holatBoshqarishRuxsat,
  superadminMi,
  oqituvchilar,
  sabablar,
}) {
  const router = useRouter();
  // Diqqat: "amaliy o'qituvchi" tushunchasi tizimdan olib tashlangan —
  // amaliy imtihonga talaba biriktirilganda o'qituvchi tanlanmaydi va
  // KPI ham amaliy qism bo'yicha hech qanday o'qituvchiga hisoblanmaydi
  // (qarang: imtihonHisob.js#oqituvchilarKpiHisoblash).
  const nazariyOqituvchilarRoyxati = useMemo(
    () => (oqituvchilar || []).filter((o) => o.turi === "nazariy"),
    [oqituvchilar]
  );
  const [urinishlar, setUrinishlar] = useState(boshlangichUrinishlar);
  const [soz, setSoz] = useState("");
  const [holat, setHolat] = useState(imtihon.holati || "boshlanmagan");
  const [boshlandiOverlay, setBoshlandiOverlay] = useState(false);
  const [holatYuklanmoqda, setHolatYuklanmoqda] = useState(false);

  // Server komponent router.refresh() orqali yangi ma'lumot bergach, mahalliy
  // holatni shu bilan sinxronlaymiz (talaba qo'shilganda/amaliyga
  // o'tkazilganda yangi qatorlar aynan shu yo'l bilan ko'rinadi).
  useEffect(() => {
    setUrinishlar(boshlangichUrinishlar);
  }, [boshlangichUrinishlar]);

  useEffect(() => {
    setHolat(imtihon.holati || "boshlanmagan");
  }, [imtihon.holati]);

  const otkazishRuxsat = natijaBelgilashRuxsat || biriktirishRuxsat;
  // Natija (o'tdi/o'tmadi/...) faqat imtihon "boshlangan" (yoki
  // "yakunlangan") holatda bo'lgandagina belgilanadi — hali boshlanmagan
  // imtihonda tugmalar bekorga faol ko'rinib turmasligi uchun.
  const imtihonBoshlandimi = holat !== "boshlanmagan";

  const filtrlangan = useMemo(() => {
    const s = soz.trim().toLowerCase();
    if (!s) return urinishlar;
    return urinishlar.filter((u) => u.talabalar?.ism_familya?.toLowerCase().includes(s));
  }, [urinishlar, soz]);

  // Talaba shu imtihon doirasida boshqa (amaliy kerakli) urinishga ega
  // bo'lsa — "amaliyga qo'shish" tugmasi endi kerak emas (allaqachon
  // qo'shilgan).
  const amaliyBorTalabalar = useMemo(() => {
    const to_plam = new Set();
    for (const u of urinishlar) {
      if (u.amaliy_kerak && u.talaba_id) to_plam.add(u.talaba_id);
    }
    return to_plam;
  }, [urinishlar]);

  function amaliygaTayyormi(u) {
    const talaba = u.talabalar;
    return (
      u.nazariy_kerak &&
      u.nazariy_natija === "otdi" &&
      !u.amaliy_kerak &&
      !amaliyBorTalabalar.has(u.talaba_id) &&
      talaba?.toifa !== "express"
    );
  }

  // Shu imtihon doirasida amaliydan o'tib — prava olganlar (alohida bo'lim
  // sifatida ajratib ko'rsatiladi, "nazariydan o'tganlar"/"qolganlar" bilan
  // aralashtirilmaydi).
  function amaliydanOtganmi(u) {
    return u.amaliy_kerak && u.amaliy_natija === "otdi";
  }

  const amaliydanOtganlar = useMemo(() => filtrlangan.filter(amaliydanOtganmi), [filtrlangan]);
  const nazariydanOtganlar = useMemo(
    () => filtrlangan.filter((u) => amaliygaTayyormi(u) && !amaliydanOtganmi(u)),
    [filtrlangan, amaliyBorTalabalar]
  );
  const qolganlar = useMemo(
    () => filtrlangan.filter((u) => !amaliygaTayyormi(u) && !amaliydanOtganmi(u)),
    [filtrlangan, amaliyBorTalabalar]
  );

  function yangilaUrinish(id, oz) {
    setUrinishlar((royxat) => royxat.map((u) => (u.id === id ? { ...u, ...oz } : u)));
  }

  const jami = urinishlar.length;
  const natijaChiqqan = urinishlar.filter((u) => {
    const qismlar = [];
    if (u.nazariy_kerak) qismlar.push(u.nazariy_natija);
    if (u.amaliy_kerak) qismlar.push(u.amaliy_natija);
    return !qismlar.some((q) => q === "kutilmoqda");
  }).length;

  // Nazariy/amaliy/ikkalasi statistikasi — imtihon boshlanishidan oldin
  // nechta o'quvchi qaysi qism bo'yicha kutilayotganini ko'rsatadi.
  const statistika = useMemo(() => {
    let faqatNazariy = 0;
    let faqatAmaliy = 0;
    let ikkalasi = 0;
    for (const u of urinishlar) {
      if (u.nazariy_kerak && u.amaliy_kerak) ikkalasi += 1;
      else if (u.nazariy_kerak) faqatNazariy += 1;
      else if (u.amaliy_kerak) faqatAmaliy += 1;
    }
    return { faqatNazariy, faqatAmaliy, ikkalasi };
  }, [urinishlar]);

  async function holatniOzgartirish(yangiHolat) {
    setHolatYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("imtihon_holatini_ozgartirish", {
      p_imtihon_id: imtihon.id,
      p_holat: yangiHolat,
    });
    setHolatYuklanmoqda(false);
    if (error) {
      alert(`Xatolik: ${error.message}`);
      return;
    }
    // Faqat haqiqiy "boshlash" (boshlanmagan → boshlangan) da bayram
    // effektini ko'rsatamiz — superadmin yakunlangan imtihonni qayta
    // boshlangan holatiga qaytarganda bu overlay keraksiz.
    if (yangiHolat === "boshlangan" && holat === "boshlanmagan") {
      setBoshlandiOverlay(true);
      setTimeout(() => setBoshlandiOverlay(false), 2600);
    }
    setHolat(yangiHolat);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/imtihonlar" className="text-sm text-brand-600 hover:underline">
            ← Imtihonlar
          </Link>
          <h1 className="text-xl font-bold text-slate-800 mt-1">{sanaKorinishi(imtihon.sana)}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {imtihon.izoh ? `${imtihon.izoh} · ` : ""}
            {natijaChiqqan}/{jami} ta natija chiqqan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${IMTIHON_HOLATI_RANG[holat]}`}>{IMTIHON_HOLATI[holat]}</span>
          {holatBoshqarishRuxsat && holat === "boshlanmagan" && (
            <button
              className="btn-primary"
              disabled={holatYuklanmoqda}
              onClick={() => holatniOzgartirish("boshlangan")}
            >
              {holatYuklanmoqda ? "…" : "▶ Boshlash"}
            </button>
          )}
          {holatBoshqarishRuxsat && holat === "boshlangan" && (
            <button
              className="btn-secondary"
              disabled={holatYuklanmoqda}
              onClick={() => holatniOzgartirish("yakunlangan")}
            >
              {holatYuklanmoqda ? "…" : "■ Yakunlash"}
            </button>
          )}
          {superadminMi && holat === "yakunlangan" && (
            <button
              className="btn-secondary"
              disabled={holatYuklanmoqda}
              onClick={() => holatniOzgartirish("boshlanmagan")}
              title="Imtihonni avvalgi holatiga qaytarish — qayta 'Boshlash' tugmasi chiqadi"
            >
              {holatYuklanmoqda ? "…" : "↺ Avvalgi holatga qaytarish"}
            </button>
          )}
        </div>
      </div>

      {/* Imtihon boshlanishidan oldin: nazariy/amaliy/ikkalasi soni */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card !py-3 text-center">
          <div className="text-xl font-bold text-slate-800">{statistika.faqatNazariy}</div>
          <div className="text-xs text-slate-400 mt-0.5">Faqat nazariy</div>
        </div>
        <div className="card !py-3 text-center">
          <div className="text-xl font-bold text-slate-800">{statistika.faqatAmaliy}</div>
          <div className="text-xs text-slate-400 mt-0.5">Faqat amaliy</div>
        </div>
        <div className="card !py-3 text-center">
          <div className="text-xl font-bold text-slate-800">{statistika.ikkalasi}</div>
          <div className="text-xs text-slate-400 mt-0.5">Nazariy + Amaliy</div>
        </div>
      </div>

      {biriktirishRuxsat && (
        <TalabaQoshish
          imtihonId={imtihon.id}
          mavjudTalabaIdlar={urinishlar.map((u) => u.talaba_id).filter(Boolean)}
          onQoshildi={() => router.refresh()}
        />
      )}

      <div className="relative">
        <img
          src="/logo.png"
          alt=""
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full object-cover pointer-events-none"
        />
        <input
          className="input !pl-12 !text-lg !py-4"
          placeholder="Ism familyani kiriting…"
          value={soz}
          onChange={(e) => setSoz(e.target.value)}
          autoFocus
        />
      </div>

      {jami === 0 ? (
        <div className="card text-sm text-slate-400">Bu imtihonga hali talaba biriktirilmagan.</div>
      ) : filtrlangan.length === 0 ? (
        <div className="card text-sm text-slate-400">Hech narsa topilmadi.</div>
      ) : (
        <div className="space-y-5">
          {amaliydanOtganlar.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-brand-700 flex items-center gap-1.5">
                🚗 Amaliydan o'tganlar — prava oldi ({amaliydanOtganlar.length})
              </h2>
              {amaliydanOtganlar.map((u) => (
                <UrinishKartochka
                  key={u.id}
                  urinish={u}
                  tahrirRuxsat={natijaBelgilashRuxsat}
                  otkazishRuxsat={otkazishRuxsat}
                  sabablar={sabablar}
                  imtihonId={imtihon.id}
                  nazariyOqituvchilar={nazariyOqituvchilarRoyxati}
                  imtihonBoshlandimi={imtihonBoshlandimi}
                  amaliygaTaklifQilish={false}
                  onYangilash={(oz) => yangilaUrinish(u.id, oz)}
                  onOtkazildi={() => router.refresh()}
                />
              ))}
            </div>
          )}

          {nazariydanOtganlar.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                ✓ Nazariydan o'tganlar — amaliyga qo'shish mumkin ({nazariydanOtganlar.length})
              </h2>
              {nazariydanOtganlar.map((u) => (
                <UrinishKartochka
                  key={u.id}
                  urinish={u}
                  tahrirRuxsat={natijaBelgilashRuxsat}
                  otkazishRuxsat={otkazishRuxsat}
                  sabablar={sabablar}
                  imtihonId={imtihon.id}
                  nazariyOqituvchilar={nazariyOqituvchilarRoyxati}
                  imtihonBoshlandimi={imtihonBoshlandimi}
                  amaliygaTaklifQilish
                  onYangilash={(oz) => yangilaUrinish(u.id, oz)}
                  onOtkazildi={() => router.refresh()}
                />
              ))}
            </div>
          )}

          <div className="space-y-3">
            {nazariydanOtganlar.length > 0 && (
              <h2 className="text-sm font-semibold text-slate-500">Barcha ishtirokchilar</h2>
            )}
            {qolganlar.map((u) => (
              <UrinishKartochka
                key={u.id}
                urinish={u}
                tahrirRuxsat={natijaBelgilashRuxsat}
                otkazishRuxsat={otkazishRuxsat}
                sabablar={sabablar}
                imtihonId={imtihon.id}
                nazariyOqituvchilar={nazariyOqituvchilarRoyxati}
                imtihonBoshlandimi={imtihonBoshlandimi}
                amaliygaTaklifQilish={false}
                onYangilash={(oz) => yangilaUrinish(u.id, oz)}
                onOtkazildi={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}

      {holat === "yakunlangan" && <YakunStatistikasi urinishlar={urinishlar} />}

      <AnimatePresence>
        {boshlandiOverlay && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-slate-900 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="xi-blob w-[26rem] h-[26rem] bg-brand-400 -top-24 -left-16" />
              <div className="xi-blob w-[22rem] h-[22rem] bg-white top-1/2 -right-20" style={{ animationDelay: "-8s" }} />
            </div>

            <div className="text-center relative px-6">
              <motion.div
                className="mx-auto mb-6 w-20 h-20 rounded-full bg-white/10 backdrop-blur flex items-center justify-center"
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.1 }}
              >
                <span className="text-4xl">🚦</span>
              </motion.div>
              <motion.h1
                className="text-2xl sm:text-3xl font-bold text-white mb-2"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
              >
                Imtihon boshlandi!
              </motion.h1>
              <motion.p
                className="text-brand-100 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                Barcha o'quvchilarga omad tilaymiz!
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function YakunStatistikasi({ urinishlar }) {
  const stat = useMemo(() => {
    let nazariyOtdi = 0;
    let nazariyOtmadi = 0;
    let amaliyOtdi = 0;
    let amaliyOtmadi = 0;
    for (const u of urinishlar) {
      if (u.nazariy_kerak) {
        if (u.nazariy_natija === "otdi") nazariyOtdi += 1;
        else if (u.nazariy_natija !== "kutilmoqda") nazariyOtmadi += 1;
      }
      if (u.amaliy_kerak) {
        if (u.amaliy_natija === "otdi") amaliyOtdi += 1;
        else if (u.amaliy_natija !== "kutilmoqda") amaliyOtmadi += 1;
      }
    }
    return { nazariyOtdi, nazariyOtmadi, amaliyOtdi, amaliyOtmadi };
  }, [urinishlar]);

  return (
    <div className="card bg-brand-50 border-brand-100">
      <div className="font-semibold text-brand-800 mb-3">Imtihon yakuni — statistika</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-emerald-600">{stat.nazariyOtdi}</div>
          <div className="text-xs text-slate-400 mt-0.5">Nazariy o'tdi</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-rose-600">{stat.nazariyOtmadi}</div>
          <div className="text-xs text-slate-400 mt-0.5">Nazariy o'tmadi</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-emerald-600">{stat.amaliyOtdi}</div>
          <div className="text-xs text-slate-400 mt-0.5">Amaliy o'tdi</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-rose-600">{stat.amaliyOtmadi}</div>
          <div className="text-xs text-slate-400 mt-0.5">Amaliy o'tmadi</div>
        </div>
      </div>
    </div>
  );
}

function TalabaQoshish({ imtihonId, mavjudTalabaIdlar, onQoshildi }) {
  const [ochiq, setOchiq] = useState(false);
  const [soz, setSoz] = useState("");
  const [natijalar, setNatijalar] = useState([]);
  const [qidirilmoqda, setQidirilmoqda] = useState(false);
  const [tanlanganlar, setTanlanganlar] = useState({});
  const [yuklanmoqdaId, setYuklanmoqdaId] = useState(null);
  const [xato, setXato] = useState("");

  async function qidirish(matn) {
    setSoz(matn);
    setXato("");
    if (matn.trim().length < 2) {
      setNatijalar([]);
      return;
    }
    setQidirilmoqda(true);
    const supabase = supabaseBrowser();
    const { data } = await supabase
      .from("talabalar")
      .select("id, ism_familya, imtihon_turi, hujjat_tayyor, filiallar(nomi), guruhlar(nomi)")
      .ilike("ism_familya", `%${matn.trim()}%`)
      .eq("hujjat_tayyor", true)
      .limit(8);
    setQidirilmoqda(false);
    setNatijalar((data || []).filter((t) => !mavjudTalabaIdlar.includes(t.id)));
  }

  function tanlashniOzgartir(talabaId, turi, qiymat, boshlangichTuri) {
    setTanlanganlar((h) => {
      const joriy =
        h[talabaId] || {
          nazariy: boshlangichTuri === "nazariy" || boshlangichTuri === "ikkalasi",
          amaliy: boshlangichTuri === "amaliy" || boshlangichTuri === "ikkalasi",
        };
      return { ...h, [talabaId]: { ...joriy, [turi]: qiymat } };
    });
  }

  async function biriktirish(talaba) {
    const tanlov =
      tanlanganlar[talaba.id] || {
        nazariy: talaba.imtihon_turi === "nazariy" || talaba.imtihon_turi === "ikkalasi",
        amaliy: talaba.imtihon_turi === "amaliy" || talaba.imtihon_turi === "ikkalasi",
      };
    if (!tanlov.nazariy && !tanlov.amaliy) {
      setXato("Kamida bittasini (nazariy yoki amaliy) tanlang");
      return;
    }
    setYuklanmoqdaId(talaba.id);
    setXato("");
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("imtihonga_biriktirish", {
      p_talaba_id: talaba.id,
      p_imtihon_id: imtihonId,
      p_nazariy_kerak: tanlov.nazariy,
      p_amaliy_kerak: tanlov.amaliy,
    });
    setYuklanmoqdaId(null);
    if (error) {
      setXato(error.message);
      return;
    }
    setNatijalar((r) => r.filter((t) => t.id !== talaba.id));
    setSoz("");
    onQoshildi();
  }

  if (!ochiq) {
    return (
      <button type="button" onClick={() => setOchiq(true)} className="btn-secondary w-full">
        + Imtihonga talaba qo'shish (ism familya bo'yicha)
      </button>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-slate-700 text-sm">Talaba qo'shish</div>
        <button type="button" onClick={() => setOchiq(false)} className="text-xs text-slate-400 hover:text-slate-600">
          Yopish
        </button>
      </div>
      <input className="input" placeholder="Ism familyani yozing…" value={soz} onChange={(e) => qidirish(e.target.value)} autoFocus />
      {qidirilmoqda && <div className="text-xs text-slate-400">Qidirilmoqda…</div>}
      {xato && <div className="text-xs text-rose-600">{xato}</div>}
      {natijalar.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {natijalar.map((t) => {
            const tanlov =
              tanlanganlar[t.id] || {
                nazariy: t.imtihon_turi === "nazariy" || t.imtihon_turi === "ikkalasi",
                amaliy: t.imtihon_turi === "amaliy" || t.imtihon_turi === "ikkalasi",
              };
            return (
              <li key={t.id} className="py-2.5 space-y-1.5">
                <div>
                  <div className="font-medium text-slate-700 text-sm">{t.ism_familya}</div>
                  <div className="text-xs text-slate-400">
                    {t.filiallar?.nomi} · {t.guruhlar?.nomi}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={tanlov.nazariy}
                      onChange={(e) => tanlashniOzgartir(t.id, "nazariy", e.target.checked, t.imtihon_turi)}
                    />
                    Nazariy
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={tanlov.amaliy}
                      onChange={(e) => tanlashniOzgartir(t.id, "amaliy", e.target.checked, t.imtihon_turi)}
                    />
                    Amaliy
                  </label>
                  <button
                    type="button"
                    disabled={yuklanmoqdaId === t.id}
                    onClick={() => biriktirish(t)}
                    className="btn-primary !py-1 !px-3 !text-xs ml-auto disabled:opacity-50"
                  >
                    {yuklanmoqdaId === t.id ? "…" : "Qo'shish"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!qidirilmoqda && soz.trim().length >= 2 && natijalar.length === 0 && (
        <div className="text-xs text-slate-400">Topilmadi (yoki allaqachon biriktirilgan / hujjati tayyor emas).</div>
      )}
    </div>
  );
}

function UrinishKartochka({
  urinish,
  tahrirRuxsat,
  otkazishRuxsat,
  sabablar,
  imtihonId,
  nazariyOqituvchilar,
  imtihonBoshlandimi,
  amaliygaTaklifQilish,
  onYangilash,
  onOtkazildi,
}) {
  const [yuklanmoqdaMaydon, setYuklanmoqdaMaydon] = useState(null);
  const talaba = urinish.talabalar;

  async function belgilash(natijaMaydon, natijaQiymat, sababMaydon, sababQiymat) {
    setYuklanmoqdaMaydon(natijaMaydon);
    const supabase = supabaseBrowser();
    const oz = { [natijaMaydon]: natijaQiymat };
    if (sababMaydon) oz[sababMaydon] = sababQiymat;
    const { error } = await supabase.from("talaba_imtihonlar").update(oz).eq("id", urinish.id);
    setYuklanmoqdaMaydon(null);
    if (!error) {
      onYangilash(oz);
      if (natijaQiymat === "otdi") otdiEffekti();
    }
  }

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-1">
        <div>
          <Link
            href={`/talabalar/${talaba.id}`}
            className="text-lg font-bold text-slate-800 hover:text-brand-600 hover:underline"
          >
            {talaba.ism_familya}
          </Link>
          <div className="text-sm text-slate-400">
            {talaba.filiallar?.nomi} · {talaba.guruhlar?.nomi}
          </div>
        </div>
        {amaliygaTaklifQilish && <span className="badge bg-emerald-100 text-emerald-700 text-xs shrink-0">✓ Nazariydan o'tgan</span>}
      </div>

      <div className="mt-4 space-y-3">
        {urinish.nazariy_kerak && (
          <NatijaTugmalari
            sarlavha="Nazariy"
            turi="nazariy"
            talabaId={talaba.id}
            oqituvchi={talaba.nazariy_oqituvchilar?.ism_familya}
            oqituvchilarRoyxati={nazariyOqituvchilar}
            biriktirishRuxsat={otkazishRuxsat}
            onOqituvchiBiriktirildi={onOtkazildi}
            natija={urinish.nazariy_natija}
            sababId={urinish.nazariy_sabab_id}
            sabablar={sabablar}
            tahrirRuxsat={tahrirRuxsat}
            imtihonBoshlandimi={imtihonBoshlandimi}
            yuklanmoqda={yuklanmoqdaMaydon === "nazariy_natija"}
            onBelgilash={(q, sababId) => belgilash("nazariy_natija", q, "nazariy_sabab_id", sababId ?? null)}
          />
        )}
        {urinish.amaliy_kerak && (
          <NatijaTugmalari
            sarlavha="Amaliy"
            turi="amaliy"
            talabaId={talaba.id}
            natija={urinish.amaliy_natija}
            sababId={urinish.amaliy_sabab_id}
            sabablar={sabablar}
            tahrirRuxsat={tahrirRuxsat}
            imtihonBoshlandimi={imtihonBoshlandimi}
            yuklanmoqda={yuklanmoqdaMaydon === "amaliy_natija"}
            onBelgilash={(q, sababId) => belgilash("amaliy_natija", q, "amaliy_sabab_id", sababId ?? null)}
          />
        )}
      </div>

      {amaliygaTaklifQilish && otkazishRuxsat && (
        <AmaliygaOtkazishForma talabaId={talaba.id} imtihonId={imtihonId} onOtkazildi={onOtkazildi} />
      )}
    </div>
  );
}

function AmaliygaOtkazishForma({ talabaId, imtihonId, onOtkazildi }) {
  const [ochiq, setOchiq] = useState(false);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  async function otkazish() {
    setYuklanmoqda(true);
    setXato("");
    const supabase = supabaseBrowser();
    // Amaliy o'qituvchi tushunchasi olib tashlangan — bu yerda o'qituvchi
    // tanlanmaydi, doim null yuboriladi.
    const { error } = await supabase.rpc("amaliyga_otkazish", {
      p_talaba_id: talabaId,
      p_imtihon_id: imtihonId,
      p_amaliy_oqituvchi_id: null,
    });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    setOchiq(false);
    onOtkazildi();
  }

  if (!ochiq) {
    return (
      <button type="button" onClick={() => setOchiq(true)} className="btn-secondary !py-2 !text-sm w-full mt-3">
        + Amaliy imtihonga qo'shish
      </button>
    );
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mt-3 space-y-2">
      <div className="text-xs font-medium text-emerald-700">Shu imtihon kuniga amaliyga biriktirilsinmi?</div>
      {xato && <div className="text-xs text-rose-600">{xato}</div>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={yuklanmoqda}
          onClick={otkazish}
          className="btn-primary !py-1.5 !text-sm flex-1 disabled:opacity-50"
        >
          {yuklanmoqda ? "…" : "Tasdiqlash"}
        </button>
        <button type="button" onClick={() => setOchiq(false)} className="btn-secondary !py-1.5 !text-sm">
          Bekor
        </button>
      </div>
    </div>
  );
}

// Talabaga hali o'qituvchi biriktirilmagan bo'lsa — imtihon menejeri
// (imtihonchi), hujjatchi yoki superadmin shu yerdan tezkor biriktirishi
// mumkin. Faqat "bo'sh" holatda ishlaydi (allaqachon biriktirilgan
// o'qituvchini bu forma orqali ALMASHTIRIB bo'lmaydi).
function OqituvchiBiriktirishForma({ talabaId, turi, oqituvchilarRoyxati, onBiriktirildi }) {
  const [ochiq, setOchiq] = useState(false);
  const [oqituvchiId, setOqituvchiId] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xato, setXato] = useState("");

  async function biriktirish() {
    if (!oqituvchiId) {
      setXato("O'qituvchini tanlang");
      return;
    }
    setYuklanmoqda(true);
    setXato("");
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("talaba_oqituvchisini_biriktirish", {
      p_talaba_id: talabaId,
      p_turi: turi,
      p_oqituvchi_id: oqituvchiId,
    });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    setOchiq(false);
    onBiriktirildi?.();
  }

  if (!ochiq) {
    return (
      <button
        type="button"
        onClick={() => setOchiq(true)}
        className="text-xs text-brand-600 hover:underline ml-2"
      >
        + O'qituvchi biriktirish
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 ml-2 flex-wrap">
      <select
        className="input !py-1 !text-xs !w-auto"
        value={oqituvchiId}
        onChange={(e) => setOqituvchiId(e.target.value)}
      >
        <option value="">O'qituvchi tanlang…</option>
        {oqituvchilarRoyxati.map((o) => (
          <option key={o.id} value={o.id}>
            {o.ism_familya}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={yuklanmoqda}
        onClick={biriktirish}
        className="btn-primary !py-1 !px-2 !text-xs disabled:opacity-50"
      >
        {yuklanmoqda ? "…" : "Saqlash"}
      </button>
      <button type="button" onClick={() => setOchiq(false)} className="text-xs text-slate-400 hover:text-slate-600">
        Bekor
      </button>
      {xato && <div className="text-xs text-rose-600 w-full">{xato}</div>}
    </div>
  );
}

function NatijaTugmalari({
  sarlavha,
  turi,
  talabaId,
  oqituvchi,
  oqituvchilarRoyxati,
  biriktirishRuxsat,
  onOqituvchiBiriktirildi,
  natija,
  sababId,
  sabablar,
  tahrirRuxsat,
  imtihonBoshlandimi,
  yuklanmoqda,
  onBelgilash,
}) {
  const yakunlangan = natija !== "kutilmoqda";
  const [modalOchiq, setModalOchiq] = useState(false);
  // null | "boshqa" | "chetlatildi" — ikkalasi ham bir xil sabab-tanlash
  // panelidan (umumiy "sabablar" ro'yxatidan) foydalanadi.
  const [sababUchun, setSababUchun] = useState(null);
  const [tanlanganSabab, setTanlanganSabab] = useState("");

  const joriySabab = sababId ? sabablar.find((s) => s.id === sababId)?.matn : null;

  function modalniOchish() {
    setSababUchun(null);
    setTanlanganSabab("");
    setModalOchiq(true);
  }

  function modalniYopish() {
    setModalOchiq(false);
    setSababUchun(null);
    setTanlanganSabab("");
  }

  function oddiyBelgilash(qiymat) {
    onBelgilash(qiymat);
    modalniYopish();
  }

  function sababniOchish(t) {
    setSababUchun((v) => (v === t ? null : t));
    setTanlanganSabab("");
  }

  function sababniTasdiqlash() {
    onBelgilash(sababUchun, tanlanganSabab);
    modalniYopish();
  }

  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="flex justify-between items-center gap-2">
        <div>
          <span className="text-sm font-semibold text-slate-700">{sarlavha}</span>
          {oqituvchi ? (
            <span className="text-xs text-slate-400 ml-2">{oqituvchi}</span>
          ) : (
            biriktirishRuxsat && (
              <OqituvchiBiriktirishForma
                talabaId={talabaId}
                turi={turi}
                oqituvchilarRoyxati={oqituvchilarRoyxati || []}
                onBiriktirildi={onOqituvchiBiriktirildi}
              />
            )
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-slate-500 text-right">
            {NATIJA[natija]}
            {joriySabab && ` — ${joriySabab}`}
          </span>
          {tahrirRuxsat && (
            <button
              type="button"
              disabled={!imtihonBoshlandimi || yuklanmoqda}
              onClick={modalniOchish}
              className="btn-secondary !py-1.5 !px-3 !text-xs disabled:opacity-40 shrink-0"
            >
              {yuklanmoqda ? "…" : yakunlangan ? "O'zgartirish" : "Holati"}
            </button>
          )}
        </div>
      </div>
      {tahrirRuxsat && !imtihonBoshlandimi && (
        <div className="text-xs text-slate-400 mt-2">Natija belgilash uchun avval imtihonni boshlang</div>
      )}

      {typeof document !== "undefined" && createPortal(
      <AnimatePresence>
        {modalOchiq && (
          <motion.div
            className="fixed inset-0 z-50 bg-white flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex justify-between items-center px-4 py-4 border-b border-slate-100 shrink-0">
              <div className="font-semibold text-slate-800 text-base">{sarlavha} — natijani belgilash</div>
              <button
                type="button"
                onClick={modalniYopish}
                className="text-slate-400 hover:text-slate-600 text-3xl leading-none px-2"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col justify-center px-4 py-6">
              <div className="w-full max-w-md mx-auto space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={yuklanmoqda}
                    onClick={() => oddiyBelgilash("otdi")}
                    className="btn !py-7 !text-lg bg-white border border-emerald-300 text-emerald-700 disabled:opacity-50"
                  >
                    O'TDI
                  </button>
                  <button
                    disabled={yuklanmoqda}
                    onClick={() => oddiyBelgilash("otmadi")}
                    className="btn !py-7 !text-lg bg-white border border-rose-300 text-rose-700 disabled:opacity-50"
                  >
                    O'TMADI
                  </button>
                  <button
                    disabled={yuklanmoqda}
                    onClick={() => oddiyBelgilash("kelmadi")}
                    className="btn !py-4 !text-base bg-white border border-amber-300 text-amber-700 disabled:opacity-50"
                  >
                    KELMADI
                  </button>
                  <button
                    disabled={yuklanmoqda}
                    onClick={() => sababniOchish("boshqa")}
                    className={`btn !py-4 !text-base ${
                      sababUchun === "boshqa" ? "bg-violet-500 text-white" : "bg-white border border-violet-300 text-violet-700"
                    } disabled:opacity-50`}
                  >
                    BOSHQA
                  </button>
                </div>
                <button
                  disabled={yuklanmoqda}
                  onClick={() => sababniOchish("chetlatildi")}
                  className={`w-full btn !py-4 !text-base ${
                    sababUchun === "chetlatildi" ? "bg-slate-700 text-white" : "bg-white border border-slate-400 text-slate-600"
                  } disabled:opacity-50`}
                >
                  IMTIHONDAN CHETLATISH
                </button>
                {sababUchun && (
                  <div className="flex gap-2 items-center bg-slate-50 border border-violet-200 rounded-lg p-2">
                    <select
                      className="input !py-2 !text-sm flex-1"
                      value={tanlanganSabab}
                      onChange={(e) => setTanlanganSabab(e.target.value)}
                    >
                      <option value="">Sababni tanlang…</option>
                      {sabablar.map((s) => (
                        <option key={s.id} value={s.id}>{s.matn}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!tanlanganSabab || yuklanmoqda}
                      onClick={sababniTasdiqlash}
                      className="btn-primary !py-2 !text-sm shrink-0 disabled:opacity-50"
                    >
                      Tasdiqlash
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
}
