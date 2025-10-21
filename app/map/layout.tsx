import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Explore Community Issues | Ganamos",
  description: "Fix your community, earn Bitcoin",
  openGraph: {
    title: "Explore Community Issues",
    description: "Fix your community, earn Bitcoin",
    type: "website",
    url: "https://ganamos.earth/map",
    images: [
      {
        url: "/og-map.jpg", // Place your 1200x630 image here
        width: 1200,
        height: 630,
        alt: "Ganamos community map with Bitcoin rewards",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Community Issues",
    description: "Fix your community, earn Bitcoin",
    images: ["/og-map.jpg"],
  },
}

export default function MapLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

