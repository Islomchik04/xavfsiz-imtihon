import Link from "next/link";
import Badge from "@/components/Badge";
import { IMTIHON_TURI, TOIFALAR } from "@/lib/constants";
import { telefonKorinishi } from "@/lib/telefon";

// "Yangi talaba" orqali qo'shilgan, lekin hujjatchi hali hujjatini tayyor
// deb belgilamagan talabalar ro'yxati — jadval (kompyuter) va kartochka
// (telefon) ko'rinishida. Ikkalasi ham (Nazariy imtihon arizalari va
// Amaliy imtihon arizalari sahifalari) shu bir xil ko'rinishni ishlatadi,
// faqat qaysi imtihon_turi bilan filtrlanganiga qarab ro'yxat farq qiladi.
export default function YangiTalabaArizaRoyxati({ royxat, error }) {
  return (
    <>
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
    </>
  );
}
