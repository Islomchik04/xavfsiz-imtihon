
-- 1) Hujjatchi endi talabaning guruhi va nazariy/amaliy o'qituvchisini
--    ISTALGAN PAYTDA (hujjat tayyor bo'lgandan keyin ham) o'zgartira oladi —
--    boshqa asosiy maydonlar (ism, filial, 083 forma, imtihon turi, qoshgan)
--    hamon himoyalangan.
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
       or new.forma_083 is distinct from old.forma_083
       or new.imtihon_turi is distinct from old.imtihon_turi
       or new.qoshgan is distinct from old.qoshgan
    then
      raise exception 'Hujjatchi faqat hujjat maydonlari, guruh va o''qituvchi biriktirishni o''zgartira oladi';
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

-- 2) talaba_imtihonlar'ga o'qituvchi "suratini" (snapshot) saqlaydigan
--    ustunlar qo'shiladi — KPI (maosh) hisob-kitobi shu urinish PAYTIDA qaysi
--    o'qituvchi biriktirilgan bo'lsa o'shanga tegishli bo'lib qolishi uchun.
--    Aks holda, o'qituvchi keyinchalik almashtirilsa, eski (allaqachon
--    hisoblangan/to'langan) oylarning KPI'si ham noto'g'ri qayta
--    taqsimlanib ketardi.
alter table talaba_imtihonlar add column if not exists nazariy_oqituvchi_id uuid references oqituvchilar(id);
alter table talaba_imtihonlar add column if not exists amaliy_oqituvchi_id uuid references oqituvchilar(id);

-- Mavjud qatorlarni joriy (hozirgi) biriktirilgan o'qituvchi bilan
-- to'ldiramiz — bu shu paytgacha hisoblangan KPI hisobotlari bilan bir xil
-- natija beradi, kelgusidagi urinishlar esa RPC orqali to'g'ri "suratga
-- olinadi".
update talaba_imtihonlar ti
set nazariy_oqituvchi_id = t.nazariy_oqituvchi_id,
    amaliy_oqituvchi_id = t.amaliy_oqituvchi_id
from talabalar t
where t.id = ti.talaba_id;

-- 3) imtihonga_biriktirish: yangi urinish yaratilganda joriy o'qituvchini
--    shu urinishga "suratga olib" saqlaydi.
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
  if joriy_rol() not in ('hujjatchi', 'superadmin') then
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

-- 4) amaliyga_otkazish: xuddi shunday — yangilangan amaliy o'qituvchini
--    (yoki mavjudini) shu urinishga suratga oladi.
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
  v_amaliy_oqituvchi_id uuid;
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

  v_amaliy_oqituvchi_id := coalesce(p_amaliy_oqituvchi_id, v_talaba.amaliy_oqituvchi_id);

  perform set_config('xi.bypass_talabalar_guard', 'on', true);
  update talabalar
  set amaliy_oqituvchi_id = v_amaliy_oqituvchi_id,
      imtihon_turi = case when imtihon_turi = 'nazariy' then 'amaliy'::imtihon_turi else imtihon_turi end
  where id = p_talaba_id;
  perform set_config('xi.bypass_talabalar_guard', 'off', true);

  insert into talaba_imtihonlar (
    talaba_id, imtihon_id, nazariy_kerak, amaliy_kerak, biriktirgan, amaliy_oqituvchi_id
  )
  values (p_talaba_id, p_imtihon_id, false, true, auth.uid(), v_amaliy_oqituvchi_id)
  returning id into v_attempt_id;

  return v_attempt_id;
end;
$$;
revoke all on function amaliyga_otkazish(uuid, uuid, uuid) from public;
revoke execute on function amaliyga_otkazish(uuid, uuid, uuid) from anon;
grant execute on function amaliyga_otkazish(uuid, uuid, uuid) to authenticated;
