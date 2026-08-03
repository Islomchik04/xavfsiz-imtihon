-- ============================================================================
-- XAVFSIZ IMTIHON — Talaba qarzdorlik holati
-- ============================================================================
-- Admin (yoki boshqa talaba qo'shuvchi rollar) talaba qo'shganda/tahrirlaganda
-- qarzdorlik holatini belgilaydi. Qarzdorlik bo'lsa, summa musbat bo'lishi
-- shart. Qarzdorligi bor talaba Imtihonchilar safiga (hujjatga_tayyorlash
-- orqali) qo'shilmasligi kerak — bu qoida shu migratsiyada RPC darajasida
-- ham kuchaytiriladi (quyida).
alter table talabalar add column if not exists qarzdorlik boolean not null default false;
alter table talabalar add column if not exists qarzdorlik_summasi numeric(12,2);

alter table talabalar drop constraint if exists talabalar_qarzdorlik_summasi_check;
alter table talabalar add constraint talabalar_qarzdorlik_summasi_check
  check (
    (qarzdorlik = false and qarzdorlik_summasi is null)
    or (qarzdorlik = true and qarzdorlik_summasi is not null and qarzdorlik_summasi > 0)
  );

-- --------------------------------------------------------------------------
-- hujjatga_tayyorlash: endi 083 forma va qarzdorlik holatini ham tekshiradi.
-- Imtihonchilar safiga qo'shish uchun to'rttala shart HAM ijobiy bo'lishi
-- kerak: tasdiqnoma, imtihon varaqasi, 083 forma, qarzdorlik YO'Q.
-- --------------------------------------------------------------------------
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
  if not p_tasdiqnoma or not p_imtihon_varaqasi or not p_hujjat_forma_083 then
    raise exception 'Tasdiqnoma, imtihon varaqasi va 083 forma bo''lishi shart';
  end if;

  select * into v_talaba from talabalar where id = p_talaba_id;
  if not found then
    raise exception 'Talaba topilmadi';
  end if;
  if v_talaba.hujjat_tayyor then
    raise exception 'Bu talaba allaqachon imtihonchilar safiga qo''shilgan';
  end if;
  if v_talaba.qarzdorlik then
    raise exception 'Bu talabada qarzdorlik bor — avval qarzdorlikni yopib, holatni yangilang';
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
revoke execute on function hujjatga_tayyorlash(uuid, uuid, boolean, boolean, boolean, text) from anon;
grant execute on function hujjatga_tayyorlash(uuid, uuid, boolean, boolean, boolean, text) to authenticated;
