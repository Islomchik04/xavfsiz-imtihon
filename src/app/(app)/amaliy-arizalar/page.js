import { redirect } from "next/navigation";
import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import ArizaRoyxati from "./ArizaRoyxati";

// Filial adminlari nazariydan o'tgan talabalarini amaliy imtihonga yuborish
// uchun ariza qoldiradi (talabalar/[id] sahifasidan, amaliy_ariza_yuborish
// RPC'si orqali). Bu yerda faqat Hujjatchi/Imtihonchi/Superadmin ko'radi va
// tasdiqlaydi/rad etadi (amaliy_arizani_tasdiqlash / _rad_etish RPC'lari).
export default async function AmaliyArizalarSahifa({ searchParams }) {
  const { profile, supabase } = await joriyFoydalanuvchi();

  if (!rolgaRuxsat(profile, ["hujjatchi", "imtihonchi", "superadmin"])) {
    redirect("/dashboard");
  }

  const filialFiltr = searchParams?.filial || "";

  const { data: filiallar } = await supabase
    .from("filiallar")
    .select("id, nomi")
    .eq("faol", true)
    .order("nomi");

  let so_rov = supabase
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
  if (filialFiltr) so_rov = so_rov.eq("talabalar.filial_id", filialFiltr);

  const [{ data: amaliyArizalar }, { data: aktivImtihonlar }] = await Promise.all([
    so_rov,
    supabase
      .from("imtihonlar")
      .select("id, sana, izoh, holati")
      .in("holati", ["boshlanmagan", "boshlangan"])
      .order("sana", { ascending: false }),
  ]);

  const royxat = amaliyArizalar || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">🚗 Amaliy imtihon arizalari</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Filial adminlari nazariydan o'tgan talabalarni amaliy imtihonga yuborish uchun qoldirgan so'rovlari —{" "}
          <span className="font-semibold text-slate-700">{royxat.length}</span> ta kutilmoqda.
        </p>
      </div>

      <form className="card flex flex-wrap gap-3 items-end" method="get">
        <div className="min-w-[200px]">
          <label className="label">Filial</label>
          <select className="input" name="filial" defaultValue={filialFiltr}>
            <option value="">Barchasi</option>
            {(filiallar || []).map((f) => (
              <option key={f.id} value={f.id}>{f.nomi}</option>
            ))}
          </select>
        </div>
        <button className="btn-secondary" type="submit">Filtrlash</button>
      </form>

      <ArizaRoyxati arizalar={royxat} aktivImtihonlar={aktivImtihonlar || []} />
    </div>
  );
}
