import Link from "next/link";
import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import Badge from "@/components/Badge";
import { IMTIHON_TURI, FORMA_083_LABEL, TALABA_HOLATI, TALABA_HOLATI_RANG, TOIFALAR } from "@/lib/constants";
import { talabaHolati, birUrinishdaOtganmi } from "@/lib/imtihonHisob";

const TALABA_SELECT = `
  id, ism_familya, toifa, imtihon_turi, forma_083, hujjat_tayyor, qarzdorlik, qarzdorlik_summasi,
  filiallar(id, nomi), guruhlar(nomi)
`;

export default async function TalabalarSahifa({ searchParams }) {
  const { profile, supabase } = await joriyFoydalanuvchi();
  const q = searchParams?.q?.trim() || "";
  const holatFiltr = searchParams?.holat || "";
  const toifaFiltr = searchParams?.toifa || "";

  let so_rov = supabase.from("talabalar").select(TALABA_SELECT).order("created_at", { ascending: false });
  if (q) so_rov = so_rov.ilike("ism_familya", `%${q}%`);
  if (toifaFiltr) so_rov = so_rov.eq("toifa", toifaFiltr);

  const { data: talabalarXom, error } = await so_rov.limit(300);
  const talabalar = talabalarXom || [];

  const idlar = talabalar.map((t) => t.id);
  let urinishlarMap = new Map();
  if (idlar.length > 0) {
    const { data: urinishlar } = await supabase
      .from("talaba_imtihonlar")
      .select("id, talaba_id, nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija, created_at")
      .in("talaba_id", idlar);
    for (const u of urinishlar || []) {
      if (!urinishlarMap.has(u.talaba_id)) urinishlarMap.set(u.talaba_id, []);
      urinishlarMap.get(u.talaba_id).push(u);
    }
  }

  let royxat = talabalar.map((t) => {
    const urinishlariT = urinishlarMap.get(t.id) || [];
    return {
      ...t,
      holat: talabaHolati(urinishlariT),
      birUrinishdaOtdi: birUrinishdaOtganmi(urinishlariT),
    };
  });
  if (holatFiltr === "bir_urinishda_otgan") {
    royxat = royxat.filter((t) => t.birUrinishdaOtdi);
  } else if (holatFiltr) {
    royxat = royxat.filter((t) => t.holat === holatFiltr);
  }

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
        {["admin", "hujjatchi", "superadmin"].includes(profile.role) && (
          <div className="flex gap-2">
            <Link href="/talabalar/import" className="btn-secondary">
              📊 Import
            </Link>
            <Link href="/talabalar/yangi" className="btn-primary">
              + Yangi talaba
            </Link>
          </div>
        )}
      </div>

      <form className="card flex flex-wrap gap-3 items-end" method="get">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Ism familya bo'yicha qidirish</label>
          <input className="input" type="text" name="q" defaultValue={q} placeholder="Masalan: Aliyev Vali" />
        </div>
        <div className="min-w-[200px]">
          <label className="label">Holat</label>
          <select className="input" name="holat" defaultValue={holatFiltr}>
            <option value="">Barchasi</option>
            <option value="hujjat_kutilmoqda">Hujjat kutilmoqda</option>
            <option value="imtihon_yoq">Imtihonga biriktirilmagan</option>
            <option value="kutilmoqda">Natija kutilmoqda</option>
            <option value="otdi">O'tdi</option>
            <option value="otmadi">O'tolmadi (qayta imtihon kerak)</option>
            <option value="kelmadi">Kelmadi (qayta imtihon kerak)</option>
            <option value="boshqa">Boshqa sabab (qayta imtihon kerak)</option>
            <option value="bir_urinishda_otgan">Bitta urinishda o'tganlar</option>
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="label">Toifa</label>
          <select className="input" name="toifa" defaultValue={toifaFiltr}>
            <option value="">Barchasi</option>
            {Object.entries(TOIFALAR).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <button className="btn-secondary" type="submit">Qidirish</button>
      </form>

      {error && <div className="card text-rose-600">Xatolik: {error.message}</div>}

      {/* Kompyuter/planshet: jadval ko'rinishi */}
      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="pb-2 font-medium">Ism familya</th>
              <th className="pb-2 font-medium">Toifa</th>
              <th className="pb-2 font-medium">Filial / Guruh</th>
              <th className="pb-2 font-medium">Imtihon turi</th>
              <th className="pb-2 font-medium">083 forma</th>
              <th className="pb-2 font-medium">Qarzdorlik</th>
              <th className="pb-2 font-medium">Holat</th>
            </tr>
          </thead>
          <tbody>
            {royxat.map((t) => (
              <tr
                key={t.id}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer"
              >
                <td className="py-2.5">
                  <Link href={`/talabalar/${t.id}`} className="font-medium text-brand-700 hover:underline">
                    {t.ism_familya}
                  </Link>
                </td>
                <td className="py-2.5">
                  <span className="badge bg-slate-100 text-slate-600">{TOIFALAR[t.toifa] || "—"}</span>
                </td>
                <td className="py-2.5 text-slate-500">
                  {t.filiallar?.nomi} / {t.guruhlar?.nomi}
                </td>
                <td className="py-2.5 text-slate-500">{IMTIHON_TURI[t.imtihon_turi]}</td>
                <td className="py-2.5">
                  <Badge ton={t.forma_083 ? "emerald" : "amber"}>{FORMA_083_LABEL[t.forma_083]}</Badge>
                </td>
                <td className="py-2.5">
                  <Badge ton={t.qarzdorlik ? "rose" : "emerald"}>
                    {t.qarzdorlik
                      ? `Bor${t.qarzdorlik_summasi != null ? ` (${Number(t.qarzdorlik_summasi).toLocaleString("uz-UZ")})` : ""}`
                      : "Yo'q"}
                  </Badge>
                </td>
                <td className="py-2.5">
                  <span className={`badge ${TALABA_HOLATI_RANG[t.holat]}`}>{TALABA_HOLATI[t.holat]}</span>
                </td>
              </tr>
            ))}
            {royxat.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Hech narsa topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Telefon: kartochka ro'yxati */}
      <div className="md:hidden space-y-3 xi-stagger">
        {royxat.length === 0 && !error && (
          <div className="card text-center text-slate-400">Hech narsa topilmadi</div>
        )}
        {royxat.map((t) => (
          <Link key={t.id} href={`/talabalar/${t.id}`} className="card block active:scale-[0.98] transition-transform">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-semibold text-brand-700">{t.ism_familya}</div>
              <Badge ton={t.forma_083 ? "emerald" : "amber"}>{FORMA_083_LABEL[t.forma_083]}</Badge>
            </div>
            <div className="text-xs text-slate-400 mb-2">
              {TOIFALAR[t.toifa] || "—"} · {t.filiallar?.nomi} / {t.guruhlar?.nomi} · {IMTIHON_TURI[t.imtihon_turi]}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className={`badge ${TALABA_HOLATI_RANG[t.holat]}`}>{TALABA_HOLATI[t.holat]}</span>
              {t.qarzdorlik && (
                <Badge ton="rose">
                  Qarz: {t.qarzdorlik_summasi != null ? Number(t.qarzdorlik_summasi).toLocaleString("uz-UZ") : "bor"}
                </Badge>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
