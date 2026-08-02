import { redirect } from "next/navigation";
import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import SozlamalarClient from "./SozlamalarClient";

export default async function SozlamalarSahifa() {
  const { profile, supabase } = await joriyFoydalanuvchi();

  if (!rolgaRuxsat(profile, ["superadmin"])) {
    redirect("/dashboard");
  }

  const [{ data: filiallar }, { data: guruhlar }, { data: oqituvchilar }, { data: foydalanuvchilar }] =
    await Promise.all([
      supabase.from("filiallar").select("id, nomi, faol").order("nomi"),
      supabase.from("guruhlar").select("id, nomi, filial_id, faol, filiallar(nomi)").order("nomi"),
      supabase
        .from("oqituvchilar")
        .select("id, ism_familya, turi, filial_id, faol, filiallar(nomi)")
        .order("ism_familya"),
      supabase.from("profiles").select("id, telefon, ism_familya, role, filial_id, faol, filiallar(nomi)").order("ism_familya"),
    ]);

  return (
    <SozlamalarClient
      boshlangichFiliallar={filiallar || []}
      boshlangichGuruhlar={guruhlar || []}
      boshlangichOqituvchilar={oqituvchilar || []}
      boshlangichFoydalanuvchilar={foydalanuvchilar || []}
    />
  );
}
