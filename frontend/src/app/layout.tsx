import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/lib/auth-context";
import SentryInit from "@/components/SentryInit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AICareerCopilot — ATS resume critique, rewrite & job match",
  description:
    "The AI workspace for job seekers. Critique weak bullets, rewrite for ATS, score your resume, and match any job description in seconds. Free to start.",
};

export const viewport: Viewport = {
  themeColor: "#05050a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body
        className="min-h-screen flex flex-col bg-transparent text-white antialiased"
        suppressHydrationWarning
      >
        <AuthProvider>
          <SentryInit />
          <Navbar />
          <main className="relative z-10 flex-1 pt-24">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
