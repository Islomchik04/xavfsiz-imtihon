import { notFound, redirect } from "next/navigation";
import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import ImtihonTafsilotClient from "./ImtihonTafsilotClient";

const URINISH_SELECT = `
  id, nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija,
  nazariy_sabab_id, amaliy_sabab_id,
  talabalar!inner(
    id, ism_familya,
    filiallar(nomi), guruhlar(nomi),
    nazariy_oqituvchilar:oqituvchilar!nazariy_oqituvchi_id(ism_familya),
    amaliy_oqituvchilar:oqituvchilar!amaliy_oqituvchi_id(ism_familya)
  )
`;

export default async function ImtihonTafsilotSahifa({ params }) {
  const { profile, supabase } = await joriyFoydalanuvchi();

  if (!rolgaRuxsat(profile, ["hujjatchi", "imtihonchi", "superadmin"])) {
    redirect("/dashboard");
  }

  const [{ data: imtihon, error: imtihonXato }, { data: urinishlar }, { data: sabablar }] = await Promise.all([
    supabase.from("imtihonlar").select("id, sana, izoh").eq("id", params.id).single(),
    supabase
      .from("talaba_imtihonlar")
      .select(URINISH_SELECT)
      .eq("imtihon_id", params.id)
      .order("ism_familya", { foreignTable: "talabalar" }),
    supabase.from("sabablar").select("id, matn").eq("faol", true).order("created_at"),
  ]);

  if (imtihonXato || !imtihon) notFound();

  return (
    <ImtihonTafsilotClient
      imtihon={imtihon}
      boshlangichUrinishlar={urinishlar || []}
      natijaBelgilashRuxsat={["imtihonchi", "superadmin"].includes(profile.role)}
      sabablar={sabablar || []}
    />
  );
}
