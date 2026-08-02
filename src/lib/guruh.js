// Guruhni "top yoki yarat" (find-or-create) — Admin/Hujjatchi guruh raqamini
// yozganda, agar shu filialda shu raqamli guruh mavjud bo'lsa ishlatiladi,
// aks holda avtomatik yaratiladi (bir xil raqamli guruhlar bitta guruhga
// birlashadi — guruhlar jadvalidagi unique(nomi, filial_id) shuni ta'minlaydi).
export async function guruhIdTop(supabase, raqam, filialId) {
  const nomi = String(raqam).trim();

  const mavjud = await supabase
    .from("guruhlar")
    .select("id")
    .eq("nomi", nomi)
    .eq("filial_id", filialId)
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
    .eq("filial_id", filialId)
    .maybeSingle();
  if (qayta.data) return qayta.data.id;

  throw yangi.error;
}
