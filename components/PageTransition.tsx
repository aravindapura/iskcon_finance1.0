"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

const transition = { duration: 0.24, ease: "easeInOut" as const };

const variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 }
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
