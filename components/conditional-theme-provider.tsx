"use client"

import { usePathname } from "next/navigation"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export function ConditionalThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname()

  // Force light mode on home and login pages
  const isLightModePage = pathname === "/" || pathname.startsWith("/auth")

  if (isLightModePage) {
    return (
      <NextThemesProvider {...props} forcedTheme="light">
        {children}
      </NextThemesProvider>
    )
  }

  // Use default theme provider with dark mode default for all other pages
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
