"use client";

import { useState } from "react";
import { IMTIHON_TURI } from "@/lib/constants";
import YangiTalabaForm from "../yangi/YangiTalabaForm";

export default function AsosiyMalumotlarCard({ talaba, tahrirRuxsat, formaMalumotlari, profile }) {
  const [tahrirlanmoqda, setTahrirlanmoqda] = useState(false);

  if (tahrirlanmoqda && formaMalumotlari) {
    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-slate-800">Asosiy ma'lumotlarni tahrirlash</h2>
          <button className="text-sm text-slate-500 hover:text-slate-700" onClick={() => setTahrirlanmoqda(false)}>
            Bekor qilish
          </button>
        </div>
        <YangiTalabaForm
          foydalanuvchiId={profile.id}
          profile={profile}
          filiallar={formaMalumotlari.filiallar}
          guruhlar={formaMalumotlari.guruhlar}
          oqituvchilar={formaMalumotlari.oqituvchilar}
          tahrirlanayotgan={talaba}
        />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-slate-800">Asosiy ma'lumotlar</h2>
        {tahrirRuxsat && (
          <button className="text-sm text-brand-600 hover:underline" onClick={() => setTahrirlanmoqda(true)}>
            Tahrirlash
          </button>
        )}
      </div>
      <div className="space-y-2 text-sm">
        <Satr label="Filial" qiymat={talaba.filiallar?.nomi} />
        <Satr label="Guruh" qiymat={talaba.guruhlar?.nomi} />
        <Satr label="Imtihon turi" qiymat={IMTIHON_TURI[talaba.imtihon_turi]} />
        {talaba.imtihon_turi !== "amaliy" && (
          <Satr label="Nazariy o'qituvchi" qiymat={talaba.nazariy_oqituvchilar?.ism_familya} />
        )}
        {talaba.imtihon_turi !== "nazariy" && (
          <Satr label="Amaliy o'qituvchi" qiymat={talaba.amaliy_oqituvchilar?.ism_familya} />
        )}
        <Satr label="Ro'yxatga olgan" qiymat={talaba.qoshgan_profil?.ism_familya} />
        <Satr label="Qo'shilgan sana" qiymat={new Date(talaba.created_at).toLocaleString("uz-UZ")} />
      </div>
    </div>
  );
}

function Satr({ label, qiymat }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 font-medium text-right">{qiymat || "—"}</span>
    </div>
  );
}
