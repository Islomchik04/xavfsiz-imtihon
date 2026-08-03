"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import LoginForm from "./LoginForm";
import { useTil } from "@/lib/i18n";

export default function LoginSahifa() {
  const { t } = useTil();

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-slate-900 px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="xi-blob w-[26rem] h-[26rem] bg-brand-400 -top-24 -left-16" />
        <div className="xi-blob w-[22rem] h-[22rem] bg-white top-1/2 -right-20" style={{ animationDelay: "-8s" }} />
      </div>

      <motion.div
        className="w-full max-w-md relative"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4 overflow-hidden"
            initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <img src="/logo.png" alt="Xavfsiz Imtihon" className="w-full h-full object-cover" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white">{t("tizim_nomi")}</h1>
          <p className="text-brand-100 mt-1 text-sm">{t("login_tavsif")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </motion.div>

        <p className="text-center text-brand-200 text-xs mt-6">{t("login_eslatma")}</p>
      </motion.div>
    </div>
  );
}
