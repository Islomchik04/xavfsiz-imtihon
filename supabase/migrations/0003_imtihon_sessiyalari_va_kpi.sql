-- ============================================================================
-- XAVFSIZ IMTIHON v2 — Imtihon sessiyalari, ko'p-filialli o'qituvchilar,
-- guruhni avtomatik yaratish, va KPI uchun fundament.
-- ============================================================================
-- MUHIM: bu migratsiya qo'llanganda talabalar/oqituvchilar jadvallari BO'SH
-- bo'lishi kerak (loyiha hali production'da ishlatilmagan) — shu sabab eski
-- ustunlarni to'g'ridan-to'g'ri o'chirib tashlaymiz (ma'lumot yo'qotish xavfi
-- yo'q). Agar bu migratsiya ishlatilganda jadvallarda haqiqiy ma'lumot bo'lsa,
-- avval backup oling.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) O'QITUVCHI <-> FILIAL (ko'p-ko'pga)
-- ----------------------------------------------------------------------------
create table if not exists oqituvchi_filiallar (
  oqituvchi_id uuid not null references oqituvchilar(id) on delete cascade,
  filial_id uuid not null references filiallar(id) on delete cascade,
  primary key (oqituvchi_id, filial_id)
);

-- Mavjud (agar bo'lsa) filial_id ma'lumotini yangi jadvalga ko'chirish
insert into oqituvchi_filiallar (oqituvchi_id, filial_id)
select id, filial_id from oqituvchilar where filial_id is not null
on conflict do nothing;

alter table oqituvchilar drop column if exists filial_id;

create index if not exists idx_oqituvchi_filiallar_filial on oqituvchi_filiallar(filial_id);

alter table oqituvchi_filiallar enable row level security;
drop policy if exists oqituvchi_filiallar_select on oqituvchi_filiallar;
create policy oqituvchi_filiallar_select on oqituvchi_filiallar for select to authenticated using (true);
drop policy if exists oqituvchi_filiallar_yozish on oqituvchi_filiallar;
create policy oqituvchi_filiallar_yozish on oqituvchi_filiallar for all to authenticated
  using (joriy_rol() = 'superadmin') with check (joriy_rol() = 'superadmin');

-- ----------------------------------------------------------------------------
-- 2) IMTIHON SESSIYALARI va URINISHLAR
-- ----------------------------------------------------------------------------
create table if not exists imtihonlar (
  id uuid primary key default gen_random_uuid(),
  sana date not null,
  izoh text,
  yaratgan uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_imtihonlar_sana on imtihonlar(sana);

create table if not exists talaba_imtihonlar (
  id uuid primary key default gen_random_uuid(),
  talaba_id uuid not null references talabalar(id) on delete cascade,
  imtihon_id uuid not null references imtihonlar(id),
  nazariy_kerak boolean not null default false,
  amaliy_kerak boolean not null default false,
  nazariy_natija natija_turi not null default 'kutilmoqda',
  amaliy_natija natija_turi not null default 'kutilmoqda',
  nazariy_belgilagan uuid references profiles(id),
  nazariy_belgilangan_vaqt timestamptz,
  amaliy_belgilagan uuid references profiles(id),
  amaliy_belgilangan_vaqt timestamptz,
  biriktirgan uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kamida_bitta_kerak check (nazariy_kerak or amaliy_kerak)
);
create index if not exists idx_talaba_imtihonlar_talaba on talaba_imtihonlar(talaba_id);
create index if not exists idx_talaba_imtihonlar_imtihon on talaba_imtihonlar(imtihon_id);

drop trigger if exists trg_talaba_imtihonlar_updated_at on talaba_imtihonlar;
create trigger trg_talaba_imtihonlar_updated_at
  before update on talaba_imtihonlar
  for each row execute function updated_at_yangilash();

-- ----------------------------------------------------------------------------
-- 3) TALABALAR: eski (endi keraksiz) ustunlarni olib tashlash
-- ----------------------------------------------------------------------------
alter table talabalar
  drop column if exists imtihon_sanasi,
  drop column if exists nazariy_natija,
  drop column if exists nazariy_belgilagan,
  drop column if exists nazariy_belgilangan_vaqt,
  drop column if exists amaliy_natija,
  drop column if exists amaliy_belgilagan,
  drop column if exists amaliy_belgilangan_vaqt;

-- ----------------------------------------------------------------------------
-- 4) RLS: imtihonlar
-- ----------------------------------------------------------------------------
alter table imtihonlar enable row level security;
drop policy if exists imtihonlar_select on imtihonlar;
create policy imtihonlar_select on imtihonlar for select to authenticated using (true);
drop policy if exists imtihonlar_insert on imtihonlar;
create policy imtihonlar_insert on imtihonlar for insert to authenticated
  with check (joriy_rol() in ('hujjatchi', 'superadmin') and yaratgan = auth.uid());
drop policy if exists imtihonlar_update on imtihonlar;
create policy imtihonlar_update on imtihonlar for update to authenticated
  using (joriy_rol() in ('hujjatchi', 'superadmin'))
  with check (joriy_rol() in ('hujjatchi', 'superadmin'));
