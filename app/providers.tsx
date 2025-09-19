"use client";

import type { ReactNode } from "react";
import { CurrencyProvider } from "@/lib/CurrencyContext";

const Providers = ({ children }: { children: ReactNode }) => (
  <CurrencyProvider>{children}</CurrencyProvider>
);

export default Providers;
