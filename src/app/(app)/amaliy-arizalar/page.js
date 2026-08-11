import { redirect } from "next/navigation";
import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import { TOIFALAR } from "@/lib/constants";
import { guruhBoyichaSaralash } from "@/lib/saralash";
import YangiTalabaArizaRoyxati from "@/components/YangiTalabaArizaRoyxati";
import RadEtilganArizalarRoyxati from "@/components/RadEtilganArizalarRoyxati";
import AutoQidiruvFormi from "@/components/AutoQidiruvFormi";
import ArizaRoyxati from "./ArizaRoyxati";
import TayyorTalabaKartochka from "./TayyorTalabaKartochka";

// Bu sahifada UCH XIL "amaliy" ariza/ro'yxat bor:
//
// 1) "Yangi amaliy arizalar" — Imtihon turi "Amaliy" bo'lgan YANGI
//    talabalar (hujjat_tayyor=false) — bularga umuman nazariy imtihon
//    kerak emas, shuning uchun /arizalar (Nazariy imtihon arizalari)
//    o'rniga to'g'ridan-to'g'ri shu yerga tushadi. Admin/Hujjatchi/
//    Imtihonchi/Superadmin ko'radi (xuddi /arizalar kabi).
//
// 2) "Amaliy imtihonga o'tkazish so'rovlari" — Filial adminlari NAZARIYDAN
//    O'TGAN (allaqachon Talabalar bo'limidagi) talabasini amaliy imtihonga
//    yuborish uchun qoldirgan so'rovi (amaliy_arizalar jadvali,
//    amaliy_ariza_yuborish RPC'si). Faqat Hujjatchi/Imtihonchi/
//    Superadmin tasdiqlaydi/rad etadi — Admin bu bo'limni ko'rmaydi
//    (o'zi yuborgan so'rovning holatini talaba sahifasida ko'radi).
//
// 3) "Nazariydan o'tgan, amaliyga tayyor talabalar" — HAR QANDAY (ariza
//    kutmasdan) nazariydan o'tgan, hali amaliyga biriktirilmagan talaba —
//    Hujjatchi/Imtihonchi/Superadmin to'g'ridan-to'g'ri shu yerdan tanlab
//    biriktirishi mumkin (amaliyga_otkazish RPC'si to'g'ridan-to'g'ri
//    chaqiriladi). Allaqachon (2)-bo'limda kutilayotgan arizasi bor
//    talabalar bu ro'yxatda takrorlanmaydi.
const TALABA_SELECT = `
  id, ism_familya, telefon, intalim_id, toifa, imtihon_turi, created_at,
  filiallar(id, nomi), guruhlar(nomi),
  qoshgan_profil:profiles!qoshgan(ism_familya),
  istalgan_imtihon:imtihonlar!istalgan_imtihon_id(sana, izoh)
`;

const RAD_ETILGAN_SELECT = `
  id, ism_familya, telefon, intalim_id, toifa, imtihon_turi, rad_izoh, rad_vaqt,
  filiallar(id, nomi), guruhlar(nomi),
  rad_sabab:sabablar!rad_sabab_id(matn),
  rad_etgan_profil:profiles!rad_etgan(ism_familya)
`;

