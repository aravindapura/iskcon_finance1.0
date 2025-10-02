"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import AppNavigation, { type AppTabKey } from "@/components/AppNavigation";

type HomeNavigationProps = {
  activeTab: AppTabKey;
};

const HomeNavigation = ({ activeTab }: HomeNavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <button
        type="button"
        className="tab-pill flex items-center justify-center gap-2"
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-controls="home-navigation-menu"
      >
        {isOpen ? (
          <ChevronUp aria-hidden className="tab-pill__icon" />
        ) : (
          <ChevronDown aria-hidden className="tab-pill__icon" />
        )}
        <span>Меню</span>
      </button>
      {isOpen ? (
        <div id="home-navigation-menu">
          <AppNavigation activeTab={activeTab} />
        </div>
      ) : null}
    </div>
  );
};

export default HomeNavigation;
