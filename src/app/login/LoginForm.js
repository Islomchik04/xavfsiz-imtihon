"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabase/client";
import { telefonToEmail } from "@/lib/telefon";
import { useTil } from "@/lib/i18n";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useTil();
  const [telefon, setTelefon] = useState("");
  const [parol, setParol] = useState("");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [xushKelibsizIsm, setXushKelibsizIsm] = useState(null);

  async function yuborish(e) {
    e.preventDefault();
    setXato("");
    setYuklanmoqda(true);

    const supabase = supabaseBrowser();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: telefonToEmail(telefon),
      password: parol,
    });

    if (error) {
      setYuklanmoqda(false);
      setXato(t("login_xato"));
      return;
    }

    let ism = "";
    if (data?.user?.id) {
      const { data: profil } = await supabase
        .from("profiles")
        .select("ism_familya")
        .eq("id", data.user.id)
        .single();
      ism = profil?.ism_familya || "";
    }

    setYuklanmoqda(false);
    setXushKelibsizIsm(ism);

    const manzil = params.get("keyin") || "/dashboard";
    setTimeout(() => {
      router.push(manzil);
      router.refresh();
    }, 1500);
  }

  return (
    <>
    <form onSubmit={yuborish} className="card space-y-4">
      <div>
        <label className="label">{t("telefon_raqam")}</label>
        <div className="flex items-stretch">
          <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-[15px]">
            +998
          </span>
          <input
            className="input rounded-l-none"
            type="tel"
            inputMode="numeric"
            placeholder="91 234 56 78"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            required
            autoFocus
          />
        </div>
      </div>

      <div>
        <label className="label">{t("parol")}</label>
        <input
          className="input"
          type="password"
          placeholder="••••••••"
          value={parol}
          onChange={(e) => setParol(e.target.value)}
          required
        />
      </div>

      {xato && (
        <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
          {xato}
        </div>
      )}

      <button type="submit" className="btn-primary w-full" disabled={yuklanmoqda}>
        {yuklanmoqda ? t("tekshirilmoqda") : t("kirish")}
      </button>
    </form>

    <AnimatePresence>
      {xushKelibsizIsm !== null && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-slate-900 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="xi-blob w-[26rem] h-[26rem] bg-brand-400 -top-24 -left-16" />
            <div className="xi-blob w-[22rem] h-[22rem] bg-white top-1/2 -right-20" style={{ animationDelay: "-8s" }} />
          </div>

          <div className="text-center relative px-6">
            <motion.div
              className="mx-auto mb-6 w-20 h-20 rounded-full bg-white/10 backdrop-blur flex items-center justify-center"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.1 }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <motion.path
                  d="M5 13l4 4L19 7"
                  stroke="#fff"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
                />
              </svg>
            </motion.div>
            <motion.h1
              className="text-2xl sm:text-3xl font-bold text-white mb-2"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              Xush kelibsiz{xushKelibsizIsm ? `, ${xushKelibsizIsm}` : ""}!
            </motion.h1>
            <motion.p
              className="text-brand-100 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Tizimga muvaffaqiyatli kirdingiz, boshqaruv paneliga o'tkazamiz…
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
