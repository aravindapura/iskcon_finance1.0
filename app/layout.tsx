import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Manrope } from "next/font/google";
import SessionProvider from "@/components/SessionProvider";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap"
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700"],
  variable: "--font-manrope",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Финансы храма — MVP",
  description: "Минимальный трекер приходов и расходов для общины."
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="ru" suppressHydrationWarning>
    <body className={`${inter.variable} ${manrope.variable}`}>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <SessionProvider>{children}</SessionProvider>
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
