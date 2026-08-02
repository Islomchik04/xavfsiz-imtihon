-- ============================================================================
-- XAVFSIZ IMTIHON v3 — O'qituvchi kabineti (login + o'z statistikasi/KPI'si)
-- ============================================================================
-- DIQQAT: 'oqituvchi' qiymati user_role enum'iga alohida migratsiyada
-- (0004a_oqituvchi_rol_enum_qoshish, apply_migration orqali) qo'shilgan —
-- Postgres'da ADD VALUE bir xil tranzaksiyada keyinroq ishlatilishi mumkin
-- emas, shu sabab ikkiga bo'lingan.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) profiles: o'qituvchi profilini oqituvchilar jadvaliga bog'lash
-- ----------------------------------------------------------------------------
alter table profiles add column if not exists oqituvchi_id uuid references oqituvchilar(id);

alter table profiles drop constraint if exists oqituvchi_bog_majburiy;
alter table profiles add constraint oqituvchi_bog_majburiy check (
  (role = 'oqituvchi' and oqituvchi_id is not null) or (role <> 'oqituvchi')
);

create unique index if not exists idx_profiles_oqituvchi_id on profiles(oqituvchi_id) where oqituvchi_id is not null;

create or replace function joriy_oqituvchi()
returns uuid
language sql stable security definer set search_path = public as $$
  select oqituvchi_id from profiles where id = auth.uid();
$$;

revoke all on function joriy_oqituvchi() from public;
grant execute on function joriy_oqituvchi() to authenticated;

-- ----------------------------------------------------------------------------
-- 2) talabalar: SELECT'ga oqituvchi rolini qo'shish (faqat o'ziga tegishli
--    o'quvchilarni ko'radi)
-- ----------------------------------------------------------------------------
drop policy if exists talabalar_select on talabalar;
create policy talabalar_select on talabalar for select to authenticated
  using (
    joriy_rol() in ('superadmin', 'hujjatchi', 'imtihonchi')
    or (joriy_rol() = 'admin' and filial_id = joriy_filial())
    or (joriy_rol() = 'oqituvchi' and (nazariy_oqituvchi_id = joriy_oqituvchi() or amaliy_oqituvchi_id = joriy_oqituvchi()))
  );

-- ----------------------------------------------------------------------------
-- 3) talaba_imtihonlar: SELECT'ga oqituvchi rolini qo'shish
-- ----------------------------------------------------------------------------
drop policy if exists talaba_imtihonlar_select on talaba_imtihonlar;
create policy talaba_imtihonlar_select on talaba_imtihonlar for select to authenticated
  using (
    joriy_rol() in ('superadmin', 'hujjatchi', 'imtihonchi')
    or (joriy_rol() = 'admin' and exists (
      select 1 from talabalar t where t.id = talaba_id and t.filial_id = joriy_filial()
    ))
    or (joriy_rol() = 'oqituvchi' and exists (
      select 1 from talabalar t where t.id = talaba_id
        and (t.nazariy_oqituvchi_id = joriy_oqituvchi() or t.amaliy_oqituvchi_id = joriy_oqituvchi())
    ))
  );
