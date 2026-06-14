// frontend/middleware.ts
// Route protection middleware — enforces role-based access control
// Session token format: "chatco:{id}:{role}:{timestamp}"
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Route group definitions — each group requires its corresponding role
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
    ],
    commuter: [
      "/dashboard",
      "/lost-and-found",
      "/rewards",
      "/feedback",
      "/profile",
      "/announcements",
    ],
    conductor: [
      "/unit-verification",
      "/conductor-dashboard",
    ],
  };

  // Check which group (if any) this route belongs to
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

  // Not a protected route — let it through
  if (!matchedGroup) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get("chatco_session")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Extract role from token: "chatco:{id}:{role}:{timestamp}"
  // TODO: Replace with proper JWT verification when backend is integrated
  const tokenParts = sessionToken.split(":");
  const userRole = tokenParts[2] || "";

  // Role-based access: each route group requires its matching role
  if (matchedGroup === "admin" && userRole !== "ADMIN") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (matchedGroup === "commuter" && userRole !== "COMMUTER") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (matchedGroup === "conductor" && userRole !== "CONDUCTOR") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin-dashboard/:path*",
    "/users/:path*",
    "/remittance/:path*",
    "/monitoring/:path*",
    "/vehicles/:path*",
    "/lost-found/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/dashboard/:path*",
    "/lost-and-found/:path*",
    "/rewards/:path*",
    "/feedback/:path*",
    "/profile/:path*",
    "/announcements/:path*",
    "/unit-verification/:path*",
    "/conductor-dashboard/:path*",
  ],
};
