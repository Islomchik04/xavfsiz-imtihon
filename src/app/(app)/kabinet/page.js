import { redirect } from "next/navigation";
import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import KabinetClient from "./KabinetClient";

const TALABA_SELECT = `
  id, ism_familya, nazariy_oqituvchi_id, amaliy_oqituvchi_id,
  filiallar(nomi), guruhlar(nomi)
`;

const URINISH_SELECT = `
  talaba_id, nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija, created_at,
  imtihonlar(sana),
  talabalar(nazariy_oqituvchi_id, amaliy_oqituvchi_id, toifa)
`;

// O'qituvchi kabineti — faqat 'oqituvchi' roli uchun. RLS talabalar va
// talaba_imtihonlar'ni allaqachon shu o'qituvchiga tegishli qatorlargacha
// cheklab beradi (joriy_oqituvchi() orqali), shu sabab bu yerda qo'shimcha
// filtrlashning hojati yo'q.
export default async function KabinetSahifa() {
  const { profile, supabase } = await joriyFoydalanuvchi();

  if (profile.role !== "oqituvchi") {
    redirect("/dashboard");
  }

  const [{ data: oqituvchi }, { data: talabalar }, { data: urinishlar }] = await Promise.all([
    supabase.from("oqituvchilar").select("id, ism_familya, turi").eq("id", profile.oqituvchi_id).single(),
    supabase.from("talabalar").select(TALABA_SELECT),
    supabase.from("talaba_imtihonlar").select(URINISH_SELECT),
  ]);

  return (
    <KabinetClient
      oqituvchi={oqituvchi}
      talabalar={talabalar || []}
      urinishlar={urinishlar || []}
    />
  );
}
