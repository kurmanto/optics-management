import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/health", "/api/cron/", "/f/", "/intake/"];
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const session = request.cookies.get("mvo_session");

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Idle timeout check
  const lastActive = request.cookies.get("mvo_last_active")?.value;
  const now = Date.now();

  if (!lastActive || now - Number(lastActive) > IDLE_TIMEOUT_MS) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("reason", "idle_timeout");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("mvo_session");
    response.cookies.delete("mvo_last_active");
    return response;
  }

  // Refresh last-active timestamp
  const response = NextResponse.next();
  response.cookies.set("mvo_last_active", String(now), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
