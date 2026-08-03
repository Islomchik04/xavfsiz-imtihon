-- ============================================================================
-- XAVFSIZ IMTIHON — Talaba "Toifa" maydoni (haydovchilik toifasi / kurs turi)
-- ============================================================================
-- Ruxsat etilgan qiymatlar: haydovchilik toifalari (A/B/BC/C/D/DE/CE) +
-- maxsus kurs turlari (express, avtoledi). Enum emas, oddiy text + CHECK —
-- kelajakda ro'yxatni o'zgartirish (masalan yangi toifa qo'shish) uchun
-- ALTER TYPE ADD VALUE'ning alohida tranzaksiya talabidan qochish uchun.
alter table talabalar add column if not exists toifa text;

alter table talabalar drop constraint if exists talabalar_toifa_check;
alter table talabalar add constraint talabalar_toifa_check
  check (toifa is null or toifa in ('A','B','BC','C','D','DE','CE','express','avtoledi'));
