import { redirect } from "next/navigation";
import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import { TOIFALAR } from "@/lib/constants";
import YangiTalabaArizaRoyxati from "@/components/YangiTalabaArizaRoyxati";
import ArizaRoyxati from "./ArizaRoyxati";

// Bu sahifada IKKI XIL "amaliy" ariza bor:
//
// 1) "Yangi amaliy arizalar" — Imtihon turi "Amaliy" bo'lgan YANGI
//    talabalar (hujjat_tayyor=false) — bularga umuman nazariy imtihon
//    kerak emas, shuning uchun /arizalar (Nazariy imtihon arizalari)
//    o'rniga to'g'ridan-to'g'ri shu yerga tushadi. Admin/Hujjatchi/
//    Imtihonchi/Superadmin ko'radi (xuddi /arizalar kabi).
//
// 2) "Amaliy imtihon so'rovlari" — Filial adminlari NAZARIYDAN O'TGAN
//    (allaqachon Talabalar bo'limidagi) talabasini amaliy imtihonga
//    yuborish uchun qoldirgan so'rovi (amaliy_arizalar jadvali,
//    amaliy_ariza_yuborish RPC'si). Faqat Hujjatchi/Imtihonchi/
//    Superadmin tasdiqlaydi/rad etadi — Admin bu bo'limni ko'rmaydi
//    (o'zi yuborgan so'rovning holatini talaba sahifasida ko'radi).
const TALABA_SELECT = `
  id, ism_familya, telefon, intalim_id, toifa, imtihon_turi, created_at,
  filiallar(id, nomi), guruhlar(nomi),
  qoshgan_profil:profiles!qoshgan(ism_familya)
`;

export default async function AmaliyArizalarSahifa({ searchParams }) {
  const { profile, supabase } = await joriyFoydalanuvchi();

  if (!rolgaRuxsat(profile, ["admin", "hujjatchi", "imtihonchi", "superadmin"])) {
    redirect("/dashboard");
  }

  const q = searchParams?.q?.trim() || "";
  const toifaFiltr = searchParams?.toifa || "";
  const filialFiltr = searchParams?.filial || "";

  const { data: filiallar } = await supabase
    .from("filiallar")
    .select("id, nomi")
    .eq("faol", true)
    .order("nomi");

  // 1) Yangi (hujjat kutilayotgan) "faqat amaliy" talabalar
  let yangiSo_rov = supabase
    .from("talabalar")
    .select(TALABA_SELECT)
    .eq("arxivlangan", false)
    .eq("hujjat_tayyor", false)
    .eq("imtihon_turi", "amaliy")
    .order("created_at", { ascending: false });
  if (q) yangiSo_rov = yangiSo_rov.or(`ism_familya.ilike.%${q}%,intalim_id.ilike.%${q}%`);
  if (toifaFiltr) yangiSo_rov = yangiSo_rov.eq("toifa", toifaFiltr);
  if (filialFiltr) yangiSo_rov = yangiSo_rov.eq("filial_id", filialFiltr);

  // 2) Nazariydan o'tgan talabalar uchun amaliyga yuborish so'rovlari —
  //    faqat Hujjatchi/Imtihonchi/Superadmin uchun yuklanadi.
  const otkazishSorovRuxsat = ["hujjatchi", "imtihonchi", "superadmin"].includes(profile.role);
  let otkazishSo_rovlar = [];
  let aktivImtihonlar = [];

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
          const [{ data: arizalarData }, { data: imtihonlarData }] = await Promise.all([
            otkazishSo_rov,
            supabase
              .from("imtihonlar")
              .select("id, sana, izoh, holati")
              .in("holati", ["boshlanmagan", "boshlangan"])
              .order("sana", { ascending: false }),
          ]);
          return { arizalar: arizalarData || [], imtihonlar: imtihonlarData || [] };
        })()
      : Promise.resolve(null),
  ]);

  const yangiRoyxat = yangiXom || [];
  if (otkazishNatija) {
    otkazishSo_rovlar = otkazishNatija.arizalar;
    aktivImtihonlar = otkazishNatija.imtihonlar;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">🚗 Amaliy imtihon arizalari</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Imtihon turi "Amaliy" bo'lgan yangi talabalar va nazariydan o'tganlarni amaliy imtihonga yuborish so'rovlari.
        </p>
      </div>

      <form className="card flex flex-wrap gap-3 items-end" method="get">
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
        <button className="btn-secondary" type="submit">Qidirish</button>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800">
          🆕 Yangi amaliy arizalar{" "}
          <span className="text-sm font-normal text-slate-500">({yangiRoyxat.length} ta kutilmoqda)</span>
        </h2>
        <YangiTalabaArizaRoyxati royxat={yangiRoyxat} error={error} />
      </div>

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
    </div>
  );
}
