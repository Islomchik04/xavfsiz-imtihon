-- ============================================================================
-- XAVFSIZ IMTIHON — boshlang'ich baza sxemasi
-- ============================================================================
-- Ushbu migratsiya quyidagilarni yaratadi:
--   1) enum turlar
--   2) jadvallar: filiallar, guruhlar, oqituvchilar, profiles, talabalar
--   3) yordamchi funksiyalar (joriy foydalanuvchi roli/filiali)
--   4) RLS (Row Level Security) policy'lari
--   5) talabalar jadvali uchun rol-asosidagi ustun himoyasi (trigger)
--   6) updated_at avtomatik yangilanishi
-- Supabase SQL Editor'da yoki `supabase db push` orqali ishga tushiring.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ----------------------------------------------------------------------------
-- 1) ENUM TURLAR
-- ----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('superadmin', 'admin', 'hujjatchi', 'imtihonchi');
exception when duplicate_object then null; end $$;

do $$ begin
  create type oqituvchi_turi as enum ('nazariy', 'amaliy');
exception when duplicate_object then null; end $$;

do $$ begin
  create type imtihon_turi as enum ('nazariy', 'amaliy', 'ikkalasi');
exception when duplicate_object then null; end $$;

do $$ begin
  create type natija_turi as enum ('kutilmoqda', 'otdi', 'otmadi');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2) JADVALLAR
-- ----------------------------------------------------------------------------

create table if not exists filiallar (
  id uuid primary key default gen_random_uuid(),
  nomi text not null unique,
  faol boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists guruhlar (
  id uuid primary key default gen_random_uuid(),
  nomi text not null,
  filial_id uuid not null references filiallar(id) on delete cascade,
  faol boolean not null default true,
  created_at timestamptz not null default now(),
  unique (nomi, filial_id)
);

create table if not exists oqituvchilar (
  id uuid primary key default gen_random_uuid(),
  ism_familya text not null,
  turi oqituvchi_turi not null,
  filial_id uuid not null references filiallar(id) on delete cascade,
  faol boolean not null default true,
  created_at timestamptz not null default now()
);

-- profiles.id = auth.users.id (Supabase Auth bilan bog'langan)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  telefon text not null unique,
  ism_familya text not null,
  role user_role not null,
  filial_id uuid references filiallar(id),
  faol boolean not null default true,
  created_at timestamptz not null default now(),
  constraint admin_filial_majburiy check (
    (role = 'admin' and filial_id is not null) or (role <> 'admin')
  )
);

create table if not exists talabalar (
  id uuid primary key default gen_random_uuid(),

  -- 1-bosqich: Admin kiritadi
  ism_familya text not null,
  filial_id uuid not null references filiallar(id),
  guruh_id uuid not null references guruhlar(id),
  forma_083 boolean not null default false,
  imtihon_turi imtihon_turi not null,
  nazariy_oqituvchi_id uuid references oqituvchilar(id),
  amaliy_oqituvchi_id uuid references oqituvchilar(id),
  qoshgan uuid not null references profiles(id),

  -- 2-bosqich: Hujjatchi to'ldiradi
  hujjat_forma_083 boolean not null default false,
  tasdiqnoma boolean not null default false,
  imtihon_varaqasi boolean not null default false,
  imtihon_sanasi date,
  hujjat_tayyor boolean not null default false,
  hujjat_izoh text,
  hujjat_tayyorlagan uuid references profiles(id),
  hujjat_sana timestamptz,

  -- 3-bosqich: Imtihonchi natija belgilaydi
  nazariy_natija natija_turi not null default 'kutilmoqda',
  nazariy_belgilagan uuid references profiles(id),
  nazariy_belgilangan_vaqt timestamptz,
  amaliy_natija natija_turi not null default 'kutilmoqda',
  amaliy_belgilagan uuid references profiles(id),
  amaliy_belgilangan_vaqt timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint nazariy_oqituvchi_talab check (
    imtihon_turi = 'amaliy' or nazariy_oqituvchi_id is not null
  ),
  constraint amaliy_oqituvchi_talab check (
    imtihon_turi = 'nazariy' or amaliy_oqituvchi_id is not null
  )
);

create index if not exists idx_talabalar_filial on talabalar(filial_id);
create index if not exists idx_talabalar_guruh on talabalar(guruh_id);
create index if not exists idx_talabalar_hujjat_tayyor on talabalar(hujjat_tayyor);
create index if not exists idx_talabalar_ism_trgm on talabalar using gin (ism_familya gin_trgm_ops);
create index if not exists idx_talabalar_nazariy_oqituvchi on talabalar(nazariy_oqituvchi_id);
create index if not exists idx_talabalar_amaliy_oqituvchi on talabalar(amaliy_oqituvchi_id);
create index if not exists idx_guruhlar_filial on guruhlar(filial_id);
create index if not exists idx_oqituvchilar_filial on oqituvchilar(filial_id);

-- ----------------------------------------------------------------------------
-- 3) YORDAMCHI FUNKSIYALAR
-- ----------------------------------------------------------------------------

