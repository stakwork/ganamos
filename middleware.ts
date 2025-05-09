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

  // Get the current path
  const path = req.nextUrl.pathname

  // If accessing a protected route without a session, redirect to login
  const protectedRoutes = ["/dashboard", "/wallet", "/profile", "/post/new"]
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route))

  if (isProtectedRoute && !session) {
    const redirectUrl = new URL("/auth/login", req.url)
    redirectUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(redirectUrl)
  }

  // If accessing login/register while logged in, redirect to dashboard
  // But only do this for exact matches to prevent redirect loops
  const authRoutes = ["/auth/login", "/auth/register"]
  const isExactAuthRoute = authRoutes.includes(path)

  if (isExactAuthRoute && session) {
    // Check if there's a specific redirect parameter
    const redirectTo = req.nextUrl.searchParams.get("redirect")
    if (redirectTo && !authRoutes.includes(redirectTo)) {
      // If there's a redirect parameter and it's not to another auth route, use it
      return NextResponse.redirect(new URL(redirectTo, req.url))
    }
    // Otherwise redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return res
}

export const config = {
  matcher: ["/dashboard/:path*", "/wallet/:path*", "/profile/:path*", "/post/:path*", "/auth/login", "/auth/register"],
}
