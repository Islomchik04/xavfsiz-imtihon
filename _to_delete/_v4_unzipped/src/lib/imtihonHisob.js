// Imtihon urinishlari asosidagi hisob-kitob funksiyalari: talaba holati,
// hafta/oy guruhlash va KPI (maosh) formulasi. Sof funksiyalar — server
// komponentlarda fetch qilingan ma'lumot ustida ishlatiladi.

// --- Sana yordamchilari -----------------------------------------------------

// Berilgan "YYYY-MM-DD" sana qaysi haftaga (Dushanba-Yakshanba) tegishli
// ekanini o'sha haftaning Dushanba sanasi ("YYYY-MM-DD") sifatida qaytaradi.
export function haftaBoshi(sanaStr) {
  const d = new Date(`${sanaStr}T00:00:00`);
  const kun = d.getDay(); // 0=Yakshanba ... 6=Shanba
  const farq = kun === 0 ? -6 : 1 - kun;
  d.setDate(d.getDate() + farq);
  return d.toISOString().slice(0, 10);
}

export function haftaOxiri(haftaBoshiStr) {
  const d = new Date(`${haftaBoshiStr}T00:00:00`);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

export function oyKaliti(sanaStr) {
  return sanaStr.slice(0, 7); // "YYYY-MM"
}

const OY_NOMLARI = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

export function oyKorinishi(oyKaliti_) {
  const [yil, oy] = oyKaliti_.split("-").map(Number);
  return `${OY_NOMLARI[oy - 1]} ${yil}`;
}

export function sanaKorinishi(sanaStr) {
  const [yil, oy, kun] = sanaStr.split("-");
  return `${kun}.${oy}.${yil}`;
}

// --- Talaba holati (urinishlar tarixidan kelib chiqib) ----------------------

// "Yakunlangan lekin o'tmagan" hisoblanadigan natijalar — o'tmadi, kelmadi
// va boshqa (sababli) — bularning barchasi qayta imtihonga biriktirilishi
// kerakligini bildiradi.
const MUVAFFAQIYATSIZ = ["otmadi", "kelmadi", "boshqa"];

// urinishlar: talaba_imtihonlar qatorlari ro'yxati (bitta talaba uchun),
// har birida nazariy_kerak/amaliy_kerak/nazariy_natija/amaliy_natija/created_at bor
export function talabaHolati(urinishlar) {
  if (!urinishlar || urinishlar.length === 0) return "imtihon_yoq";
  const oxirgi = [...urinishlar].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )[0];
  const qismlar = [];
  if (oxirgi.nazariy_kerak) qismlar.push(oxirgi.nazariy_natija);
  if (oxirgi.amaliy_kerak) qismlar.push(oxirgi.amaliy_natija);
  if (qismlar.some((q) => q === "kutilmoqda")) return "kutilmoqda";
  // Ustuvorlik: otmadi > kelmadi > boshqa > otdi (aralash natija bo'lsa eng
  // "og'ir" holat ko'rsatiladi)
  if (qismlar.some((q) => q === "otmadi")) return "otmadi";
  if (qismlar.some((q) => q === "kelmadi")) return "kelmadi";
  if (qismlar.some((q) => q === "boshqa")) return "boshqa";
  return "otdi";
}

export function oxirgiUrinish(urinishlar) {
  if (!urinishlar || urinishlar.length === 0) return null;
  return [...urinishlar].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )[0];
}

// Talaba aynan BITTA urinishda (qayta topshirmasdan) o'tganmi — "bir
// urinishda o'tganlar" statistikasi uchun.
export function birUrinishdaOtganmi(urinishlar) {
  if (!urinishlar || urinishlar.length !== 1) return false;
  return talabaHolati(urinishlar) === "otdi";
}

// Talabaning FAQAT bitta qismi (nazariy YOKI amaliy) bo'yicha holatini
// aniqlaydi — o'qituvchi kabinetida "Mening o'quvchilarim" bo'limi uchun
// (talabaHolati() ikkala qismni birga ko'radi, bu funksiya faqat bittasini).
// Natija: "kirmagan" (hali bu qism bo'yicha yakunlangan natija yo'q),
// "otgan", "otolmagan" (otmadi/kelmadi/boshqa — barchasi qayta imtihon kerak).
export function qismHolati(urinishlar, turi) {
  const kerakMaydon = turi === "nazariy" ? "nazariy_kerak" : "amaliy_kerak";
  const natijaMaydon = turi === "nazariy" ? "nazariy_natija" : "amaliy_natija";
  const tegishli = (urinishlar || []).filter((u) => u[kerakMaydon]);
  if (tegishli.length === 0) return "kirmagan";
  const oxirgi = [...tegishli].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  const natija = oxirgi[natijaMaydon];
  if (!natija || natija === "kutilmoqda") return "kirmagan";
  if (natija === "otdi") return "otgan";
  return "otolmagan"; // otmadi / kelmadi / boshqa
}

// Talaba shu bitta qismdan (nazariy yoki amaliy) aynan BITTA urinishda
// o'tganmi.
export function qismBirUrinishdaOtganmi(urinishlar, turi) {
  const kerakMaydon = turi === "nazariy" ? "nazariy_kerak" : "amaliy_kerak";
  const natijaMaydon = turi === "nazariy" ? "nazariy_natija" : "amaliy_natija";
  const tegishli = (urinishlar || []).filter((u) => u[kerakMaydon]);
  return tegishli.length === 1 && tegishli[0][natijaMaydon] === "otdi";
}

