import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}