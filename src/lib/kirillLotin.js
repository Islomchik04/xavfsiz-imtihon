// O'zbek krill alifbosidagi matnni lotin alifbosiga o'giradi (Vazirlar
// Mahkamasining rasmiy krill-lotin jadvali asosida). Talabalar ma'lumotlari
// (ism-familya) krill harflarida kiritilgan hollarda foydalanish uchun.
//
// Eslatma: "е" harfi so'z boshida yoki unlidan keyin "ye", undoshdan keyin
// "e" deb o'giriladi. Amaliyotda (masalan O'zbekistondagi hujjatlarda)
// so'z boshidagi "Е" ko'pincha shunchaki "E" deb ham yoziladi — shu sabab
// bu funksiya so'z boshida ham "E"/"e" ni ishlatadi (masalan "Егамбердиев"
// -> "Egamberdiyev", keng tarqalgan yozilishiga mos).

const BIR_HARFLI = {
  а: "a", б: "b", в: "v", г: "g", д: "d",
  з: "z", и: "i", й: "y", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "x",
  ъ: "", ь: "", ы: "i", э: "e",
};

const KOP_HARFLI = {
  ё: "yo", ж: "j", ц: "ts", ч: "ch", ш: "sh", щ: "sh",
  ю: "yu", я: "ya", ў: "o'", қ: "q", ғ: "g'", ҳ: "h",
};

const UNLILAR = new Set(["а", "е", "ё", "и", "о", "у", "ў", "э", "ю", "я", "ы"]);

function harfniOgir(kichik, oldingiKichik, sozBoshimi) {
  if (kichik === "е") {
    // So'z boshida — "e" (amaliyotda keng tarqalgan yozilishi, masalan
    // "Егамбердиев" -> "Egamberdiyev"). Unlidan keyin (so'z ichida) — "ye"
    // (masalan "Хайруллаев" -> "Xayrullayev", "Хўжаев" -> "Xo'jayev").
    // Undoshdan keyin — oddiy "e".
    if (sozBoshimi) return "e";
    const unlidanKeyin = oldingiKichik != null && UNLILAR.has(oldingiKichik);
    return unlidanKeyin ? "ye" : "e";
  }
  if (BIR_HARFLI[kichik] != null) return BIR_HARFLI[kichik];
  if (KOP_HARFLI[kichik] != null) return KOP_HARFLI[kichik];
  return null;
}

function boshHarfniQil(lotin, boshDaKattaMi) {
  if (!lotin) return lotin;
  if (!boshDaKattaMi) return lotin;
  return lotin.charAt(0).toUpperCase() + lotin.slice(1);
}

export function kirilldanLotinga(matn) {
  if (!matn) return matn;
  let natija = "";
  let oldingiKichik = null;
  let sozBoshimi = true;
  for (const belgi of matn) {
    const kichik = belgi.toLowerCase();
    const kattaMi = belgi !== kichik && belgi === belgi.toUpperCase();
    const ogirilgan = harfniOgir(kichik, oldingiKichik, sozBoshimi);
    if (ogirilgan == null) {
      // Krill bo'lmagan belgi (lotin harfi, raqam, bo'shliq, tinish
      // belgisi va h.k.) — o'zgarishsiz qoldiriladi.
      natija += belgi;
      sozBoshimi = /[\s.\-]/.test(belgi);
      oldingiKichik = null;
      continue;
    }
    natija += boshHarfniQil(ogirilgan, kattaMi);
    sozBoshimi = false;
    oldingiKichik = kichik;
  }
  return natija;
}

// Matnda krill harflari bor-yo'qligini tekshiradi.
export function krillBormi(matn) {
  return typeof matn === "string" && /[а-яёА-ЯЁЎўҚқҒғҲҳ]/.test(matn);
}
