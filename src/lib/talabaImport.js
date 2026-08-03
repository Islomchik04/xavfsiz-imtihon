// Talabalarni Excel orqali import qilish uchun umumiy yordamchilar — shablon
// yaratish (/api/talabalar-shablon) va faylni o'qish (/api/talabalar-import)
// BIR XIL ustun tartibi va qiymatlar ro'yxatidan foydalanishi kerak, aks
// holda shablonda tanlangan qiymat import paytida "tanilmay" qolishi mumkin.

import { IMTIHON_TURI, FORMA_083_LABEL, TOIFALAR } from "./constants";

// Shablondagi ustunlar tartibi (A, B, C, ...). "namuna" — shablon 2-qatoriga
// yoziladigan misol qiymat (foydalanuvchi buni ko'rib format nima ekanini
// tushunadi; import paytida bu qator HAR DOIM o'tkazib yuboriladi).
export const IMPORT_USTUNLARI = [
  { key: "ism_familya", header: "Ism familya *", namuna: "Aliyev Vali Aliyevich", kenglik: 28 },
  { key: "telefon", header: "Telefon raqami * (998siz, 9 xonali)", namuna: "91 234 56 78", kenglik: 22 },
  { key: "toifa", header: "Toifa *", namuna: "B", kenglik: 12 },
  { key: "guruh_raqami", header: "Guruh raqami *", namuna: "24", kenglik: 14 },
  { key: "forma_083", header: "083 forma *", namuna: FORMA_083_LABEL[true], kenglik: 14 },
  { key: "imtihon_turi", header: "Imtihon turi *", namuna: IMTIHON_TURI.ikkalasi, kenglik: 26 },
  { key: "nazariy_oqituvchi", header: "Nazariy o'qituvchi", namuna: "", kenglik: 24 },
  { key: "amaliy_oqituvchi", header: "Amaliy o'qituvchi", namuna: "", kenglik: 24 },
];

// Header qatoridan keyingi BIRINCHI qator har doim "namuna" hisoblanadi va
// import paytida o'tkazib yuboriladi (Excel qatori: 1-header, 2-namuna,
// 3-dan haqiqiy ma'lumot boshlanadi).
export const NAMUNA_QATOR_RAQAMI = 2;
export const MALUMOT_BOSHLANISH_QATORI = 3;

function teskariLugat(lugat) {
  const m = new Map();
  for (const [kalit, matn] of Object.entries(lugat)) {
    m.set(String(matn).trim().toLowerCase(), kalit);
  }
  return m;
}

const TOIFA_TESKARI = teskariLugat(TOIFALAR);
const IMTIHON_TURI_TESKARI = teskariLugat(IMTIHON_TURI);
const FORMA_083_TESKARI = teskariLugat(FORMA_083_LABEL);

// Excel katakchasidagi matnni tegishli lug'at kalitiga aylantiradi (katta-kichik
// harf va bo'sh joylarga sezgir emas). Topilmasa null qaytaradi.
export function matndanToifa(matn) {
  if (!matn) return null;
  return TOIFA_TESKARI.get(String(matn).trim().toLowerCase()) || null;
}
export function matndanImtihonTuri(matn) {
  if (!matn) return null;
  return IMTIHON_TURI_TESKARI.get(String(matn).trim().toLowerCase()) || null;
}
export function matndanForma083(matn) {
  if (!matn) return null;
  const kalit = FORMA_083_TESKARI.get(String(matn).trim().toLowerCase());
  if (kalit === undefined) return null;
  return kalit === "true"; // JS obyekt kaliti sifatida "true"/"false" satr bo'ladi
}
