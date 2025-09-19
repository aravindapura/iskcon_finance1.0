import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Финансы храма — MVP",
  description: "Минимальный трекер приходов и расходов для общины."
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="ru">
    <body>
      <div className="app-shell">
        <header className="app-header">
          <div>
            <p className="app-title">Финансы храма — MVP</p>
            <p className="app-subtitle">Минимальный контроль финансов общины</p>
          </div>
          <nav className="app-nav">
            <Link href="/">Операции</Link>
            <Link href="/debts">Долги</Link>
          </nav>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </body>
  </html>
);

export default RootLayout;
