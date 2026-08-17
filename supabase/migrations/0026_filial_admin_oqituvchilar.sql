-- ============================================================================
-- Filial adminiga o'ziga tegishli o'qituvchilarni boshqarish imkoni.
--
-- Hozirgacha oqituvchilar/oqituvchi_filiallar jadvallariga yozish faqat
-- superadmin uchun ochiq edi (oqituvchilar_yozish, oqituvchi_filiallar_yozish
-- policy'lari). Admin (filial darajasida) endi SECURITY DEFINER RPC'lar
-- orqali — faqat o'z filialiga bog'liq o'qituvchilarni — qo'sha, tahrirlay va
-- o'chira oladi. RLS policy'lari o'zgarmaydi (baribir superadmin-only), chunki
-- bu RPC'lar orqali kirish nazorati funksiya ichida qo'lda tekshiriladi.
-- ============================================================================

create or replace function admin_oqituvchi_qoshish(
  p_ism_familya text,
  p_turi oqituvchi_turi,
  p_telefon text default null
) returns uuid
language plpgsql
security definer set search_path = public as $$
declare
  v_filial uuid;
  v_id uuid;
begin
  if joriy_rol() <> 'admin' then
    raise exception 'Faqat filial admini o''qituvchi qo''sha oladi';
  end if;

  v_filial := joriy_filial();
  if v_filial is null then
    raise exception 'Sizga filial biriktirilmagan';
  end if;

  if p_ism_familya is null or trim(p_ism_familya) = '' then
    raise exception 'Ism familya kiritilishi shart';
  end if;

  insert into oqituvchilar (ism_familya, turi, telefon)
  values (trim(p_ism_familya), p_turi, nullif(trim(coalesce(p_telefon, '')), ''))
  returning id into v_id;

  insert into oqituvchi_filiallar (oqituvchi_id, filial_id)
  values (v_id, v_filial);

  return v_id;
end;
$$;
revoke all on function admin_oqituvchi_qoshish(text, oqituvchi_turi, text) from public;
revoke execute on function admin_oqituvchi_qoshish(text, oqituvchi_turi, text) from anon;
grant execute on function admin_oqituvchi_qoshish(text, oqituvchi_turi, text) to authenticated;

create or replace function admin_oqituvchi_tahrirlash(
  p_oqituvchi_id uuid,
  p_ism_familya text,
  p_turi oqituvchi_turi,
  p_telefon text default null
) returns void
language plpgsql
security definer set search_path = public as $$
declare
  v_filial uuid;
begin
  if joriy_rol() <> 'admin' then
    raise exception 'Faqat filial admini o''qituvchini tahrirlay oladi';
  end if;

  v_filial := joriy_filial();
  if not exists (
    select 1 from oqituvchi_filiallar
    where oqituvchi_id = p_oqituvchi_id and filial_id = v_filial
  ) then
    raise exception 'Bu o''qituvchi sizning filialingizga tegishli emas';
  end if;

  if p_ism_familya is null or trim(p_ism_familya) = '' then
    raise exception 'Ism familya kiritilishi shart';
  end if;

  update oqituvchilar
  set ism_familya = trim(p_ism_familya),
      turi = p_turi,
      telefon = nullif(trim(coalesce(p_telefon, '')), '')
  where id = p_oqituvchi_id;
end;
$$;
revoke all on function admin_oqituvchi_tahrirlash(uuid, text, oqituvchi_turi, text) from public;
revoke execute on function admin_oqituvchi_tahrirlash(uuid, text, oqituvchi_turi, text) from anon;
grant execute on function admin_oqituvchi_tahrirlash(uuid, text, oqituvchi_turi, text) to authenticated;

create or replace function admin_oqituvchi_faollik(
  p_oqituvchi_id uuid,
  p_faol boolean
) returns void
language plpgsql
security definer set search_path = public as $$
declare
  v_filial uuid;
begin
  if joriy_rol() <> 'admin' then
    raise exception 'Faqat filial admini o''qituvchi holatini o''zgartira oladi';
  end if;

  v_filial := joriy_filial();
  if not exists (
    select 1 from oqituvchi_filiallar
    where oqituvchi_id = p_oqituvchi_id and filial_id = v_filial
  ) then
    raise exception 'Bu o''qituvchi sizning filialingizga tegishli emas';
  end if;

  update oqituvchilar set faol = p_faol where id = p_oqituvchi_id;
end;
$$;
revoke all on function admin_oqituvchi_faollik(uuid, boolean) from public;
revoke execute on function admin_oqituvchi_faollik(uuid, boolean) from anon;
grant execute on function admin_oqituvchi_faollik(uuid, boolean) to authenticated;

-- "O'chirish" — admin nuqtai nazaridan o'qituvchi o'z filiali ro'yxatidan
-- yo'qoladi: oqituvchi_filiallar bog'lanishi o'chiriladi. Agar shu
-- o'qituvchining boshqa hech qanday filialga bog'lanishi qolmasa, VA hech bir
-- talaba/urinish/erkin ariza unga bog'lanmagan bo'lsa — asosiy oqituvchilar
-- yozuvi ham butunlay o'chiriladi. Aks holda (masalan boshqa filialda ham
-- ishlaydi, yoki eski talaba yozuvlarida tarixiy ma'lumot sifatida
-- ishlatilgan) faqat bog'lanish olib tashlanadi — bu xavfsiz va kutilgan
-- xatti-harakat (ma'lumotlar bazasi butunligini buzmaydi).
create or replace function admin_oqituvchi_ochirish(
  p_oqituvchi_id uuid
) returns void
language plpgsql
security definer set search_path = public as $$
declare
  v_filial uuid;
  v_qolgan int;
begin
  if joriy_rol() <> 'admin' then
    raise exception 'Faqat filial admini o''qituvchini o''chira oladi';
  end if;

  v_filial := joriy_filial();
  if not exists (
    select 1 from oqituvchi_filiallar
    where oqituvchi_id = p_oqituvchi_id and filial_id = v_filial
  ) then
    raise exception 'Bu o''qituvchi sizning filialingizga tegishli emas';
  end if;

  delete from oqituvchi_filiallar
  where oqituvchi_id = p_oqituvchi_id and filial_id = v_filial;

  select count(*) into v_qolgan from oqituvchi_filiallar where oqituvchi_id = p_oqituvchi_id;
  if v_qolgan = 0 then
    begin
      delete from oqituvchilar where id = p_oqituvchi_id;
    exception when foreign_key_violation then
      -- Talaba/urinish yozuvlarida hali ishlatilmoqda — tarixiy ma'lumotni
      -- buzmaslik uchun asosiy yozuvni saqlab qolamiz, faqat filialdan
      -- chiqarib tashlash yetarli (admin ro'yxatida endi ko'rinmaydi).
      null;
    end;
  end if;
end;
$$;
revoke all on function admin_oqituvchi_ochirish(uuid) from public;
revoke execute on function admin_oqituvchi_ochirish(uuid) from anon;
grant execute on function admin_oqituvchi_ochirish(uuid) to authenticated;
