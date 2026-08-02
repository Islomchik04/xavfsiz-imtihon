import ExcelJS from "exceljs";
import { supabaseServer } from "@/lib/supabase/server";
import { oqituvchilarKpiHisoblash, oyKaliti, sanaKorinishi } from "@/lib/imtihonHisob";
import { OQITUVCHI_TURI } from "@/lib/constants";

const URINISH_SELECT = `
  nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija,
  imtihonlar(sana),
  talabalar(nazariy_oqituvchi_id, amaliy_oqituvchi_id)
`;

// Superadmin uchun: tanlangan oyning KPI/maosh hisobotini Excel (.xlsx)
// faylida yuklab beradi. Formula: imtihonHisob.js#oqituvchilarKpiHisoblash.
export async function GET(so_rov) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Avtorizatsiyadan o'tilmagan", { status: 401 });
  }

  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profil?.role !== "superadmin") {
    return new Response("Faqat superadmin KPI hisobotini yuklab olishi mumkin", { status: 403 });
  }

  const { searchParams } = new URL(so_rov.url);
  const tanlanganOy = searchParams.get("oy") || oyKaliti(new Date().toISOString().slice(0, 10));

  const [{ data: urinishlarXom, error }, { data: oqituvchilar }] = await Promise.all([
    supabase.from("talaba_imtihonlar").select(URINISH_SELECT),
    supabase.from("oqituvchilar").select("id, ism_familya, turi").eq("faol", true),
  ]);

  if (error) {
    return new Response(`Ma'lumotlarni yuklashda xatolik: ${error.message}`, { status: 500 });
  }

  const oyUrinishlari = (urinishlarXom || []).filter(
    (u) => u.imtihonlar?.sana && oyKaliti(u.imtihonlar.sana) === tanlanganOy
  );
  const kpiRoyxat = oqituvchilarKpiHisoblash(oyUrinishlari, oqituvchilar || []);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Xavfsiz Imtihon";
  workbook.created = new Date(`${tanlanganOy}-01T00:00:00Z`);

  // --- 1-bet: Oylik yakun -----------------------------------------------------
  const yakunBet = workbook.addWorksheet(`Yakun ${tanlanganOy}`);
  yakunBet.columns = [
    { header: "O'qituvchi", key: "ism", width: 28 },
    { header: "Turi", key: "turi", width: 16 },
    { header: "O'tgan", key: "otgan", width: 10 },
    { header: "O'tmagan", key: "otmagan", width: 10 },
    { header: "Mukofot (so'm)", key: "mukofot", width: 16 },
    { header: "Jarima (so'm)", key: "jarima", width: 16 },
    { header: "Sof (so'm)", key: "sof", width: 16 },
  ];
  yakunBet.getRow(1).font = { bold: true };

  let jamiOtgan = 0;
  let jamiOtmagan = 0;
  let jamiMukofot = 0;
  let jamiJarima = 0;
  let jamiSof = 0;

  for (const r of kpiRoyxat) {
    yakunBet.addRow({
      ism: r.oqituvchi.ism_familya,
      turi: OQITUVCHI_TURI[r.oqituvchi.turi] || r.oqituvchi.turi,
      otgan: r.oy.otgan,
      otmagan: r.oy.otmagan,
      mukofot: r.oy.mukofot,
      jarima: r.oy.jarima,
      sof: r.oy.sof,
    });
    jamiOtgan += r.oy.otgan;
    jamiOtmagan += r.oy.otmagan;
    jamiMukofot += r.oy.mukofot;
    jamiJarima += r.oy.jarima;
    jamiSof += r.oy.sof;
  }

  const jamiQator = yakunBet.addRow({
    ism: "JAMI",
    turi: "",
    otgan: jamiOtgan,
    otmagan: jamiOtmagan,
    mukofot: jamiMukofot,
    jarima: jamiJarima,
    sof: jamiSof,
  });
  jamiQator.font = { bold: true };

  // --- 2-bet: Haftalik tafsilot ------------------------------------------------
  const haftaBet = workbook.addWorksheet("Haftalik tafsilot");
  haftaBet.columns = [
    { header: "O'qituvchi", key: "ism", width: 28 },
    { header: "Turi", key: "turi", width: 16 },
    { header: "Hafta boshi", key: "haftaBoshi", width: 14 },
    { header: "Hafta oxiri", key: "haftaOxiri", width: 14 },
    { header: "O'tgan", key: "otgan", width: 10 },
    { header: "O'tmagan", key: "otmagan", width: 10 },
    { header: "Foiz", key: "foiz", width: 10 },
    { header: "Jarima/dona (so'm)", key: "jarimaBir", width: 18 },
    { header: "Mukofot (so'm)", key: "mukofot", width: 16 },
    { header: "Jarima (so'm)", key: "jarima", width: 16 },
    { header: "Sof (so'm)", key: "sof", width: 16 },
  ];
  haftaBet.getRow(1).font = { bold: true };

  for (const r of kpiRoyxat) {
    for (const h of r.haftalar) {
      haftaBet.addRow({
        ism: r.oqituvchi.ism_familya,
        turi: OQITUVCHI_TURI[r.oqituvchi.turi] || r.oqituvchi.turi,
        haftaBoshi: sanaKorinishi(h.hafta),
        haftaOxiri: sanaKorinishi(h.haftaOxiri),
        otgan: h.otgan,
        otmagan: h.otmagan,
        foiz: `${Math.round(h.foiz * 100)}%`,
        jarimaBir: h.jarimaBir,
        mukofot: h.mukofot,
        jarima: h.jarima,
        sof: h.sof,
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fayNomi = `kpi-${tanlanganOy}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fayNomi}"`,
    },
  });
}
