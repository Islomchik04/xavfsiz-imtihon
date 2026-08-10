import Link from "next/link";
import { redirect } from "next/navigation";
import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import MustaqilArizaKartochka from "./MustaqilArizaKartochka";

// Telegram bot orqali domlalar yuborgan, o'zi mustaqil imtihon topshirgan
// o'quvchilar uchun KPI so'rovlari — Hujjatchi/Superadmin ko'radi.
// Ikkita bo'lim: "Arizalar" (hali ko'rib chiqilmagan) va "Tasdiqlanganlar"
// (KPI allaqachon yozilgan tarix).
export default async function MustaqilImtihonchilarSahifa({ searchParams }) {
  const { profile, supabase } = await joriyFoydalanuvchi();

  if (!rolgaRuxsat(profile, ["hujjatchi", "superadmin"])) {
    redirect("/dashboard");
  }

  const tab = searchParams?.tab === "tasdiqlanganlar" ? "tasdiqlanganlar" : "arizalar";
  const holat = tab === "tasdiqlanganlar" ? "tasdiqlangan" : "kutilmoqda";

  const { data: erkinData } = await supabase
    .from("erkin_talaba_arizalari")
    .select(`
      id, ism_familya, telefon, urinish_raqami, izoh, rasm_yoli, holati, created_at, korib_chiqqan_vaqt,
      oqituvchilar(ism_familya)
    `)
    .eq("holati", holat)
    .order(tab === "tasdiqlanganlar" ? "korib_chiqqan_vaqt" : "created_at", { ascending: false })
    .limit(200);

  const arizalar = await Promise.all(
    (erkinData || []).map(async (a) => {
      if (!a.rasm_yoli) return { ...a, rasmUrl: null };
      const { data: imza } = await supabase.storage.from("erkin-fotolar").createSignedUrl(a.rasm_yoli, 3600);
      return { ...a, rasmUrl: imza?.signedUrl || null };
    })
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">📷 Mustaqil imtihonchilar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Telegram bot orqali domlalar yuborgan, o'zi mustaqil imtihon topshirgan o'quvchilar uchun KPI so'rovlari.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <Link
          href="/mustaqil-imtihonchilar?tab=arizalar"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
            tab === "arizalar" ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Arizalar
        </Link>
        <Link
          href="/mustaqil-imtihonchilar?tab=tasdiqlanganlar"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
            tab === "tasdiqlanganlar" ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Tasdiqlanganlar
        </Link>
      </div>

      {arizalar.length === 0 ? (
        <div className="card text-sm text-slate-400">
          {tab === "arizalar" ? "Hozircha so'rov yo'q." : "Hali tasdiqlangan so'rov yo'q."}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 xi-stagger">
          {arizalar.map((a) => (
            <MustaqilArizaKartochka key={a.id} ariza={a} />
          ))}
        </div>
      )}
    </div>
  );
}
