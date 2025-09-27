import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import SessionProvider from "@/components/SessionProvider";
import { ThemeProvider } from "next-themes";
import { defaultLocale } from "@/lib/i18n/settings";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap"
});

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang={defaultLocale} suppressHydrationWarning>
    <body className={inter.className}>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <SessionProvider>{children}</SessionProvider>
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
