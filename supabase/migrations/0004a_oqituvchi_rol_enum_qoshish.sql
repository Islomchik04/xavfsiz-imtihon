-- Alohida migratsiya: ALB TYPE ... ADD VALUE bir xil tranzaksiya ichida
-- qo'shilgan qiymatni keyinroq ishlatib bo'lmaydi, shu sabab bu alohida
-- fayl/apply_migration chaqiruvi sifatida bajarilishi kerak, 0004 dan oldin.
alter type user_role add value if not exists 'oqituvchi';
