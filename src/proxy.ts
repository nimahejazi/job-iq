import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/database.types";

const protectedRoutes = ["/", "/jobs", "/onboarding", "/profile", "/settings"];
const authRoutes = ["/auth/sign-in", "/auth/sign-up"];

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isAuthRoute(pathname: string) {
  return authRoutes.includes(pathname);
}

// Proxy refreshes Supabase auth cookies before pages render and handles coarse route redirects.
export async function proxy(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabasePublicEnv();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (!user && isProtectedRoute(pathname)) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(signInUrl);
  }

  if (user && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
