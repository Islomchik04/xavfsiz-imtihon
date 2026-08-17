"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Qo'llab-quvvatlanadigan tizim tillari: o'zbekcha (lotin), o'zbekcha (krill), ruscha.
export const TILLAR = {
  uz: "O'zbekcha",
  uzk: "Ўзбекча",
  ru: "Русский",
};

const SAQLASH_KALITI = "xavfsiz-imtihon-til";

// Lug'at: har bir kalit uchun 3 til. Faqat uz bo'lsa ham matn ko'rinadi
// (qolgan tillar hali tarjima qilinmagan joylarda uz'ga tushib qoladi).
const LUGAT = {
  // --- Umumiy / navigatsiya -------------------------------------------------
  nav_statistika: { uz: "Statistika", uzk: "Статистика", ru: "Статистика" },
  nav_talabalar: { uz: "Talabalar", uzk: "Талабалар", ru: "Студенты" },
  nav_yangi_talaba: { uz: "Yangi talaba", uzk: "Янги талаба", ru: "Новый студент" },
  nav_imtihonlar: { uz: "Imtihonlar", uzk: "Имтиҳонлар", ru: "Экзамены" },
  nav_hisobotlar: { uz: "Hisobotlar", uzk: "Ҳисоботлар", ru: "Отчёты" },
  nav_arxiv: { uz: "Arxiv", uzk: "Архив", ru: "Архив" },
  nav_arizalar: { uz: "Nazariy imtihon arizalari", uzk: "Назарий имтиҳон аризалари", ru: "Заявки на теорию" },
  nav_amaliy_arizalar: { uz: "Amaliy imtihon arizalari", uzk: "Амалий имтиҳон аризалари", ru: "Заявки на практику" },
  nav_mustaqil_imtihonchilar: { uz: "Mustaqil imtihonchilar", uzk: "Мустақил имтиҳончилар", ru: "Независимые экзаменуемые" },
  nav_kpi: { uz: "KPI / Maosh", uzk: "KPI / Маош", ru: "KPI / Зарплата" },
  nav_kabinet: { uz: "Mening kabinetim", uzk: "Менинг кабинетим", ru: "Мой кабинет" },
  nav_oqituvchilar: { uz: "O'qituvchilar", uzk: "Ўқитувчилар", ru: "Преподаватели" },
  nav_sozlamalar: { uz: "Sozlamalar", uzk: "Созламалар", ru: "Настройки" },
  chiqish: { uz: "Chiqish", uzk: "Чиқиш", ru: "Выйти" },
  menyu: { uz: "Menyu", uzk: "Меню", ru: "Меню" },
  koproq: { uz: "Ko'proq", uzk: "Кўпроқ", ru: "Ещё" },

  // --- Umumiy amallar --------------------------------------------------------
  saqlash: { uz: "Saqlash", uzk: "Сақлаш", ru: "Сохранить" },
  saqlanmoqda: { uz: "Saqlanmoqda…", uzk: "Сақланмоқда…", ru: "Сохранение…" },
  bekor_qilish: { uz: "Bekor qilish", uzk: "Бекор қилиш", ru: "Отмена" },
  qidirish: { uz: "Qidirish", uzk: "Қидириш", ru: "Поиск" },
  faol: { uz: "Faol", uzk: "Фаол", ru: "Активен" },
  faolsiz: { uz: "Faolsiz", uzk: "Фаолсиз", ru: "Неактивен" },
  hammasi: { uz: "Barchasi", uzk: "Барчаси", ru: "Все" },
  tanlang: { uz: "Tanlang", uzk: "Танланг", ru: "Выберите" },
  qoshish: { uz: "Qo'shish", uzk: "Қўшиш", ru: "Добавить" },
  tahrirlash: { uz: "Tahrirlash", uzk: "Таҳрирлаш", ru: "Изменить" },
  ochirish: { uz: "O'chirish", uzk: "Ўчириш", ru: "Удалить" },
  telefon_raqam: { uz: "Telefon raqam", uzk: "Телефон рақам", ru: "Номер телефона" },
  parol: { uz: "Parol", uzk: "Парол", ru: "Пароль" },
  ism_familya: { uz: "Ism familya", uzk: "Исм фамилия", ru: "Имя и фамилия" },
  filial: { uz: "Filial", uzk: "Филиал", ru: "Филиал" },
  rol: { uz: "Rol", uzk: "Рол", ru: "Роль" },
  izoh: { uz: "Izoh", uzk: "Изоҳ", ru: "Примечание" },
  sana: { uz: "Sana", uzk: "Сана", ru: "Дата" },

  // --- Login -------------------------------------------------------------
  tizim_nomi: { uz: "Xavfsiz Imtihon", uzk: "Хавфсиз Имтиҳон", ru: "Хавфсиз Имтихон" },
  login_tavsif: {
    uz: "Davlat imtihoni nazorat tizimi",
    uzk: "Давлат имтиҳони назорат тизими",
    ru: "Система контроля госэкзаменов",
  },
  kirish: { uz: "Kirish", uzk: "Кириш", ru: "Войти" },
  tekshirilmoqda: { uz: "Tekshirilmoqda…", uzk: "Текширилмоқда…", ru: "Проверка…" },
  login_xato: {
    uz: "Telefon raqam yoki parol noto'g'ri",
    uzk: "Телефон рақам ёки парол нотўғри",
    ru: "Неверный номер телефона или пароль",
  },
  login_eslatma: {
    uz: "Loginni faqat superadmin beradi. Muammo bo'lsa administratoringizga murojaat qiling.",
    uzk: "Логинни фақат суперадмин беради. Муаммо бўлса администраторингизга мурожаат қилинг.",
    ru: "Логин выдаёт только суперадмин. При проблеме обратитесь к администратору.",
  },

  // --- Dashboard -----------------------------------------------------------
  sarlavha_statistika: { uz: "Statistika", uzk: "Статистика", ru: "Статистика" },
  jami_royxatga_olingan: {
    uz: "Faol talabalar",
    uzk: "Фаол талабалар",
    ru: "Активные студенты",
  },
  dashboard_yangi_arizalar: { uz: "Yangi arizalar", uzk: "Янги аризалар", ru: "Новые заявки" },
  dashboard_arxivlangan: { uz: "Arxivlangan (prava oldi)", uzk: "Архивланган (права олди)", ru: "В архиве (получили права)" },
  hujjat_tayyor: { uz: "Hujjat tayyor", uzk: "Ҳужжат тайёр", ru: "Документ готов" },
  batafsil_hisobotlar: { uz: "Batafsil hisobotlar", uzk: "Батафсил ҳисоботлар", ru: "Подробные отчёты" },
  davr_kunlik: { uz: "Bugun", uzk: "Бугун", ru: "Сегодня" },
  davr_haftalik: { uz: "Haftalik", uzk: "Ҳафталик", ru: "За неделю" },
  davr_oylik: { uz: "Oylik", uzk: "Ойлик", ru: "За месяц" },
  davr_sana: { uz: "Sana tanlash", uzk: "Сана танлаш", ru: "Выбрать дату" },
  eng_kop_yiqilgan: {
    uz: "Eng ko'p yiqilgan o'qituvchi",
    uzk: "Энг кўп йиқилган ўқитувчи",
    ru: "Больше всего провалов у преподавателя",
  },

  // --- Rollar ----------------------------------------------------------------
  rol_superadmin: { uz: "Superadmin", uzk: "Супeрадмин", ru: "Суперадмин" },
  rol_admin: { uz: "Admin", uzk: "Админ", ru: "Админ" },
  rol_hujjatchi: { uz: "Hujjatchi", uzk: "Ҳужжатчи", ru: "Документовед" },
  rol_imtihonchi: { uz: "Imtihon boshqaruvchisi", uzk: "Имтиҳон бошқарувчиси", ru: "Экзаменатор" },
  rol_oqituvchi: { uz: "O'qituvchi", uzk: "Ўқитувчи", ru: "Преподаватель" },

  // --- Natija / holat --------------------------------------------------------
  natija_kutilmoqda: { uz: "Kutilmoqda", uzk: "Кутилмоқда", ru: "Ожидается" },
  natija_otdi: { uz: "O'tdi", uzk: "Ўтди", ru: "Сдал" },
  natija_otmadi: { uz: "O'tmadi", uzk: "Ўтмади", ru: "Не сдал" },

  imtihon_turi_nazariy: { uz: "Nazariy", uzk: "Назарий", ru: "Теория" },
  imtihon_turi_amaliy: { uz: "Amaliy", uzk: "Амалий", ru: "Практика" },
  imtihon_turi_ikkalasi: {
    uz: "Nazariy + Amaliy (bir kunda)",
    uzk: "Назарий + Амалий (бир кунда)",
    ru: "Теория + Практика (в один день)",
  },

  forma_083_tayyor: { uz: "Tayyor", uzk: "Тайёр", ru: "Готово" },
  forma_083_tayyor_emas: { uz: "Tayyor emas", uzk: "Тайёр эмас", ru: "Не готово" },

  holat_hujjat_kutilmoqda: { uz: "Hujjat kutilmoqda", uzk: "Ҳужжат кутилмоқда", ru: "Ожидается документ" },
  holat_imtihon_yoq: {
    uz: "Imtihonga biriktirilmagan",
    uzk: "Имтиҳонга бириктирилмаган",
    ru: "Не прикреплён к экзамену",
  },
  holat_kutilmoqda: { uz: "Natija kutilmoqda", uzk: "Натижа кутилмоқда", ru: "Результат ожидается" },
  holat_otdi: { uz: "O'tdi", uzk: "Ўтди", ru: "Сдал" },
  holat_otmadi: {
    uz: "O'tolmadi — qayta imtihon kerak",
    uzk: "Ўтолмади — қайта имтиҳон керак",
    ru: "Не сдал — нужен пересдача",
  },

  imtihon_holati_bosh: { uz: "Bo'sh", uzk: "Бўш", ru: "Пусто" },
  imtihon_holati_aktiv: { uz: "Aktiv", uzk: "Актив", ru: "Активен" },
  imtihon_holati_yakunlangan: { uz: "Yakunlangan", uzk: "Якунланган", ru: "Завершён" },

  // --- Mavzu (tema) ------------------------------------------------------
  tema_kunduzgi: { uz: "Kunduzgi", uzk: "Кундузги", ru: "Светлая" },
  tema_tungi: { uz: "Tungi", uzk: "Тунги", ru: "Тёмная" },
};

