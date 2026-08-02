import { notFound } from "next/navigation";
import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import { IMTIHON_TURI, FORMA_083_LABEL, TALABA_HOLATI, TALABA_HOLATI_RANG } from "@/lib/constants";
import { talabaHolati } from "@/lib/imtihonHisob";
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
  hujjat_tayyorlagan_profil:profiles!hujjat_tayyorlagan(ism_familya)
`;

const URINISH_SELECT = `
  *,
  imtihonlar(id, sana, izoh),
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

  const { data: urinishlar } = await supabase
    .from("talaba_imtihonlar")
    .select(URINISH_SELECT)
    .eq("talaba_id", talaba.id)
    .order("created_at", { ascending: false });

  const asosiyTahrirRuxsat =
    !talaba.hujjat_tayyor &&
    (profile.role === "superadmin" ||
      profile.role === "hujjatchi" ||
      (profile.role === "admin" && profile.filial_id === talaba.filial_id));

  const hujjatTahrirRuxsat =
    !talaba.hujjat_tayyor && ["hujjatchi", "superadmin"].includes(profile.role);

  const natijaTahrirRuxsat = ["imtihonchi", "superadmin"].includes(profile.role);
  const qaytaBiriktirishRuxsat = ["hujjatchi", "superadmin"].includes(profile.role);

  let formaMalumotlari = null;
  if (asosiyTahrirRuxsat) {
    const [{ data: filiallar }, { data: oqituvchilarXom }, { data: oqFiliallar }] = await Promise.all([
      supabase.from("filiallar").select("id, nomi").eq("faol", true).order("nomi"),
      supabase.from("oqituvchilar").select("id, ism_familya, turi").eq("faol", true).order("ism_familya"),
      supabase.from("oqituvchi_filiallar").select("oqituvchi_id, filial_id"),
    ]);
    const map = new Map();
    for (const of_ of oqFiliallar || []) {
      if (!map.has(of_.oqituvchi_id)) map.set(of_.oqituvchi_id, []);
      map.get(of_.oqituvchi_id).push(of_.filial_id);
    }
    formaMalumotlari = {
      filiallar: filiallar || [],
      oqituvchilar: (oqituvchilarXom || []).map((o) => ({ ...o, filiallar: map.get(o.id) || [] })),
    };
  }

  let imtihonlar = [];
  if (hujjatTahrirRuxsat || qaytaBiriktirishRuxsat) {
    const { data } = await supabase
      .from("imtihonlar")
      .select("id, sana, izoh")
      .order("sana", { ascending: false })
      .limit(100);
    imtihonlar = data || [];
  }

  const holat = talabaHolati(urinishlar || []);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{talaba.ism_familya}</h1>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge ton="blue">{IMTIHON_TURI[talaba.imtihon_turi]}</Badge>
          <Badge ton={talaba.forma_083 ? "emerald" : "amber"}>083 forma: {FORMA_083_LABEL[talaba.forma_083]}</Badge>
          <span className={`badge ${TALABA_HOLATI_RANG[holat]}`}>{TALABA_HOLATI[holat]}</span>
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
            <SatrMalumot label="083 forma (Hujjatchi tasdig'i)" qiymat={FORMA_083_LABEL[talaba.hujjat_forma_083]} />
            <SatrMalumot label="Tasdiqnoma" qiymat={talaba.tasdiqnoma ? "Bor" : "Yo'q"} />
            <SatrMalumot label="Imtihon varaqasi" qiymat={talaba.imtihon_varaqasi ? "Bor" : "Yo'q"} />
            {talaba.hujjat_izoh && <SatrMalumot label="Izoh" qiymat={talaba.hujjat_izoh} />}
            <SatrMalumot
              label="Tayyorlagan"
              qiymat={`${talaba.hujjat_tayyorlagan_profil?.ism_familya || "—"} ${
                talaba.hujjat_sana ? `· ${new Date(talaba.hujjat_sana).toLocaleString("uz-UZ")}` : ""
              }`}
            />
          </div>
        ) : hujjatTahrirRuxsat ? (
          <HujjatchiForm talaba={talaba} imtihonlar={imtihonlar} />
        ) : (
          <p className="text-sm text-slate-400">Hujjatchi tomonidan hali ko'rib chiqilmagan.</p>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-4">Imtihon natijasi</h2>
        {!talaba.hujjat_tayyor ? (
          <p className="text-sm text-slate-400">Hujjat tayyor bo'lgach bu yerda ko'rinadi.</p>
        ) : (
          <NatijaForm
            talaba={talaba}
            urinishlar={urinishlar || []}
            natijaTahrirRuxsat={natijaTahrirRuxsat}
            qaytaBiriktirishRuxsat={qaytaBiriktirishRuxsat}
            imtihonlar={imtihonlar}
          />
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
