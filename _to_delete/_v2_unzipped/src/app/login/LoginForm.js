"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { telefonToEmail } from "@/lib/telefon";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [telefon, setTelefon] = useState("");
  const [parol, setParol] = useState("");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  async function yuborish(e) {
    e.preventDefault();
    setXato("");
    setYuklanmoqda(true);

    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email: telefonToEmail(telefon),
      password: parol,
    });

    setYuklanmoqda(false);

    if (error) {
      setXato("Telefon raqam yoki parol noto'g'ri");
      return;
    }

    router.push(params.get("keyin") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={yuborish} className="card space-y-4">
      <div>
        <label className="label">Telefon raqam</label>
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
        <label className="label">Parol</label>
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
        {yuklanmoqda ? "Tekshirilmoqda…" : "Kirish"}
      </button>
    </form>
  );
}
