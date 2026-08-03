import { redirect } from "next/navigation";
import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import ImtihonlarClient from "./ImtihonlarClient";

export default async function ImtihonlarSahifa() {
  const { user, profile, supabase } = await joriyFoydalanuvchi();

  if (!rolgaRuxsat(profile, ["hujjatchi", "imtihonchi", "superadmin"])) {
    redirect("/dashboard");
  }

  const [{ data: imtihonlar }, { data: urinishlar }] = await Promise.all([
    supabase
      .from("imtihonlar")
      .select("id, sana, izoh, holati, created_at, yaratgan_profil:profiles!yaratgan(ism_familya)")
      .order("sana", { ascending: false }),
    supabase
      .from("talaba_imtihonlar")
      .select("imtihon_id, nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija"),
  ]);

  return (
    <ImtihonlarClient
      foydalanuvchiId={user.id}
      rol={profile.role}
      imtihonlar={imtihonlar || []}
      urinishlar={urinishlar || []}
    />
  );
}
