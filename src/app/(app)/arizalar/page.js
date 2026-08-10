import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import { TOIFALAR } from "@/lib/constants";
import YangiTalabaArizaRoyxati from "@/components/YangiTalabaArizaRoyxati";

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
  qoshgan_profil:profiles!qoshgan(ism_familya)
`;

export default async function ArizalarSahifa({ searchParams }) {
  const { supabase } = await joriyFoydalanuvchi();
  const q = searchParams?.q?.trim() || "";
  const toifaFiltr = searchParams?.toifa || "";
  const filialFiltr = searchParams?.filial || "";

  let so_rov = supabase
    .from("talabalar")
    .select(TALABA_SELECT)
    .eq("arxivlangan", false)
    .eq("hujjat_tayyor", false)
    .neq("imtihon_turi", "amaliy")
    .order("created_at", { ascending: false });
  if (q) so_rov = so_rov.or(`ism_familya.ilike.%${q}%,intalim_id.ilike.%${q}%`);
  if (toifaFiltr) so_rov = so_rov.eq("toifa", toifaFiltr);
  if (filialFiltr) so_rov = so_rov.eq("filial_id", filialFiltr);

  const { data: royxatXom, error } = await so_rov.limit(300);
  const royxat = royxatXom || [];

  // Filial bo'yicha filtr qilish uchun — Hujjatchi/superadmin barcha
  // filiallarni ko'radi, Admin RLS orqali baribir faqat o'z filialini
  // ko'radi (dropdown baribir zararsiz).
  const { data: filiallar } = await supabase
    .from("filiallar")
    .select("id, nomi")
    .eq("faol", true)
    .order("nomi");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">📋 Nazariy imtihon arizalari</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Adminlar yuborgan, hujjati hali tasdiqlanmagan talabalar (Imtihon turi: Nazariy yoki Nazariy+Amaliy).
          Hujjat tayyor deb belgilangach — avtomatik "Talabalar" bo'limiga o'tadi.
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

      <p className="text-sm text-slate-500">
        <span className="font-semibold text-slate-700">{royxat.length}</span> ta ariza kutilmoqda
      </p>

      <YangiTalabaArizaRoyxati royxat={royxat} error={error} />
    </div>
  );
}
