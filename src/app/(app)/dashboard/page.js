import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import StatTile from "@/components/StatTile";
import {
  umumiyStatistika,
  filialBoyichaStatistika,
  oqituvchiBoyichaStatistika,
} from "@/lib/statistika";

const TALABA_SELECT = `
  id, imtihon_turi, hujjat_tayyor, nazariy_natija, amaliy_natija,
  filiallar(nomi),
  nazariy_oqituvchilar:oqituvchilar!nazariy_oqituvchi_id(ism_familya),
  amaliy_oqituvchilar:oqituvchilar!amaliy_oqituvchi_id(ism_familya)
`;

export default async function Dashboard() {
  const { profile, supabase } = await joriyFoydalanuvchi();

  const { data: talabalar, error } = await supabase
    .from("talabalar")
    .select(TALABA_SELECT);

  if (error) {
    return (
      <div className="card text-rose-600">
        Ma'lumotlarni yuklashda xatolik: {error.message}
      </div>
    );
  }

  const stat = umumiyStatistika(talabalar || []);
  const filiallar = filialBoyichaStatistika(talabalar || []);
  const nazariyOqituvchilar = oqituvchiBoyichaStatistika(talabalar || [], "nazariy");
  const amaliyOqituvchilar = oqituvchiBoyichaStatistika(talabalar || [], "amaliy");

  const barchaFiliallarniKorish = ["superadmin", "hujjatchi", "imtihonchi"].includes(profile.role);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Statistika</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {profile.role === "admin"
            ? `${profile.filiallar?.nomi || ""} filiali bo'yicha umumiy holat`
            : "Barcha filiallar bo'yicha umumiy holat"}
        </p>
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
          sub={`${stat.nazariy.otmadi} o'tmadi · ${stat.nazariy.kutilmoqda} kutilmoqda`}
        />
        <StatTile
          label="Amaliy: o'tdi"
          value={stat.amaliy.otdi}
          accent="emerald"
          sub={`${stat.amaliy.otmadi} o'tmadi · ${stat.amaliy.kutilmoqda} kutilmoqda`}
        />
      </div>

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
