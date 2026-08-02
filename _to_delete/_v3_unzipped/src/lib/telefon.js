// Foydalanuvchilar tizimga TELEFON RAQAM + PAROL bilan kiradi, lekin
// Supabase Auth email+parolga asoslangan — shu sabab telefon raqamni
// sun'iy (ichki) emailga map qilamiz. Foydalanuvchi buni hech qachon ko'rmaydi.

const DOMEN = process.env.NEXT_PUBLIC_AUTH_PHONE_DOMAIN || "xavfsizimtihon.local";

// Kirishdagi har xil formatlarni (bo'sh joy, +998, tire) bitta shaklga keltiradi:
// faqat raqamlar, so'nggi 9 ta xonasi (masalan "91 234 56 78" -> "912345678")
export function telefonNormallash(xom) {
  const faqatRaqam = String(xom || "").replace(/\D/g, "");
  return faqatRaqam.slice(-9);
}

export function telefonKorinishi(normal) {
  const t = String(normal || "").padStart(9, "0");
  return `${t.slice(0, 2)} ${t.slice(2, 5)} ${t.slice(5, 7)} ${t.slice(7, 9)}`;
}

export function telefonToEmail(xom) {
  return `${telefonNormallash(xom)}@${DOMEN}`;
}
