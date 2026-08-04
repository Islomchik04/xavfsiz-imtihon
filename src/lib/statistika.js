// talaba_imtihonlar (urinish) qatorlaridan statistik ko'rsatkichlarni
// hisoblaydigan sof funksiyalar. Har bir urinish qatorida quyidagilar bo'lishi
// kutiladi: nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija,
// created_at, imtihonlar:{sana}, talabalar:{filial_id, filiallar:{nomi},
// nazariy_oqituvchi_id, amaliy_oqituvchi_id,
// nazariy_oqituvchilar:{ism_familya}, amaliy_oqituvchilar:{ism_familya}}

function qismlarNatijasi(u) {
  // Bitta urinishning "umumiy" natijasi: kerakli qismlardan birortasi
  // kutilmoqda bo'lsa — kutilmoqda; ustuvorlik otmadi > kelmadi > boshqa >
  // otdi (aralash natija bo'lsa eng "og'ir" holat ko'rsatiladi). "kelmadi" va
  // "boshqa" ATAYIN "otdi" DEB HISOBLANMAYDI — ular natija/KPI hisobidan
  // chiqarib tashlanishi kerak (talabaHolati() bilan bir xil mantiq).
  const qismlar = [];
  if (u.nazariy_kerak) qismlar.push(u.nazariy_natija);
  if (u.amaliy_kerak) qismlar.push(u.amaliy_natija);
  if (qismlar.some((q) => q === "kutilmoqda")) return "kutilmoqda";
  if (qismlar.some((q) => q === "otmadi")) return "otmadi";
  if (qismlar.some((q) => q === "chetlatildi")) return "chetlatildi";
  if (qismlar.some((q) => q === "kelmadi")) return "kelmadi";
  if (qismlar.some((q) => q === "boshqa")) return "boshqa";
  return "otdi";
}

export function umumiyStatistika(talabalar, urinishlar) {
  const jami = talabalar.length;
  const hujjatTayyor = talabalar.filter((t) => t.hujjat_tayyor).length;

  const nazariyHisob = { jami: 0, otdi: 0, otmadi: 0, kutilmoqda: 0 };
  const amaliyHisob = { jami: 0, otdi: 0, otmadi: 0, kutilmoqda: 0 };

  for (const u of urinishlar) {
    if (u.nazariy_kerak) {
      nazariyHisob.jami += 1;
      nazariyHisob[u.nazariy_natija] = (nazariyHisob[u.nazariy_natija] || 0) + 1;
    }
    if (u.amaliy_kerak) {
      amaliyHisob.jami += 1;
      amaliyHisob[u.amaliy_natija] = (amaliyHisob[u.amaliy_natija] || 0) + 1;
    }
  }

  return {
    jami,
    hujjatTayyor,
    hujjatKutilmoqda: jami - hujjatTayyor,
    nazariy: nazariyHisob,
    amaliy: amaliyHisob,
  };
}

export function filialBoyichaStatistika(talabalar, urinishlar) {
  const guruh = new Map();
  for (const t of talabalar) {
    const nomi = t.filiallar?.nomi || "Noma'lum";
    if (!guruh.has(nomi)) {
      guruh.set(nomi, { nomi, jami: 0, hujjatTayyor: 0, otdi: 0, otmadi: 0 });
    }
    const yozuv = guruh.get(nomi);
    yozuv.jami += 1;
    if (t.hujjat_tayyor) yozuv.hujjatTayyor += 1;
  }

  for (const u of urinishlar) {
    const nomi = u.talabalar?.filiallar?.nomi || "Noma'lum";
    if (!guruh.has(nomi)) {
      guruh.set(nomi, { nomi, jami: 0, hujjatTayyor: 0, otdi: 0, otmadi: 0 });
    }
    const natija = qismlarNatijasi(u);
    const yozuv = guruh.get(nomi);
    if (natija === "otdi") yozuv.otdi += 1;
    else if (natija === "otmadi") yozuv.otmadi += 1;
  }

  return Array.from(guruh.values()).sort((a, b) => b.jami - a.jami);
}

