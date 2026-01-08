import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_BASE = "https://ai-doc-assistant-dev-f2b9agd0h4exa2eg.centralus-01.azurewebsites.net";
const PUBLIC_PATHS = ["/auth/callback", "/health"];

export async function middleware(req: NextRequest) {
  const { pathname, origin, search } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // get access token from cookies
  const token = req.cookies.get("access_token")?.value;

  // If no token, redirect immediately to login
  if (!token) {
    const login = new URL("/auth/login", API_BASE);
    const redirectUri = `${origin}/auth/callback`;
    login.searchParams.set("redirect_uri", redirectUri);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  // Verify token with API
  try {
    const me = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "X-Requested-With": "Middleware"
      },
      cache: "no-store",
    });

    if (me.ok) return NextResponse.next();
  } catch {
    // Token verification failed
  }

  // Token is invalid, clear it and redirect to login
  const login = new URL("/auth/login", API_BASE);
  const redirectUri = `${origin}/auth/callback`;
  login.searchParams.set("redirect_uri", redirectUri);
  login.searchParams.set("next", pathname + search);
  
  const res = NextResponse.redirect(login);
  res.cookies.delete("access_token");
  res.cookies.delete("auth_redirected");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};