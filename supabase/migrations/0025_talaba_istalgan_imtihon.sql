-- Admin yangi talaba arizasini yuborayotganda qaysi imtihon (sessiya)
-- uchun so'ralayotganini ham belgilashi mumkin — bu shunchaki "istak"
-- (majburiy emas), hujjatchi hujjatni tayyorlashda buni ko'rib, xohlasa
-- xuddi shu imtihonni tanlaydi (yoki boshqasini tanlashi ham mumkin).
alter table talabalar add column if not exists istalgan_imtihon_id uuid references imtihonlar(id) on delete set null;
