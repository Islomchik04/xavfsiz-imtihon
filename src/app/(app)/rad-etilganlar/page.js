import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import { TOIFALAR } from "@/lib/constants";
import RadEtilganArizalarRoyxati from "@/components/RadEtilganArizalarRoyxati";
import AutoQidiruvFormi from "@/components/AutoQidiruvFormi";

// Barcha rad etilgan talaba arizalari — bitta joyda, hammaga (superadmin,
// admin, hujjatchi, imtihonchi) ko'rinadi. Avval bu ro'yxat faqat
// /arizalar sahifasining pastida, faqat hujjatchi/superadmin uchun
// ko'rinardi — endi mustaqil menyu sifatida, /arizalar'dagi kabi
// imtihon_turi bo'yicha cheklovsiz (amaliy talabalar ham shu yerga
// chiqadi, chunki ularni ham talaba profilidan rad etish mumkin).
const RAD_ETILGAN_SELECT = `
  id, ism_familya, telefon, intalim_id, toifa, imtihon_turi, rad_izoh, rad_vaqt,
  filiallar(id, nomi), guruhlar(nomi),
  rad_sabab:sabablar!rad_sabab_id(matn),
  rad_etgan_profil:profiles!rad_etgan(ism_familya)
`;

export default async function RadEtilganlarSahifa({ searchParams }) {
  const { profile, supabase } = await joriyFoydalanuvchi();
  const q = searchParams?.q?.trim() || "";
  const toifaFiltr = searchParams?.toifa || "";
  const filialFiltr = searchParams?.filial || "";

  let so_rov = supabase
    .from("talabalar")
    .select(RAD_ETILGAN_SELECT)
    .eq("arxivlangan", false)
    .eq("rad_etildi", true)
    .order("rad_vaqt", { ascending: false });
  if (q) so_rov = so_rov.or(`ism_familya.ilike.%${q}%,intalim_id.ilike.%${q}%`);
  if (toifaFiltr) so_rov = so_rov.eq("toifa", toifaFiltr);
  if (filialFiltr) so_rov = so_rov.eq("filial_id", filialFiltr);

  const { data: royxatXom, error } = await so_rov.limit(300);
  const royxat = royxatXom || [];

  // Filial bo'yicha filtr — Admin RLS orqali baribir faqat o'z filialini
  // ko'radi (dropdown baribir zararsiz), boshqa rollar barcha filiallarni.
  const { data: filiallar } = await supabase.from("filiallar").select("id, nomi").eq("faol", true).order("nomi");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">🚫 Rad etilgan arizalar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Hujjatchi (yoki superadmin) tomonidan rad etilgan barcha talaba arizalari.
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
        <button className="btn-secondary" type="submit">Qidirish</button>
      </AutoQidiruvFormi>

      <p className="text-sm text-slate-500">
        <span className="font-semibold text-slate-700">{royxat.length}</span> ta rad etilgan ariza
      </p>

      {error ? (
        <div className="card text-sm text-rose-600">Xatolik: {error.message}</div>
      ) : (
        <RadEtilganArizalarRoyxati royxat={royxat} qaytarishRuxsat={rolgaRuxsat(profile, ["superadmin"])} />
      )}
    </div>
  );
}
