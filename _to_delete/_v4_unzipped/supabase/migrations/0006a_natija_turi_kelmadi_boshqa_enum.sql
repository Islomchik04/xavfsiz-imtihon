-- Alohida migratsiya (ALTER TYPE ... ADD VALUE keyinroq bir xil tranzaksiyada
-- ishlatilishi mumkin emas — 0006 dan oldin qo'llanishi kerak).
alter type natija_turi add value if not exists 'kelmadi';
alter type natija_turi add value if not exists 'boshqa';
