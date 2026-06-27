import type { Metadata } from "next";
import { M_PLUS_1p, Space_Grotesk } from "next/font/google";
import "./globals.css";

const uiFont = M_PLUS_1p({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-ui",
  display: "swap"
});

const headlineFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-headline",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Earthquake Visualization",
  description: "地震発生情報を地図と一覧で見える化するダッシュボード"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${uiFont.variable} ${headlineFont.variable}`}>{children}</body>
    </html>
  );
}