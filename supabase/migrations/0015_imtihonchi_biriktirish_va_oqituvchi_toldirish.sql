-- 1) Imtihon menejeri (imtihonchi) ham talabani imtihonga tezkor
--    biriktira oladi (ism-familya bo'yicha qidirib qo'shish) — superadmin
--    va hujjatchi bilan bir qatorda.
create or replace function imtihonga_biriktirish(
  p_talaba_id uuid,
  p_imtihon_id uuid,
  p_nazariy_kerak boolean,
  p_amaliy_kerak boolean
) returns uuid
language plpgsql
security definer set search_path = public as $$
declare
  v_talaba talabalar%rowtype;
  v_pending int;
  v_attempt_id uuid;
begin
  if joriy_rol() not in ('hujjatchi', 'superadmin', 'imtihonchi') then
    raise exception 'Ruxsat yo''q';
  end if;
  if not p_nazariy_kerak and not p_amaliy_kerak then
    raise exception 'Kamida bittasi (nazariy yoki amaliy) tanlanishi kerak';
  end if;

  select * into v_talaba from talabalar where id = p_talaba_id;
  if not found then
    raise exception 'Talaba topilmadi';
  end if;
  if not v_talaba.hujjat_tayyor then
    raise exception 'Talabaning hujjati hali tayyor emas';
  end if;

  select count(*) into v_pending
  from talaba_imtihonlar
  where talaba_id = p_talaba_id
    and ((nazariy_kerak and nazariy_natija = 'kutilmoqda') or (amaliy_kerak and amaliy_natija = 'kutilmoqda'));
  if v_pending > 0 then
    raise exception 'Bu talabaning hali natijasi chiqmagan (kutilayotgan) imtihoni bor';
  end if;

  insert into talaba_imtihonlar (
    talaba_id, imtihon_id, nazariy_kerak, amaliy_kerak, biriktirgan,
    nazariy_oqituvchi_id, amaliy_oqituvchi_id
  )
  values (
    p_talaba_id, p_imtihon_id, p_nazariy_kerak, p_amaliy_kerak, auth.uid(),
    case when p_nazariy_kerak then v_talaba.nazariy_oqituvchi_id else null end,
    case when p_amaliy_kerak then v_talaba.amaliy_oqituvchi_id else null end
  )
  returning id into v_attempt_id;

  return v_attempt_id;
end;
$$;
revoke all on function imtihonga_biriktirish(uuid, uuid, boolean, boolean) from public;
revoke execute on function imtihonga_biriktirish(uuid, uuid, boolean, boolean) from anon;
grant execute on function imtihonga_biriktirish(uuid, uuid, boolean, boolean) to authenticated;

-- 2) Imtihon menejeriga (va hujjatchi/superadminga) — agar talabaga hali
--    o'qituvchi biriktirilmagan bo'lsa, uni biriktirish imkoniyati.
--    Faqat "bo'sh" holatda ishlaydi — allaqachon biriktirilgan o'qituvchini
--    bu funksiya orqali ALMASHTIRIB bo'lmaydi (buning uchun hujjatchi/
--    superadmin talaba tahrirlash formasidan foydalanadi).
create or replace function talaba_oqituvchisini_biriktirish(
  p_talaba_id uuid,
  p_turi text,
  p_oqituvchi_id uuid
) returns void
language plpgsql
security definer set search_path = public as $$
declare
  v_joriy uuid;
begin
  if joriy_rol() not in ('imtihonchi', 'hujjatchi', 'superadmin') then
    raise exception 'Ruxsat yo''q';
  end if;
  if p_turi not in ('nazariy', 'amaliy') then
    raise exception 'Noto''g''ri tur';
  end if;
  if p_oqituvchi_id is null then
    raise exception 'O''qituvchini tanlang';
  end if;

  if p_turi = 'nazariy' then
    select nazariy_oqituvchi_id into v_joriy from talabalar where id = p_talaba_id;
  else
    select amaliy_oqituvchi_id into v_joriy from talabalar where id = p_talaba_id;
  end if;
  if not found then
    raise exception 'Talaba topilmadi';
  end if;
  if v_joriy is not null then
    raise exception 'Bu talabaga allaqachon o''qituvchi biriktirilgan';
  end if;

  perform set_config('xi.bypass_talabalar_guard', 'on', true);
  if p_turi = 'nazariy' then
    update talabalar set nazariy_oqituvchi_id = p_oqituvchi_id where id = p_talaba_id;
  else
    update talabalar set amaliy_oqituvchi_id = p_oqituvchi_id where id = p_talaba_id;
  end if;
  perform set_config('xi.bypass_talabalar_guard', 'off', true);
end;
$$;
revoke all on function talaba_oqituvchisini_biriktirish(uuid, text, uuid) from public;
revoke execute on function talaba_oqituvchisini_biriktirish(uuid, text, uuid) from anon;
grant execute on function talaba_oqituvchisini_biriktirish(uuid, text, uuid) to authenticated;
