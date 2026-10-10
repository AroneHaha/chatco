import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthenticatedSession } from "@/lib/conductor/server/auth";
import { getRoleDashboard } from "@/types/user";

export async function middleware(request: NextRequest) {
  // Decode before classifying so encoded module URLs receive the same guard.
  let pathname: string;
  try {
    pathname = decodeURIComponent(request.nextUrl.pathname);
  } catch {
    return new NextResponse("Invalid request.", { status: 400 });
  }

  const routeGroups: Record<string, string[]> = {
    admin: [
      "/admin-dashboard",
      "/users",
      "/remittance",
      "/monitoring",
      "/vehicles",
      "/lost-found",
      "/analytics",
      "/settings",
      "/receipts",
      "/activity-logs",
      // The /announcements page lives in the (admin) route group and is only
      // linked from the admin notification bell. Commuters read announcements
      // via a hook on their rewards page, not this route — so it must be
      // ADMIN-guarded, otherwise admins get bounced to /login.
      "/announcements",
    ],
    commuter: [
      "/dashboard",
      "/lost-and-found",
      "/rewards",
      "/feedback",
      "/profile",
      "/gcash/return",
    ],
    conductor: [
      "/unit-verification",
      "/conductor-dashboard",
    ],
  };

  let matchedGroup: string | null = null;

  for (const [group, routes] of Object.entries(routeGroups)) {
    const isMatch = routes.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );
    if (isMatch) {
      matchedGroup = group;
      break;
    }
  }

  const isEntryPage = pathname === "/" || pathname === "/login" || pathname === "/signup";
  if (!matchedGroup && !isEntryPage) {
    return NextResponse.next();
  }

  try {
    const session = await getAuthenticatedSession(request);
    let response: NextResponse;

    if (!session) {
      response = matchedGroup
        ? NextResponse.redirect(new URL("/login", request.url))
        : NextResponse.next();
      // Rejected/revoked tokens must not cause a landing/login redirect loop.
      if (request.cookies.has("chatco_session")) {
        response.cookies.delete("chatco_session");
        response.cookies.delete("chatco_role");
      }
    } else if (isEntryPage || session.role.toLowerCase() !== matchedGroup) {
      response = NextResponse.redirect(new URL(getRoleDashboard(session.role)!, request.url));
    } else {
      response = NextResponse.next();
    }

    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    // A timeout/outage is not a logout. Keep the cookie but render no module.
    return new NextResponse("Unable to verify your session. Please try again.", {
      status: 503,
      headers: { "Cache-Control": "private, no-store", "Retry-After": "5" },
    });
  }
}

export const config = {
  // Include encoded paths and RSC/prefetch requests. API handlers retain their
  // existing bearer-token proxies and backend authentication/role checks.
  matcher: ["/((?!api/|_next/static/|_next/image|favicon.ico).*)"],
};
