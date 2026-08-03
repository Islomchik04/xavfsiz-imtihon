-- Express toifadagi talabalarga guruh biriktirish shart emas — o'qituvchi
-- kabi, guruh ham endi ixtiyoriy.
alter table talabalar alter column guruh_id drop not null;
