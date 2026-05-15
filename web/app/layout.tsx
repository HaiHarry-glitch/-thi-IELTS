import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import RetryPendingAttempts from "@/components/RetryPendingAttempts";

const fraunces = Fraunces({
  subsets: ["vietnamese"],
  variable: "--font-fraunces",
});

const inter = Inter({
  subsets: ["vietnamese"],
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["vietnamese"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "HIN - IELTS Reading & Listening",
  description: "Harry IELTS Navigator - Thư viện đề thi IELTS bản full, không giới hạn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className={`${inter.className} min-h-screen bg-[#F5F1E9] text-[#1a1a1a] antialiased`}>
        <RetryPendingAttempts />
        {children}
      </body>
    </html>
  );
}
