import Link from "next/link";
import { TOIFALAR } from "@/lib/constants";
import { telefonKorinishi } from "@/lib/telefon";
import QaytarishTugmasi from "@/components/QaytarishTugmasi";

// Rad etilgan (hujjatchi tomonidan) yangi talaba arizalari — faqat ko'rish
// uchun (sababi, izohi, kim va qachon rad etgani bilan). Superadmin
// "Qaytarish" orqali bekor qilib, arizani yana kutilmoqda ro'yxatiga
// qaytarishi mumkin.
export default function RadEtilganArizalarRoyxati({ royxat, qaytarishRuxsat }) {
  if (royxat.length === 0) {
    return <div className="card text-sm text-slate-400">Rad etilgan ariza yo'q</div>;
  }

  return (
    <div className="space-y-3 xi-stagger">
      {royxat.map((t) => (
        <div key={t.id} className="card border-l-4 border-l-rose-300">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={`/talabalar/${t.id}`} className="font-semibold text-brand-700 hover:underline">
                {t.ism_familya}
              </Link>
              {t.intalim_id && <div className="text-xs text-slate-400">ID: {t.intalim_id}</div>}
              <div className="text-xs text-slate-400 mt-0.5">
                {TOIFALAR[t.toifa] || "—"} · {t.filiallar?.nomi} / {t.guruhlar?.nomi}
              </div>
              {t.telefon && (
                <div className="text-xs text-slate-500 mt-0.5">📞 +998 {telefonKorinishi(t.telefon)}</div>
              )}
            </div>
            {qaytarishRuxsat && <QaytarishTugmasi talabaId={t.id} />}
          </div>
          <div className="mt-2.5 bg-rose-50 rounded-lg px-3 py-2 text-sm">
            <div className="text-rose-700 font-medium">
              Sabab: {t.rad_sabab?.matn || "—"}
            </div>
            {t.rad_izoh && <div className="text-rose-600 text-xs mt-0.5">{t.rad_izoh}</div>}
            <div className="text-xs text-slate-400 mt-1">
              {t.rad_etgan_profil?.ism_familya ? `${t.rad_etgan_profil.ism_familya} · ` : ""}
              {t.rad_vaqt ? new Date(t.rad_vaqt).toLocaleString("uz-UZ") : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
