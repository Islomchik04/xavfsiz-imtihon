import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { telefonNormallash, telefonToEmail } from "@/lib/telefon";

// Mavjud foydalanuvchini (ism, telefon, parol, lavozim, filial) tahrirlaydi.
// Faqat superadmin chaqira oladi. Telefon/parol o'zgarishi Supabase Auth
// (auth.users) tomonida ham yangilanishi kerak, shuning uchun service_role
// kalit bilan serverda amalga oshiriladi.
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
    return NextResponse.json({ xato: "Faqat superadmin foydalanuvchini tahrirlay oladi" }, { status: 403 });
  }

  const tana = await so_rov.json();
  const { id, ismFamilya, telefon, parol, role, filialId } = tana;

  if (!id || !ismFamilya || !telefon || !role) {
    return NextResponse.json({ xato: "Barcha maydonlarni to'ldiring" }, { status: 400 });
  }
  if (role === "admin" && !filialId) {
    return NextResponse.json({ xato: "Admin uchun filial majburiy" }, { status: 400 });
  }
  if (role === "oqituvchi") {
    return NextResponse.json(
      { xato: "O'qituvchi login ma'lumotlari 'O'qituvchilar' bo'limidan boshqariladi" },
      { status: 400 }
    );
  }
  if (parol && parol.length < 4) {
    return NextResponse.json({ xato: "Parol kamida 4 ta belgidan iborat bo'lishi kerak" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: eski } = await admin.from("profiles").select("role, telefon").eq("id", id).single();
  if (!eski) {
    return NextResponse.json({ xato: "Foydalanuvchi topilmadi" }, { status: 404 });
  }
  if (eski.role === "oqituvchi") {
    return NextResponse.json(
      { xato: "O'qituvchi login ma'lumotlari 'O'qituvchilar' bo'limidan boshqariladi" },
      { status: 400 }
    );
  }

  // Auth (email/parol) — faqat o'zgargan bo'lsa yangilaymiz
  const yangiTelefon = telefonNormallash(telefon);
  const authYangilash = {};
  if (yangiTelefon !== eski.telefon) authYangilash.email = telefonToEmail(telefon);
  if (parol) authYangilash.password = parol;

  if (Object.keys(authYangilash).length > 0) {
    const { error: authXato } = await admin.auth.admin.updateUserById(id, authYangilash);
    if (authXato) {
      return NextResponse.json({ xato: authXato.message }, { status: 400 });
    }
  }

  const { error: profilXatosi } = await admin
    .from("profiles")
    .update({
      ism_familya: ismFamilya,
      telefon: yangiTelefon,
      role,
      filial_id: role === "admin" ? filialId : null,
    })
    .eq("id", id);

  if (profilXatosi) {
    return NextResponse.json({ xato: profilXatosi.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
