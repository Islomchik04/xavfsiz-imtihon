"use client";

import { Suspense } from "react";
import LoginForm from "./LoginForm";
import { useTil } from "@/lib/i18n";

export default function LoginSahifa() {
  const { t } = useTil();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4 overflow-hidden">
            <img src="/logo.png" alt="Xavfsiz Imtihon" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t("tizim_nomi")}</h1>
          <p className="text-brand-100 mt-1 text-sm">{t("login_tavsif")}</p>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <p className="text-center text-brand-200 text-xs mt-6">{t("login_eslatma")}</p>
      </div>
    </div>
  );
}
