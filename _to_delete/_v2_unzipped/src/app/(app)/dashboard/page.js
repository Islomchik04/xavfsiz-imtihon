import Link from "next/link";
import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import StatTile from "@/components/StatTile";
import {
  umumiyStatistika,
  filialBoyichaStatistika,
  oqituvchiBoyichaStatistika,
  oqituvchilarReytingi,
} from "@/lib/statistika";
import { oyKaliti, oyKorinishi, sanaKorinishi } from "@/lib/imtihonHisob";

const TALABA_SELECT = `id, hujjat_tayyor, filial_id, filiallar(nomi)`;

const URINISH_SELECT = `
  nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija,
  imtihonlar(id, sana),
  talabalar(
    filial_id, filiallar(nomi),
    nazariy_oqituvchi_id, amaliy_oqituvchi_id,
    nazariy_oqituvchilar:oqituvchilar!nazariy_oqituvchi_id(ism_familya),
    amaliy_oqituvchilar:oqituvchilar!amaliy_oqituvchi_id(ism_familya)
  )
`;

export default async function Dashboard() {
  const { profile, supabase } = await joriyFoydalanuvchi();

  const [{ data: talabalar, error }, { data: urinishlar, error: urinishXato }] = await Promise.all([
    supabase.from("talabalar").select(TALABA_SELECT),
    supabase.from("talaba_imtihonlar").select(URINISH_SELECT),
  ]);

  if (error || urinishXato) {
    return (
      <div className="card text-rose-600">
        Ma'lumotlarni yuklashda xatolik: {(error || urinishXato).message}
      </div>
    );
  }

  const talabalarRoyxat = talabalar || [];
  const urinishlarRoyxat = urinishlar || [];

  const stat = umumiyStatistika(talabalarRoyxat, urinishlarRoyxat);
  const filiallar = filialBoyichaStatistika(talabalarRoyxat, urinishlarRoyxat);
  const nazariyOqituvchilar = oqituvchiBoyichaStatistika(urinishlarRoyxat, "nazariy");
  const amaliyOqituvchilar = oqituvchiBoyichaStatistika(urinishlarRoyxat, "amaliy");

  const barchaFiliallarniKorish = ["superadmin", "hujjatchi", "imtihonchi"].includes(profile.role);

  // --- Oy va imtihon kuni bo'yicha reyting -----------------------------------
  const bugun = new Date().toISOString().slice(0, 10);
  const joriyOy = oyKaliti(bugun);

  const oyReytingi = oqituvchilarReytingi(urinishlarRoyxat, (u) => {
    const sana = u.imtihonlar?.sana;
    return sana && oyKaliti(sana) === joriyOy ? joriyOy : null;
  });
  const joriyOyNatija = oyReytingi.get(joriyOy) || { top: [], engKopYiqilgan: null };

  // Eng so'nggi (natija chiqqan) imtihon kuni
  const kunReytingi = oqituvchilarReytingi(urinishlarRoyxat, (u) => u.imtihonlar?.sana || null);
  const sanalar = Array.from(kunReytingi.keys()).sort().reverse();
  const oxirgiSana = sanalar[0];
  const oxirgiSanaNatija = oxirgiSana ? kunReytingi.get(oxirgiSana) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Statistika</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {profile.role === "admin"
              ? `${profile.filiallar?.nomi || ""} filiali bo'yicha umumiy holat`
              : "Barcha filiallar bo'yicha umumiy holat"}
          </p>
        </div>
        <Link href="/hisobotlar" className="btn-secondary">
          Batafsil hisobotlar →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Jami ro'yxatga olingan" value={stat.jami} accent="blue" />
        <StatTile
          label="Hujjat tayyor"
          value={stat.hujjatTayyor}
          accent="amber"
          sub={`${stat.hujjatKutilmoqda} ta kutilmoqda`}
        />
        <StatTile
          label="Nazariy: o'tdi"
          value={stat.nazariy.otdi}
          accent="emerald"
          sub={`${stat.nazariy.otmadi || 0} o'tmadi · ${stat.nazariy.kutilmoqda || 0} kutilmoqda`}
        />
        <StatTile
          label="Amaliy: o'tdi"
          value={stat.amaliy.otdi}
          accent="emerald"
          sub={`${stat.amaliy.otmadi || 0} o'tmadi · ${stat.amaliy.kutilmoqda || 0} kutilmoqda`}
        />
      </div>

      {barchaFiliallarniKorish && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-semibold text-slate-800 mb-1">
              TOP-3 o'qituvchi — {oyKorinishi(joriyOy)}
            </h2>
            <p className="text-xs text-slate-400 mb-4">Shu oyda eng ko'p talabasini o'tkazgan o'qituvchilar</p>
            <ReytingRoyxati royxat={joriyOyNatija.top} />
            {joriyOyNatija.engKopYiqilgan && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="text-slate-500">Eng ko'p yiqilgan o'qituvchi</span>
                <span className="font-medium text-rose-600">
                  {joriyOyNatija.engKopYiqilgan.ism} · {joriyOyNatija.engKopYiqilgan.otmadi} ta
                </span>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="font-semibold text-slate-800 mb-1">
              TOP-3 o'qituvchi — {oxirgiSana ? sanaKorinishi(oxirgiSana) : "so'nggi imtihon kuni"}
            </h2>
            <p className="text-xs text-slate-400 mb-4">Eng so'nggi natija chiqqan imtihon kuni bo'yicha</p>
            {oxirgiSanaNatija ? (
              <>
                <ReytingRoyxati royxat={oxirgiSanaNatija.top} />
                {oxirgiSanaNatija.engKopYiqilgan && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Eng ko'p yiqilgan o'qituvchi</span>
                    <span className="font-medium text-rose-600">
                      {oxirgiSanaNatija.engKopYiqilgan.ism} · {oxirgiSanaNatija.engKopYiqilgan.otmadi} ta
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400">Hali natija chiqmagan</p>
            )}
          </div>
        </div>
      )}

      {barchaFiliallarniKorish && filiallar.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="font-semibold text-slate-800 mb-4">Filiallar bo'yicha</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100">
                <th className="pb-2 font-medium">Filial</th>
                <th className="pb-2 font-medium text-right">Jami</th>
                <th className="pb-2 font-medium text-right">Hujjat tayyor</th>
                <th className="pb-2 font-medium text-right">O'tdi</th>
                <th className="pb-2 font-medium text-right">O'tmadi</th>
              </tr>
            </thead>
            <tbody>
              {filiallar.map((f) => (
                <tr key={f.nomi} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium text-slate-700">{f.nomi}</td>
                  <td className="py-2.5 text-right">{f.jami}</td>
                  <td className="py-2.5 text-right">{f.hujjatTayyor}</td>
                  <td className="py-2.5 text-right text-emerald-600 font-medium">{f.otdi}</td>
                  <td className="py-2.5 text-right text-rose-600 font-medium">{f.otmadi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <OqituvchiJadval sarlavha="Nazariy o'qituvchilar" royxat={nazariyOqituvchilar} />
        <OqituvchiJadval sarlavha="Amaliy o'qituvchilar" royxat={amaliyOqituvchilar} />
      </div>
    </div>
  );
}

function ReytingRoyxati({ royxat }) {
  if (!royxat || royxat.length === 0) {
    return <p className="text-sm text-slate-400">Hali natija yo'q</p>;
  }
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <div className="space-y-2">
      {royxat.map((o, i) => (
        <div key={o.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{medal[i] || `${i + 1}.`}</span>
            <span className="font-medium text-slate-700">{o.ism}</span>
          </div>
          <div className="text-sm text-slate-500">
            <span className="text-emerald-600 font-semibold">{o.otdi} o'tdi</span>
            {o.otmadi > 0 && <span className="text-rose-500 ml-2">{o.otmadi} o'tmadi</span>}
            <span className="ml-2 text-slate-400">{o.foiz}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OqituvchiJadval({ sarlavha, royxat }) {
  return (
    <div className="card overflow-x-auto">
      <h2 className="font-semibold text-slate-800 mb-4">{sarlavha}</h2>
      {royxat.length === 0 ? (
        <p className="text-sm text-slate-400">Ma'lumot yo'q</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="pb-2 font-medium">O'qituvchi</th>
              <th className="pb-2 font-medium text-right">O'quvchi</th>
              <th className="pb-2 font-medium text-right">O'tgan</th>
              <th className="pb-2 font-medium text-right">Foiz</th>
            </tr>
          </thead>
          <tbody>
            {royxat.map((o) => (
              <tr key={o.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 font-medium text-slate-700">{o.ism}</td>
                <td className="py-2.5 text-right">{o.jami}</td>
                <td className="py-2.5 text-right text-emerald-600 font-medium">{o.otdi}</td>
                <td className="py-2.5 text-right text-slate-500">
                  {o.foiz === null ? "—" : `${o.foiz}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
