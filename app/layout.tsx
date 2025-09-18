import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Финансы храма — MVP"
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="ru">
    <body>{children}</body>
  </html>
);

export default RootLayout;
