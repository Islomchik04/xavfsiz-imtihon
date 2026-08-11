import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import { TOIFALAR } from "@/lib/constants";
import { guruhBoyichaSaralash } from "@/lib/saralash";
import YangiTalabaArizaRoyxati from "@/components/YangiTalabaArizaRoyxati";
import RadEtilganArizalarRoyxati from "@/components/RadEtilganArizalarRoyxati";
import AutoQidiruvFormi from "@/components/AutoQidiruvFormi";

// Adminlar (yoki hujjatchi/superadmin) tomonidan "Yangi talaba" orqali
// qo'shilgan, lekin hujjatchi hali hujjatini tayyor deb belgilamagan
// talabalar shu yerda — "nazariy imtihon arizasi" sifatida — turadi.
// Hujjatchi /talabalar/[id] sahifasida "Hujjat holati" bo'limidan hujjatni
// tayyor deb belgilagach, talaba shu ro'yxatdan avtomatik chiqib
// "Talabalar" bo'limiga o'tadi (talabalar/page.js hujjat_tayyor=true
// filtri orqali).
//
// Diqqat: Imtihon turi "Amaliy" bo'lgan yangi arizalar BU YERGA
// chiqmaydi — ular /amaliy-arizalar sahifasiga o'tadi (chunki bunday
// talabaga umuman nazariy imtihon kerak emas). "Mustaqil imtihonchilar"
// (Telegram bot) — /mustaqil-imtihonchilar sahifasida alohida.
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

export default async function ArizalarSahifa({ searchParams }) {
  const { profile, supabase } = await joriyFoydalanuvchi();
  const q = searchParams?.q?.trim() || "";
  const toifaFiltr = searchParams?.toifa || "";
  const filialFiltr = searchParams?.filial || "";
  const guruhFiltr = searchParams?.guruh || "";
  const tartibFiltr = searchParams?.tartib || "";
  const radEtishRuxsat = rolgaRuxsat(profile, ["hujjatchi", "superadmin"]);

  let so_rov = supabase
    .from("talabalar")
    .select(TALABA_SELECT)
    .eq("arxivlangan", false)
    .eq("hujjat_tayyor", false)
    .eq("rad_etildi", false)
    .neq("imtihon_turi", "amaliy")
    .order("created_at", { ascending: false });
  if (q) so_rov = so_rov.or(`ism_familya.ilike.%${q}%,intalim_id.ilike.%${q}%`);
  if (toifaFiltr) so_rov = so_rov.eq("toifa", toifaFiltr);
  if (filialFiltr) so_rov = so_rov.eq("filial_id", filialFiltr);
  if (guruhFiltr) so_rov = so_rov.eq("guruh_id", guruhFiltr);

  const { data: royxatXom, error } = await so_rov.limit(300);
  const royxat = tartibFiltr === "guruh" ? guruhBoyichaSaralash(royxatXom || []) : royxatXom || [];

  // Filial bo'yicha filtr qilish uchun — Hujjatchi/superadmin barcha
  // filiallarni ko'radi, Admin RLS orqali baribir faqat o'z filialini
  // ko'radi (dropdown baribir zararsiz).
  const [{ data: filiallar }, { data: guruhlar }] = await Promise.all([
    supabase.from("filiallar").select("id, nomi").eq("faol", true).order("nomi"),
    // Guruh filiallararo bo'lishi mumkin (0017-migratsiya) — shuning uchun
    // filial bo'yicha cheklamasdan, barcha faol guruhlarni ko'rsatamiz.
    supabase.from("guruhlar").select("id, nomi").eq("faol", true).order("nomi"),
  ]);

  let radEtilganRoyxat = [];
  if (radEtishRuxsat) {
    const { data: radEtilganXom } = await supabase
      .from("talabalar")
      .select(RAD_ETILGAN_SELECT)
      .eq("arxivlangan", false)
      .eq("rad_etildi", true)
      .neq("imtihon_turi", "amaliy")
      .order("rad_vaqt", { ascending: false })
      .limit(200);
    radEtilganRoyxat = radEtilganXom || [];
  }

  let sabablar = [];
  let faolImtihonlar = [];
  if (radEtishRuxsat) {
    const [{ data: sabablarXom }, { data: imtihonlarXom }] = await Promise.all([
      supabase.from("sabablar").select("id, matn").eq("faol", true).order("created_at"),
      // Ommaviy "imtihonga biriktirish" uchun — hali yakunlanmagan imtihonlar.
      supabase
        .from("imtihonlar")
        .select("id, sana, izoh")
        .in("holati", ["boshlanmagan", "boshlangan"])
        .order("sana", { ascending: false }),
    ]);
    sabablar = sabablarXom || [];
    faolImtihonlar = imtihonlarXom || [];
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">📋 Nazariy imtihon arizalari</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Adminlar yuborgan, hujjati hali tasdiqlanmagan talabalar (Imtihon turi: Nazariy yoki Nazariy+Amaliy).
          Hujjat tayyor deb belgilangach — avtomatik "Talabalar" bo'limiga o'tadi.
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

      <p className="text-sm text-slate-500">
        <span className="font-semibold text-slate-700">{royxat.length}</span> ta ariza kutilmoqda
      </p>

      <YangiTalabaArizaRoyxati
        royxat={royxat}
        error={error}
        sabablar={sabablar}
        radEtishRuxsat={radEtishRuxsat}
        imtihonlar={faolImtihonlar}
        ommaviyTasdiqRuxsat={radEtishRuxsat}
        ommaviyOchirishRuxsat={profile.role === "superadmin"}
      />

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
    </div>
  );
}
