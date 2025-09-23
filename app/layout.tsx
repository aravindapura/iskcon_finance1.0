import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import SessionProvider from "@/components/SessionProvider";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Финансы храма — MVP",
  description: "Минимальный трекер приходов и расходов для общины."
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="ru" suppressHydrationWarning>
    <body className={inter.className}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <SessionProvider>{children}</SessionProvider>
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