create or replace function joriy_rol()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function joriy_filial()
returns uuid
language sql stable security definer set search_path = public as $$
  select filial_id from profiles where id = auth.uid();
$$;

create or replace function updated_at_yangilash()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_talabalar_updated_at on talabalar;
create trigger trg_talabalar_updated_at
  before update on talabalar
  for each row execute function updated_at_yangilash();

-- ----------------------------------------------------------------------------
-- 4) RLS YOQISH
-- ----------------------------------------------------------------------------

alter table filiallar enable row level security;
alter table guruhlar enable row level security;
alter table oqituvchilar enable row level security;
alter table profiles enable row level security;
alter table talabalar enable row level security;

-- filiallar: hamma autentifikatsiyadan o'tgan foydalanuvchi o'qiy oladi, faqat superadmin yozadi
drop policy if exists filiallar_select on filiallar;
create policy filiallar_select on filiallar for select to authenticated using (true);
drop policy if exists filiallar_yozish on filiallar;
create policy filiallar_yozish on filiallar for all to authenticated
  using (joriy_rol() = 'superadmin') with check (joriy_rol() = 'superadmin');

-- guruhlar
drop policy if exists guruhlar_select on guruhlar;
create policy guruhlar_select on guruhlar for select to authenticated using (true);
drop policy if exists guruhlar_yozish on guruhlar;
create policy guruhlar_yozish on guruhlar for all to authenticated
  using (joriy_rol() = 'superadmin') with check (joriy_rol() = 'superadmin');

-- oqituvchilar
drop policy if exists oqituvchilar_select on oqituvchilar;
create policy oqituvchilar_select on oqituvchilar for select to authenticated using (true);
drop policy if exists oqituvchilar_yozish on oqituvchilar;
create policy oqituvchilar_yozish on oqituvchilar for all to authenticated
  using (joriy_rol() = 'superadmin') with check (joriy_rol() = 'superadmin');

-- profiles: ICHKI xodimlar tizimi bo'lgani uchun barcha login qilgan
-- foydalanuvchilar bir-birining ism/rolini ko'ra oladi (masalan "kim
-- ro'yxatga oldi", "kim hujjatni tayyorladi" kabi join'lar shuning uchun
-- ishlaydi — RLS embed qilingan jadvalga ham qo'llanadi). Yozish esa
-- cheklangan: faqat o'zini yoki (superadmin) hammani.
drop policy if exists profiles_select_self on profiles;
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated using (true);
drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid() or joriy_rol() = 'superadmin')
  with check (id = auth.uid() or joriy_rol() = 'superadmin');
-- Yangi profil qo'shish/o'chirish faqat server-tomon (service_role, /api/create-user)
-- orqali amalga oshiriladi, shuning uchun bu yerda insert/delete policy yo'q
-- (service_role RLS'ni chetlab o'tadi).

-- talabalar: SELECT — admin faqat o'z filialini, boshqa rollar hammasini ko'radi
drop policy if exists talabalar_select on talabalar;
create policy talabalar_select on talabalar for select to authenticated
  using (
    joriy_rol() in ('superadmin', 'hujjatchi', 'imtihonchi')
    or (joriy_rol() = 'admin' and filial_id = joriy_filial())
  );

-- talabalar: INSERT — admin faqat o'z filialiga, superadmin istalgan filialga
drop policy if exists talabalar_insert on talabalar;
create policy talabalar_insert on talabalar for insert to authenticated
  with check (
    joriy_rol() = 'superadmin'
    or (joriy_rol() = 'admin' and filial_id = joriy_filial() and qoshgan = auth.uid())
  );

-- talabalar: UPDATE — barcha ishtirokchi rollar yozishi mumkin,
-- lekin QAYSI USTUNLARNI o'zgartirishi mumkinligini pastdagi trigger nazorat qiladi.
drop policy if exists talabalar_update on talabalar;
create policy talabalar_update on talabalar for update to authenticated
  using (
    joriy_rol() = 'superadmin'
    or joriy_rol() in ('hujjatchi', 'imtihonchi')
    or (joriy_rol() = 'admin' and filial_id = joriy_filial())
  )
  with check (
    joriy_rol() = 'superadmin'
    or joriy_rol() in ('hujjatchi', 'imtihonchi')
    or (joriy_rol() = 'admin' and filial_id = joriy_filial())
  );

