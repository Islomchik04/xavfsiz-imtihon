-- ============================================================================
-- XAVFSIZ IMTIHON — Talaba telefon raqami
-- ============================================================================
-- Talaba qo'shish/tahrirlashda telefon raqami interfeys darajasida majburiy
-- (qo'lda kiritish va Excel import ikkalasida ham). Bazada eski yozuvlarni
-- buzmaslik uchun ustun null bo'lishi mumkin, lekin to'ldirilganda aniq
-- 9 xonali (998 kodisiz) formatga mos bo'lishi kerak.
alter table talabalar add column if not exists telefon text;

alter table talabalar drop constraint if exists talabalar_telefon_check;
alter table talabalar add constraint talabalar_telefon_check
  check (telefon is null or telefon ~ '^\d{9}$');
