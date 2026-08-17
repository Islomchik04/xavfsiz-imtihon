import Link from "next/link";
import { joriyFoydalanuvchi, rolgaRuxsat } from "@/lib/joriyFoydalanuvchi";
import Badge from "@/components/Badge";
import { IMTIHON_TURI, FORMA_083_LABEL, TALABA_HOLATI, TALABA_HOLATI_RANG, TOIFALAR } from "@/lib/constants";
import { talabaHolati, birUrinishdaOtganmi, qismHolati, oxirgiUrinish, sanaKorinishi } from "@/lib/imtihonHisob";
import { telefonKorinishi } from "@/lib/telefon";
import { guruhBoyichaSaralash } from "@/lib/saralash";
import RadEtilganArizalarRoyxati from "@/components/RadEtilganArizalarRoyxati";
import AutoQidiruvFormi from "@/components/AutoQidiruvFormi";

const TALABA_SELECT = `
  id, ism_familya, telefon, intalim_id, toifa, imtihon_turi, forma_083, hujjat_tayyor, qarzdorlik, qarzdorlik_summasi,
  rad_etildi, rad_izoh, rad_vaqt,
  filiallar(id, nomi), guruhlar(nomi),
  rad_sabab:sabablar!rad_sabab_id(matn)
`;

const RAD_ETILGAN_SELECT = `
  id, ism_familya, telefon, intalim_id, toifa, imtihon_turi, rad_izoh, rad_vaqt,
  filiallar(id, nomi), guruhlar(nomi),
  rad_sabab:sabablar!rad_sabab_id(matn),
  rad_etgan_profil:profiles!rad_etgan(ism_familya)
`;

