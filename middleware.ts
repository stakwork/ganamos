import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If accessing a protected route without a session, redirect to login
  const protectedRoutes = ["/dashboard", "/wallet", "/profile", "/post/new"]
  const isProtectedRoute = protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute && !session) {
    const redirectUrl = new URL("/auth/login", req.url)
    redirectUrl.searchParams.set("redirect", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If accessing login/register while logged in, redirect to dashboard
  // Commenting this out to prevent redirect loops
  /*
  const authRoutes = ["/auth/login", "/auth/register"]
  const isAuthRoute = authRoutes.some((route) => req.nextUrl.pathname === route)

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }
  */

  return res
}

export const config = {
  matcher: ["/dashboard/:path*", "/wallet/:path*", "/profile/:path*", "/post/:path*", "/auth/login", "/auth/register"],
}