-- talabalar: DELETE — faqat superadmin
drop policy if exists talabalar_delete on talabalar;
create policy talabalar_delete on talabalar for delete to authenticated
  using (joriy_rol() = 'superadmin');

-- ----------------------------------------------------------------------------
-- 5) ROL-ASOSIDAGI USTUN HIMOYASI (talabalar UPDATE trigger)
-- ----------------------------------------------------------------------------
-- RLS faqat QATOR (row) darajasida ishlaydi, USTUN darajasida emas.
-- Shu sabab: Admin faqat 1-bosqich maydonlarini (va faqat hujjat hali tayyor
-- bo'lmaguncha), Hujjatchi faqat 2-bosqich maydonlarini, Imtihonchi faqat
-- 3-bosqich (natija) maydonlarini o'zgartira olishini shu trigger orqali
-- majburlaymiz.

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
       or new.imtihon_sanasi is distinct from old.imtihon_sanasi
       or new.hujjat_tayyor is distinct from old.hujjat_tayyor
       or new.hujjat_tayyorlagan is distinct from old.hujjat_tayyorlagan
       or new.hujjat_sana is distinct from old.hujjat_sana
       or new.nazariy_natija is distinct from old.nazariy_natija
       or new.nazariy_belgilagan is distinct from old.nazariy_belgilagan
       or new.nazariy_belgilangan_vaqt is distinct from old.nazariy_belgilangan_vaqt
       or new.amaliy_natija is distinct from old.amaliy_natija
       or new.amaliy_belgilagan is distinct from old.amaliy_belgilagan
       or new.amaliy_belgilangan_vaqt is distinct from old.amaliy_belgilangan_vaqt
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
       or new.nazariy_natija is distinct from old.nazariy_natija
       or new.amaliy_natija is distinct from old.amaliy_natija
       or new.nazariy_belgilagan is distinct from old.nazariy_belgilagan
       or new.amaliy_belgilagan is distinct from old.amaliy_belgilagan
    then
      raise exception 'Hujjatchi faqat hujjat maydonlarini (083 forma, tasdiqnoma, imtihon varaqasi, imtihon sanasi) o''zgartira oladi';
    end if;
    if new.hujjat_tayyor and not old.hujjat_tayyor then
      new.hujjat_tayyorlagan := auth.uid();
      new.hujjat_sana := now();
    end if;
    return new;
  end if;

  if rol = 'imtihonchi' then
    if not old.hujjat_tayyor then
      raise exception 'Hujjat hali tayyor emas — natija belgilab bo''lmaydi';
    end if;
    if new.ism_familya is distinct from old.ism_familya
       or new.filial_id is distinct from old.filial_id
       or new.guruh_id is distinct from old.guruh_id
       or new.forma_083 is distinct from old.forma_083
       or new.imtihon_turi is distinct from old.imtihon_turi
       or new.nazariy_oqituvchi_id is distinct from old.nazariy_oqituvchi_id
       or new.amaliy_oqituvchi_id is distinct from old.amaliy_oqituvchi_id
       or new.hujjat_forma_083 is distinct from old.hujjat_forma_083
       or new.tasdiqnoma is distinct from old.tasdiqnoma
       or new.imtihon_varaqasi is distinct from old.imtihon_varaqasi
       or new.imtihon_sanasi is distinct from old.imtihon_sanasi
       or new.hujjat_tayyor is distinct from old.hujjat_tayyor
    then
      raise exception 'Imtihonchi faqat imtihon natijasini (o''tdi/o''tmadi) belgilashi mumkin';
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

  raise exception 'Ruxsat yo''q';
end;
$$;

drop trigger if exists trg_talabalar_update_guard on talabalar;
create trigger trg_talabalar_update_guard
  before update on talabalar
  for each row execute function talabalar_update_guard();

-- ----------------------------------------------------------------------------
-- 6) BIRINCHI SUPERADMINNI QO'LDA YARATISH (README'da tushuntirilgan)
-- ----------------------------------------------------------------------------
-- Bu migratsiya faqat sxema yaratadi. Birinchi superadmin foydalanuvchisini
-- Supabase Dashboard > Authentication orqali (yoki quyidagi SQL namunasi
-- bilan, auth.users yaratilgach) qo'lda kiritish kerak — README.md'ga qarang.
