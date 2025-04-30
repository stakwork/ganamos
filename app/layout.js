// Convert layout to JS with safety checks for undefined values
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Ganamos!",
  description: "Fix your community, earn Bitcoin",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
}

// Simplified layout that doesn't use any complex components
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.png" />
        <meta name="theme-color" content="#10b981" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Pacifico&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
