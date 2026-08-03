-- 1) talabalar_update_guard trigger'ga tor doiradagi "bypass" bayrog'i
--    qo'shamiz — faqat ishonchli SECURITY DEFINER funksiyalar (masalan,
--    amaliyga_otkazish) o'zining ichki tekshiruvidan o'tgach shu bayroqni
--    vaqtincha yoqib, talabalar.amaliy_oqituvchi_id/imtihon_turi ustunlarini
--    yangilay oladi — bu odatiy RLS/trigger yo'lini kengaytirmaydi.
create or replace function talabalar_update_guard()
returns trigger
language plpgsql
security definer set search_path = public as $$
declare
  rol user_role;
begin
  if current_setting('xi.bypass_talabalar_guard', true) = 'on' then
    return new;
  end if;

  rol := joriy_rol();

  if rol = 'superadmin' then
    return new;
  end if;

  if rol = 'admin' then
    if old.hujjat_tayyor then
      raise exception 'Hujjat tayyorlangan talaba ma''lumotini Admin o''zgartira olmaydi';
    end if;
    if new.filial_id is distinct from old.filial_id
       or new.hujjat_forma_083 is distinct from old.hujjat_forma_083
       or new.tasdiqnoma is distinct from old.tasdiqnoma
       or new.imtihon_varaqasi is distinct from old.imtihon_varaqasi
       or new.hujjat_tayyor is distinct from old.hujjat_tayyor
       or new.hujjat_tayyorlagan is distinct from old.hujjat_tayyorlagan
       or new.hujjat_sana is distinct from old.hujjat_sana
       or new.hujjat_izoh is distinct from old.hujjat_izoh
       or new.qoshgan is distinct from old.qoshgan
    then
      raise exception 'Admin faqat asosiy ma''lumotlarni (ism, guruh, 083 forma, imtihon turi, o''qituvchi) o''zgartira oladi';
    end if;
    return new;
  end if;

  if rol = 'hujjatchi' then
    if new.ism_familya is distinct from old.ism_familya
       or new.filial_id is distinct from old.filial_id
       or new.guruh_id is distinct from old.guruh_id
       or new.forma_083 is distinct from old.forma_083
       or new.imtihon_turi is distinct from old.imtihon_turi
       or new.nazariy_oqituvchi_id is distinct from old.nazariy_oqituvchi_id
       or new.amaliy_oqituvchi_id is distinct from old.amaliy_oqituvchi_id
       or new.qoshgan is distinct from old.qoshgan
    then
      raise exception 'Hujjatchi faqat hujjat maydonlarini (083 forma, tasdiqnoma, imtihon varaqasi, izoh) o''zgartira oladi';
    end if;
    if new.hujjat_tayyor and not old.hujjat_tayyor then
      new.hujjat_tayyorlagan := auth.uid();
      new.hujjat_sana := now();
    end if;
    return new;
  end if;

  raise exception 'Ruxsat yo''q';
end;
$$;

-- 2) Imtihon sessiyasi hayotiy sikli: boshlanmagan -> boshlangan -> yakunlangan
alter table imtihonlar add column if not exists holati text not null default 'boshlanmagan'
  check (holati in ('boshlanmagan', 'boshlangan', 'yakunlangan'));
alter table imtihonlar add column if not exists boshlangan_vaqt timestamptz;
alter table imtihonlar add column if not exists yakunlangan_vaqt timestamptz;

create or replace function imtihon_holatini_ozgartirish(
  p_imtihon_id uuid,
  p_holat text
) returns void
language plpgsql
security definer set search_path = public as $$
begin
  if joriy_rol() not in ('imtihonchi', 'hujjatchi', 'superadmin') then
    raise exception 'Ruxsat yo''q';
  end if;
  if p_holat not in ('boshlanmagan', 'boshlangan', 'yakunlangan') then
    raise exception 'Noto''g''ri holat';
  end if;

  update imtihonlar
  set holati = p_holat,
      boshlangan_vaqt = case when p_holat = 'boshlangan' then now() else boshlangan_vaqt end,
      yakunlangan_vaqt = case when p_holat = 'yakunlangan' then now() else yakunlangan_vaqt end
  where id = p_imtihon_id;

  if not found then
    raise exception 'Imtihon topilmadi';
  end if;
end;
$$;
revoke all on function imtihon_holatini_ozgartirish(uuid, text) from public;
revoke execute on function imtihon_holatini_ozgartirish(uuid, text) from anon;
grant execute on function imtihon_holatini_ozgartirish(uuid, text) to authenticated;

-- 3) Nazariydan o'tgan talabani amaliy imtihonga o'tkazish: amaliy
--    o'qituvchini biriktiradi (agar berilsa), imtihon_turi'ni yangilaydi
--    (sof "nazariy" bo'lsa endi "amaliy" bosqichga o'tadi) va shu imtihon
--    sessiyasiga amaliy urinish sifatida biriktiradi. Imtihonchi ham
--    (natija belgilagan rol) chaqira oladi — shuning uchun
--    imtihonga_biriktirish() (faqat hujjatchi/superadmin) o'rniga mustaqil
--    yozilgan.
create or replace function amaliyga_otkazish(
  p_talaba_id uuid,
  p_imtihon_id uuid,
  p_amaliy_oqituvchi_id uuid
) returns uuid
language plpgsql
security definer set search_path = public as $$
declare
  v_talaba talabalar%rowtype;
  v_pending int;
  v_attempt_id uuid;
begin
  if joriy_rol() not in ('imtihonchi', 'hujjatchi', 'superadmin') then
    raise exception 'Ruxsat yo''q';
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
  where talaba_id = p_talaba_id and amaliy_kerak and amaliy_natija = 'kutilmoqda';
  if v_pending > 0 then
    raise exception 'Bu talabaning hali natijasi chiqmagan (kutilayotgan) amaliy imtihoni bor';
  end if;

  perform set_config('xi.bypass_talabalar_guard', 'on', true);
  update talabalar
  set amaliy_oqituvchi_id = coalesce(p_amaliy_oqituvchi_id, amaliy_oqituvchi_id),
      imtihon_turi = case when imtihon_turi = 'nazariy' then 'amaliy'::imtihon_turi else imtihon_turi end
  where id = p_talaba_id;
  perform set_config('xi.bypass_talabalar_guard', 'off', true);

  insert into talaba_imtihonlar (talaba_id, imtihon_id, nazariy_kerak, amaliy_kerak, biriktirgan)
  values (p_talaba_id, p_imtihon_id, false, true, auth.uid())
  returning id into v_attempt_id;

  return v_attempt_id;
end;
$$;
revoke all on function amaliyga_otkazish(uuid, uuid, uuid) from public;
revoke execute on function amaliyga_otkazish(uuid, uuid, uuid) from anon;
grant execute on function amaliyga_otkazish(uuid, uuid, uuid) to authenticated;
