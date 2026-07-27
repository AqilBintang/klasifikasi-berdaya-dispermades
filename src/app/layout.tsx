import type { Metadata } from "next";
import { Roboto_Condensed } from "next/font/google";
import "./globals.css";

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Klas Berdaya",
  description: "Platform program dan kegiatan pemberdayaan masyarakat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${robotoCondensed.variable} h-full antialiased`}
    >
      <body
        className="h-full bg-background"
        style={{ fontFamily: "var(--font-roboto-condensed), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