drop policy if exists imtihonlar_delete on imtihonlar;
create policy imtihonlar_delete on imtihonlar for delete to authenticated
  using (joriy_rol() = 'superadmin');

-- ----------------------------------------------------------------------------
-- 5) RLS: talaba_imtihonlar
-- ----------------------------------------------------------------------------
alter table talaba_imtihonlar enable row level security;

drop policy if exists talaba_imtihonlar_select on talaba_imtihonlar;
create policy talaba_imtihonlar_select on talaba_imtihonlar for select to authenticated
  using (
    joriy_rol() in ('superadmin', 'hujjatchi', 'imtihonchi')
    or (joriy_rol() = 'admin' and exists (
      select 1 from talabalar t where t.id = talaba_id and t.filial_id = joriy_filial()
    ))
  );

drop policy if exists talaba_imtihonlar_insert on talaba_imtihonlar;
create policy talaba_imtihonlar_insert on talaba_imtihonlar for insert to authenticated
  with check (
    joriy_rol() in ('hujjatchi', 'superadmin')
    and biriktirgan = auth.uid()
    and exists (select 1 from talabalar t where t.id = talaba_id and t.hujjat_tayyor = true)
  );

drop policy if exists talaba_imtihonlar_update on talaba_imtihonlar;
create policy talaba_imtihonlar_update on talaba_imtihonlar for update to authenticated
  using (joriy_rol() in ('superadmin', 'hujjatchi', 'imtihonchi'))
  with check (joriy_rol() in ('superadmin', 'hujjatchi', 'imtihonchi'));

drop policy if exists talaba_imtihonlar_delete on talaba_imtihonlar;
create policy talaba_imtihonlar_delete on talaba_imtihonlar for delete to authenticated
  using (joriy_rol() = 'superadmin');

-- Ustun darajasidagi himoya (kim nimani o'zgartira olishi)
create or replace function talaba_imtihonlar_update_guard()
returns trigger
language plpgsql
security definer set search_path = public as $$
declare
  rol user_role;
begin
  rol := joriy_rol();

  if rol = 'superadmin' then
    return new;
  end if;

  if rol = 'imtihonchi' then
    if new.talaba_id is distinct from old.talaba_id
       or new.imtihon_id is distinct from old.imtihon_id
       or new.nazariy_kerak is distinct from old.nazariy_kerak
       or new.amaliy_kerak is distinct from old.amaliy_kerak
       or new.biriktirgan is distinct from old.biriktirgan
    then
      raise exception 'Imtihonchi faqat natijani belgilashi mumkin';
    end if;
    if new.nazariy_natija is distinct from old.nazariy_natija then
      new.nazariy_belgilagan := auth.uid();
      new.nazariy_belgilangan_vaqt := now();
    end if;
    if new.amaliy_natija is distinct from old.amaliy_natija then
      new.amaliy_belgilagan := auth.uid();
      new.amaliy_belgilangan_vaqt := now();
    end if;
    return new;
  end if;

  if rol = 'hujjatchi' then
    if old.nazariy_natija <> 'kutilmoqda' or old.amaliy_natija <> 'kutilmoqda' then
      raise exception 'Natija chiqqan urinishni Hujjatchi o''zgartira olmaydi';
    end if;
    if new.talaba_id is distinct from old.talaba_id
       or new.imtihon_id is distinct from old.imtihon_id
       or new.nazariy_natija is distinct from old.nazariy_natija
       or new.amaliy_natija is distinct from old.amaliy_natija
       or new.nazariy_belgilagan is distinct from old.nazariy_belgilagan
       or new.amaliy_belgilagan is distinct from old.amaliy_belgilagan
       or new.biriktirgan is distinct from old.biriktirgan
    then
      raise exception 'Hujjatchi faqat nazariy_kerak/amaliy_kerak maydonlarini (natija chiqmagunicha) o''zgartira oladi';
    end if;
    return new;
  end if;

  raise exception 'Ruxsat yo''q';
end;
$$;

drop trigger if exists trg_talaba_imtihonlar_update_guard on talaba_imtihonlar;
create trigger trg_talaba_imtihonlar_update_guard
  before update on talaba_imtihonlar
  for each row execute function talaba_imtihonlar_update_guard();

-- ----------------------------------------------------------------------------
-- 6) TALABALAR: yangilangan RLS va trigger (Hujjatchi ham qo'sha oladi,
--    Imtihonchi endi talabalar jadvalini emas, talaba_imtihonlar'ni o'zgartiradi)
-- ----------------------------------------------------------------------------
drop policy if exists talabalar_insert on talabalar;
create policy talabalar_insert on talabalar for insert to authenticated
  with check (
    qoshgan = auth.uid()
    and (
      joriy_rol() = 'superadmin'
      or joriy_rol() = 'hujjatchi'
      or (joriy_rol() = 'admin' and filial_id = joriy_filial())
    )
  );

