-- ============================================================================
-- 1) Filiallar uchun "KPI bormi?" bayrog'i — faqat superadmin o'rnatadi
--    (Sozlamalar → Filiallar). "Yo'q" deb belgilangan filial o'quvchilari
--    o'qituvchi KPI/maosh hisobiga hech qachon kirmaydi (Express toifa bilan
--    bir xil mantiq — qarang: src/lib/imtihonHisob.js#kpigaKirmaydimi).
-- ============================================================================
alter table filiallar add column if not exists kpi_bor boolean not null default true;

-- ============================================================================
-- 2) Bir xil ism+telefon bilan ikkita FAOL talaba kiritilishini oldini olish
--    — bu QATTIQ DB cheklovi sifatida emas (mavjud ma'lumotlar bazasida
--    "911111111" kabi umumiy/vaqtinchalik raqamlar bir nechta talaba uchun
--    ishlatilgani aniqlandi — shuning uchun faqat telefon bo'yicha unique
--    cheklov qo'yib bo'lmaydi, mavjud yozuvlarni buzib qo'yardi), balki
--    ilova darajasida (YangiTalabaForm.js) — yangi talaba kiritilishidan
--    oldin bir xil ism+telefon bilan FAOL talaba bor-yo'qligi tekshiriladi
--    va topilsa foydalanuvchidan tasdiqlash so'raladi.
-- ============================================================================
-- 3) "Amaliy imtihonga ariza" — Filial admini o'zining nazariydan o'tgan
--    (hujjati tayyor) talabasini qidirib, uni amaliy imtihonga yuborish uchun
--    ARIZA (so'rov) qoldiradi. Admin to'g'ridan-to'g'ri imtihonga
--    biriktirolmaydi (bu hujjatchi/imtihonchi ishi) — ariza Hujjatchiga
--    alohida, ajratilgan holatda ko'rinadi, u tasdiqlaganda aynan
--    amaliyga_otkazish() RPC'si ishga tushadi.
-- ============================================================================
create table if not exists amaliy_arizalar (
  id uuid primary key default gen_random_uuid(),
  talaba_id uuid not null references talabalar(id) on delete cascade,
  soragan uuid not null references profiles(id),
  holati text not null default 'kutilmoqda' check (holati in ('kutilmoqda', 'tasdiqlangan', 'rad_etildi')),
  izoh text,
  created_at timestamptz not null default now(),
  korib_chiqqan uuid references profiles(id),
  korib_chiqqan_vaqt timestamptz,
  yaratilgan_urinish_id uuid references talaba_imtihonlar(id)
);

create index if not exists idx_amaliy_arizalar_talaba on amaliy_arizalar(talaba_id);
create index if not exists idx_amaliy_arizalar_holati on amaliy_arizalar(holati);

alter table amaliy_arizalar enable row level security;

drop policy if exists amaliy_arizalar_select on amaliy_arizalar;
create policy amaliy_arizalar_select on amaliy_arizalar for select to authenticated
  using (
    joriy_rol() in ('superadmin', 'hujjatchi', 'imtihonchi')
    or soragan = auth.uid()
    or (joriy_rol() = 'admin' and exists (
      select 1 from talabalar t where t.id = talaba_id and t.filial_id = joriy_filial()
    ))
  );

-- Yozish (insert/update) faqat SECURITY DEFINER RPC'lar orqali — quyida.
-- To'g'ridan-to'g'ri jadvalga yozishga hech kimga ruxsat yo'q (RPC'lar
-- funksiya egasi nomidan RLS'ni chetlab o'tib ishlaydi).
drop policy if exists amaliy_arizalar_no_direct_write on amaliy_arizalar;
create policy amaliy_arizalar_no_direct_write on amaliy_arizalar for all to authenticated
  using (false) with check (false);

