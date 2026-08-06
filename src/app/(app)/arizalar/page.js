import Link from "next/link";
import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import Badge from "@/components/Badge";
import { IMTIHON_TURI, TOIFALAR } from "@/lib/constants";
import { telefonKorinishi } from "@/lib/telefon";

// Adminlar (yoki hujjatchi/superadmin) tomonidan "Yangi talaba" orqali
// qo'shilgan, lekin hujjatchi hali hujjatini tayyor deb belgilamagan
// talabalar shu yerda — "ariza" sifatida — turadi. Hujjatchi
// /talabalar/[id] sahifasida "Hujjat holati" bo'limidan hujjatni tayyor deb
// belgilagach, talaba shu ro'yxatdan avtomatik chiqib "Talabalar"
// bo'limiga o'tadi (talabalar/page.js hujjat_tayyor=true filtri orqali).
const TALABA_SELECT = `
  id, ism_familya, telefon, intalim_id, toifa, imtihon_turi, created_at,
  filiallar(id, nomi), guruhlar(nomi),
  qoshgan_profil:profiles!qoshgan(ism_familya)
`;

export default async function ArizalarSahifa({ searchParams }) {
  const { profile, supabase } = await joriyFoydalanuvchi();
  const q = searchParams?.q?.trim() || "";
  const toifaFiltr = searchParams?.toifa || "";

  let so_rov = supabase
    .from("talabalar")
    .select(TALABA_SELECT)
    .eq("arxivlangan", false)
    .eq("hujjat_tayyor", false)
    .order("created_at", { ascending: false });
  if (q) so_rov = so_rov.or(`ism_familya.ilike.%${q}%,intalim_id.ilike.%${q}%`);
  if (toifaFiltr) so_rov = so_rov.eq("toifa", toifaFiltr);

  const { data: royxatXom, error } = await so_rov.limit(300);
  const royxat = royxatXom || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">📝 Arizalar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Adminlar yuborgan, hujjati hali tasdiqlanmagan talabalar. Hujjat tayyor deb belgilangach —
          avtomatik "Talabalar" bo'limiga o'tadi.
        </p>
      </div>

      <form className="card flex flex-wrap gap-3 items-end" method="get">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Ism familya yoki Int'alim ID bo'yicha qidirish</label>
          <input className="input" type="text" name="q" defaultValue={q} placeholder="Masalan: Aliyev Vali yoki 1234567" />
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

      <p className="text-sm text-slate-500">
        <span className="font-semibold text-slate-700">{royxat.length}</span> ta ariza kutilmoqda
      </p>

      {error && <div className="card text-rose-600">Xatolik: {error.message}</div>}

      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="pb-2 font-medium">Ism familya</th>
              <th className="pb-2 font-medium">Telefon</th>
              <th className="pb-2 font-medium">Toifa</th>
              <th className="pb-2 font-medium">Filial / Guruh</th>
              <th className="pb-2 font-medium">Imtihon turi</th>
              <th className="pb-2 font-medium">Yuborgan</th>
              <th className="pb-2 font-medium">Sana</th>
            </tr>
          </thead>
          <tbody>
            {royxat.map((t) => (
              <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="py-2.5">
                  <Link href={`/talabalar/${t.id}`} className="font-medium text-brand-700 hover:underline">
                    {t.ism_familya}
                  </Link>
                  {t.intalim_id && <div className="text-xs text-slate-400">ID: {t.intalim_id}</div>}
                </td>
                <td className="py-2.5 text-slate-500">
                  {t.telefon ? (
                    <a href={`tel:+998${t.telefon}`} className="text-brand-600 hover:underline">
                      +998 {telefonKorinishi(t.telefon)}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2.5">
                  <span className="badge bg-slate-100 text-slate-600">{TOIFALAR[t.toifa] || "—"}</span>
                </td>
                <td className="py-2.5 text-slate-500">
                  {t.filiallar?.nomi} / {t.guruhlar?.nomi}
                </td>
                <td className="py-2.5 text-slate-500">{IMTIHON_TURI[t.imtihon_turi]}</td>
                <td className="py-2.5 text-slate-500">{t.qoshgan_profil?.ism_familya || "—"}</td>
                <td className="py-2.5 text-slate-400 text-xs">
                  {new Date(t.created_at).toLocaleDateString("uz-UZ")}
                </td>
              </tr>
            ))}
            {royxat.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Hozircha ariza yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3 xi-stagger">
        {royxat.length === 0 && !error && (
          <div className="card text-center text-slate-400">Hozircha ariza yo'q</div>
        )}
        {royxat.map((t) => (
          <Link key={t.id} href={`/talabalar/${t.id}`} className="card block active:scale-[0.98] transition-transform">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="font-semibold text-brand-700">{t.ism_familya}</div>
                {t.intalim_id && <div className="text-xs text-slate-400">ID: {t.intalim_id}</div>}
              </div>
              <Badge ton="amber">Hujjat kutilmoqda</Badge>
            </div>
            <div className="text-xs text-slate-400 mb-2">
              {TOIFALAR[t.toifa] || "—"} · {t.filiallar?.nomi} / {t.guruhlar?.nomi} · {IMTIHON_TURI[t.imtihon_turi]}
            </div>
            {t.telefon && (
              <div className="text-xs text-slate-500 mb-2">📞 +998 {telefonKorinishi(t.telefon)}</div>
            )}
            <div className="text-xs text-slate-400">
              Yuborgan: {t.qoshgan_profil?.ism_familya || "—"} · {new Date(t.created_at).toLocaleDateString("uz-UZ")}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
