import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Warehouse Ramps Visualization",
  description: "Interactive visualization system for warehouse ramps",
  icons: {
    icon: [{ url: "/warehouse-icon.png" }],
    apple: [{ url: "/warehouse-icon.png" }],
    shortcut: [{ url: "/warehouse-icon.png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Warehouse Ramps",
    statusBarStyle: "default",
  },
  manifest: "/manifest.json",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
