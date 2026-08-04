import { notFound, redirect } from "next/navigation";
import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import ImtihonTafsilotClient from "./ImtihonTafsilotClient";

const URINISH_SELECT = `
  id, talaba_id, nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija,
  nazariy_sabab_id, amaliy_sabab_id, nazariy_urinish_raqami, amaliy_urinish_raqami,
  talabalar!inner(
    id, ism_familya, toifa, intalim_id,
    filiallar(nomi), guruhlar(nomi),
    nazariy_oqituvchilar:oqituvchilar!nazariy_oqituvchi_id(ism_familya)
  )
`;

export default async function ImtihonTafsilotSahifa({ params }) {
  const { profile, supabase } = await joriyFoydalanuvchi();

  if (!rolgaRuxsat(profile, ["hujjatchi", "imtihonchi", "superadmin"])) {
    redirect("/dashboard");
  }

  const [
    { data: imtihon, error: imtihonXato },
    { data: urinishlar },
    { data: sabablar },
    { data: oqituvchilar },
    { data: aktivImtihonlar },
  ] = await Promise.all([
    supabase.from("imtihonlar").select("id, sana, izoh, holati, boshlangan_vaqt, yakunlangan_vaqt").eq("id", params.id).single(),
    supabase
      .from("talaba_imtihonlar")
      .select(URINISH_SELECT)
      .eq("imtihon_id", params.id)
      .order("ism_familya", { foreignTable: "talabalar" }),
    supabase.from("sabablar").select("id, matn").eq("faol", true).order("created_at"),
    supabase.from("oqituvchilar").select("id, ism_familya, turi").eq("faol", true).order("ism_familya"),
    // Amaliyga o'tkazishda talabani QAYSI imtihonga biriktirish kerakligini
    // tanlash uchun — hozirgi vaqtda "aktiv" (hali yakunlanmagan) barcha
    // imtihonlar ro'yxati.
    supabase
      .from("imtihonlar")
      .select("id, sana, izoh, holati")
      .in("holati", ["boshlanmagan", "boshlangan"])
      .order("sana", { ascending: false }),
  ]);

  if (imtihonXato || !imtihon) notFound();

  return (
    <ImtihonTafsilotClient
      imtihon={imtihon}
      boshlangichUrinishlar={urinishlar || []}
      natijaBelgilashRuxsat={["imtihonchi", "superadmin"].includes(profile.role)}
      biriktirishRuxsat={["hujjatchi", "superadmin", "imtihonchi"].includes(profile.role)}
      holatBoshqarishRuxsat={["imtihonchi", "hujjatchi", "superadmin"].includes(profile.role)}
      superadminMi={profile.role === "superadmin"}
      oqituvchilar={oqituvchilar || []}
      sabablar={sabablar || []}
      aktivImtihonlar={aktivImtihonlar || []}
    />
  );
}
