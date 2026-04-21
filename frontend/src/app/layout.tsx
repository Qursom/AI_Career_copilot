import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
  title: "AI Career Copilot — Resume & Job Match AI",
  description:
    "Roast, optimize, and ATS-score your resume. Match yourself against any job description in seconds with an AI copilot built for your career.",
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
        <Navbar />
        <main className="relative z-10 flex-1 pt-24">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