drop policy if exists talabalar_update on talabalar;
create policy talabalar_update on talabalar for update to authenticated
  using (
    joriy_rol() = 'superadmin'
    or joriy_rol() = 'hujjatchi'
    or (joriy_rol() = 'admin' and filial_id = joriy_filial())
  )
  with check (
    joriy_rol() = 'superadmin'
    or joriy_rol() = 'hujjatchi'
    or (joriy_rol() = 'admin' and filial_id = joriy_filial())
  );

create or replace function talabalar_update_guard()
returns trigger
language plpgsql
security definer set search_path = public as $$
declare
  rol user_role;
begin
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

-- ----------------------------------------------------------------------------
-- 7) GURUHLAR: Admin/Hujjatchi ham (o'z filiali doirasida / markaziy)
--    guruh nomini kiritganda avtomatik yaratib qo'ya olishi kerak.
-- ----------------------------------------------------------------------------
drop policy if exists guruhlar_yozish on guruhlar;
drop policy if exists guruhlar_insert on guruhlar;
create policy guruhlar_insert on guruhlar for insert to authenticated
  with check (
    joriy_rol() = 'superadmin'
    or joriy_rol() = 'hujjatchi'
    or (joriy_rol() = 'admin' and filial_id = joriy_filial())
  );
drop policy if exists guruhlar_update on guruhlar;
create policy guruhlar_update on guruhlar for update to authenticated
  using (joriy_rol() = 'superadmin') with check (joriy_rol() = 'superadmin');
drop policy if exists guruhlar_delete on guruhlar;
create policy guruhlar_delete on guruhlar for delete to authenticated
  using (joriy_rol() = 'superadmin');

-- ----------------------------------------------------------------------------
-- 8) RPC: Hujjatchi "imtihonchilar safiga qo'shish" + birinchi imtihonga
--    biriktirish — bitta atomik amal (transaction) sifatida.
-- ----------------------------------------------------------------------------
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

  insert into talaba_imtihonlar (talaba_id, imtihon_id, nazariy_kerak, amaliy_kerak, biriktirgan)
  values (p_talaba_id, p_imtihon_id, p_nazariy_kerak, p_amaliy_kerak, auth.uid())
  returning id into v_attempt_id;

  return v_attempt_id;
end;
$$;
revoke all on function imtihonga_biriktirish(uuid, uuid, boolean, boolean) from public;
grant execute on function imtihonga_biriktirish(uuid, uuid, boolean, boolean) to authenticated;

create or replace function hujjatga_tayyorlash(
  p_talaba_id uuid,
  p_imtihon_id uuid,
  p_hujjat_forma_083 boolean,
  p_tasdiqnoma boolean,
  p_imtihon_varaqasi boolean,
  p_izoh text
) returns uuid
language plpgsql
security definer set search_path = public as $$
declare
  v_talaba talabalar%rowtype;
  v_attempt_id uuid;
begin
  if joriy_rol() not in ('hujjatchi', 'superadmin') then
    raise exception 'Ruxsat yo''q';
  end if;
  if not p_tasdiqnoma or not p_imtihon_varaqasi then
    raise exception 'Tasdiqnoma va imtihon varaqasi bo''lishi shart';
  end if;

  select * into v_talaba from talabalar where id = p_talaba_id;
  if not found then
    raise exception 'Talaba topilmadi';
  end if;
  if v_talaba.hujjat_tayyor then
    raise exception 'Bu talaba allaqachon imtihonchilar safiga qo''shilgan';
  end if;

  update talabalar set
    hujjat_forma_083 = p_hujjat_forma_083,
    tasdiqnoma = p_tasdiqnoma,
    imtihon_varaqasi = p_imtihon_varaqasi,
    hujjat_izoh = p_izoh,
    hujjat_tayyor = true
  where id = p_talaba_id;

  select imtihonga_biriktirish(
    p_talaba_id,
    p_imtihon_id,
    v_talaba.imtihon_turi in ('nazariy', 'ikkalasi'),
    v_talaba.imtihon_turi in ('amaliy', 'ikkalasi')
  ) into v_attempt_id;

  return v_attempt_id;
end;
$$;
revoke all on function hujjatga_tayyorlash(uuid, uuid, boolean, boolean, boolean, text) from public;
grant execute on function hujjatga_tayyorlash(uuid, uuid, boolean, boolean, boolean, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 9) Xavfsizlik: ichki yordamchi funksiyalarni anon/public'dan yashirish
--    (RLS policy'lar ularni 'authenticated' sifatida chaqiraveradi, lekin
--    tashqi RPC orqali to'g'ridan-to'g'ri chaqirilishining oldini olamiz)
-- ----------------------------------------------------------------------------
-- Eslatma: trigger funksiyalarini (talabalar_update_guard va h.k.) ataylab
-- bu yerda revoke qilmadik — trigger sifatida ishlashi uchun bu shart emas,
-- lekin production'da ishlab turgan tizimda tasdiqlanmagan taxmin bilan
-- barcha UPDATE amallarini buzib qo'yish xavfidan qochish uchun ataylab
-- tegilmadi (past darajali WARN, real xavfsizlik xavfi yo'q).
revoke all on function joriy_rol() from public;
grant execute on function joriy_rol() to authenticated;
revoke all on function joriy_filial() from public;
grant execute on function joriy_filial() to authenticated;
