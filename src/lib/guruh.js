// Guruhni "top yoki yarat" (find-or-create) — Admin/Hujjatchi guruh raqamini
// yozganda, agar SHU NOMLI guruh tizimda (filialdan qat'i nazar) mavjud
// bo'lsa o'sha ishlatiladi, aks holda avtomatik yaratiladi. Bir xil nomli
// guruhlar endi turli filiallar orasida ham bitta guruhga birlashadi —
// guruhlar jadvalidagi unique(nomi) shuni ta'minlaydi. filialId faqat guruh
// YANGI yaratilganda uning "boshlang'ich" filiali sifatida saqlanadi (guruh
// keyinchalik boshqa filiallardan ham talaba qabul qilishi mumkin).
export async function guruhIdTop(supabase, raqam, filialId) {
  const nomi = String(raqam).trim();

  const mavjud = await supabase
    .from("guruhlar")
    .select("id")
    .eq("nomi", nomi)
    .maybeSingle();
  if (mavjud.data) return mavjud.data.id;

  const yangi = await supabase
    .from("guruhlar")
    .insert({ nomi, filial_id: filialId })
    .select("id")
    .single();
  if (!yangi.error) return yangi.data.id;

  // Bir vaqtda ikkita foydalanuvchi xuddi shu guruhni yaratmoqchi bo'lsa
  // (unique constraint to'qnashuvi) — qayta qidirib topamiz.
  const qayta = await supabase
    .from("guruhlar")
    .select("id")
    .eq("nomi", nomi)
    .maybeSingle();
  if (qayta.data) return qayta.data.id;

  throw yangi.error;
}