-- ----------------------------------------------------------------------------
-- amaliy_ariza_yuborish — Admin (yoki hujjatchi/imtihonchi/superadmin) shu
-- talaba uchun "amaliyga yuborish" arizasini yaratadi. Talaba nazariydan
-- o'tgan va hali birorta amaliy urinishga ega bo'lmagan bo'lishi kerak
-- (xuddi UI'dagi amaliygaTayyormi() tekshiruvi bilan bir xil mantiq).
-- ----------------------------------------------------------------------------
create or replace function amaliy_ariza_yuborish(p_talaba_id uuid, p_izoh text default null)
returns uuid
language plpgsql
security definer set search_path = public as $$
declare
  v_talaba talabalar%rowtype;
  v_ariza_id uuid;
begin
  if joriy_rol() not in ('admin', 'hujjatchi', 'imtihonchi', 'superadmin') then
    raise exception 'Ruxsat yo''q';
  end if;

  select * into v_talaba from talabalar where id = p_talaba_id;
  if not found then
    raise exception 'Talaba topilmadi';
  end if;

  if joriy_rol() = 'admin' and v_talaba.filial_id <> joriy_filial() then
    raise exception 'Bu boshqa filial talabasi — faqat o''z filialingiz talabasi uchun ariza yubora olasiz';
  end if;

  if not v_talaba.hujjat_tayyor then
    raise exception 'Talabaning hujjati hali tayyor emas';
  end if;

  if not exists (
    select 1 from talaba_imtihonlar
    where talaba_id = p_talaba_id and nazariy_kerak and nazariy_natija = 'otdi'
  ) then
    raise exception 'Talaba hali nazariydan o''tmagan';
  end if;

  if exists (select 1 from talaba_imtihonlar where talaba_id = p_talaba_id and amaliy_kerak) then
    raise exception 'Talaba allaqachon amaliy imtihonga biriktirilgan';
  end if;

  if exists (select 1 from amaliy_arizalar where talaba_id = p_talaba_id and holati = 'kutilmoqda') then
    raise exception 'Bu talaba uchun allaqachon kutilayotgan ariza bor';
  end if;

  insert into amaliy_arizalar (talaba_id, soragan, izoh)
  values (p_talaba_id, auth.uid(), nullif(trim(p_izoh), ''))
  returning id into v_ariza_id;

  return v_ariza_id;
end;
$$;
revoke all on function amaliy_ariza_yuborish(uuid, text) from public;
revoke execute on function amaliy_ariza_yuborish(uuid, text) from anon;
grant execute on function amaliy_ariza_yuborish(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- amaliy_arizani_tasdiqlash — Hujjatchi/imtihonchi/superadmin arizani
-- tanlangan imtihonga tasdiqlaydi. Ichida xuddi amaliyga_otkazish() RPC'sini
-- chaqiradi (bir xil biznes-mantiq — kod takrorlanmasin), so'ng arizani
-- "tasdiqlangan" deb belgilaydi.
-- ----------------------------------------------------------------------------
create or replace function amaliy_arizani_tasdiqlash(p_ariza_id uuid, p_imtihon_id uuid)
returns uuid
language plpgsql
security definer set search_path = public as $$
declare
  v_ariza amaliy_arizalar%rowtype;
  v_urinish_id uuid;
begin
  if joriy_rol() not in ('hujjatchi', 'imtihonchi', 'superadmin') then
    raise exception 'Ruxsat yo''q';
  end if;

  select * into v_ariza from amaliy_arizalar where id = p_ariza_id;
  if not found then
    raise exception 'Ariza topilmadi';
  end if;
  if v_ariza.holati <> 'kutilmoqda' then
    raise exception 'Bu ariza allaqachon ko''rib chiqilgan';
  end if;

  select amaliyga_otkazish(v_ariza.talaba_id, p_imtihon_id, null) into v_urinish_id;

  update amaliy_arizalar
  set holati = 'tasdiqlangan',
      korib_chiqqan = auth.uid(),
      korib_chiqqan_vaqt = now(),
      yaratilgan_urinish_id = v_urinish_id
  where id = p_ariza_id;

  return v_urinish_id;
end;
$$;
revoke all on function amaliy_arizani_tasdiqlash(uuid, uuid) from public;
revoke execute on function amaliy_arizani_tasdiqlash(uuid, uuid) from anon;
grant execute on function amaliy_arizani_tasdiqlash(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- amaliy_arizani_rad_etish — Hujjatchi/imtihonchi/superadmin arizani rad
-- etadi (masalan hujjatda muammo bor). Rad etilgan ariza qayta yuborilishi
-- mumkin (amaliy_ariza_yuborish faqat "kutilmoqda" holatidagi dublikatni
-- bloklaydi).
-- ----------------------------------------------------------------------------
create or replace function amaliy_arizani_rad_etish(p_ariza_id uuid, p_sabab text default null)
returns void
language plpgsql
security definer set search_path = public as $$
begin
  if joriy_rol() not in ('hujjatchi', 'imtihonchi', 'superadmin') then
    raise exception 'Ruxsat yo''q';
  end if;

  update amaliy_arizalar
  set holati = 'rad_etildi',
      korib_chiqqan = auth.uid(),
      korib_chiqqan_vaqt = now(),
      izoh = coalesce(nullif(trim(p_sabab), ''), izoh)
  where id = p_ariza_id and holati = 'kutilmoqda';

  if not found then
    raise exception 'Ariza topilmadi yoki allaqachon ko''rib chiqilgan';
  end if;
end;
$$;
revoke all on function amaliy_arizani_rad_etish(uuid, text) from public;
revoke execute on function amaliy_arizani_rad_etish(uuid, text) from anon;
grant execute on function amaliy_arizani_rad_etish(uuid, text) to authenticated;
