import { redirect } from "next/navigation";
import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import TalabaImportClient from "./TalabaImportClient";

export default async function TalabaImportSahifa() {
  const { profile, supabase } = await joriyFoydalanuvchi();

  if (!rolgaRuxsat(profile, ["admin", "hujjatchi", "superadmin"])) {
    redirect("/talabalar");
  }

  const markaziyRol = profile.role === "superadmin" || profile.role === "hujjatchi";
  const { data: filiallar } = markaziyRol
    ? await supabase.from("filiallar").select("id, nomi").eq("faol", true).order("nomi")
    : { data: null };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-slate-800 mb-1">Talabalarni Excel orqali import qilish</h1>
      <p className="text-sm text-slate-500 mb-5">
        Avval shablonni yuklab oling, uni to'ldiring, so'ng shu yerga qayta yuklang.
      </p>
      <TalabaImportClient
        profile={profile}
        filiallar={filiallar || []}
      />
    </div>
  );
}
