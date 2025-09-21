import type { Metadata } from "next";
import type { ReactNode } from "react";
import SessionProvider from "@/components/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Финансы храма — MVP",
  description: "Минимальный трекер приходов и расходов для общины."
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="ru">
    <body>
      <SessionProvider>{children}</SessionProvider>
    </body>
  </html>
);

export default RootLayout;
