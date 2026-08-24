import ExcelJS from "exceljs";
import { supabaseServer } from "@/lib/supabase/server";
import { TOIFALAR } from "@/lib/constants";
import { sanaKorinishi } from "@/lib/imtihonHisob";
import { telefonKorinishi } from "@/lib/telefon";

// Imtihon kuni printer qilib, qo'lda (qalam bilan) natija va necha-urinishda
// o'tganini belgilab borish uchun ro'yxat — keyinchalik shu qog'ozga qarab
// tizimga O'TDI/O'TMADI va urinish raqamini kiritish uchun. "Natija" va
// "Necha urinishda" ustunlari ATAYLAB BO'SH qoldiriladi (Excel formulasi
// yoki qiymat yo'q — qog'ozda qo'lda to'ldiriladi).
const URINISH_SELECT = `
  id, nazariy_kerak, amaliy_kerak,
  talabalar!inner(
    ism_familya, telefon, intalim_id, toifa,
    filiallar(nomi), guruhlar(nomi),
    nazariy_oqituvchilar:oqituvchilar!nazariy_oqituvchi_id(ism_familya)
  )
`;

export async function GET(so_rov) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Avtorizatsiyadan o'tilmagan", { status: 401 });
  }

  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["hujjatchi", "imtihonchi", "superadmin"].includes(profil?.role)) {
    return new Response("Sizda bu ro'yxatni yuklab olish huquqi yo'q", { status: 403 });
  }

  const { searchParams } = new URL(so_rov.url);
  const imtihonId = searchParams.get("id");
  if (!imtihonId) {
    return new Response("Imtihon ko'rsatilmagan", { status: 400 });
  }

  const [{ data: imtihon, error: imtihonXato }, { data: urinishlarXom, error: urinishXato }] = await Promise.all([
    supabase.from("imtihonlar").select("id, sana, izoh").eq("id", imtihonId).single(),
    supabase
      .from("talaba_imtihonlar")
      .select(URINISH_SELECT)
      .eq("imtihon_id", imtihonId)
      .order("ism_familya", { foreignTable: "talabalar" }),
  ]);

  if (imtihonXato || !imtihon) {
    return new Response("Imtihon topilmadi", { status: 404 });
  }
  if (urinishXato) {
    return new Response(`Ma'lumotlarni yuklashda xatolik: ${urinishXato.message}`, { status: 500 });
  }
  const urinishlar = urinishlarXom || [];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Xavfsiz Imtihon";
  workbook.created = new Date();

  const bet = workbook.addWorksheet("Imtihon royxati", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  bet.mergeCells("A1:J1");
  bet.getCell("A1").value = `Imtihon: ${sanaKorinishi(imtihon.sana)}${imtihon.izoh ? ` — ${imtihon.izoh}` : ""}`;
  bet.getCell("A1").font = { bold: true, size: 14 };
  bet.getRow(1).height = 24;

  const bosh = 3;
  bet.getRow(bosh).values = [
    "№",
    "Ism familya",
    "Toifa",
    "Filial",
    "Guruh",
    "Telefon",
    "Nazariy o'qituvchi",
    "Nazariy?",
    "Amaliy?",
    "NATIJA (qo'lda to'ldiriladi)",
    "NECHA URINISHDA (qo'lda to'ldiriladi)",
  ];
  bet.getRow(bosh).font = { bold: true };
  bet.getRow(bosh).eachCell((cell) => {
    cell.border = { bottom: { style: "medium" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  bet.getRow(bosh).height = 32;

  bet.columns = [
    { key: "raqam", width: 5 },
    { key: "ism", width: 26 },
    { key: "toifa", width: 8 },
    { key: "filial", width: 18 },
    { key: "guruh", width: 10 },
    { key: "telefon", width: 15 },
    { key: "nazariyOqituvchi", width: 20 },
    { key: "nazariyKerak", width: 9 },
    { key: "amaliyKerak", width: 9 },
    { key: "natija", width: 26 },
    { key: "urinish", width: 20 },
  ];

  urinishlar.forEach((u, i) => {
    const t = u.talabalar;
    const qator = bet.getRow(bosh + 1 + i);
    qator.values = [
      i + 1,
      t?.ism_familya || "",
      TOIFALAR[t?.toifa] || "",
      t?.filiallar?.nomi || "",
      t?.guruhlar?.nomi || "",
      t?.telefon ? `+998 ${telefonKorinishi(t.telefon)}` : "",
      t?.nazariy_oqituvchilar?.ism_familya || "",
      u.nazariy_kerak ? "Ha" : "",
      u.amaliy_kerak ? "Ha" : "",
      "",
      "",
    ];
    qator.eachCell((cell, colNumber) => {
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
      // Qo'lda to'ldiriladigan ikkita ustun kattaroq va chegarali bo'lsin —
      // qog'ozda yozish uchun joy borligi ko'zga aniq ko'rinsin.
      if (colNumber === 10 || colNumber === 11) {
        cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      }
    });
    qator.height = 22;
  });

  if (urinishlar.length === 0) {
    bet.getRow(bosh + 1).getCell(2).value = "Bu imtihonga hali talaba biriktirilmagan";
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fayNomi = `imtihon-royxati-${imtihon.sana}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fayNomi}"`,
    },
  });
}
