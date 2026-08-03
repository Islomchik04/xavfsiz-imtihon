-- Talaba qo'shishda o'qituvchi tanlash endi majburiy emas ("Yo'q" holati
-- ruxsat etiladi). Bu ayniqsa "Express" toifadagi talabalar uchun kerak —
-- ular umuman o'qituvchiga biriktirilmaydi va KPI hisobiga kirmaydi.
-- Bu constraint'lar live loyihada allaqachon (Supabase MCP orqali) olib
-- tashlangan edi — bu fayl shu holatni repo tarixida qayd etadi.

alter table talabalar drop constraint if exists nazariy_oqituvchi_talab;
alter table talabalar drop constraint if exists amaliy_oqituvchi_talab;
