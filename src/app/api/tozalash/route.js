import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

// Superadmin uchun "Ma'lumotlarni tozalash" — test/eskirgan ma'lumotlarni
// o'chirib, statistikani 0 ga tushiradi. Filiallar, o'qituvchilar va
// foydalanuvchi (login) ma'lumotlariga HECH QACHON tegilmaydi.
//
// Ruxsat etilgan darajalar (FK bog'liqligi tartibida o'chiriladi):
//   "natijalar"      — faqat talaba_imtihonlar (urinishlar/natijalar)
//   "talaba_imtihon" — yuqoridagi + talabalar + imtihonlar
//   "toliq"          — yuqoridagi + avtomatik yaratilgan guruhlar
const DARAJALAR = {
  natijalar: ["talaba_imtihonlar"],
  talaba_imtihon: ["talaba_imtihonlar", "talabalar", "imtihonlar"],
  toliq: ["talaba_imtihonlar", "talabalar", "imtihonlar", "guruhlar"],
};

export async function POST(so_rov) {
  const chaqiruvchi = supabaseServer();
  const {
    data: { user },
  } = await chaqiruvchi.auth.getUser();

  if (!user) {
    return NextResponse.json({ xato: "Avtorizatsiyadan o'tilmagan" }, { status: 401 });
  }

  const { data: profil } = await chaqiruvchi.from("profiles").select("role").eq("id", user.id).single();
  if (profil?.role !== "superadmin") {
    return NextResponse.json({ xato: "Faqat superadmin ma'lumotlarni tozalay oladi" }, { status: 403 });
  }

  const { daraja, tasdiq } = await so_rov.json();
  if (!DARAJALAR[daraja]) {
    return NextResponse.json({ xato: "Tozalash darajasi noto'g'ri" }, { status: 400 });
  }
  if (tasdiq !== "TOZALASH") {
    return NextResponse.json({ xato: "Tasdiqlash matni noto'g'ri" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  // Jadvallar to'g'ri tartibda o'chiriladi (FK cheklovlariga mos):
  // talaba_imtihonlar -> talabalar/imtihonlar -> guruhlar.
  for (const jadval of DARAJALAR[daraja]) {
    const { error } = await admin.from(jadval).delete().not("id", "is", null);
    if (error) {
      return NextResponse.json({ xato: `"${jadval}" jadvalini tozalashda xatolik: ${error.message}` }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
