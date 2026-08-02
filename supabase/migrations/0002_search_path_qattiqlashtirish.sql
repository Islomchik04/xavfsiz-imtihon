-- Xavfsizlik kuchaytirish: search_path mutable bo'lgan funksiyani tuzatish
-- (Supabase Advisor tomonidan aniqlangan WARN darajasidagi tavsiya).
alter function public.updated_at_yangilash() set search_path = public;
