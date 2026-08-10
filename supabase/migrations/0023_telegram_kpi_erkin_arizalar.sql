-- ============================================================================
-- Telegram bot orqali "erkin/mustaqil o'quvchi" KPI arizalari.
--
-- Ba'zi o'quvchilar tizimda umuman ro'yxatdan o'tmagan holda o'zlari
-- (mustaqil) imtihon topshiradi, lekin shundan oldin domlaning oldiga
-- maslahatga keladi. Bunday holatlar uchun domla Telegram bot orqali
-- o'quvchi rasmi + ma'lumotini yuboradi, Hujjatchi yoki Superadmin buni
-- ko'rib chiqib tasdiqlaydi, tasdiqlangach shu domlaga xuddi oddiy "otdi"
-- kabi KPI mukofoti (100 000 so'm) yoziladi — qarang:
-- imtihonHisob.js#oqituvchilarKpiHisoblash (3-parametr: erkinArizalar).
-- ============================================================================

-- 1) O'qituvchining Telegram bilan bog'lanishi uchun telefon raqami va,
--    bog'langandan keyin, uning Telegram chat_id'si.
alter table oqituvchilar add column if not exists telefon text;
alter table oqituvchilar add column if not exists telegram_chat_id bigint;
create unique index if not exists idx_oqituvchilar_telegram_chat_id
  on oqituvchilar(telegram_chat_id) where telegram_chat_id is not null;

-- 2) Ariza jadvali
create table if not exists erkin_talaba_arizalari (
  id uuid primary key default gen_random_uuid(),
  oqituvchi_id uuid not null references oqituvchilar(id),
  ism_familya text not null,
  telefon text,
  urinish_raqami int,
  rasm_yoli text,
  izoh text,
  holati text not null default 'kutilmoqda' check (holati in ('kutilmoqda', 'tasdiqlangan', 'rad_etildi')),
  telegram_chat_id bigint,
  telegram_message_id bigint,
  created_at timestamptz not null default now(),
  korib_chiqqan uuid references profiles(id),
  korib_chiqqan_vaqt timestamptz,
  kpi_hafta date
);
create index if not exists idx_erkin_arizalar_oqituvchi on erkin_talaba_arizalari(oqituvchi_id);
create index if not exists idx_erkin_arizalar_holati on erkin_talaba_arizalari(holati);

alter table erkin_talaba_arizalari enable row level security;

-- Faqat Hujjatchi va Superadmin ko'rib chiqadi (foydalanuvchi tanlovi bo'yicha
-- — Imtihonchi bu yerga kirmaydi).
drop policy if exists erkin_arizalar_select on erkin_talaba_arizalari;
create policy erkin_arizalar_select on erkin_talaba_arizalari for select to authenticated
  using (joriy_rol() in ('hujjatchi', 'superadmin'));

-- Yozish faqat: (a) Telegram webhook (service_role kalit bilan, RLS'ni
-- chetlab o'tadi — ariza yaratish uchun), (b) quyidagi RPC'lar (tasdiqlash/
-- rad etish uchun). Oddiy authenticated foydalanuvchi to'g'ridan-to'g'ri
-- yoza olmaydi.
drop policy if exists erkin_arizalar_no_direct_write on erkin_talaba_arizalari;
create policy erkin_arizalar_no_direct_write on erkin_talaba_arizalari for all to authenticated
  using (false) with check (false);

-- ----------------------------------------------------------------------------
create or replace function erkin_arizani_tasdiqlash(p_ariza_id uuid)
returns void
language plpgsql
security definer set search_path = public as $$
begin
  if joriy_rol() not in ('hujjatchi', 'superadmin') then
    raise exception 'Ruxsat yo''q';
  end if;

  update erkin_talaba_arizalari
  set holati = 'tasdiqlangan',
      korib_chiqqan = auth.uid(),
      korib_chiqqan_vaqt = now(),
      -- Haftaning Dushanbasi — Postgres date_trunc('week', ...) ham
      -- ISO (Dushanba boshlanadigan) hafta bilan hisoblaydi, JS tomondagi
      -- haftaBoshi() bilan mos keladi.
      kpi_hafta = date_trunc('week', now())::date
  where id = p_ariza_id and holati = 'kutilmoqda';

  if not found then
    raise exception 'Ariza topilmadi yoki allaqachon ko''rib chiqilgan';
  end if;
end;
$$;
revoke all on function erkin_arizani_tasdiqlash(uuid) from public;
revoke execute on function erkin_arizani_tasdiqlash(uuid) from anon;
grant execute on function erkin_arizani_tasdiqlash(uuid) to authenticated;

-- ----------------------------------------------------------------------------
create or replace function erkin_arizani_rad_etish(p_ariza_id uuid, p_sabab text default null)
returns void
language plpgsql
security definer set search_path = public as $$
begin
  if joriy_rol() not in ('hujjatchi', 'superadmin') then
    raise exception 'Ruxsat yo''q';
  end if;

  update erkin_talaba_arizalari
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
revoke all on function erkin_arizani_rad_etish(uuid, text) from public;
revoke execute on function erkin_arizani_rad_etish(uuid, text) from anon;
grant execute on function erkin_arizani_rad_etish(uuid, text) to authenticated;

-- 3) Fotolar uchun (private) storage bucket
insert into storage.buckets (id, name, public)
values ('erkin-fotolar', 'erkin-fotolar', false)
on conflict (id) do nothing;

drop policy if exists erkin_fotolar_select on storage.objects;
create policy erkin_fotolar_select on storage.objects for select to authenticated
  using (bucket_id = 'erkin-fotolar' and joriy_rol() in ('hujjatchi', 'superadmin'));
