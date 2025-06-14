import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Get the current path and session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const path = req.nextUrl.pathname

  // Protected routes require authentication
  const protectedRoutes = ["/dashboard", "/wallet", "/profile", "/post/new"]
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route))

  if (isProtectedRoute && !session) {
    // Redirect to login with return URL
    const redirectUrl = new URL("/auth/login", req.url)
    redirectUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages
  const authRoutes = ["/auth/login", "/auth/register"]
  const isExactAuthRoute = authRoutes.includes(path)

  if (isExactAuthRoute && session) {
    // Check for redirect parameter
    const redirectTo = req.nextUrl.searchParams.get("redirect")
    if (redirectTo && !authRoutes.includes(redirectTo)) {
      return NextResponse.redirect(new URL(redirectTo, req.url))
    }

    // Default redirect to dashboard
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return res
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/wallet/:path*",
    "/profile/:path*",
    "/post/:path*",
    "/auth/login",
    "/auth/register",
    "/auth/phone",
  ],
}
