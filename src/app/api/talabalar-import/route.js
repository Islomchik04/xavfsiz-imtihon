import ExcelJS from "exceljs";
import { supabaseServer } from "@/lib/supabase/server";
import { guruhIdTop } from "@/lib/guruh";
import { telefonNormallash } from "@/lib/telefon";
import {
  MALUMOT_BOSHLANISH_QATORI,
  matndanToifa,
  matndanImtihonTuri,
  matndanForma083,
} from "@/lib/talabaImport";

// Talabalarni Excel (.xlsx) fayldan ommaviy import qiladi. Har bir qator
// mustaqil baholanadi — bittasi xato bo'lsa ham qolganlari qo'shilishda
// davom etadi, oxirida to'liq hisobot qaytariladi. Yozish RLS orqali
// (supabaseServer, joriy foydalanuvchi sessiyasi bilan) amalga oshiriladi —
// shu sababli admin faqat o'z filialiga qo'sha oladi, superadmin/hujjatchi
// istalgan filialga (baza darajasidagi talabalar_insert policy'si bilan bir xil).
export async function POST(so_rov) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ xato: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
  }

  const { data: profil } = await supabase.from("profiles").select("role, filial_id").eq("id", user.id).single();
  if (!["admin", "hujjatchi", "superadmin"].includes(profil?.role)) {
    return Response.json({ xato: "Sizda talaba qo'shish huquqi yo'q" }, { status: 403 });
  }

  const forma = await so_rov.formData();
  const fayl = forma.get("fayl");
  const filialId = profil.role === "admin" ? profil.filial_id : forma.get("filialId");

  if (!fayl) {
    return Response.json({ xato: "Fayl yuborilmadi" }, { status: 400 });
  }
  if (!filialId) {
    return Response.json({ xato: "Filial ko'rsatilmagan" }, { status: 400 });
  }

  const { data: filial } = await supabase.from("filiallar").select("id").eq("id", filialId).single();
  if (!filial) {
    return Response.json({ xato: "Filial topilmadi" }, { status: 404 });
  }

  // Shu filialga biriktirilgan o'qituvchilarni ism bo'yicha topish uchun
  // (katta-kichik harf va bo'sh joylarga sezgir emas) — bir martalik so'rov.
  const [{ data: oqFiliallar }, { data: oqituvchilarXom }] = await Promise.all([
    supabase.from("oqituvchi_filiallar").select("oqituvchi_id").eq("filial_id", filialId),
    supabase.from("oqituvchilar").select("id, ism_familya, turi").eq("faol", true),
  ]);
  const shuFilialOqIdlari = new Set((oqFiliallar || []).map((o) => o.oqituvchi_id));
  const oqituvchilar = (oqituvchilarXom || []).filter((o) => shuFilialOqIdlari.has(o.id));
  const nazariyMap = new Map(
    oqituvchilar.filter((o) => o.turi === "nazariy").map((o) => [o.ism_familya.trim().toLowerCase(), o.id])
  );
  const amaliyMap = new Map(
    oqituvchilar.filter((o) => o.turi === "amaliy").map((o) => [o.ism_familya.trim().toLowerCase(), o.id])
  );

  let workbook;
  try {
    const arrayBuffer = await fayl.arrayBuffer();
    workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
  } catch (err) {
    return Response.json({ xato: "Fayl o'qib bo'lmadi — .xlsx formatida ekanini tekshiring" }, { status: 400 });
  }

  const bet = workbook.getWorksheet("Talabalar") || workbook.worksheets[0];
  if (!bet) {
    return Response.json({ xato: "Faylda \"Talabalar\" varag'i topilmadi" }, { status: 400 });
  }

  const natijalar = { jami: 0, muvaffaqiyatli: 0, xatolar: [] };

  for (let r = MALUMOT_BOSHLANISH_QATORI; r <= bet.rowCount; r++) {
    const qator = bet.getRow(r);
    const matn = (col) => {
      const q = qator.getCell(col).value;
      if (q === null || q === undefined) return "";
      if (typeof q === "object" && "text" in q) return String(q.text).trim(); // rich text/link
      if (typeof q === "object" && "result" in q) return String(q.result).trim(); // formula
      return String(q).trim();
    };

    const ismFamilya = matn(1);
    const telefonMatni = matn(2);
    const toifaMatni = matn(3);
    const guruhRaqami = matn(4);
    const forma083Matni = matn(5);
    const imtihonTuriMatni = matn(6);
    const nazariyIsmi = matn(7);
    const amaliyIsmi = matn(8);

    // Butunlay bo'sh qatorni jimgina o'tkazib yuboramiz (xato hisoblanmaydi).
    if (!ismFamilya && !telefonMatni && !toifaMatni && !guruhRaqami && !forma083Matni && !imtihonTuriMatni) continue;

    natijalar.jami += 1;
    const xatoQoshish = (sabab) => natijalar.xatolar.push({ qator: r, ism: ismFamilya || "(ismsiz)", sabab });

    if (!ismFamilya) { xatoQoshish("Ism familya bo'sh"); continue; }
    const telefon = telefonNormallash(telefonMatni);
    if (!telefonMatni || telefon.length !== 9) { xatoQoshish("Telefon raqami noto'g'ri (9 xonali bo'lishi kerak, masalan: 91 234 56 78)"); continue; }
    if (!guruhRaqami || !/^\d+$/.test(guruhRaqami)) { xatoQoshish("Guruh raqami noto'g'ri (faqat son bo'lishi kerak)"); continue; }

    const toifa = matndanToifa(toifaMatni);
    if (!toifa) { xatoQoshish(`Toifa "${toifaMatni}" tanilmadi — Yordam varag'idagi ro'yxatdan tanlang`); continue; }

    const forma083 = matndanForma083(forma083Matni);
    if (forma083 === null) { xatoQoshish(`083 forma "${forma083Matni}" tanilmadi (Tayyor / Tayyor emas)`); continue; }

    const imtihonTuri = matndanImtihonTuri(imtihonTuriMatni);
    if (!imtihonTuri) { xatoQoshish(`Imtihon turi "${imtihonTuriMatni}" tanilmadi`); continue; }

    const nazariyKerak = imtihonTuri === "nazariy" || imtihonTuri === "ikkalasi";
    const amaliyKerak = imtihonTuri === "amaliy" || imtihonTuri === "ikkalasi";

    let nazariyOqituvchiId = null;
    if (nazariyKerak) {
      if (!nazariyIsmi) { xatoQoshish("Nazariy o'qituvchi ko'rsatilmagan"); continue; }
      nazariyOqituvchiId = nazariyMap.get(nazariyIsmi.toLowerCase());
      if (!nazariyOqituvchiId) { xatoQoshish(`Nazariy o'qituvchi "${nazariyIsmi}" bu filialda topilmadi`); continue; }
    }

    let amaliyOqituvchiId = null;
    if (amaliyKerak) {
      if (!amaliyIsmi) { xatoQoshish("Amaliy o'qituvchi ko'rsatilmagan"); continue; }
      amaliyOqituvchiId = amaliyMap.get(amaliyIsmi.toLowerCase());
      if (!amaliyOqituvchiId) { xatoQoshish(`Amaliy o'qituvchi "${amaliyIsmi}" bu filialda topilmadi`); continue; }
    }

    let guruhId;
    try {
      guruhId = await guruhIdTop(supabase, guruhRaqami, filialId);
    } catch (err) {
      xatoQoshish(`Guruhni aniqlashda xatolik: ${err.message}`);
      continue;
    }

    const { error } = await supabase.from("talabalar").insert({
      ism_familya: ismFamilya,
      telefon,
      toifa,
      filial_id: filialId,
      guruh_id: guruhId,
      forma_083: forma083,
      imtihon_turi: imtihonTuri,
      nazariy_oqituvchi_id: nazariyOqituvchiId,
      amaliy_oqituvchi_id: amaliyOqituvchiId,
      qoshgan: user.id,
    });

    if (error) {
      xatoQoshish(error.message);
      continue;
    }

    natijalar.muvaffaqiyatli += 1;
  }

  return Response.json({ ok: true, ...natijalar });
}
