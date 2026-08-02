import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";

// Server komponentlarda: joriy foydalanuvchi + uning profilini (rol, filial)
// birga qaytaradi. Sessiya bo'lmasa /login'ga yo'naltiradi.
export async function joriyFoydalanuvchi({ majburiy = true } = {}) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (majburiy) redirect("/login");
    return { user: null, profile: null, supabase };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, filiallar(nomi)")
    .eq("id", user.id)
    .single();

  if (!profile && majburiy) {
    redirect("/login?xato=profil_topilmadi");
  }

  return { user, profile, supabase };
}

export function rolgaRuxsat(profile, ruxsatEtilganlar) {
  if (!profile) return false;
  return ruxsatEtilganlar.includes(profile.role);
}
