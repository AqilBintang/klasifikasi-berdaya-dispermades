import type { Metadata } from "next";
import { Fira_Sans } from "next/font/google";
import "./globals.css";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-fira-sans",
  display: "swap",
});

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
    <html lang="id" className={`h-full antialiased ${firaSans.variable}`}>
      <body className="h-full bg-background">
        {children}
      </body>
    </html>
  );
}
