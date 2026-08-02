import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AsosiySahifa() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
