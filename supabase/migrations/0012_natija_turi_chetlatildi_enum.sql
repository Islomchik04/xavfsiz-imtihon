-- "Imtihondan chetlatildi" natija turi qo'shiladi (masalan intizomiy sabab
-- bilan imtihon jarayonida chetlatilgan talaba uchun) — mavjud "sabablar"
-- ro'yxatidan foydalanadi, alohida jadval kerak emas.
alter type natija_turi add value if not exists 'chetlatildi';
