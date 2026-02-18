import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mint Vision Optique",
  description: "Staff Portal - Mint Vision Optique",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontPref = (await cookies()).get("mvo_font_size")?.value ?? "medium";
  const fontClass =
    fontPref === "small" ? "font-small" : fontPref === "large" ? "font-large" : "";

  return (
    <html
      lang="en"
      className={`${inter.variable} ${fontClass}`.trim()}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
