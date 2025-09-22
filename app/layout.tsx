import type { Metadata } from "next";
import type { ReactNode } from "react";
import SessionProvider from "@/components/SessionProvider";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Финансы храма — MVP",
  description: "Минимальный трекер приходов и расходов для общины."
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="ru" suppressHydrationWarning>
    <body>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <SessionProvider>{children}</SessionProvider>
      </ThemeProvider>
    </body>
  </html>
);

export default RootLayout;
