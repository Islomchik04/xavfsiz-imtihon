import { redirect } from "next/navigation";
import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import SozlamalarClient from "./SozlamalarClient";

export default async function SozlamalarSahifa() {
  const { profile, supabase } = await joriyFoydalanuvchi();

  if (!rolgaRuxsat(profile, ["superadmin"])) {
    redirect("/dashboard");
  }

  const [
    { data: filiallar },
    { data: guruhlar },
    { data: oqituvchilarXom },
    { data: oqFiliallar },
    { data: foydalanuvchilar },
  ] = await Promise.all([
    supabase.from("filiallar").select("id, nomi, faol").order("nomi"),
    supabase.from("guruhlar").select("id, nomi, filial_id, faol, filiallar(nomi)").order("nomi"),
    supabase.from("oqituvchilar").select("id, ism_familya, turi, faol").order("ism_familya"),
    supabase.from("oqituvchi_filiallar").select("oqituvchi_id, filial_id"),
    supabase.from("profiles").select("id, telefon, ism_familya, role, filial_id, faol, filiallar(nomi)").order("ism_familya"),
  ]);

  const filialMap = new Map();
  for (const of_ of oqFiliallar || []) {
    if (!filialMap.has(of_.oqituvchi_id)) filialMap.set(of_.oqituvchi_id, []);
    filialMap.get(of_.oqituvchi_id).push(of_.filial_id);
  }
  const oqituvchilar = (oqituvchilarXom || []).map((o) => ({
    ...o,
    filial_idlar: filialMap.get(o.id) || [],
  }));

  return (
    <SozlamalarClient
      boshlangichFiliallar={filiallar || []}
      boshlangichGuruhlar={guruhlar || []}
      boshlangichOqituvchilar={oqituvchilar}
      boshlangichFoydalanuvchilar={foydalanuvchilar || []}
    />
  );
}
