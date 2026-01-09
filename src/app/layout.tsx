import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "메일톡 - 비즈니스 이메일 서비스",
  description: "간편하고 신뢰할 수 있는 도메인 이메일 서비스. 회사 도메인으로 전문적인 이메일을 사용하세요.",
  keywords: ["비즈니스 이메일", "도메인 이메일", "기업 이메일", "메일톡", "MailTalk"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
