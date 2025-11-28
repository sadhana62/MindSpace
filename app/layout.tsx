import type React from "react"
import type { Metadata } from "next"
import { Nunito } from "next/font/google";
import { Open_Sans } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"
import { Toaster } from "react-hot-toast"

export const nunito = Nunito({
  subsets: ["latin"],
   variable: "--font-nunito",
   weight: ["400", "600", "700", "900"],
});
// const montserrat = Montserrat({
//   subsets: ["latin"],
//   variable: "--font-montserrat",
//   weight: ["400", "600", "700", "900"],
// })

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "MindSpace - Mental Health Portal",
  description: "A safe space for mental health support, mood tracking, and wellness resources",
  generator: "mental.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${openSans.variable} ${nunito.variable} ${GeistMono.variable}`}>
        <Toaster position="top-center" />
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
