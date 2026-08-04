import ExcelJS from "exceljs";
import { supabaseServer } from "@/lib/supabase/server";
import { IMTIHON_TURI, FORMA_083_LABEL, TALABA_HOLATI, TOIFALAR } from "@/lib/constants";
import { talabaHolati, birUrinishdaOtganmi, qismHolati } from "@/lib/imtihonHisob";
import { telefonKorinishi } from "@/lib/telefon";

const TALABA_SELECT = `
  id, ism_familya, telefon, intalim_id, toifa, imtihon_turi, forma_083, hujjat_tayyor, qarzdorlik, qarzdorlik_summasi,
  filiallar(id, nomi), guruhlar(nomi)
`;

// talabalar/page.js'dagi filtrlar (q, holat, toifa) bilan bir xil natijani
// Excel (.xlsx) faylida yuklab beradi — RLS orqali (supabaseServer, joriy
// foydalanuvchi sessiyasi bilan) shu foydalanuvchi ko'ra oladigan talabalar
// bilan cheklanadi (admin faqat o'z filiali).
export async function GET(so_rov) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Avtorizatsiyadan o'tilmagan", { status: 401 });
  }

  const { searchParams } = new URL(so_rov.url);
  const q = searchParams.get("q")?.trim() || "";
  const holatFiltr = searchParams.get("holat") || "";
  const toifaFiltr = searchParams.get("toifa") || "";

  let so_rovBuilder = supabase
    .from("talabalar")
    .select(TALABA_SELECT)
    .eq("arxivlangan", false)
    .order("created_at", { ascending: false });
  if (q) so_rovBuilder = so_rovBuilder.or(`ism_familya.ilike.%${q}%,intalim_id.ilike.%${q}%`);
  if (toifaFiltr) so_rovBuilder = so_rovBuilder.eq("toifa", toifaFiltr);

  const { data: talabalarXom, error } = await so_rovBuilder.limit(2000);
  if (error) {
    return new Response(`Ma'lumotlarni yuklashda xatolik: ${error.message}`, { status: 500 });
  }
  const talabalar = talabalarXom || [];

  const idlar = talabalar.map((t) => t.id);
  let urinishlarMap = new Map();
  if (idlar.length > 0) {
    const { data: urinishlar } = await supabase
      .from("talaba_imtihonlar")
      .select("id, talaba_id, nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija, created_at")
      .in("talaba_id", idlar);
    for (const u of urinishlar || []) {
      if (!urinishlarMap.has(u.talaba_id)) urinishlarMap.set(u.talaba_id, []);
      urinishlarMap.get(u.talaba_id).push(u);
    }
  }

  let royxat = talabalar.map((t) => {
    const urinishlariT = urinishlarMap.get(t.id) || [];
    return {
      ...t,
      holat: talabaHolati(urinishlariT),
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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Xavfsiz Imtihon";
  workbook.created = new Date();

  const bet = workbook.addWorksheet("Talabalar");
  bet.columns = [
    { header: "Ism familya", key: "ism", width: 28 },
    { header: "Int'alim ID", key: "intalimId", width: 14 },
    { header: "Telefon", key: "telefon", width: 16 },
    { header: "Toifa", key: "toifa", width: 10 },
    { header: "Filial", key: "filial", width: 20 },
    { header: "Guruh", key: "guruh", width: 12 },
    { header: "Imtihon turi", key: "imtihonTuri", width: 14 },
    { header: "083 forma", key: "forma083", width: 14 },
    { header: "Qarzdorlik", key: "qarzdorlik", width: 20 },
    { header: "Holat", key: "holat", width: 22 },
  ];
  bet.getRow(1).font = { bold: true };

  for (const t of royxat) {
    bet.addRow({
      ism: t.ism_familya,
      intalimId: t.intalim_id || "",
      telefon: t.telefon ? `+998${telefonKorinishi(t.telefon)}` : "",
      toifa: TOIFALAR[t.toifa] || "",
      filial: t.filiallar?.nomi || "",
      guruh: t.guruhlar?.nomi || "",
      imtihonTuri: IMTIHON_TURI[t.imtihon_turi] || "",
      forma083: FORMA_083_LABEL[t.forma_083],
      qarzdorlik: t.qarzdorlik
        ? `Bor${t.qarzdorlik_summasi != null ? ` (${Number(t.qarzdorlik_summasi).toLocaleString("uz-UZ")} so'm)` : ""}`
        : "Yo'q",
      holat: `${TALABA_HOLATI[t.holat] || t.holat}${t.nazariydanOtganmi ? " · Nazariydan o'tgan" : ""}`,
    });
  }

  if (royxat.length === 0) {
    bet.addRow({ ism: "Hech narsa topilmadi" });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fayNomi = `talabalar-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fayNomi}"`,
    },
  });
}
