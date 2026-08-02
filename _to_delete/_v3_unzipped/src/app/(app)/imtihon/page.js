import { redirect } from "next/navigation";
import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import ImtihonQidiruv from "./ImtihonQidiruv";

export default async function ImtihonSahifa() {
  const { profile } = await joriyFoydalanuvchi();

  if (!rolgaRuxsat(profile, ["imtihonchi", "superadmin"])) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-slate-800 mb-1">Imtihon kunida qidiruv</h1>
      <p className="text-sm text-slate-500 mb-5">
        Talabaning ism familyasini kiriting va natijasini belgilang.
      </p>
      <ImtihonQidiruv />
    </div>
  );
}
