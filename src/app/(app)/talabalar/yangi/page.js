import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import { redirect } from "next/navigation";
import YangiTalabaForm from "./YangiTalabaForm";

export default async function YangiTalabaSahifa() {
  const { user, profile, supabase } = await joriyFoydalanuvchi();

  if (!rolgaRuxsat(profile, ["admin", "superadmin"])) {
    redirect("/talabalar");
  }

  const [{ data: filiallar }, { data: guruhlar }, { data: oqituvchilar }] = await Promise.all([
    supabase.from("filiallar").select("id, nomi").eq("faol", true).order("nomi"),
    supabase.from("guruhlar").select("id, nomi, filial_id").eq("faol", true).order("nomi"),
    supabase
      .from("oqituvchilar")
      .select("id, ism_familya, turi, filial_id")
      .eq("faol", true)
      .order("ism_familya"),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-slate-800 mb-1">Yangi talaba ro'yxatga olish</h1>
      <p className="text-sm text-slate-500 mb-5">
        Imtihonga boradigan talaba ma'lumotlarini kiriting. Bu ma'lumot Hujjatchiga tekshirish uchun yuboriladi.
      </p>
      <YangiTalabaForm
        foydalanuvchiId={user.id}
        profile={profile}
        filiallar={filiallar || []}
        guruhlar={guruhlar || []}
        oqituvchilar={oqituvchilar || []}
      />
    </div>
  );
}