export function matn(kalit, til) {
  const yozuv = LUGAT[kalit];
  if (!yozuv) return kalit;
  return yozuv[til] || yozuv.uz || kalit;
}

// Ba'zi joylarda tayyor {uz,uzk,ru} obyekti (masalan constants.js'dagi
// ROLLAR/NATIJA kabi) to'g'ridan-to'g'ri berilishi mumkin — shu holat uchun.
export function obyektdanMatn(obj, til) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[til] || obj.uz || "";
}

const TilKonteksti = createContext({ til: "uz", tilniOzgartirish: () => {}, t: (k) => matn(k, "uz") });

export function TilProvider({ children }) {
  const [til, setTil] = useState("uz");

  useEffect(() => {
    const saqlangan = typeof window !== "undefined" ? window.localStorage.getItem(SAQLASH_KALITI) : null;
    if (saqlangan && TILLAR[saqlangan]) setTil(saqlangan);
  }, []);

  function tilniOzgartirish(yangiTil) {
    setTil(yangiTil);
    if (typeof window !== "undefined") window.localStorage.setItem(SAQLASH_KALITI, yangiTil);
  }

  const t = (kalit) => matn(kalit, til);

  return (
    <TilKonteksti.Provider value={{ til, tilniOzgartirish, t }}>{children}</TilKonteksti.Provider>
  );
}

export function useTil() {
  return useContext(TilKonteksti);
}
