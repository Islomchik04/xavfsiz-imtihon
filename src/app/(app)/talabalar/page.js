import Link from "next/link";
import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import Badge from "@/components/Badge";
import { IMTIHON_TURI, NATIJA } from "@/lib/constants";

const TALABA_SELECT = `
  id, ism_familya, imtihon_turi, forma_083, hujjat_tayyor, imtihon_sanasi,
  nazariy_natija, amaliy_natija,
  filiallar(id, nomi), guruhlar(nomi)
`;

export default async function TalabalarSahifa({ searchParams }) {
  const { profile, supabase } = await joriyFoydalanuvchi();
  const q = searchParams?.q?.trim() || "";
  const holat = searchParams?.holat || "";

  let so_rov = supabase.from("talabalar").select(TALABA_SELECT).order("created_at", { ascending: false });

  if (q) so_rov = so_rov.ilike("ism_familya", `%${q}%`);
  if (holat === "kutilmoqda") so_rov = so_rov.eq("hujjat_tayyor", false);
  if (holat === "tayyor") so_rov = so_rov.eq("hujjat_tayyor", true);

  const { data: talabalar, error } = await so_rov.limit(300);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Talabalar</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {profile.role === "admin"
              ? `${profile.filiallar?.nomi || ""} filiali`
              : "Barcha filiallar"}
          </p>
        </div>
        {["admin", "superadmin"].includes(profile.role) && (
          <Link href="/talabalar/yangi" className="btn-primary">
            + Yangi talaba
          </Link>
        )}
      </div>

      <form className="card flex flex-wrap gap-3 items-end" method="get">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Ism familya bo'yicha qidirish</label>
          <input className="input" type="text" name="q" defaultValue={q} placeholder="Masalan: Aliyev Vali" />
        </div>
        <div className="min-w-[180px]">
          <label className="label">Holat</label>
          <select className="input" name="holat" defaultValue={holat}>
            <option value="">Barchasi</option>
            <option value="kutilmoqda">Hujjat kutilmoqda</option>
            <option value="tayyor">Hujjat tayyor</option>
          </select>
        </div>
        <button className="btn-secondary" type="submit">Qidirish</button>
      </form>

      {error && <div className="card text-rose-600">Xatolik: {error.message}</div>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="pb-2 font-medium">Ism familya</th>
              <th className="pb-2 font-medium">Filial / Guruh</th>
              <th className="pb-2 font-medium">Imtihon turi</th>
              <th className="pb-2 font-medium">083 forma</th>
              <th className="pb-2 font-medium">Hujjat</th>
              <th className="pb-2 font-medium">Natija</th>
              <th className="pb-2 font-medium">Sana</th>
            </tr>
          </thead>
          <tbody>
            {(talabalar || []).map((t) => (
              <tr
                key={t.id}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer"
              >
                <td className="py-2.5">
                  <Link href={`/talabalar/${t.id}`} className="font-medium text-brand-700 hover:underline">
                    {t.ism_familya}
                  </Link>
                </td>
                <td className="py-2.5 text-slate-500">
                  {t.filiallar?.nomi} / {t.guruhlar?.nomi}
                </td>
                <td className="py-2.5 text-slate-500">{IMTIHON_TURI[t.imtihon_turi]}</td>
                <td className="py-2.5">
                  <Badge ton={t.forma_083 ? "emerald" : "slate"}>{t.forma_083 ? "Ha" : "Yo'q"}</Badge>
                </td>
                <td className="py-2.5">
                  <Badge ton={t.hujjat_tayyor ? "emerald" : "amber"}>
                    {t.hujjat_tayyor ? "Tayyor" : "Kutilmoqda"}
                  </Badge>
                </td>
                <td className="py-2.5">
                  <div className="flex flex-col gap-1">
                    {t.imtihon_turi !== "amaliy" && (
                      <Badge ton={t.nazariy_natija === "otdi" ? "emerald" : t.nazariy_natija === "otmadi" ? "rose" : "slate"}>
                        Nazariy: {NATIJA[t.nazariy_natija]}
                      </Badge>
                    )}
                    {t.imtihon_turi !== "nazariy" && (
                      <Badge ton={t.amaliy_natija === "otdi" ? "emerald" : t.amaliy_natija === "otmadi" ? "rose" : "slate"}>
                        Amaliy: {NATIJA[t.amaliy_natija]}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="py-2.5 text-slate-500">{t.imtihon_sanasi || "—"}</td>
              </tr>
            ))}
            {(talabalar || []).length === 0 && !error && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Hech narsa topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
