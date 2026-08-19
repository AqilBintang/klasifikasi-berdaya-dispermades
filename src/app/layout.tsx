import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klasifikasi Berdaya",
  description: "Platform program dan kegiatan pemberdayaan masyarakat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="h-full bg-background">
        {children}
      </body>
    </html>
  );
}
