import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Финансы храма — MVP",
  description: "Минимальный трекер приходов и расходов для общины."
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="ru">
    <body>
      <Providers>{children}</Providers>
    </body>
  </html>
);

export default RootLayout;
