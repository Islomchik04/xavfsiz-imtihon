-- Mavjud talabalar orasida ism-familyasi krill alifbosida kiritilgan
-- 11 nafar o'quvchining ma'lumotini lotin alifbosiga o'giramiz (rasmiy
-- krill-lotin jadvali asosida). Bir martalik ma'lumot tuzatish — shu
-- sabab id bo'yicha aniq moslashtirilgan (idempotent: qayta ishga
-- tushirilsa ham xatarsiz, chunki qiymatlar allaqachon lotincha bo'lsa
-- ham xuddi shu qiymat bilan almashtiriladi).
select set_config('xi.bypass_talabalar_guard', 'on', false);

update talabalar as t
set ism_familya = v.yangi
from (values
  ('9acac21f-f356-489e-a50c-2d27bbf26584'::uuid, 'Egamberdiyev Nuriddin'),
  ('4ead182c-388e-44a8-a54b-54832821e836'::uuid, 'Jakbarov Yodgorbek'),
  ('6490c27b-734a-49b4-a30a-377d302b9a93'::uuid, 'Karimov Ravshanbek'),
  ('10c83035-b4af-49bf-8b53-b82b0c25ff7d'::uuid, 'Mamatova Durdona'),
  ('1c8734c4-f2c6-47d3-808c-82014c2947ea'::uuid, 'Masaidov Isroil'),
  ('751d9a89-ff46-446e-aa59-7238e350df2d'::uuid, 'Mullajonov Umidjon'),
  ('d1ab462d-c993-4ca0-9435-02f6f843ef3e'::uuid, 'Odilbekov Muxammadayubxon'),
  ('686d3f8a-227c-4268-9847-612f82b51ee3'::uuid, 'Safarova Gozaloy'),
  ('61c6fd84-3bfe-4bd6-ae45-ad0474b95f5d'::uuid, 'Ubaydulloxonov M.azizxon'),
  ('49ca832f-a0f7-4024-b33d-d2704665c1db'::uuid, 'Xayrullayev Oyatillo'),
  ('666ae283-aa5e-4e6a-b8c5-3ef8b8ffa1ec'::uuid, 'Xoshimov Ibroxim')
) as v(id, yangi)
where t.id = v.id;

select set_config('xi.bypass_talabalar_guard', 'off', false);
