import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import { redirect } from "next/navigation";
import YangiTalabaForm from "./YangiTalabaForm";

export default async function YangiTalabaSahifa() {
  const { user, profile, supabase } = await joriyFoydalanuvchi();

  if (!rolgaRuxsat(profile, ["admin", "hujjatchi", "superadmin"])) {
    redirect("/talabalar");
  }

  const [{ data: filiallar }, { data: oqituvchilarXom }, { data: oqFiliallar }] = await Promise.all([
    supabase.from("filiallar").select("id, nomi").eq("faol", true).order("nomi"),
    supabase.from("oqituvchilar").select("id, ism_familya, turi").eq("faol", true).order("ism_familya"),
    supabase.from("oqituvchi_filiallar").select("oqituvchi_id, filial_id"),
  ]);

  const filiallarMap = new Map();
  for (const of_ of oqFiliallar || []) {
    if (!filiallarMap.has(of_.oqituvchi_id)) filiallarMap.set(of_.oqituvchi_id, []);
    filiallarMap.get(of_.oqituvchi_id).push(of_.filial_id);
  }
  const oqituvchilar = (oqituvchilarXom || []).map((o) => ({
    ...o,
    filiallar: filiallarMap.get(o.id) || [],
  }));

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
        oqituvchilar={oqituvchilar}
      />
    </div>
  );
}
