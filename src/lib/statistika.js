// Talabalar ro'yxatidan (RLS allaqachon filial bo'yicha filtrlagan) statistik
// ko'rsatkichlarni hisoblaydigan sof funksiyalar. Server komponentda ishlatiladi.

export function umumiyStatistika(talabalar) {
  const jami = talabalar.length;
  const hujjatTayyor = talabalar.filter((t) => t.hujjat_tayyor).length;

  const nazariyKerak = talabalar.filter((t) => t.imtihon_turi !== "amaliy");
  const amaliyKerak = talabalar.filter((t) => t.imtihon_turi !== "nazariy");

  const natijaHisobla = (royxat, maydon) => ({
    jami: royxat.length,
    otdi: royxat.filter((t) => t[maydon] === "otdi").length,
    otmadi: royxat.filter((t) => t[maydon] === "otmadi").length,
    kutilmoqda: royxat.filter((t) => t[maydon] === "kutilmoqda").length,
  });

  return {
    jami,
    hujjatTayyor,
    hujjatKutilmoqda: jami - hujjatTayyor,
    nazariy: natijaHisobla(nazariyKerak, "nazariy_natija"),
    amaliy: natijaHisobla(amaliyKerak, "amaliy_natija"),
  };
}

export function filialBoyichaStatistika(talabalar) {
  const guruh = new Map();
  for (const t of talabalar) {
    const nomi = t.filiallar?.nomi || "Noma'lum";
    if (!guruh.has(nomi)) {
      guruh.set(nomi, { nomi, jami: 0, hujjatTayyor: 0, otdi: 0, otmadi: 0 });
    }
    const yozuv = guruh.get(nomi);
    yozuv.jami += 1;
    if (t.hujjat_tayyor) yozuv.hujjatTayyor += 1;
    if (t.nazariy_natija === "otdi" || t.amaliy_natija === "otdi") yozuv.otdi += 1;
    if (
      (t.imtihon_turi !== "amaliy" && t.nazariy_natija === "otmadi") ||
      (t.imtihon_turi !== "nazariy" && t.amaliy_natija === "otmadi")
    ) {
      yozuv.otmadi += 1;
    }
  }
  return Array.from(guruh.values()).sort((a, b) => b.jami - a.jami);
}

export function oqituvchiBoyichaStatistika(talabalar, turi) {
  const maydonId = turi === "nazariy" ? "nazariy_oqituvchi_id" : "amaliy_oqituvchi_id";
  const maydonObj = turi === "nazariy" ? "nazariy_oqituvchilar" : "amaliy_oqituvchilar";
  const natijaMaydon = turi === "nazariy" ? "nazariy_natija" : "amaliy_natija";

  const guruh = new Map();
  for (const t of talabalar) {
    const id = t[maydonId];
    if (!id) continue;
    const ism = t[maydonObj]?.ism_familya || "Noma'lum";
    if (!guruh.has(id)) {
      guruh.set(id, { id, ism, jami: 0, otdi: 0, otmadi: 0, kutilmoqda: 0 });
    }
    const yozuv = guruh.get(id);
    yozuv.jami += 1;
    if (t[natijaMaydon] === "otdi") yozuv.otdi += 1;
    else if (t[natijaMaydon] === "otmadi") yozuv.otmadi += 1;
    else yozuv.kutilmoqda += 1;
  }

  return Array.from(guruh.values())
    .map((y) => ({
      ...y,
      foiz: y.otdi + y.otmadi > 0 ? Math.round((y.otdi / (y.otdi + y.otmadi)) * 100) : null,
    }))
    .sort((a, b) => b.jami - a.jami);
}
