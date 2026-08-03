import ExcelJS from "exceljs";
import { supabaseServer } from "@/lib/supabase/server";
import { IMTIHON_TURI, FORMA_083_LABEL, TOIFALAR } from "@/lib/constants";
import { IMPORT_USTUNLARI, MALUMOT_BOSHLANISH_QATORI } from "@/lib/talabaImport";

// Talabalarni Excel orqali import qilish uchun NAMUNA shablonni yuklab
// beradi. Filialga qarab 2-sahifadagi (Yordam) o'qituvchilar ro'yxati
// moslashadi, shu orqali 1-sahifada dropdown (data validation) ishlaydi.
export async function GET(so_rov) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Avtorizatsiyadan o'tilmagan", { status: 401 });
  }

  const { data: profil } = await supabase.from("profiles").select("role, filial_id").eq("id", user.id).single();
  if (!["admin", "hujjatchi", "superadmin"].includes(profil?.role)) {
    return new Response("Sizda talaba qo'shish huquqi yo'q", { status: 403 });
  }

  const { searchParams } = new URL(so_rov.url);
  // Admin faqat o'z filiali uchun shablon oladi (so'ralgan filialId'dan
  // qat'i nazar) — talaba qo'shish ruxsati bilan bir xil qoida.
  const filialId = profil.role === "admin" ? profil.filial_id : searchParams.get("filialId");

  if (!filialId) {
    return new Response("Filial ko'rsatilmagan", { status: 400 });
  }

  const [{ data: filial }, { data: oqFiliallar }, { data: oqituvchilarXom }] = await Promise.all([
    supabase.from("filiallar").select("id, nomi").eq("id", filialId).single(),
    supabase.from("oqituvchi_filiallar").select("oqituvchi_id").eq("filial_id", filialId),
    supabase.from("oqituvchilar").select("id, ism_familya, turi").eq("faol", true).order("ism_familya"),
  ]);

  if (!filial) {
    return new Response("Filial topilmadi", { status: 404 });
  }

  const shuFilialOqIdlari = new Set((oqFiliallar || []).map((o) => o.oqituvchi_id));
  const oqituvchilar = (oqituvchilarXom || []).filter((o) => shuFilialOqIdlari.has(o.id));
  const nazariyOqituvchilar = oqituvchilar.filter((o) => o.turi === "nazariy").map((o) => o.ism_familya);
  const amaliyOqituvchilar = oqituvchilar.filter((o) => o.turi === "amaliy").map((o) => o.ism_familya);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Xavfsiz Imtihon";
  workbook.created = new Date();

  // --- 1-bet: Talabalar (to'ldiriladigan shablon) -----------------------------
  const bet = workbook.addWorksheet("Talabalar");
  bet.columns = IMPORT_USTUNLARI.map((u) => ({ header: u.header, key: u.key, width: u.kenglik }));
  bet.getRow(1).font = { bold: true };
  bet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

  const namunaQator = bet.addRow(Object.fromEntries(IMPORT_USTUNLARI.map((u) => [u.key, u.namuna])));
  namunaQator.font = { italic: true, color: { argb: "FF94A3B8" } };
  bet.getCell("H2").value = "☝️ Bu namuna qator — import paytida har doim o'tkazib yuboriladi. O'chirishingiz shart emas.";
  bet.getCell("H1").value = "Izoh";
  bet.getCell("H1").font = { bold: true };
  bet.getColumn(8).width = 55;

  // 3-qatordan boshlab ~200 qatorga stil (chegaralar) beramiz, ko'rinishi
  // uchun — real ma'lumot yo'q, faqat vizual.
  for (let r = 3; r <= 200; r++) {
    for (let c = 1; c <= 7; c++) {
      bet.getCell(r, c).border = { bottom: { style: "hair", color: { argb: "FFF1F5F9" } } };
    }
  }

  // --- 2-bet: Yordam (dropdown manbasi + ma'lumot uchun) -----------------------
  const yordamBet = workbook.addWorksheet("Yordam");
  yordamBet.columns = [
    { header: "Toifa", key: "toifa", width: 14 },
    { header: "Imtihon turi", key: "imtihon_turi", width: 26 },
    { header: "083 forma", key: "forma_083", width: 14 },
    { header: `${filial.nomi} — Nazariy o'qituvchi`, key: "nazariy", width: 26 },
    { header: `${filial.nomi} — Amaliy o'qituvchi`, key: "amaliy", width: 26 },
  ];
  yordamBet.getRow(1).font = { bold: true };

  const toifaQiymatlari = Object.values(TOIFALAR);
  const imtihonTuriQiymatlari = Object.values(IMTIHON_TURI);
  const forma083Qiymatlari = [FORMA_083_LABEL[true], FORMA_083_LABEL[false]];
  const maxUzunlik = Math.max(
    toifaQiymatlari.length,
    imtihonTuriQiymatlari.length,
    forma083Qiymatlari.length,
    nazariyOqituvchilar.length,
    amaliyOqituvchilar.length,
    1
  );
  for (let i = 0; i < maxUzunlik; i++) {
    yordamBet.addRow({
      toifa: toifaQiymatlari[i] || null,
      imtihon_turi: imtihonTuriQiymatlari[i] || null,
      forma_083: forma083Qiymatlari[i] || null,
      nazariy: nazariyOqituvchilar[i] || null,
      amaliy: amaliyOqituvchilar[i] || null,
    });
  }

  // --- Dropdown (data validation) 1-betdagi ustunlarga ------------------------
  const oxirgiQator = 200;
  function validatsiya(ustunHarfi, manbaDiapazon) {
    for (let r = MALUMOT_BOSHLANISH_QATORI; r <= oxirgiQator; r++) {
      bet.getCell(`${ustunHarfi}${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [manbaDiapazon],
        showErrorMessage: true,
        errorTitle: "Noto'g'ri qiymat",
        error: "Iltimos ro'yxatdan tanlang (Yordam varag'ini ko'ring).",
      };
    }
  }
  validatsiya("B", `Yordam!$A$2:$A$${maxUzunlik + 1}`); // Toifa
  validatsiya("D", `Yordam!$C$2:$C$${maxUzunlik + 1}`); // 083 forma
  validatsiya("E", `Yordam!$B$2:$B$${maxUzunlik + 1}`); // Imtihon turi
  if (nazariyOqituvchilar.length > 0) validatsiya("F", `Yordam!$D$2:$D$${maxUzunlik + 1}`);
  if (amaliyOqituvchilar.length > 0) validatsiya("G", `Yordam!$E$2:$E$${maxUzunlik + 1}`);

  const buffer = await workbook.xlsx.writeBuffer();
  const fayNomi = `talabalar-shablon-${filial.nomi.replace(/[^a-zA-Z0-9]+/g, "-")}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fayNomi}"`,
    },
  });
}
