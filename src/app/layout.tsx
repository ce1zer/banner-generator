import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bully Agency — AI Background/Composition Generator",
  description:
    "Upload a dog photo, pick a theme, and generate a cinematic 4:5 composition (background + composition only).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="min-h-dvh bg-zinc-50 text-zinc-950">
            <header className="border-b border-zinc-200 bg-white">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
                <Link href="/" className="font-semibold tracking-tight">
                  Bully Agency
                </Link>
                <nav className="flex items-center gap-4 text-sm text-zinc-700">
                  <Link href="/create" className="hover:text-zinc-950">
                    Create
                  </Link>
                  <Link href="/my" className="hover:text-zinc-950">
                    My
                  </Link>
                  <Link href="/admin" className="hover:text-zinc-950">
                    Admin
                  </Link>
                </nav>
              </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
