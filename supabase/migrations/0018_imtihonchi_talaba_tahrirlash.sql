-- Imtihon menejeri (imtihonchi) endi imtihon ichida o'quvchi ismiga bosib
-- uning "asosiy ma'lumotlari"ni (ism, telefon, toifa, qarzdorlik, filial,
-- guruh, 083 forma, imtihon turi, nazariy o'qituvchi) tahrirlay oladi —
-- xuddi admin kabi, lekin filial va hujjat_tayyor cheklovisiz (imtihonchi
-- tizim bo'yicha global ishlaydi). Hujjatchiga tegishli maydonlarni
-- (hujjat_forma_083, tasdiqnoma, imtihon_varaqasi, hujjat_tayyor va h.k.)
-- imtihonchi o'zgartira olmaydi — bu hujjatchi/superadmin vazifasi bo'lib
-- qoladi.
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

  if rol = 'imtihonchi' then
    if new.hujjat_forma_083 is distinct from old.hujjat_forma_083
       or new.tasdiqnoma is distinct from old.tasdiqnoma
       or new.imtihon_varaqasi is distinct from old.imtihon_varaqasi
       or new.hujjat_tayyor is distinct from old.hujjat_tayyor
       or new.hujjat_tayyorlagan is distinct from old.hujjat_tayyorlagan
       or new.hujjat_sana is distinct from old.hujjat_sana
       or new.hujjat_izoh is distinct from old.hujjat_izoh
       or new.qoshgan is distinct from old.qoshgan
    then
      raise exception 'Imtihon menejeri hujjat holatini o''zgartira olmaydi';
    end if;
    return new;
  end if;

  raise exception 'Ruxsat yo''q';
end;
$$;
