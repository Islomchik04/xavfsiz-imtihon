import ExcelJS from "exceljs";
import { supabaseServer } from "@/lib/supabase/server";
import {
  oqituvchilarKpiHisoblash,
  urinishTartibiBilan,
  oyKaliti,
  sanaKorinishi,
  haftaBoshi,
  haftaOxiri,
  KPI_MUKOFOT_BIR,
} from "@/lib/imtihonHisob";
import { OQITUVCHI_TURI } from "@/lib/constants";

const URINISH_SELECT = `
  talaba_id, nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija, created_at,
  nazariy_oqituvchi_id, amaliy_oqituvchi_id,
  imtihonlar(sana),
  talabalar(ism_familya, toifa, filiallar(nomi), guruhlar(nomi))
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

  // Urinish tartib raqamlari TO'LIQ tarixdan hisoblanadi (2+ urinishda
  // o'tganga mukofot yo'q qoidasi to'g'ri ishlashi uchun), keyin tanlangan
  // oyga filtrlanadi.
  const tartibliUrinishlar = urinishTartibiBilan(urinishlarXom || []);
  const oyUrinishlari = tartibliUrinishlar.filter(
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

  // --- 3-bet: O'quvchilar tafsiloti (pastki list) ------------------------------
  // Har bir o'qituvchi bo'yicha — o'sha oyda unga tegishli har bir o'quvchi
  // urinishi (natijasi, necha-urinishligi va mukofotga hissasi) alohida
  // qatorda ko'rinadi. Bu "Haftalik tafsilot" (faqat umumiy son) dan farqli
  // ravishda ANIQ o'quvchi ismlari bilan.
  const oqMap = new Map((oqituvchilar || []).map((o) => [o.id, o]));
  const oquvchilarQatorlari = [];

  for (const u of oyUrinishlari) {
    const sana = u.imtihonlar?.sana;
    if (!sana) continue;
    const hafta = haftaBoshi(sana);
    const talaba = u.talabalar;
    if (talaba?.toifa === "express") continue; // Express — KPI hisobiga kirmaydi

    function qatorQoshish(oqituvchiId, turi, natijaMaydon, urinishRaqami) {
      const oq = oqMap.get(oqituvchiId);
      if (!oq) return;
      const natija = talaba?.[natijaMaydon];
      if (natija !== "otdi" && natija !== "otmadi") return;
      const otdimi = natija === "otdi";
      const mukofotYoq = otdimi && urinishRaqami > 1;
      oquvchilarQatorlari.push({
        oqituvchiIsm: oq.ism_familya,
        turi: OQITUVCHI_TURI[turi] || turi,
        oquvchi: talaba?.ism_familya || "",
        filial: talaba?.filiallar?.nomi || "",
        guruh: talaba?.guruhlar?.nomi || "",
        sana: sanaKorinishi(sana),
        hafta: `${sanaKorinishi(hafta)} – ${sanaKorinishi(haftaOxiri(hafta))}`,
        natija: otdimi ? "O'tdi" : "O'tmadi",
        urinish: urinishRaqami || 1,
        mukofot: otdimi ? (mukofotYoq ? 0 : KPI_MUKOFOT_BIR) : "",
        izoh: mukofotYoq ? "2+ urinishda o'tgan — mukofot yo'q" : "",
      });
    }

    if (u.nazariy_kerak) {
      qatorQoshish(u.nazariy_oqituvchi_id, "nazariy", "nazariy_natija", u.nazariyUrinishRaqami);
    }
    if (u.amaliy_kerak) {
      qatorQoshish(u.amaliy_oqituvchi_id, "amaliy", "amaliy_natija", u.amaliyUrinishRaqami);
    }
  }

  oquvchilarQatorlari.sort((a, b) => {
    if (a.oqituvchiIsm !== b.oqituvchiIsm) return a.oqituvchiIsm.localeCompare(b.oqituvchiIsm, "uz");
    return a.sana.localeCompare(b.sana);
  });

  const oquvchilarBet = workbook.addWorksheet("O'quvchilar tafsiloti");
  oquvchilarBet.columns = [
    { header: "O'qituvchi", key: "oqituvchiIsm", width: 26 },
    { header: "Turi", key: "turi", width: 12 },
    { header: "O'quvchi", key: "oquvchi", width: 26 },
    { header: "Filial", key: "filial", width: 18 },
    { header: "Guruh", key: "guruh", width: 12 },
    { header: "Sana", key: "sana", width: 12 },
    { header: "Hafta", key: "hafta", width: 22 },
    { header: "Natija", key: "natija", width: 12 },
    { header: "Necha-urinishda", key: "urinish", width: 16 },
    { header: "Mukofot (so'm)", key: "mukofot", width: 16 },
    { header: "Izoh", key: "izoh", width: 32 },
  ];
  oquvchilarBet.getRow(1).font = { bold: true };

  for (const q of oquvchilarQatorlari) {
    const qator = oquvchilarBet.addRow(q);
    if (q.natija === "O'tdi") {
      qator.getCell("natija").font = { color: { argb: "FF059669" } };
    } else {
      qator.getCell("natija").font = { color: { argb: "FFE11D48" } };
    }
    if (q.izoh) {
      qator.getCell("izoh").font = { color: { argb: "FFE11D48" }, italic: true };
    }
  }
  if (oquvchilarQatorlari.length === 0) {
    oquvchilarBet.addRow({ oqituvchiIsm: "Shu oyda ma'lumot yo'q" });
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
