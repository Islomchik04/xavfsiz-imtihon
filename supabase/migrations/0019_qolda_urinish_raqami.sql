-- Natija "O'TDI" deb belgilanganda endi shu o'rinda QO'LDA "nechinchi
-- urinishda o'tgani" so'raladi (avtomatik hisoblangan tartib o'rniga aniq,
-- xodim tomonidan tasdiqlangan raqam). Bu KPI'da "faqat 1-urinishda o'tgan
-- talaba uchun mukofot" qoidasini ANIQROQ qo'llash uchun kerak — masalan
-- talaba avvalgi urinishlarini ushbu tizimdan TASHQARIDA (masalan qog'ozda)
-- topshirgan bo'lishi mumkin, avtomatik hisoblash buni bilmaydi.
--
-- Ustun bo'sh (null) bo'lsa — eski xulq-atvor davom etadi: KPI hisobida
-- imtihonHisob.js#urinishTartibiBilan orqali AVTOMATIK hisoblangan tartib
-- raqamiga qaytiladi (orqaga qarab moslik uchun, eski yozuvlar buzilmasin).
alter table talaba_imtihonlar
  add column if not exists nazariy_urinish_raqami int,
  add column if not exists amaliy_urinish_raqami int;

alter table talaba_imtihonlar
  add constraint talaba_imtihonlar_nazariy_urinish_raqami_check
    check (nazariy_urinish_raqami is null or nazariy_urinish_raqami >= 1),
  add constraint talaba_imtihonlar_amaliy_urinish_raqami_check
    check (amaliy_urinish_raqami is null or amaliy_urinish_raqami >= 1);
