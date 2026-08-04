import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import HisobotlarClient from "./HisobotlarClient";

const URINISH_SELECT = `
  nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija,
  imtihonlar(id, sana, izoh),
  talabalar(
    filial_id, filiallar(nomi), toifa,
    nazariy_oqituvchi_id,
    nazariy_oqituvchilar:oqituvchilar!nazariy_oqituvchi_id(ism_familya)
  )
`;

export default async function HisobotlarSahifa({ searchParams }) {
  const { supabase } = await joriyFoydalanuvchi();

  const { data: urinishlar, error } = await supabase.from("talaba_imtihonlar").select(URINISH_SELECT);

  if (error) {
    return <div className="card text-rose-600">Ma'lumotlarni yuklashda xatolik: {error.message}</div>;
  }

  return (
    <HisobotlarClient urinishlar={urinishlar || []} boshlangichImtihonId={searchParams?.imtihon || ""} />
  );
}
