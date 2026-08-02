"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { sanaKorinishi } from "@/lib/imtihonHisob";

const HOLAT_LABEL = {
  bosh: "Bo'sh",
  aktiv: "Aktiv",
  yakunlangan: "Yakunlangan",
};
const HOLAT_RANG = {
  bosh: "bg-slate-100 text-slate-500",
  aktiv: "bg-amber-100 text-amber-700",
  yakunlangan: "bg-emerald-100 text-emerald-700",
};

export default function ImtihonlarClient({ foydalanuvchiId, rol, imtihonlar, urinishlar }) {
  const router = useRouter();
  const yaratishRuxsat = ["hujjatchi", "superadmin"].includes(rol);
  const ochirishRuxsat = rol === "superadmin";

  const [sana, setSana] = useState("");
  const [izoh, setIzoh] = useState("");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [tahrirId, setTahrirId] = useState(null);

  const statistikaMap = useMemo(() => {
    const map = new Map();
    for (const u of urinishlar) {
      if (!map.has(u.imtihon_id)) {
        map.set(u.imtihon_id, { jami: 0, natijaChiqqan: 0, otgan: 0, otmagan: 0 });
      }
      const y = map.get(u.imtihon_id);
      y.jami += 1;
      const qismlar = [];
      if (u.nazariy_kerak) qismlar.push(u.nazariy_natija);
      if (u.amaliy_kerak) qismlar.push(u.amaliy_natija);
      const kutilmoqda = qismlar.some((q) => q === "kutilmoqda");
      const otmadi = qismlar.some((q) => q === "otmadi");
      if (!kutilmoqda) {
        y.natijaChiqqan += 1;
        if (otmadi) y.otmagan += 1;
        else y.otgan += 1;
      }
    }
    return map;
  }, [urinishlar]);

  function holatAniqlash(id) {
    const s = statistikaMap.get(id);
    if (!s || s.jami === 0) return "bosh";
    return s.natijaChiqqan === s.jami ? "yakunlangan" : "aktiv";
  }

  async function yuborish(e) {
    e.preventDefault();
    setXato("");
    if (!sana) {
      setXato("Sanani kiriting");
      return;
    }
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("imtihonlar")
      .insert({ sana, izoh: izoh || null, yaratgan: foydalanuvchiId });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    setSana("");
    setIzoh("");
    router.refresh();
  }

  async function ochirish(id) {
    if (!confirm("Rostdan ham bu imtihonni o'chirmoqchimisiz?")) return;
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("imtihonlar").delete().eq("id", id);
    if (error) {
      alert(
        error.message.includes("violates foreign key")
          ? "Bu imtihonga talabalar biriktirilgan — avval ularni boshqa imtihonga o'tkazing yoki o'chiring."
          : error.message
      );
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Imtihonlar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {yaratishRuxsat
            ? "Avval shu yerda imtihon sessiyasini yarating, so'ng talaba sahifasida shu imtihonga biriktiring."
            : "Imtihon sanasini tanlang — ichida talabalarni qidirib natijasini belgilashingiz mumkin."}
        </p>
      </div>

      <div className={`grid gap-6 ${yaratishRuxsat ? "lg:grid-cols-2" : ""}`}>
        {yaratishRuxsat && (
          <form onSubmit={yuborish} className="card space-y-4 h-fit">
            <h2 className="font-semibold text-slate-800">Yangi imtihon</h2>
            <div>
              <label className="label">Imtihon sanasi</label>
              <input className="input" type="date" value={sana} onChange={(e) => setSana(e.target.value)} required />
            </div>
            <div>
              <label className="label">Izoh (ixtiyoriy)</label>
              <input
                className="input"
                value={izoh}
                onChange={(e) => setIzoh(e.target.value)}
                placeholder="Masalan: Nazariy imtihon, DHM markazi"
              />
            </div>
            {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
            <button className="btn-primary w-full" disabled={yuklanmoqda}>
              {yuklanmoqda ? "Yaratilmoqda…" : "Imtihon yaratish"}
            </button>
          </form>
        )}

        <div className="card overflow-x-auto">
          <h2 className="font-semibold text-slate-800 mb-4">Mavjud imtihonlar</h2>
          {imtihonlar.length === 0 ? (
            <p className="text-sm text-slate-400">Hozircha imtihon yaratilmagan.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-medium">Sana</th>
                  <th className="pb-2 font-medium">Izoh</th>
                  <th className="pb-2 font-medium">Holati</th>
                  <th className="pb-2 font-medium text-right">Talaba</th>
                  <th className="pb-2 font-medium text-right">O'tdi</th>
                  <th className="pb-2 font-medium text-right">O'tmadi</th>
                  {(yaratishRuxsat || ochirishRuxsat) && <th className="pb-2 font-medium"></th>}
                </tr>
              </thead>
              <tbody>
                {imtihonlar.map((i) => {
                  const s = statistikaMap.get(i.id) || { jami: 0, otgan: 0, otmagan: 0 };
                  const holat = holatAniqlash(i.id);
                  return (
                    <ImtihonQatori
                      key={i.id}
                      imtihon={i}
                      stat={s}
                      holat={holat}
                      yaratishRuxsat={yaratishRuxsat}
                      ochirishRuxsat={ochirishRuxsat}
                      tahrirlanmoqda={tahrirId === i.id}
                      onTahrirBoshlash={() => setTahrirId(i.id)}
                      onTahrirYopish={() => setTahrirId(null)}
                      onOchirish={() => ochirish(i.id)}
                      onYangilandi={() => {
                        setTahrirId(null);
                        router.refresh();
                      }}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function ImtihonQatori({
  imtihon: i,
  stat: s,
  holat,
  yaratishRuxsat,
  ochirishRuxsat,
  tahrirlanmoqda,
  onTahrirBoshlash,
  onTahrirYopish,
  onOchirish,
  onYangilandi,
}) {
  return (
    <>
      <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
        <td className="py-2.5 font-medium text-slate-700">
          <Link href={`/imtihonlar/${i.id}`} className="hover:underline text-brand-700">
            {sanaKorinishi(i.sana)}
          </Link>
        </td>
        <td className="py-2.5 text-slate-500">{i.izoh || "—"}</td>
        <td className="py-2.5">
          <span className={`badge ${HOLAT_RANG[holat]}`}>{HOLAT_LABEL[holat]}</span>
        </td>
        <td className="py-2.5 text-right">{s.jami}</td>
        <td className="py-2.5 text-right text-emerald-600 font-medium">{s.otgan}</td>
        <td className="py-2.5 text-right text-rose-600 font-medium">{s.otmagan}</td>
        {(yaratishRuxsat || ochirishRuxsat) && (
          <td className="py-2.5 text-right whitespace-nowrap">
            {yaratishRuxsat && (
              <button onClick={onTahrirBoshlash} className="text-xs font-medium text-brand-600 hover:underline mr-3">
                Tahrirlash
              </button>
            )}
            {ochirishRuxsat && (
              <button onClick={onOchirish} className="text-xs font-medium text-rose-600 hover:underline">
                O'chirish
              </button>
            )}
          </td>
        )}
      </tr>
      {tahrirlanmoqda && (
        <tr>
          <td colSpan={7} className="pb-4">
            <ImtihonTahrirForma imtihon={i} onBekor={onTahrirYopish} onSaqlandi={onYangilandi} />
          </td>
        </tr>
      )}
    </>
  );
}

function ImtihonTahrirForma({ imtihon, onBekor, onSaqlandi }) {
  const [sana, setSana] = useState(imtihon.sana);
  const [izoh, setIzoh] = useState(imtihon.izoh || "");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  async function saqlash(e) {
    e.preventDefault();
    setXato("");
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("imtihonlar")
      .update({ sana, izoh: izoh || null })
      .eq("id", imtihon.id);
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    onSaqlandi();
  }

  return (
    <form onSubmit={saqlash} className="bg-slate-50 rounded-xl p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Imtihon sanasi</label>
          <input className="input" type="date" value={sana} onChange={(e) => setSana(e.target.value)} required />
        </div>
        <div>
          <label className="label">Izoh</label>
          <input className="input" value={izoh} onChange={(e) => setIzoh(e.target.value)} />
        </div>
      </div>
      {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={yuklanmoqda}>
          {yuklanmoqda ? "Saqlanmoqda…" : "Saqlash"}
        </button>
        <button type="button" onClick={onBekor} className="btn-secondary">
          Bekor qilish
        </button>
      </div>
    </form>
  );
}