// Har bir urinishdagi kerakli har bir qism (nazariy/amaliy) alohida
// o'qituvchiga bog'lanadi — bitta talaba ikkalasini ham topshirsa, ikkala
// o'qituvchisiga alohida hisoblanadi. MUHIM: o'qituvchi ID shu urinishning
// o'zidagi SNAPSHOT ustunidan (u.nazariy_oqituvchi_id/u.amaliy_oqituvchi_id)
// o'qiladi — talaba.nazariy/amaliy_oqituvchi_id (joriy biriktirilgan
// o'qituvchi) dan EMAS — aks holda talaba boshqa o'qituvchiga o'tkazilganda
// eski statistikasi ham noto'g'ri qayta taqsimlanib ketardi.
export function oqituvchiBoyichaStatistika(urinishlar, turi) {
  const oqIdMaydon = turi === "nazariy" ? "nazariy_oqituvchi_id" : "amaliy_oqituvchi_id";
  const oqObjMaydon = turi === "nazariy" ? "nazariy_oqituvchilar" : "amaliy_oqituvchilar";
  const kerakMaydon = turi === "nazariy" ? "nazariy_kerak" : "amaliy_kerak";
  const natijaMaydon = turi === "nazariy" ? "nazariy_natija" : "amaliy_natija";

  const guruh = new Map();
  for (const u of urinishlar) {
    if (!u[kerakMaydon]) continue;
    // Express toifadagi talabalar KPI/statistikaga hech qachon kirmaydi —
    // o'qituvchi biriktirilgan bo'lsa ham.
    if (u.talabalar?.toifa === "express") continue;
    const id = u[oqIdMaydon] ?? u.talabalar?.[oqIdMaydon];
    if (!id) continue;
    const ism = u.talabalar?.[oqObjMaydon]?.ism_familya || "Noma'lum";
    if (!guruh.has(id)) {
      guruh.set(id, { id, ism, jami: 0, otdi: 0, otmadi: 0, kutilmoqda: 0, kelmadi: 0, boshqa: 0, chetlatildi: 0 });
    }
    const yozuv = guruh.get(id);
    yozuv.jami += 1;
    const natija = u[natijaMaydon];
    if (natija === "otdi") yozuv.otdi += 1;
    else if (natija === "otmadi") yozuv.otmadi += 1;
    else if (natija === "kelmadi") yozuv.kelmadi += 1;
    else if (natija === "boshqa") yozuv.boshqa += 1;
    else if (natija === "chetlatildi") yozuv.chetlatildi += 1;
    else yozuv.kutilmoqda += 1;
  }

  return Array.from(guruh.values())
    .map((y) => ({
      ...y,
      // "Hisobga olinmaydi" qarori: kelmadi/boshqa foiz hisobidan chiqarib
      // tashlanadi — faqat otdi/otmadi solishtiriladi (KPI bilan bir xil).
      foiz: y.otdi + y.otmadi > 0 ? Math.round((y.otdi / (y.otdi + y.otmadi)) * 100) : null,
    }))
    .sort((a, b) => b.jami - a.jami);
}

// --- Reyting (TOP-3 va eng ko'p yiqilganlar) --------------------------------

