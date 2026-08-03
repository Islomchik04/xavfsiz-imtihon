"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

// Har bir sahifa almashganda (route o'zgarganda) mazmun yumshoq fade+slide
// bilan kiradi — butun (app) guruhidagi barcha sahifalarga bir joydan
// tegishli bo'ladi, har bir sahifani alohida o'rab chiqishning hojati yo'q.
export default function PageTransition({ children }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
