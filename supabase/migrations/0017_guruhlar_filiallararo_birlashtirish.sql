-- Bitta nomdagi guruh endi BARCHA filiallar uchun umumiy (bir xil nomli
-- guruh — masalan "24" — qaysi filialda kiritilishidan qat'i nazar bitta
-- guruhga birlashadi). Avval guruhlar.filial_id bilan birga scope qilinardi
-- (unique(nomi, filial_id)), shu sabab bir xil raqamli guruh har bir
-- filialda ALOHIDA qator sifatida yaratilardi.

-- 1) Mavjud (filial bo'yicha) dublikat nomli guruhlarni birlashtiramiz:
--    har bir nomi uchun eng birinchi yaratilgan qatorni "kanonik" deb olib,
--    qolganlariga tegishli talabalarni o'sha kanonik guruhga ko'chiramiz,
--    so'ng ortiqcha qatorlarni o'chiramiz.
do $$
declare
  r record;
begin
  for r in
    select
      nomi,
      (array_agg(id order by created_at))[1] as kanonik_id,
      array_agg(id) as barcha_idlar,
      bool_or(faol) as faol_bormi
    from guruhlar
    group by nomi
    having count(*) > 1
  loop
    update talabalar
    set guruh_id = r.kanonik_id
    where guruh_id = any(r.barcha_idlar) and guruh_id <> r.kanonik_id;

    update guruhlar set faol = r.faol_bormi where id = r.kanonik_id;

    delete from guruhlar
    where nomi = r.nomi and id <> r.kanonik_id;
  end loop;
end $$;

-- 2) Endi guruh nomi tizim bo'yicha (filialdan qat'i nazar) yagona bo'lishi
--    kerak — eski (nomi, filial_id) cheklovini (nomi) bilan almashtiramiz.
alter table guruhlar drop constraint guruhlar_nomi_filial_id_key;
alter table guruhlar add constraint guruhlar_nomi_key unique (nomi);
