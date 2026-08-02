import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Har bir so'rovda Supabase sessiya cookie'sini yangilab turadi va
// himoyalangan sahifalarga kirishni tekshiradi.
export async function updateSession(request) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const himoyalanmagan = path === "/login" || path.startsWith("/_next") || path.startsWith("/api/auth");

  if (!user && !himoyalanmagan) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("keyin", path);
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
