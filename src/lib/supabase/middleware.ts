import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";
  const supabase = createServerClient(url, key, {
    cookies: {
      get: (name: string) => request.cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: CookieOptions) => {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });
  const path = request.nextUrl.pathname;
  const isAuth = path === "/login" || path === "/register";
  const hasSavedSession = request.cookies
    .getAll()
    .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
  let user: User | null = null;
  try {
    const result = await supabase.auth.getSession();
    if (result.error && !hasSavedSession) throw result.error;
    user = result.data.session?.user ?? null;
  } catch (error) {
    if (!hasSavedSession) throw error;
  }
  const hasSession = Boolean(user || hasSavedSession);
  if (hasSession && isAuth) {
    const u = request.nextUrl.clone();
    u.pathname = "/invoices";
    return NextResponse.redirect(u);
  }
  if (!hasSession && (path.startsWith("/invoices") || path.startsWith("/business"))) {
    const u = request.nextUrl.clone();
    u.pathname = "/login";
    u.searchParams.set("next", path);
    return NextResponse.redirect(u);
  }
  return response;
}
