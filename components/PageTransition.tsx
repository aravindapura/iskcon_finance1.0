"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

const transition = { duration: 0.26, ease: "easeInOut" as const };

const variants = {
  initial: { opacity: 0, x: 24, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -24, scale: 0.98 }
};

type PageTransitionProps = {
  children: ReactNode;
};

const PageTransition = ({ children }: PageTransitionProps) => {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
