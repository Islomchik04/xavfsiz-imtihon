import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server komponent / route handler ichida ishlatiladigan Supabase klient.
// Foydalanuvchi sessiyasini cookie orqali o'qiydi (RLS shu sessiyaga qarab ishlaydi).
export function supabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server komponentdan (render vaqtida) chaqirilsa cookie yozib
            // bo'lmaydi — middleware sessiyani yangilab turgani uchun bu xavfsiz.
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // yuqoridagi izohga qarang
          }
        },
      },
    }
  );
}

// Maxfiy service_role kalit bilan ishlaydigan klient — RLS'ni chetlab o'tadi.
// FAQAT ishonchli server-tomon operatsiyalar uchun (masalan foydalanuvchi
// yaratish). Hech qachon client komponentga yubormang.
export function supabaseAdmin() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
