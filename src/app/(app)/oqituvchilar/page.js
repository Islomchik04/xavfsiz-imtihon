import { redirect } from "next/navigation";
import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import OqituvchilarClient from "./OqituvchilarClient";

// Filial admini uchun — faqat o'z filialiga bog'liq o'qituvchilarni
// ko'radi/boshqaradi (admin_oqituvchi_* RPC'lari orqali — qarang:
// 0026_filial_admin_oqituvchilar.sql). Superadmin uchun bu bo'lim emas —
// u hamma o'qituvchini Sozlamalar > O'qituvchilar orqali boshqaradi.
export default async function OqituvchilarSahifa() {
  const { profile, supabase } = await joriyFoydalanuvchi();

  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: bogliqlar } = await supabase
    .from("oqituvchi_filiallar")
    .select("oqituvchi_id")
    .eq("filial_id", profile.filial_id);
  const idlar = (bogliqlar || []).map((b) => b.oqituvchi_id);

  let oqituvchilar = [];
  if (idlar.length > 0) {
    const { data } = await supabase
      .from("oqituvchilar")
      .select("id, ism_familya, turi, telefon, faol, created_at")
      .in("id", idlar)
      .order("ism_familya");
    oqituvchilar = data || [];
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">O'qituvchilar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {profile.filiallar?.nomi ? `${profile.filiallar.nomi} filiali` : "Sizning filialingiz"} bo'yicha o'qituvchilar
        </p>
      </div>
      <OqituvchilarClient boshlangichOqituvchilar={oqituvchilar} />
    </div>
  );
}
