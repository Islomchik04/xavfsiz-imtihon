import { notFound } from "next/navigation";
import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import { IMTIHON_TURI } from "@/lib/constants";
import Badge from "@/components/Badge";
import AsosiyMalumotlarCard from "./AsosiyMalumotlarCard";
import HujjatchiForm from "./HujjatchiForm";
import NatijaForm from "./NatijaForm";

const TALABA_SELECT = `
  *,
  filiallar(id, nomi),
  guruhlar(id, nomi),
  nazariy_oqituvchilar:oqituvchilar!nazariy_oqituvchi_id(id, ism_familya),
  amaliy_oqituvchilar:oqituvchilar!amaliy_oqituvchi_id(id, ism_familya),
  qoshgan_profil:profiles!qoshgan(ism_familya),
  hujjat_tayyorlagan_profil:profiles!hujjat_tayyorlagan(ism_familya),
  nazariy_belgilagan_profil:profiles!nazariy_belgilagan(ism_familya),
  amaliy_belgilagan_profil:profiles!amaliy_belgilagan(ism_familya)
`;

export default async function TalabaDetailSahifa({ params }) {
  const { profile, supabase } = await joriyFoydalanuvchi();

  const { data: talaba, error } = await supabase
    .from("talabalar")
    .select(TALABA_SELECT)
    .eq("id", params.id)
    .single();

  if (error || !talaba) notFound();

  const asosiyTahrirRuxsat =
    !talaba.hujjat_tayyor &&
    (profile.role === "superadmin" || (profile.role === "admin" && profile.filial_id === talaba.filial_id));

  const hujjatTahrirRuxsat =
    !talaba.hujjat_tayyor && ["hujjatchi", "superadmin"].includes(profile.role);

  const natijaTahrirRuxsat =
    talaba.hujjat_tayyor && ["imtihonchi", "superadmin"].includes(profile.role);

  let formaMalumotlari = null;
  if (asosiyTahrirRuxsat) {
    const [{ data: filiallar }, { data: guruhlar }, { data: oqituvchilar }] = await Promise.all([
      supabase.from("filiallar").select("id, nomi").eq("faol", true).order("nomi"),
      supabase.from("guruhlar").select("id, nomi, filial_id").eq("faol", true).order("nomi"),
      supabase.from("oqituvchilar").select("id, ism_familya, turi, filial_id").eq("faol", true).order("ism_familya"),
    ]);
    formaMalumotlari = { filiallar: filiallar || [], guruhlar: guruhlar || [], oqituvchilar: oqituvchilar || [] };
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{talaba.ism_familya}</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge ton="blue">{IMTIHON_TURI[talaba.imtihon_turi]}</Badge>
          <Badge ton={talaba.forma_083 ? "emerald" : "slate"}>083 forma: {talaba.forma_083 ? "Ha" : "Yo'q"}</Badge>
          <Badge ton={talaba.hujjat_tayyor ? "emerald" : "amber"}>
            {talaba.hujjat_tayyor ? "Hujjat tayyor" : "Hujjat kutilmoqda"}
          </Badge>
        </div>
      </div>

      <AsosiyMalumotlarCard
        talaba={talaba}
        tahrirRuxsat={asosiyTahrirRuxsat}
        formaMalumotlari={formaMalumotlari}
        profile={profile}
      />

      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-4">Hujjat holati</h2>
        {talaba.hujjat_tayyor ? (
          <div className="space-y-2 text-sm">
            <SatrMalumot label="083 forma (Hujjatchi tasdig'i)" qiymat={talaba.hujjat_forma_083 ? "Bor" : "Yo'q"} />
            <SatrMalumot label="Tasdiqnoma" qiymat={talaba.tasdiqnoma ? "Bor" : "Yo'q"} />
            <SatrMalumot label="Imtihon varaqasi" qiymat={talaba.imtihon_varaqasi ? "Bor" : "Yo'q"} />
            <SatrMalumot label="Imtihon sanasi" qiymat={talaba.imtihon_sanasi || "—"} />
            {talaba.hujjat_izoh && <SatrMalumot label="Izoh" qiymat={talaba.hujjat_izoh} />}
            <SatrMalumot
              label="Tayyorlagan"
              qiymat={`${talaba.hujjat_tayyorlagan_profil?.ism_familya || "—"} ${
                talaba.hujjat_sana ? `· ${new Date(talaba.hujjat_sana).toLocaleString("uz-UZ")}` : ""
              }`}
            />
          </div>
        ) : hujjatTahrirRuxsat ? (
          <HujjatchiForm talaba={talaba} />
        ) : (
          <p className="text-sm text-slate-400">Hujjatchi tomonidan hali ko'rib chiqilmagan.</p>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-4">Imtihon natijasi</h2>
        {!talaba.hujjat_tayyor ? (
          <p className="text-sm text-slate-400">Hujjat tayyor bo'lgach bu yerda ko'rinadi.</p>
        ) : (
          <NatijaForm talaba={talaba} tahrirRuxsat={natijaTahrirRuxsat} />
        )}
      </div>
    </div>
  );
}

function SatrMalumot({ label, qiymat }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 font-medium text-right">{qiymat}</span>
    </div>
  );
}