export default async function TalabalarSahifa({ searchParams }) {
  const { profile, supabase } = await joriyFoydalanuvchi();
  const q = searchParams?.q?.trim() || "";
  const holatFiltr = searchParams?.holat || "";
  const toifaFiltr = searchParams?.toifa || "";
  const guruhFiltr = searchParams?.guruh || "";
  const tartibFiltr = searchParams?.tartib || "";
  // "Rad etilgan" — bular hujjat_tayyor=false (arizasi hujjatchi tomonidan
  // rad etilgan) talabalar, shuning uchun oddiy ro'yxatdan (hujjat_tayyor=true)
  // butunlay boshqacha so'rov va ko'rinish talab qiladi.
  const radRejimi = holatFiltr === "rad_etilgan";

  // Guruh filiallararo bo'lishi mumkin — filial bo'yicha cheklamasdan
  // barcha faol guruhlarni ko'rsatamiz.
  const { data: guruhlar } = await supabase.from("guruhlar").select("id, nomi").eq("faol", true).order("nomi");

  let royxat = [];
  let radEtilganRoyxat = [];
  let error = null;

  if (radRejimi) {
    let radSo_rov = supabase
      .from("talabalar")
      .select(RAD_ETILGAN_SELECT)
      .eq("arxivlangan", false)
      .eq("rad_etildi", true)
      .order("rad_vaqt", { ascending: false });
    if (q) radSo_rov = radSo_rov.or(`ism_familya.ilike.%${q}%,intalim_id.ilike.%${q}%`);
    if (toifaFiltr) radSo_rov = radSo_rov.eq("toifa", toifaFiltr);
    if (guruhFiltr) radSo_rov = radSo_rov.eq("guruh_id", guruhFiltr);
    const { data: radXom, error: radXato } = await radSo_rov.limit(300);
    radEtilganRoyxat = tartibFiltr === "guruh" ? guruhBoyichaSaralash(radXom || []) : radXom || [];
    error = radXato;
  } else {
    // Bazadagi BARCHA talabalar — hujjati hali tayyor bo'lmaganlar (arizalar
    // bosqichida) va rad etilganlar ham shu yerda, tegishli "Holat" belgisi
    // bilan ko'rinadi. Faqat arxivlangan talabalar bundan mustasno — ular
    // alohida Arxiv bo'limida turadi.
    let so_rov = supabase
      .from("talabalar")
      .select(TALABA_SELECT)
      .eq("arxivlangan", false)
      .order("created_at", { ascending: false });
    if (q) so_rov = so_rov.or(`ism_familya.ilike.%${q}%,intalim_id.ilike.%${q}%`);
    if (toifaFiltr) so_rov = so_rov.eq("toifa", toifaFiltr);
    if (guruhFiltr) so_rov = so_rov.eq("guruh_id", guruhFiltr);

    const { data: talabalarXom, error: xato } = await so_rov.limit(2000);
    error = xato;
    const talabalar = talabalarXom || [];

    const idlar = talabalar.map((t) => t.id);
    let urinishlarMap = new Map();
    if (idlar.length > 0) {
      const { data: urinishlar } = await supabase
        .from("talaba_imtihonlar")
        .select("id, talaba_id, nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija, created_at, imtihonlar(sana)")
        .in("talaba_id", idlar);
      for (const u of urinishlar || []) {
        if (!urinishlarMap.has(u.talaba_id)) urinishlarMap.set(u.talaba_id, []);
        urinishlarMap.get(u.talaba_id).push(u);
      }
    }

    royxat = talabalar.map((t) => {
      const urinishlariT = urinishlarMap.get(t.id) || [];
      // Rad etilgan yoki hujjati hali tayyor bo'lmagan talabalar uchun
      // umumiy imtihon holati emas, balki shu maxsus holat ko'rsatiladi.
      const holat = t.rad_etildi
        ? "rad_etilgan"
        : !t.hujjat_tayyor
          ? "hujjat_kutilmoqda"
          : talabaHolati(urinishlariT);
      // "Qachon o'tgani" — talaba umumiy holati "otdi" bo'lsa, oxirgi
      // (eng so'nggi) urinishi biriktirilgan imtihon kunini ko'rsatamiz.
      const otganSana = holat === "otdi" ? oxirgiUrinish(urinishlariT)?.imtihonlar?.sana || null : null;
      return {
        ...t,
        holat,
        otganSana,
        birUrinishdaOtdi: birUrinishdaOtganmi(urinishlariT),
        nazariydanOtganmi: qismHolati(urinishlariT, "nazariy") === "otgan",
      };
    });
    if (holatFiltr === "bir_urinishda_otgan") {
      royxat = royxat.filter((t) => t.birUrinishdaOtdi);
    } else if (holatFiltr === "nazariydan_otgan") {
      royxat = royxat.filter((t) => t.nazariydanOtganmi);
    } else if (holatFiltr) {
      royxat = royxat.filter((t) => t.holat === holatFiltr);
    }
    if (tartibFiltr === "guruh") royxat = guruhBoyichaSaralash(royxat);
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

      <AutoQidiruvFormi className="card flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Ism familya yoki Int'alim ID bo'yicha qidirish</label>
          <input className="input" type="text" name="q" defaultValue={q} placeholder="Masalan: Aliyev Vali yoki 1234567" />
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
            <option value="chetlatildi">Chetlatildi (qayta imtihon kerak)</option>
            <option value="bir_urinishda_otgan">Bitta urinishda o'tganlar</option>
            <option value="nazariydan_otgan">Nazariydan o'tganlar</option>
            <option value="rad_etilgan">Rad etilgan arizalar</option>
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
        <div className="min-w-[160px]">
          <label className="label">Guruh</label>
          <select className="input" name="guruh" defaultValue={guruhFiltr}>
            <option value="">Barchasi</option>
            {(guruhlar || []).map((g) => (
              <option key={g.id} value={g.id}>{g.nomi}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="label">Saralash</label>
          <select className="input" name="tartib" defaultValue={tartibFiltr}>
            <option value="">Sana (yangi birinchi)</option>
            <option value="guruh">Guruh (A-Z)</option>
          </select>
        </div>
        <button className="btn-secondary" type="submit">Qidirish</button>
      </AutoQidiruvFormi>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{radRejimi ? radEtilganRoyxat.length : royxat.length}</span> ta natija topildi
        </p>
        {!radRejimi && (
          <a
            href={`/api/talabalar-eksport?${new URLSearchParams({ q, holat: holatFiltr, toifa: toifaFiltr, guruh: guruhFiltr, tartib: tartibFiltr })}`}
            className="btn-secondary !py-2 !text-sm"
          >
            📊 Excel yuklab olish
          </a>
        )}
      </div>

      {error && <div className="card text-rose-600">Xatolik: {error.message}</div>}

      {radRejimi && (
        <RadEtilganArizalarRoyxati
          royxat={radEtilganRoyxat}
          qaytarishRuxsat={rolgaRuxsat(profile, ["superadmin"])}
        />
      )}

      {!radRejimi && (
        <>

      {/* Kompyuter/planshet: jadval ko'rinishi */}
      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="pb-2 font-medium">Ism familya</th>
              <th className="pb-2 font-medium">Telefon</th>
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
                  <div className="flex flex-wrap gap-1">
                    <span className={`badge ${TALABA_HOLATI_RANG[t.holat]}`}>{TALABA_HOLATI[t.holat]}</span>
                    {t.nazariydanOtganmi && <span className="badge bg-emerald-100 text-emerald-700">Nazariydan o'tgan</span>}
                  </div>
                  {t.otganSana && <div className="text-xs text-slate-400 mt-1">O'tgan sana: {sanaKorinishi(t.otganSana)}</div>}
                  {t.holat === "rad_etilgan" && (
                    <div className="text-xs text-rose-500 mt-1">Sabab: {t.rad_sabab?.matn || "—"}</div>
                  )}
                </td>
              </tr>
            ))}
            {royxat.length === 0 && !error && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
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
              <div>
                <div className="font-semibold text-brand-700">{t.ism_familya}</div>
                {t.intalim_id && <div className="text-xs text-slate-400">ID: {t.intalim_id}</div>}
              </div>
              <Badge ton={t.forma_083 ? "emerald" : "amber"}>{FORMA_083_LABEL[t.forma_083]}</Badge>
            </div>
            <div className="text-xs text-slate-400 mb-2">
              {TOIFALAR[t.toifa] || "—"} · {t.filiallar?.nomi} / {t.guruhlar?.nomi} · {IMTIHON_TURI[t.imtihon_turi]}
            </div>
            {t.telefon && (
              <div className="text-xs text-slate-500 mb-2">📞 +998 {telefonKorinishi(t.telefon)}</div>
            )}
            <div className="flex flex-wrap gap-1.5">
              <span className={`badge ${TALABA_HOLATI_RANG[t.holat]}`}>{TALABA_HOLATI[t.holat]}</span>
              {t.nazariydanOtganmi && <span className="badge bg-emerald-100 text-emerald-700">Nazariydan o'tgan</span>}
              {t.qarzdorlik && (
                <Badge ton="rose">
                  Qarz: {t.qarzdorlik_summasi != null ? Number(t.qarzdorlik_summasi).toLocaleString("uz-UZ") : "bor"}
                </Badge>
              )}
            </div>
            {t.otganSana && <div className="text-xs text-slate-400 mt-1.5">O'tgan sana: {sanaKorinishi(t.otganSana)}</div>}
            {t.holat === "rad_etilgan" && (
              <div className="text-xs text-rose-500 mt-1.5">Sabab: {t.rad_sabab?.matn || "—"}</div>
            )}
          </Link>
        ))}
      </div>
        </>
      )}
    </div>
  );
}