export default async function AmaliyArizalarSahifa({ searchParams }) {
  const { profile, supabase } = await joriyFoydalanuvchi();

  if (!rolgaRuxsat(profile, ["admin", "hujjatchi", "imtihonchi", "superadmin"])) {
    redirect("/dashboard");
  }

  const q = searchParams?.q?.trim() || "";
  const toifaFiltr = searchParams?.toifa || "";
  const filialFiltr = searchParams?.filial || "";
  const guruhFiltr = searchParams?.guruh || "";
  const tartibFiltr = searchParams?.tartib || "";
  const radEtishRuxsat = rolgaRuxsat(profile, ["hujjatchi", "superadmin"]);

  const [{ data: filiallar }, { data: guruhlar }] = await Promise.all([
    supabase.from("filiallar").select("id, nomi").eq("faol", true).order("nomi"),
    // Guruh filiallararo bo'lishi mumkin — filial bo'yicha cheklamasdan
    // barcha faol guruhlarni ko'rsatamiz.
    supabase.from("guruhlar").select("id, nomi").eq("faol", true).order("nomi"),
  ]);

  // 1) Yangi (hujjat kutilayotgan) "faqat amaliy" talabalar
  let yangiSo_rov = supabase
    .from("talabalar")
    .select(TALABA_SELECT)
    .eq("arxivlangan", false)
    .eq("hujjat_tayyor", false)
    .eq("rad_etildi", false)
    .eq("imtihon_turi", "amaliy")
    .order("created_at", { ascending: false });
  if (q) yangiSo_rov = yangiSo_rov.or(`ism_familya.ilike.%${q}%,intalim_id.ilike.%${q}%`);
  if (toifaFiltr) yangiSo_rov = yangiSo_rov.eq("toifa", toifaFiltr);
  if (filialFiltr) yangiSo_rov = yangiSo_rov.eq("filial_id", filialFiltr);
  if (guruhFiltr) yangiSo_rov = yangiSo_rov.eq("guruh_id", guruhFiltr);

  // 2) Nazariydan o'tgan talabalar uchun amaliyga yuborish so'rovlari, va
  //    3) har qanday nazariydan o'tgan/amaliyga tayyor talaba — faqat
  //    Hujjatchi/Imtihonchi/Superadmin uchun yuklanadi (amaliyga_otkazish
  //    RPC'siga to'g'ridan-to'g'ri ruxsati bor rollar).
  const otkazishSorovRuxsat = ["hujjatchi", "imtihonchi", "superadmin"].includes(profile.role);
  let otkazishSo_rovlar = [];
  let aktivImtihonlar = [];
  let tayyorTalabalar = [];

  const [{ data: yangiXom, error }, otkazishNatija] = await Promise.all([
    yangiSo_rov.limit(300),
    otkazishSorovRuxsat
      ? (async () => {
          let otkazishSo_rov = supabase
            .from("amaliy_arizalar")
            .select(
              `
              id, izoh, created_at, holati,
              talabalar!inner(id, ism_familya, intalim_id, filial_id, filiallar(nomi), guruhlar(nomi)),
              soragan_profil:profiles!soragan(ism_familya)
            `
            )
            .eq("holati", "kutilmoqda")
            .order("created_at", { ascending: false });
          if (filialFiltr) otkazishSo_rov = otkazishSo_rov.eq("talabalar.filial_id", filialFiltr);

          // Nazariy o'tgan/amaliy_kerak yo'q — barcha urinishlarni yig'ib,
          // JS tomonda talaba bo'yicha aniqlaymiz (xuddi ImtihonTafsilotClient.js
          // dagi amaliygaTayyormi() mantig'i, lekin GLOBAL — bitta imtihonga
          // cheklanmagan holda).
          let tayyorSo_rov = supabase
            .from("talaba_imtihonlar")
            .select(
              `
              talaba_id, nazariy_kerak, nazariy_natija, amaliy_kerak,
              talabalar!inner(id, ism_familya, intalim_id, toifa, filial_id, hujjat_tayyor, arxivlangan, filiallar(nomi), guruhlar(nomi))
            `
            )
            .eq("talabalar.hujjat_tayyor", true)
            .eq("talabalar.arxivlangan", false)
            .neq("talabalar.toifa", "express");
          if (filialFiltr) tayyorSo_rov = tayyorSo_rov.eq("talabalar.filial_id", filialFiltr);
          if (toifaFiltr) tayyorSo_rov = tayyorSo_rov.eq("talabalar.toifa", toifaFiltr);
          if (guruhFiltr) tayyorSo_rov = tayyorSo_rov.eq("talabalar.guruh_id", guruhFiltr);
          if (q) tayyorSo_rov = tayyorSo_rov.or(`ism_familya.ilike.%${q}%,intalim_id.ilike.%${q}%`, { foreignTable: "talabalar" });

          const [{ data: arizalarData }, { data: imtihonlarData }, { data: urinishlarXom }] = await Promise.all([
            otkazishSo_rov,
            supabase
              .from("imtihonlar")
              .select("id, sana, izoh, holati")
              .in("holati", ["boshlanmagan", "boshlangan"])
              .order("sana", { ascending: false }),
            tayyorSo_rov,
          ]);

          const holatMap = new Map();
          for (const u of urinishlarXom || []) {
            const id = u.talaba_id;
            if (!holatMap.has(id)) holatMap.set(id, { talaba: u.talabalar, nazariyOtdi: false, amaliyBor: false });
            const rec = holatMap.get(id);
            if (u.nazariy_kerak && u.nazariy_natija === "otdi") rec.nazariyOtdi = true;
            if (u.amaliy_kerak) rec.amaliyBor = true;
          }
          const arizaBorTalabalar = new Set((arizalarData || []).map((a) => a.talabalar?.id));
          const tayyor = Array.from(holatMap.values())
            .filter((r) => r.nazariyOtdi && !r.amaliyBor && !arizaBorTalabalar.has(r.talaba.id))
            .map((r) => r.talaba)
            .sort((a, b) => a.ism_familya.localeCompare(b.ism_familya, "uz"));

          return { arizalar: arizalarData || [], imtihonlar: imtihonlarData || [], tayyor };
        })()
      : Promise.resolve(null),
  ]);

  const yangiRoyxat = tartibFiltr === "guruh" ? guruhBoyichaSaralash(yangiXom || []) : yangiXom || [];
  if (otkazishNatija) {
    otkazishSo_rovlar = otkazishNatija.arizalar;
    aktivImtihonlar = otkazishNatija.imtihonlar;
    tayyorTalabalar =
      tartibFiltr === "guruh" ? guruhBoyichaSaralash(otkazishNatija.tayyor) : otkazishNatija.tayyor;
  }

  let sabablar = [];
  let radEtilganRoyxat = [];
  if (radEtishRuxsat) {
    const [{ data: sabablarXom }, { data: radEtilganXom }] = await Promise.all([
      supabase.from("sabablar").select("id, matn").eq("faol", true).order("created_at"),
      supabase
        .from("talabalar")
        .select(RAD_ETILGAN_SELECT)
        .eq("arxivlangan", false)
        .eq("rad_etildi", true)
        .eq("imtihon_turi", "amaliy")
        .order("rad_vaqt", { ascending: false })
        .limit(200),
    ]);
    sabablar = sabablarXom || [];
    radEtilganRoyxat = radEtilganXom || [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">🚗 Amaliy imtihon arizalari</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Imtihon turi "Amaliy" bo'lgan yangi talabalar, nazariydan o'tganlarni amaliy imtihonga yuborish so'rovlari
          va amaliyga tayyor barcha talabalar.
        </p>
      </div>

      <AutoQidiruvFormi className="card flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Ism familya yoki Int'alim ID bo'yicha qidirish</label>
          <input className="input" type="text" name="q" defaultValue={q} placeholder="Masalan: Aliyev Vali yoki 1234567" />
        </div>
        <div className="min-w-[160px]">
          <label className="label">Toifa</label>
          <select className="input" name="toifa" defaultValue={toifaFiltr}>
            <option value="">Barchasi</option>
            {Object.entries(TOIFALAR).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="label">Filial</label>
          <select className="input" name="filial" defaultValue={filialFiltr}>
            <option value="">Barchasi</option>
            {(filiallar || []).map((f) => (
              <option key={f.id} value={f.id}>{f.nomi}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="label">Guruh</label>
          <select className="input" name="guruh" defaultValue={guruhFiltr}>
            <option value="">Barchasi</option>
            {(guruhlar || []).map((g) => (
              <option key={g.id} value={g.id}>{g.nomi}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="label">Saralash</label>
          <select className="input" name="tartib" defaultValue={tartibFiltr}>
            <option value="">Sana (yangi birinchi)</option>
            <option value="guruh">Guruh (A-Z)</option>
          </select>
        </div>
        <button className="btn-secondary" type="submit">Qidirish</button>
      </AutoQidiruvFormi>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800">
          🆕 Yangi amaliy arizalar{" "}
          <span className="text-sm font-normal text-slate-500">({yangiRoyxat.length} ta kutilmoqda)</span>
        </h2>
        <YangiTalabaArizaRoyxati
          royxat={yangiRoyxat}
          error={error}
          sabablar={sabablar}
          radEtishRuxsat={radEtishRuxsat}
          imtihonlar={aktivImtihonlar}
          ommaviyTasdiqRuxsat={radEtishRuxsat}
          ommaviyOchirishRuxsat={profile.role === "superadmin"}
        />
      </div>

      {radEtishRuxsat && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800">
            🚫 Rad etilgan arizalar{" "}
            <span className="text-sm font-normal text-slate-500">({radEtilganRoyxat.length} ta)</span>
          </h2>
          <RadEtilganArizalarRoyxati
            royxat={radEtilganRoyxat}
            qaytarishRuxsat={rolgaRuxsat(profile, ["superadmin"])}
          />
        </div>
      )}

      {otkazishSorovRuxsat && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800">
            🔁 Amaliy imtihonga o'tkazish so'rovlari{" "}
            <span className="text-sm font-normal text-slate-500">({otkazishSo_rovlar.length} ta kutilmoqda)</span>
          </h2>
          <p className="text-sm text-slate-500 -mt-2">
            Filial adminlari nazariydan o'tgan talabalarni amaliy imtihonga yuborish uchun qoldirgan so'rovlari.
          </p>
          <ArizaRoyxati arizalar={otkazishSo_rovlar} aktivImtihonlar={aktivImtihonlar} />
        </div>
      )}

      {otkazishSorovRuxsat && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800">
            ✅ Nazariydan o'tgan, amaliyga tayyor talabalar{" "}
            <span className="text-sm font-normal text-slate-500">({tayyorTalabalar.length} ta)</span>
          </h2>
          <p className="text-sm text-slate-500 -mt-2">
            Ariza kutmasdan — barcha nazariydan o'tgan, hali amaliy imtihonga biriktirilmagan talabalar. Bu yerdan
            to'g'ridan-to'g'ri tanlangan imtihonga biriktirishingiz mumkin.
          </p>
          {tayyorTalabalar.length === 0 ? (
            <div className="card text-sm text-slate-400">Hozircha bunday talaba yo'q.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 xi-stagger">
              {tayyorTalabalar.map((t) => (
                <TayyorTalabaKartochka key={t.id} talaba={t} aktivImtihonlar={aktivImtihonlar} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
