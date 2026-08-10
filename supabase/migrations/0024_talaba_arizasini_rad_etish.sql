-- ============================================================================
-- Yangi talaba arizasini (hali hujjat tayyor bo'lmagan) rad etish —
-- sababi mavjud "sabablar" jadvali bilan bog'lanadi (xuddi imtihon
-- natijasi "otmadi" bo'lganda sabab tanlangani kabi).
-- ============================================================================
alter table talabalar add column if not exists rad_etildi boolean not null default false;
alter table talabalar add column if not exists rad_sabab_id uuid references sabablar(id);
alter table talabalar add column if not exists rad_izoh text;
alter table talabalar add column if not exists rad_etgan uuid references profiles(id);
alter table talabalar add column if not exists rad_vaqt timestamptz;

create index if not exists idx_talabalar_rad_etildi on talabalar(rad_etildi) where rad_etildi = true;

create or replace function talaba_arizasini_rad_etish(p_talaba_id uuid, p_sabab_id uuid, p_izoh text default null)
returns void
language plpgsql
security definer set search_path = public as $$
declare
  v_talaba talabalar%rowtype;
begin
  if joriy_rol() not in ('hujjatchi', 'superadmin') then
    raise exception 'Ruxsat yo''q';
  end if;
  select * into v_talaba from talabalar where id = p_talaba_id;
  if not found then
    raise exception 'Talaba topilmadi';
  end if;
  if v_talaba.hujjat_tayyor then
    raise exception 'Hujjat allaqachon tayyor deb belgilangan — ariza rad etib bo''lmaydi';
  end if;
  if v_talaba.rad_etildi then
    raise exception 'Bu ariza allaqachon rad etilgan';
  end if;
  if p_sabab_id is null then
    raise exception 'Rad etish sababini tanlang';
  end if;
  if not exists (select 1 from sabablar where id = p_sabab_id) then
    raise exception 'Sabab topilmadi';
  end if;

  perform set_config('xi.bypass_talabalar_guard', 'on', true);
  update talabalar
  set rad_etildi = true,
      rad_sabab_id = p_sabab_id,
      rad_izoh = nullif(trim(p_izoh), ''),
      rad_etgan = auth.uid(),
      rad_vaqt = now()
  where id = p_talaba_id;
  perform set_config('xi.bypass_talabalar_guard', 'off', true);
end;
$$;
revoke all on function talaba_arizasini_rad_etish(uuid, uuid, text) from public;
revoke execute on function talaba_arizasini_rad_etish(uuid, uuid, text) from anon;
grant execute on function talaba_arizasini_rad_etish(uuid, uuid, text) to authenticated;

create or replace function talaba_arizasini_qaytarish(p_talaba_id uuid)
returns void
language plpgsql
security definer set search_path = public as $$
begin
  if joriy_rol() <> 'superadmin' then
    raise exception 'Ruxsat yo''q';
  end if;
  perform set_config('xi.bypass_talabalar_guard', 'on', true);
  update talabalar
  set rad_etildi = false, rad_sabab_id = null, rad_izoh = null, rad_etgan = null, rad_vaqt = null
  where id = p_talaba_id;
  perform set_config('xi.bypass_talabalar_guard', 'off', true);
end;
$$;
revoke all on function talaba_arizasini_qaytarish(uuid) from public;
revoke execute on function talaba_arizasini_qaytarish(uuid) from anon;
grant execute on function talaba_arizasini_qaytarish(uuid) to authenticated;
