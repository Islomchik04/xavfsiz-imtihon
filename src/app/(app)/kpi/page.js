import { redirect } from "next/navigation";
import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import KpiClient from "./KpiClient";

const URINISH_SELECT = `
  talaba_id, nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija, created_at,
  nazariy_oqituvchi_id, amaliy_oqituvchi_id,
  imtihonlar(sana),
  talabalar(toifa)
`;

export default async function KpiSahifa() {
  const { profile, supabase } = await joriyFoydalanuvchi();

  if (!rolgaRuxsat(profile, ["superadmin"])) {
    redirect("/dashboard");
  }

  const [{ data: urinishlar, error }, { data: oqituvchilar }] = await Promise.all([
    supabase.from("talaba_imtihonlar").select(URINISH_SELECT),
    supabase.from("oqituvchilar").select("id, ism_familya, turi").eq("faol", true),
  ]);

  if (error) {
    return <div className="card text-rose-600">Ma'lumotlarni yuklashda xatolik: {error.message}</div>;
  }

  return <KpiClient urinishlar={urinishlar || []} oqituvchilar={oqituvchilar || []} />;
}
