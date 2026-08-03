"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useInView } from "framer-motion";

const ACCENT_MAP = {
  slate: "text-slate-700 bg-slate-100",
  blue: "text-brand-700 bg-brand-100",
  emerald: "text-emerald-700 bg-emerald-100",
  rose: "text-rose-700 bg-rose-100",
  amber: "text-amber-700 bg-amber-100",
};

export default function StatTile({ label, value, accent = "slate", sub }) {
  const sonmi = typeof value === "number" && Number.isFinite(value);

  return (
    <motion.div
      className="card"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 350, damping: 22 }}
    >
      <div className={`inline-flex text-xs font-semibold rounded-full px-2.5 py-1 mb-3 ${ACCENT_MAP[accent]}`}>
        {label}
      </div>
      <div className="text-3xl font-bold text-slate-800">
        {sonmi ? <SonHisoblagich qiymat={value} /> : value}
      </div>
      {sub && <div className="text-sm text-slate-400 mt-1">{sub}</div>}
    </motion.div>
  );
}

// Sahifa ko'rinishga kirganda 0 dan haqiqiy qiymatgacha yumshoq o'sib
// boradigan son animatsiyasi (framer-motion spring asosida).
function SonHisoblagich({ qiymat }) {
  const ref = useRef(null);
  const korinadimi = useInView(ref, { once: true, margin: "-10% 0px" });
  const motionQiymat = useMotionValue(0);
  const spring = useSpring(motionQiymat, { stiffness: 90, damping: 20, mass: 0.6 });
  const [korinish, setKorinish] = useState(0);

  useEffect(() => {
    if (korinadimi) motionQiymat.set(qiymat);
  }, [korinadimi, qiymat, motionQiymat]);

  useEffect(() => {
    const bekor = spring.on("change", (v) => setKorinish(Math.round(v)));
    return () => bekor();
  }, [spring]);

  return <span ref={ref}>{korinish.toLocaleString("uz-UZ")}</span>;
}
