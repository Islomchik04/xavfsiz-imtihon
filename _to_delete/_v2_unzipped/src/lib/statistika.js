// talaba_imtihonlar (urinish) qatorlaridan statistik ko'rsatkichlarni
// hisoblaydigan sof funksiyalar. Har bir urinish qatorida quyidagilar bo'lishi
// kutiladi: nazariy_kerak, amaliy_kerak, nazariy_natija, amaliy_natija,
// created_at, imtihonlar:{sana}, talabalar:{filial_id, filiallar:{nomi},
// nazariy_oqituvchi_id, amaliy_oqituvchi_id,
// nazariy_oqituvchilar:{ism_familya}, amaliy_oqituvchilar:{ism_familya}}

function qismlarNatijasi(u) {
  // Bitta urinishning "umumiy" natijasi: kerakli qismlardan birortasi
  // kutilmoqda bo'lsa — kutilmoqda; birortasi otmadi bo'lsa — otmadi;
  // aks holda otdi.
  const qismlar = [];
  if (u.nazariy_kerak) qismlar.push(u.nazariy_natija);
  if (u.amaliy_kerak) qismlar.push(u.amaliy_natija);
  if (qismlar.some((q) => q === "kutilmoqda")) return "kutilmoqda";
  if (qismlar.some((q) => q === "otmadi")) return "otmadi";
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
// o'qituvchisiga alohida hisoblanadi.
export function oqituvchiBoyichaStatistika(urinishlar, turi) {
  const oqIdMaydon = turi === "nazariy" ? "nazariy_oqituvchi_id" : "amaliy_oqituvchi_id";
  const oqObjMaydon = turi === "nazariy" ? "nazariy_oqituvchilar" : "amaliy_oqituvchilar";
  const kerakMaydon = turi === "nazariy" ? "nazariy_kerak" : "amaliy_kerak";
  const natijaMaydon = turi === "nazariy" ? "nazariy_natija" : "amaliy_natija";

  const guruh = new Map();
  for (const u of urinishlar) {
    if (!u[kerakMaydon]) continue;
    const id = u.talabalar?.[oqIdMaydon];
    if (!id) continue;
    const ism = u.talabalar?.[oqObjMaydon]?.ism_familya || "Noma'lum";
    if (!guruh.has(id)) {
      guruh.set(id, { id, ism, jami: 0, otdi: 0, otmadi: 0, kutilmoqda: 0 });
    }
    const yozuv = guruh.get(id);
    yozuv.jami += 1;
    const natija = u[natijaMaydon];
    if (natija === "otdi") yozuv.otdi += 1;
    else if (natija === "otmadi") yozuv.otmadi += 1;
    else yozuv.kutilmoqda += 1;
  }

  return Array.from(guruh.values())
    .map((y) => ({
      ...y,
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

  for (const u of urinishlar) {
    const kalit = guruhKaliti(u);
    if (!kalit) continue;
    if (u.nazariy_kerak && u.nazariy_natija !== "kutilmoqda") {
      qoshish(
        kalit,
        u.talabalar?.nazariy_oqituvchi_id,
        u.talabalar?.nazariy_oqituvchilar?.ism_familya,
        u.nazariy_natija === "otdi"
      );
    }
    if (u.amaliy_kerak && u.amaliy_natija !== "kutilmoqda") {
      qoshish(
        kalit,
        u.talabalar?.amaliy_oqituvchi_id,
        u.talabalar?.amaliy_oqituvchilar?.ism_familya,
        u.amaliy_natija === "otdi"
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

  const jamlar = new Map(); // kalit -> {jami, otgan, otmagan}
  for (const u of urinishlar) {
    const kalit = kalitFn(u);
    if (!kalit) continue;
    if (!jamlar.has(kalit)) jamlar.set(kalit, { jami: 0, otgan: 0, otmagan: 0 });
    const y = jamlar.get(kalit);
    if (u.nazariy_kerak && u.nazariy_natija !== "kutilmoqda") {
      y.jami += 1;
      if (u.nazariy_natija === "otdi") y.otgan += 1;
      else y.otmagan += 1;
    }
    if (u.amaliy_kerak && u.amaliy_natija !== "kutilmoqda") {
      y.jami += 1;
      if (u.amaliy_natija === "otdi") y.otgan += 1;
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
