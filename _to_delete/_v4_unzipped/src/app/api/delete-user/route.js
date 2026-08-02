import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";

// Foydalanuvchini butunlay o'chiradi (auth.users -> profiles cascade orqali).
// Faqat superadmin, va o'zini-o'zi o'chira olmaydi (tizimdan chiqib qolmasin).
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
    return NextResponse.json({ xato: "Faqat superadmin foydalanuvchini o'chira oladi" }, { status: 403 });
  }

  const { id } = await so_rov.json();
  if (!id) {
    return NextResponse.json({ xato: "Foydalanuvchi ko'rsatilmagan" }, { status: 400 });
  }
  if (id === user.id) {
    return NextResponse.json({ xato: "O'zingizni o'chira olmaysiz" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    const cheklanganmi = /foreign key|violates/i.test(error.message);
    return NextResponse.json(
      {
        xato: cheklanganmi
          ? "Bu foydalanuvchi allaqachon talaba/hujjat/imtihon yozuvlariga bog'langan — uni o'chirib bo'lmaydi. Buning o'rniga \"Faolsiz\" holatiga o'tkazing."
          : error.message,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