// guruhKaliti(u) — urinishni qaysi "guruh"ga (masalan bitta imtihon kuni yoki
// bitta oy) tegishli ekanini aniqlaydigan funksiya, u.imtihonlar.sana asosida.
// Natija: [{id, ism, otdi, otmadi, jami, foiz}], faqat natija chiqqan
// (kutilmoqda bo'lmagan) qismlar hisobga olinadi.
export function oqituvchilarReytingi(urinishlar, guruhKaliti) {
  const guruhlar = new Map(); // kalit -> Map(oqId -> {ism, otdi, otmagan})

  function qoshish(kalit, oqId, ism, otdimi) {
    if (!oqId) return;
    if (!guruhlar.has(kalit)) guruhlar.set(kalit, new Map());
    const oqMap = guruhlar.get(kalit);
    if (!oqMap.has(oqId)) oqMap.set(oqId, { id: oqId, ism, otdi: 0, otmadi: 0 });
    const y = oqMap.get(oqId);
    if (otdimi) y.otdi += 1;
    else y.otmadi += 1;
  }

  // Diqqat: "kelmadi" va "boshqa" natijalari bu yerda ham HISOBGA OLINMAYDI —
  // faqat "otdi"/"otmadi" reytingga ta'sir qiladi (KPI bilan bir xil qoida).
  // "Amaliy o'qituvchi" tushunchasi olib tashlangan — amaliy natijalar
  // reytingga umuman kiritilmaydi, faqat nazariy natijalar hisoblanadi.
  for (const u of urinishlar) {
    const kalit = guruhKaliti(u);
    if (!kalit) continue;
    // Express toifadagi talabalar reytingga hech qachon kirmaydi.
    if (u.talabalar?.toifa === "express") continue;
    if (u.nazariy_kerak && (u.nazariy_natija === "otdi" || u.nazariy_natija === "otmadi")) {
      qoshish(
        kalit,
        u.talabalar?.nazariy_oqituvchi_id,
        u.talabalar?.nazariy_oqituvchilar?.ism_familya,
        u.nazariy_natija === "otdi"
      );
    }
  }

  const natija = new Map(); // kalit -> {top: [...], engKopYiqilgan: {...}}
  for (const [kalit, oqMap] of guruhlar) {
    const royxat = Array.from(oqMap.values()).map((y) => ({
      ...y,
      jami: y.otdi + y.otmadi,
      foiz: y.otdi + y.otmadi > 0 ? Math.round((y.otdi / (y.otdi + y.otmadi)) * 100) : 0,
    }));
    const top = [...royxat].sort((a, b) => b.otdi - a.otdi || b.foiz - a.foiz).slice(0, 3);
    const engKopYiqilgan = [...royxat]
      .filter((y) => y.otmadi > 0)
      .sort((a, b) => b.otmadi - a.otmadi)[0] || null;
    natija.set(kalit, { top, engKopYiqilgan, hammasi: royxat });
  }
  return natija;
}

// Davr bo'yicha (masalan hafta yoki oy) umumiy jami/otgan/otmagan + shu davrning
// TOP-3 va eng ko'p yiqilgan o'qituvchisi. kalitFn(u) -> davr kaliti yoki null,
// korinishFn(kalit) -> ko'rsatish uchun matn. Natija kalit bo'yicha kamayish
// tartibida (eng yangi davr birinchi) qaytariladi.
export function davrBoyichaStatistika(urinishlar, kalitFn, korinishFn) {
  const reyting = oqituvchilarReytingi(urinishlar, kalitFn);

  // Bu yerda ham "kelmadi"/"boshqa" jami/otgan/otmagan hisobidan chiqarib
  // tashlanadi — faqat "otdi"/"otmadi" natijalari sanaladi (KPI bilan bir xil).
  // "Amaliy o'qituvchi" tushunchasi olib tashlangan — bu jamlar ham faqat
  // nazariy natijalardan hisoblanadi.
  const jamlar = new Map(); // kalit -> {jami, otgan, otmagan}
  for (const u of urinishlar) {
    const kalit = kalitFn(u);
    if (!kalit) continue;
    // Express toifadagi talabalar bu jamlarga ham kirmaydi.
    if (u.talabalar?.toifa === "express") continue;
    if (!jamlar.has(kalit)) jamlar.set(kalit, { jami: 0, otgan: 0, otmagan: 0 });
    const y = jamlar.get(kalit);
    if (u.nazariy_kerak && (u.nazariy_natija === "otdi" || u.nazariy_natija === "otmadi")) {
      y.jami += 1;
      if (u.nazariy_natija === "otdi") y.otgan += 1;
      else y.otmagan += 1;
    }
  }

  const kalitlar = Array.from(jamlar.keys()).sort().reverse();
  return kalitlar.map((kalit) => {
    const { jami, otgan, otmagan } = jamlar.get(kalit);
    const reytingYozuv = reyting.get(kalit) || { top: [], engKopYiqilgan: null };
    return {
      kalit,
      korinish: korinishFn(kalit),
      jami,
      otgan,
      otmagan,
      foiz: jami > 0 ? Math.round((otgan / jami) * 100) : 0,
      top: reytingYozuv.top,
      engKopYiqilgan: reytingYozuv.engKopYiqilgan,
    };
  });
}
