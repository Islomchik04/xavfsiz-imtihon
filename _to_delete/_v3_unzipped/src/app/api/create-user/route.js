import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { telefonNormallash, telefonToEmail } from "@/lib/telefon";

// Yangi foydalanuvchi (Admin/Hujjatchi/Imtihonchi/Superadmin) yaratadi.
// Faqat superadmin chaqira oladi — service_role kalit bilan serverda ishlaydi,
// shuning uchun RLS'ni chetlab o'tishi mumkin, shu sabab ruxsatni bu yerda
// qo'lda tekshiramiz.
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
    return NextResponse.json({ xato: "Faqat superadmin yangi foydalanuvchi qo'sha oladi" }, { status: 403 });
  }

  const tana = await so_rov.json();
  const { telefon, parol, ismFamilya, role, filialId, oqituvchiId } = tana;

  if (!telefon || !parol || !ismFamilya || !role) {
    return NextResponse.json({ xato: "Barcha maydonlarni to'ldiring" }, { status: 400 });
  }
  if (role === "admin" && !filialId) {
    return NextResponse.json({ xato: "Admin uchun filial majburiy" }, { status: 400 });
  }
  if (role === "oqituvchi" && !oqituvchiId) {
    return NextResponse.json({ xato: "O'qituvchi tanlanishi shart" }, { status: 400 });
  }
  if (parol.length < 6) {
    return NextResponse.json({ xato: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const email = telefonToEmail(telefon);

  const { data: yangiFoydalanuvchi, error: yaratishXatosi } = await admin.auth.admin.createUser({
    email,
    password: parol,
    email_confirm: true,
  });

  if (yaratishXatosi) {
    return NextResponse.json({ xato: yaratishXatosi.message }, { status: 400 });
  }

  const { error: profilXatosi } = await admin.from("profiles").insert({
    id: yangiFoydalanuvchi.user.id,
    telefon: telefonNormallash(telefon),
    ism_familya: ismFamilya,
    role,
    filial_id: role === "admin" ? filialId : null,
    oqituvchi_id: role === "oqituvchi" ? oqituvchiId : null,
  });

  if (profilXatosi) {
    // Profil yaratilmasa auth foydalanuvchini ham bekor qilamiz (chala qolmasin)
    await admin.auth.admin.deleteUser(yangiFoydalanuvchi.user.id);
    return NextResponse.json({ xato: profilXatosi.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: yangiFoydalanuvchi.user.id });
}
