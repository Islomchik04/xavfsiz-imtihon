-- Amaliy imtihondan o'tib (prava olib) bo'lgan talabalar endi "Talabalar"
-- ro'yxatida ko'payib ketmasligi uchun avtomatik ravishda arxivga
-- o'tkaziladi. Bu talabalar/page.js va boshqa "aktiv" ro'yxatlarda
-- arxivlangan=false filtri bilan ko'rinmay qoladi, alohida /arxiv sahifasida
-- ko'rinadi.

alter table talabalar
  add column if not exists arxivlangan boolean not null default false,
  add column if not exists arxivlangan_vaqt timestamptz;

create index if not exists talabalar_arxivlangan_idx on talabalar (arxivlangan);

-- talaba_imtihonlar jadvalidagi amaliy_natija har safar o'zgarganda —
-- shu talabaning BARCHA urinishlari orasida "amaliy_kerak va
-- amaliy_natija='otdi'" bo'lgan qatori bor-yo'qligini qayta hisoblab,
-- talabalar.arxivlangan holatini shunga moslashtiramiz. Bu nafaqat
-- "o'tdi" deb belgilanganda arxivlashni, balki superadmin natijani qaytadan
-- o'zgartirganda (masalan "otmadi"ga qaytarsa) avtomatik arxivdan
-- chiqarishni ham to'g'ri bajaradi.
create or replace function talaba_arxiv_holatini_yangilash()
returns trigger
language plpgsql
security definer set search_path = public as $$
declare
  otganmi boolean;
begin
  if new.amaliy_natija is distinct from old.amaliy_natija then
    select exists(
      select 1 from talaba_imtihonlar
      where talaba_id = new.talaba_id and amaliy_kerak and amaliy_natija = 'otdi'
    ) into otganmi;

    perform set_config('xi.bypass_talabalar_guard', 'on', true);
    update talabalar
      set arxivlangan = otganmi,
          arxivlangan_vaqt = case when otganmi then now() else null end
      where id = new.talaba_id and arxivlangan is distinct from otganmi;
    perform set_config('xi.bypass_talabalar_guard', 'off', true);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_talaba_arxiv_holatini_yangilash on talaba_imtihonlar;
create trigger trg_talaba_arxiv_holatini_yangilash
  after update on talaba_imtihonlar
  for each row execute function talaba_arxiv_holatini_yangilash();

-- Superadmin talabalar/[id] sahifasidan qo'lda ham arxivlash/arxivdan
-- chiqarish imkoniyatiga ega bo'lishi uchun RPC (masalan avtomatik
-- mantiqqa to'g'ri kelmaydigan istisno holatlarda).
create or replace function talaba_arxiv_holatini_ozgartirish(p_talaba_id uuid, p_arxivlangan boolean)
returns void
language plpgsql
security definer set search_path = public as $$
begin
  if joriy_rol() <> 'superadmin' then
    raise exception 'Faqat superadmin arxiv holatini qo''lda o''zgartira oladi';
  end if;

  perform set_config('xi.bypass_talabalar_guard', 'on', true);
  update talabalar
    set arxivlangan = p_arxivlangan,
        arxivlangan_vaqt = case when p_arxivlangan then now() else null end
    where id = p_talaba_id;
  perform set_config('xi.bypass_talabalar_guard', 'off', true);
end;
$$;

grant execute on function talaba_arxiv_holatini_ozgartirish(uuid, boolean) to authenticated;
