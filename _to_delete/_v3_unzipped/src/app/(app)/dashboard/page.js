import { redirect } from "next/navigation";
import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import DashboardClient from "./DashboardClient";

const TALABA_SELECT = `id, hujjat_tayyor, filial_id, filiallar(nomi)`;

const URINISH_SELECT = `
  nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija,
  imtihonlar(id, sana),
  talabalar(
    filial_id, filiallar(nomi),
    nazariy_oqituvchi_id, amaliy_oqituvchi_id,
    nazariy_oqituvchilar:oqituvchilar!nazariy_oqituvchi_id(ism_familya),
    amaliy_oqituvchilar:oqituvchilar!amaliy_oqituvchi_id(ism_familya)
  )
`;

export default async function Dashboard() {
  const { profile, supabase } = await joriyFoydalanuvchi();

  if (profile.role === "oqituvchi") {
    redirect("/kabinet");
  }

  const [{ data: talabalar, error }, { data: urinishlar, error: urinishXato }] = await Promise.all([
    supabase.from("talabalar").select(TALABA_SELECT),
    supabase.from("talaba_imtihonlar").select(URINISH_SELECT),
  ]);

  if (error || urinishXato) {
    return (
      <div className="card text-rose-600">
        Ma'lumotlarni yuklashda xatolik: {(error || urinishXato).message}
      </div>
    );
  }

  const barchaFiliallarniKorish = ["superadmin", "hujjatchi", "imtihonchi"].includes(profile.role);

  return (
    <DashboardClient
      profile={profile}
      talabalar={talabalar || []}
      urinishlar={urinishlar || []}
      barchaFiliallarniKorish={barchaFiliallarniKorish}
    />
  );
}
