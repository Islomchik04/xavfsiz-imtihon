export const ROLLAR = {
  superadmin: "Superadmin",
  admin: "Admin",
  hujjatchi: "Hujjatchi",
  imtihonchi: "Imtihon boshqaruvchisi",
  oqituvchi: "O'qituvchi",
};

export const ROL_TAVSIF = {
  superadmin: "Tizim sozlamalari: foydalanuvchi, filial, guruh, o'qituvchi boshqaruvi",
  admin: "O'z filiali bo'yicha imtihonchi talabalarni ro'yxatga oladi",
  hujjatchi: "Talabalar hujjatlarini tekshiradi va imtihonga tayyorlaydi",
  imtihonchi: "Imtihonlarni boshqaradi, talabani qidirib natijasini belgilaydi",
  oqituvchi: "O'z talabalari va KPI'sini ko'radi",
};

export const IMTIHON_TURI = {
  nazariy: "Nazariy",
  amaliy: "Amaliy",
  ikkalasi: "Nazariy + Amaliy (bir kunda)",
};

export const NATIJA = {
  kutilmoqda: "Kutilmoqda",
  otdi: "O'tdi",
  otmadi: "O'tmadi",
  kelmadi: "Kelmadi",
  boshqa: "Boshqa",
  chetlatildi: "Chetlatildi",
};

export const NATIJA_RANG = {
  kutilmoqda: "bg-slate-100 text-slate-600",
  otdi: "bg-emerald-100 text-emerald-700",
  otmadi: "bg-rose-100 text-rose-700",
  kelmadi: "bg-amber-100 text-amber-700",
  boshqa: "bg-violet-100 text-violet-700",
  chetlatildi: "bg-slate-700 text-white",
};

// Natijalar orasida qaysilari "yakunlangan" (kutilmoqda emas) hisoblanadi —
// bularning barchasi qayta imtihonga biriktirish tugmasini chiqaradi.
export const MUVAFFAQIYATSIZ_NATIJALAR = ["otmadi", "kelmadi", "boshqa", "chetlatildi"];

export const OQITUVCHI_TURI = {
  nazariy: "Nazariy o'qituvchi",
  amaliy: "Amaliy o'qituvchi",
};

// Talaba toifasi — haydovchilik toifalari + maxsus kurs turlari.
export const TOIFALAR = {
  A: "A",
  B: "B",
  BC: "BC",
  C: "C",
  D: "D",
  DE: "DE",
  CE: "CE",
  express: "Express",
  avtoledi: "Avtoledi",
};

// 083 forma holati (Admin ro'yxatga olishda belgilaydi) — UCH holat: Ha (bor),
// Yo'q (umuman yo'q), O'zida (talabada bor, hali maktabga topshirilmagan).
// Diqqat: bu Hujjatchi bosqichidagi hujjat_forma_083 (Ha/Yo'q, majburiy) bilan
// aralashtirilmasin — o'sha maydon o'zgarmagan, hali ham strikt boolean.
export const FORMA_083_LABEL = {
  ha: "Ha",
  yoq: "Yo'q",
  ozida: "O'zida",
};

export const FORMA_083_RANG = {
  ha: "bg-emerald-100 text-emerald-700",
  yoq: "bg-rose-100 text-rose-700",
  ozida: "bg-amber-100 text-amber-700",
};

// Badge komponenti uchun "ton" nomlari (Badge.js'dagi tonlar ro'yxatiga mos).
export const FORMA_083_TON = {
  ha: "emerald",
  yoq: "rose",
  ozida: "amber",
};

// Hujjatchi bosqichidagi 083 forma tasdig'i (hujjat_forma_083) — bu hali ham
// strikt boolean (imtihonchilar safiga qo'shish uchun majburiy "Ha" bo'lishi
// kerak, "o'zida" degan oraliq holat bu yerda ma'nosiz).
export const HUJJAT_FORMA_083_LABEL = {
  true: "Tayyor",
  false: "Tayyor emas",
};

// Talaba umumiy holati (imtihonHisob.js#talabaHolati natijasi)
export const TALABA_HOLATI = {
  rad_etilgan: "Rad etilgan",
  hujjat_kutilmoqda: "Hujjat kutilmoqda",
  imtihon_yoq: "Imtihonga biriktirilmagan",
  kutilmoqda: "Natija kutilmoqda",
  otdi: "O'tdi",
  otmadi: "O'tolmadi — qayta imtihon kerak",
  kelmadi: "Kelmadi — qayta imtihon kerak",
  boshqa: "Boshqa sabab — qayta imtihon kerak",
  chetlatildi: "Chetlatildi — qayta imtihon kerak",
};

// Imtihon sessiyasi hayotiy sikli holati
export const IMTIHON_HOLATI = {
  boshlanmagan: "Boshlanmagan",
  boshlangan: "Boshlangan",
  yakunlangan: "Yakunlangan",
};

export const IMTIHON_HOLATI_RANG = {
  boshlanmagan: "bg-slate-100 text-slate-500",
  boshlangan: "bg-emerald-100 text-emerald-700",
  yakunlangan: "bg-brand-100 text-brand-700",
};

export const TALABA_HOLATI_RANG = {
  rad_etilgan: "bg-rose-100 text-rose-700",
  hujjat_kutilmoqda: "bg-amber-100 text-amber-700",
  imtihon_yoq: "bg-slate-100 text-slate-500",
  kutilmoqda: "bg-brand-100 text-brand-700",
  otdi: "bg-emerald-100 text-emerald-700",
  otmadi: "bg-rose-100 text-rose-700",
  kelmadi: "bg-amber-100 text-amber-700",
  boshqa: "bg-violet-100 text-violet-700",
  chetlatildi: "bg-slate-700 text-white",
};
