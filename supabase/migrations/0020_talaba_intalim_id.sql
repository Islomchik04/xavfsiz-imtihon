-- Talabaga "Int'alim ID" (davlat Int a'lim tizimidagi identifikatori)
-- ixtiyoriy ravishda biriktiriladi — bu orqali talabani tezroq qidirish
-- mumkin bo'ladi (ism-familya bilan bir qatorda).
alter table talabalar add column if not exists intalim_id text;

create index if not exists talabalar_intalim_id_idx on talabalar (intalim_id);
