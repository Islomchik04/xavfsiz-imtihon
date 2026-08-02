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
};

export const NATIJA_RANG = {
  kutilmoqda: "bg-slate-100 text-slate-600",
  otdi: "bg-emerald-100 text-emerald-700",
  otmadi: "bg-rose-100 text-rose-700",
};

export const OQITUVCHI_TURI = {
  nazariy: "Nazariy o'qituvchi",
  amaliy: "Amaliy o'qituvchi",
};

// 083 forma holati — "Ha/Yo'q" o'rniga "Tayyor/Tayyor emas" ko'rinishida
export const FORMA_083_LABEL = {
  true: "Tayyor",
  false: "Tayyor emas",
};

export const FORMA_083_RANG = {
  true: "bg-emerald-100 text-emerald-700",
  false: "bg-amber-100 text-amber-700",
};

// Talaba umumiy holati (imtihonHisob.js#talabaHolati natijasi)
export const TALABA_HOLATI = {
  hujjat_kutilmoqda: "Hujjat kutilmoqda",
  imtihon_yoq: "Imtihonga biriktirilmagan",
  kutilmoqda: "Natija kutilmoqda",
  otdi: "O'tdi",
  otmadi: "O'tolmadi — qayta imtihon kerak",
};

export const TALABA_HOLATI_RANG = {
  hujjat_kutilmoqda: "bg-amber-100 text-amber-700",
  imtihon_yoq: "bg-slate-100 text-slate-500",
  kutilmoqda: "bg-brand-100 text-brand-700",
  otdi: "bg-emerald-100 text-emerald-700",
  otmadi: "bg-rose-100 text-rose-700",
};
