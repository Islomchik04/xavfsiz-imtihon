-- ============================================================================
-- Admin ro'yxatga olishda belgilaydigan "083 forma" holati endi ikki emas,
-- UCH holatli: Ha (bor/topshirilgan) / Yo'q (umuman yo'q) / O'zida (talabada
-- bor, lekin hali maktabga topshirilmagan). Bu FAQAT talabalar.forma_083
-- (Admin bosqichi) uchun — Hujjatchi bosqichidagi tasdiqlash maydoni
-- (hujjat_forma_083, "imtihonchilar safiga qo'shish" uchun majburiy Ha/Yo'q
-- shart) o'zgarmaydi, chunki u yerda "o'zida" tushunchasi ma'nosiz (hujjatchi
-- uchun hujjat yo yetkazilgan, yo yo'q).
-- ============================================================================

do $$ begin
  create type forma_083_holati as enum ('ha', 'yoq', 'ozida');
exception when duplicate_object then null; end $$;

alter table talabalar alter column forma_083 drop default;
alter table talabalar
  alter column forma_083 type forma_083_holati
  using (case when forma_083 then 'ha' else 'yoq' end)::forma_083_holati;
alter table talabalar alter column forma_083 set default 'yoq';
