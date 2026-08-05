import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

const STAFF_PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-otp",
  "/accept-invite",
];

const PORTAL_PUBLIC_ROUTES = [
  "/portal/login",
  "/portal/accept-invite",
  "/portal/forgot-password",
  "/portal/reset-password",
];

// Optional dedicated hostname for the patient portal (e.g. a second
// *.vercel.app alias on the same project). When a request's Host header
// matches this, "/" is treated as "/portal" so patients land straight in
// their portal instead of the staff app's root. Unset by default - the
// staff domain's behavior is completely unaffected.
const PATIENT_PORTAL_HOST = process.env.PATIENT_PORTAL_HOST ?? "";

/**
 * Refreshes the Supabase auth session on every request and redirects
 * unauthenticated users away from protected routes / authenticated users
 * away from auth routes. Called from the root middleware.ts.
 *
 * Staff and patient-portal accounts share one Supabase Auth session
 * mechanism but are two different "realms" (profiles vs
 * patient_portal_accounts) - /portal/* routes are handled separately from
 * staff routes so a lapsed patient session bounces to /portal/login (not
 * the staff /login), and a Supabase user from one realm never gets
 * force-redirected off the other realm's own login page, which would
 * otherwise loop against that page's own "not the right kind of account"
 * redirect.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const realPathname = request.nextUrl.pathname;
  const hostname = request.headers.get("host") ?? "";
  const isPatientPortalHost = PATIENT_PORTAL_HOST.length > 0 && hostname === PATIENT_PORTAL_HOST;
  const pathname = isPatientPortalHost && realPathname === "/" ? "/portal" : realPathname;

  // API routes handle their own authentication and return JSON 401/403
  // responses - never redirect them to a login *page*. Redirecting a
  // fetch() call (e.g. the login POST itself) to /login breaks the
  // request: Next.js redirects preserve the method on 307/308, so a POST
  // to /api/auth/login would get re-sent as a POST to the /login page,
  // which Vercel's routing layer rejects outright.
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  if (pathname.startsWith("/portal")) {
    const isPortalPublicRoute = PORTAL_PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

    if (!user && !isPortalPublicRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/portal/login";
      return NextResponse.redirect(redirectUrl);
    }

    // /portal/reset-password needs the recovery-link session to reach the
    // page - bouncing it away as "already logged in" would make the reset
    // impossible to complete, mirroring the staff side's own exclusion.
    if (user && isPortalPublicRoute && pathname !== "/portal/reset-password") {
      // Only bounce away if this session is actually a patient portal
      // account - a staff member who wandered onto /portal/login should
      // just see the page, not get force-redirected in a loop against
      // /portal's own "not a portal account" check.
      const { data: portalAccount } = await supabase
        .from("patient_portal_accounts")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (portalAccount) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/portal";
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }
    }

    // The patient-portal host's root ("/") was mapped to "/portal" above -
    // rewrite so Next.js actually renders the portal instead of the
    // default (staff) root page, while keeping the address bar at "/".
    if (realPathname !== pathname) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = pathname;
      return NextResponse.rewrite(rewriteUrl);
    }

    return supabaseResponse;
  }

  const isPublicRoute = STAFF_PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isAuthRoute =
    isPublicRoute && !pathname.startsWith("/accept-invite") && pathname !== "/reset-password";

  if (!user && !isPublicRoute && pathname !== "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    // Symmetric guard: only bounce to /dashboard if this session actually
    // has a staff profile - a patient-portal-only user who wandered onto
    // /login should just see the page, not loop against the dashboard
    // layout's own "no profile" redirect back to /login.
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (profile) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
