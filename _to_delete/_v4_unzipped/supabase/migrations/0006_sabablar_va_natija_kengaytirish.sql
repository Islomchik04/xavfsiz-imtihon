-- ============================================================================
-- XAVFSIZ IMTIHON v4 — "Kelmadi"/"Boshqa" natija turlari + sabablar
-- ============================================================================
-- 0006a (natija_turi enumga 'kelmadi'/'boshqa' qo'shish) BU MIGRATSIYADAN
-- OLDIN qo'llanishi shart (ALTER TYPE ... ADD VALUE bir xil tranzaksiyada
-- ishlatilishi mumkin emas).
-- ============================================================================

-- "Boshqa" natija turi uchun sabablar ro'yxati — superadmin Sozlamalardan
-- boshqaradi, Imtihon boshqaruvchisi natija belgilaganda shundan tanlaydi.
create table if not exists sabablar (
  id uuid primary key default gen_random_uuid(),
  matn text not null,
  faol boolean not null default true,
  created_at timestamptz not null default now()
);

alter table sabablar enable row level security;
drop policy if exists sabablar_select on sabablar;
create policy sabablar_select on sabablar for select to authenticated using (true);
drop policy if exists sabablar_yozish on sabablar;
create policy sabablar_yozish on sabablar for all to authenticated
  using (joriy_rol() = 'superadmin') with check (joriy_rol() = 'superadmin');

-- talaba_imtihonlar: "Boshqa" natija tanlanganda sababni saqlash uchun ustunlar.
-- Trigger guard funksiyasini o'zgartirishning hojati yo'q — u faqat ANIQ
-- nomlangan ustunlarni bloklaydi, yangi ustunlar ro'yxatda yo'q, shuning uchun
-- Imtihonchi (imtihon boshqaruvchisi) bularni erkin belgilay oladi.
alter table talaba_imtihonlar
  add column if not exists nazariy_sabab_id uuid references sabablar(id),
  add column if not exists amaliy_sabab_id uuid references sabablar(id);
