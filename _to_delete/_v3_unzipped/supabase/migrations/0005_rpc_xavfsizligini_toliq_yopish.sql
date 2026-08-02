-- ============================================================================
-- XAVFSIZ IMTIHON — RPC xavfsizligini to'liq yopish (ANON dan aniq revoke)
-- ============================================================================
-- Oldingi migratsiyalarda "revoke all on function X from public" yozilgan
-- edi va bu YETARLI EMAS ekani aniqlandi: Supabase'da anon/authenticated
-- rollariga EXECUTE huquqi funksiya yaratilganda DEFAULT PRIVILEGE orqali
-- TO'G'RIDAN-TO'G'RI (public pseudo-roli orqali emas) beriladi. Shu sabab
-- "revoke ... from public" bu to'g'ridan-to'g'ri grantlarga ta'sir qilmadi —
-- tekshiruv natijasida (pg_proc.proacl) anon hali ham EXECUTE huquqiga ega
-- ekani aniqlandi. Bu yerda ANON'dan ANIQ revoke qilinadi.
--
-- Trigger funksiyalari (talabalar_update_guard, talaba_imtihonlar_update_guard,
-- updated_at_yangilash) uchun endi EXECUTE huquqi anon'dan HAM, authenticated'
-- dan HAM to'liq olib tashlandi — bu XAVFSIZ, chunki PostgreSQL trigger orqali
-- funksiya ishga tushganda chaqiruvchi rolning o'sha funksiyaga EXECUTE huquqi
-- borligini TEKSHIRMAYDI (trigger jadval egasi/trigger ta'rifi vakolati bilan
-- ishlaydi). Bu jonli bazada real UPDATE orqali sinovdan o'tkazildi va
-- to'g'ridan-to'g'ri RPC chaqiruvi (masalan /rest/v1/rpc/talabalar_update_guard)
-- esa "insufficient_privilege" xatosi bilan bloklanishi tasdiqlandi.
-- ============================================================================

revoke execute on function joriy_rol() from anon, public;
revoke execute on function joriy_filial() from anon, public;
revoke execute on function joriy_oqituvchi() from anon, public;
grant execute on function joriy_rol() to authenticated;
grant execute on function joriy_filial() to authenticated;
grant execute on function joriy_oqituvchi() to authenticated;

revoke execute on function imtihonga_biriktirish(uuid, uuid, boolean, boolean) from anon, public;
revoke execute on function hujjatga_tayyorlash(uuid, uuid, boolean, boolean, boolean, text) from anon, public;
grant execute on function imtihonga_biriktirish(uuid, uuid, boolean, boolean) to authenticated;
grant execute on function hujjatga_tayyorlash(uuid, uuid, boolean, boolean, boolean, text) to authenticated;

revoke execute on function talabalar_update_guard() from anon, authenticated, public;
revoke execute on function talaba_imtihonlar_update_guard() from anon, authenticated, public;
revoke execute on function updated_at_yangilash() from anon, authenticated, public;