// Qayta imtihonga biriktirish tugmasi ko'rinishi kerakmi (oxirgi urinishda
// hech bo'lmasa bitta kerakli qism muvaffaqiyatsiz — otmadi/kelmadi/boshqa —
// bo'lsa va boshqa kutilayotgan qism yo'q bo'lsa) — va default qaysi qismlar
// (nazariy/amaliy) tanlanishi kerak.
export function qaytaBiriktirishKerakmi(urinishlar) {
  const oxirgi = oxirgiUrinish(urinishlar);
  if (!oxirgi) return null;
  const nazariyHolat = oxirgi.nazariy_kerak ? oxirgi.nazariy_natija : null;
  const amaliyHolat = oxirgi.amaliy_kerak ? oxirgi.amaliy_natija : null;
  if (nazariyHolat === "kutilmoqda" || amaliyHolat === "kutilmoqda") return null;
  const nazariyMuvaffaqiyatsiz = MUVAFFAQIYATSIZ.includes(nazariyHolat);
  const amaliyMuvaffaqiyatsiz = MUVAFFAQIYATSIZ.includes(amaliyHolat);
  if (!nazariyMuvaffaqiyatsiz && !amaliyMuvaffaqiyatsiz) return null;
  return { nazariyKerak: nazariyMuvaffaqiyatsiz, amaliyKerak: amaliyMuvaffaqiyatsiz };
}

// --- KPI formulasi -----------------------------------------------------------

export const KPI_MUKOFOT_BIR = 100000;

// Bitta davr (hafta) uchun: nechta o'quvchi o'tgan / o'tmagan bo'lsa,
// domlaga qancha mukofot/jarima tegishini hisoblaydi.
export function kpiDaraja(otgan, otmagan) {
  const jami = otgan + otmagan;
  if (jami === 0) return null;
  const foiz = otgan / jami;
  let jarimaBir;
  if (foiz >= 0.8) jarimaBir = 0;
  else if (foiz >= 0.5) jarimaBir = 50000;
  else jarimaBir = 100000;
  const mukofot = otgan * KPI_MUKOFOT_BIR;
  const jarima = otmagan * jarimaBir;
  return { foiz, otgan, otmagan, jami, jarimaBir, mukofot, jarima, sof: mukofot - jarima };
}

// urinishlar: bir oyga tegishli talaba_imtihonlar qatorlari, quyidagi
// bog'langan ma'lumot bilan birga: imtihon.sana, talaba.nazariy_oqituvchi_id,
// talaba.amaliy_oqituvchi_id, talaba.filial_id
// oqituvchilar: {id, ism_familya, turi} ro'yxati
export function oqituvchilarKpiHisoblash(urinishlar, oqituvchilar) {
  const oqMap = new Map(oqituvchilar.map((o) => [o.id, o]));
  // oqituvchi_id -> hafta -> {otgan, otmagan}
  const hisob = new Map();

  function qoshish(oqituvchiId, hafta, otdimi) {
    if (!oqituvchiId || !oqMap.has(oqituvchiId)) return;
    if (!hisob.has(oqituvchiId)) hisob.set(oqituvchiId, new Map());
    const haftalar = hisob.get(oqituvchiId);
    if (!haftalar.has(hafta)) haftalar.set(hafta, { otgan: 0, otmagan: 0 });
    const yozuv = haftalar.get(hafta);
    if (otdimi) yozuv.otgan += 1;
    else yozuv.otmagan += 1;
  }

  // Diqqat: "kelmadi" va "boshqa" natijalari KPI hisobidan butunlay chiqarib
  // tashlanadi (na o'tgan, na o'tmagan sifatida hisoblanmaydi) — bu odatda
  // o'qituvchining aybi bo'lmagani uchun. Faqat "otdi"/"otmadi" hisobga olinadi.
  for (const u of urinishlar) {
    const sana = u.imtihonlar?.sana;
    if (!sana) continue;
    const hafta = haftaBoshi(sana);
    if (u.nazariy_kerak && (u.nazariy_natija === "otdi" || u.nazariy_natija === "otmadi")) {
      qoshish(u.talabalar?.nazariy_oqituvchi_id, hafta, u.nazariy_natija === "otdi");
    }
    if (u.amaliy_kerak && (u.amaliy_natija === "otdi" || u.amaliy_natija === "otmadi")) {
      qoshish(u.talabalar?.amaliy_oqituvchi_id, hafta, u.amaliy_natija === "otdi");
    }
  }

  const natija = [];
  for (const oqituvchi of oqituvchilar) {
    const haftalarMap = hisob.get(oqituvchi.id);
    const haftalar = [];
    let oyOtgan = 0;
    let oyOtmagan = 0;
    let oyMukofot = 0;
    let oyJarima = 0;
    if (haftalarMap) {
      const kalitlar = Array.from(haftalarMap.keys()).sort();
      for (const hafta of kalitlar) {
        const { otgan, otmagan } = haftalarMap.get(hafta);
        const daraja = kpiDaraja(otgan, otmagan);
        if (!daraja) continue;
        haftalar.push({ hafta, haftaOxiri: haftaOxiri(hafta), ...daraja });
        oyOtgan += otgan;
        oyOtmagan += otmagan;
        oyMukofot += daraja.mukofot;
        oyJarima += daraja.jarima;
      }
    }
    if (haftalar.length === 0) continue; // shu oyda umuman natija chiqmagan
    natija.push({
      oqituvchi,
      haftalar,
      oy: {
        otgan: oyOtgan,
        otmagan: oyOtmagan,
        jami: oyOtgan + oyOtmagan,
        mukofot: oyMukofot,
        jarima: oyJarima,
        sof: oyMukofot - oyJarima,
      },
    });
  }

  return natija.sort((a, b) => b.oy.sof - a.oy.sof);
}
