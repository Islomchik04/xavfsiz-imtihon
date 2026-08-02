"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ROLLAR, OQITUVCHI_TURI } from "@/lib/constants";
import { telefonKorinishi } from "@/lib/telefon";

const TABLAR = [
  { key: "foydalanuvchilar", label: "Foydalanuvchilar" },
  { key: "filiallar", label: "Filiallar" },
  { key: "guruhlar", label: "Guruhlar" },
  { key: "oqituvchilar", label: "O'qituvchilar" },
];

export default function SozlamalarClient({
  boshlangichFiliallar,
  boshlangichGuruhlar,
  boshlangichOqituvchilar,
  boshlangichFoydalanuvchilar,
}) {
  const [tab, setTab] = useState("foydalanuvchilar");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Sozlamalar</h1>
        <p className="text-sm text-slate-500 mt-0.5">Foydalanuvchi, filial, guruh va o'qituvchilarni boshqarish</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABLAR.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "foydalanuvchilar" && (
        <FoydalanuvchilarBolimi foydalanuvchilar={boshlangichFoydalanuvchilar} filiallar={boshlangichFiliallar} />
      )}
      {tab === "filiallar" && <FiliallarBolimi filiallar={boshlangichFiliallar} />}
      {tab === "guruhlar" && <GuruhlarBolimi guruhlar={boshlangichGuruhlar} filiallar={boshlangichFiliallar} />}
      {tab === "oqituvchilar" && <OqituvchilarBolimi oqituvchilar={boshlangichOqituvchilar} filiallar={boshlangichFiliallar} />}
    </div>
  );
}

// ------------------------------- FOYDALANUVCHILAR -------------------------------

function FoydalanuvchilarBolimi({ foydalanuvchilar, filiallar }) {
  const router = useRouter();
  const [telefon, setTelefon] = useState("");
  const [parol, setParol] = useState("");
  const [ismFamilya, setIsmFamilya] = useState("");
  const [role, setRole] = useState("");
  const [filialId, setFilialId] = useState("");
  const [xato, setXato] = useState("");
  const [muvaffaqiyat, setMuvaffaqiyat] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  async function qoshish(e) {
    e.preventDefault();
    setXato("");
    setMuvaffaqiyat("");
    setYuklanmoqda(true);

    const javob = await fetch("/api/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefon, parol, ismFamilya, role, filialId: role === "admin" ? filialId : null }),
    });
    const natija = await javob.json();
    setYuklanmoqda(false);

    if (!javob.ok) {
      setXato(natija.xato || "Xatolik yuz berdi");
      return;
    }

    setMuvaffaqiyat("Foydalanuvchi qo'shildi");
    setTelefon("");
    setParol("");
    setIsmFamilya("");
    setRole("");
    setFilialId("");
    router.refresh();
  }

  async function faollikniOzgartirish(id, faol) {
    const supabase = supabaseBrowser();
    await supabase.from("profiles").update({ faol: !faol }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={qoshish} className="card space-y-4 h-fit">
        <h2 className="font-semibold text-slate-800">Yangi foydalanuvchi</h2>

        <div>
          <label className="label">Ism familya</label>
          <input className="input" value={ismFamilya} onChange={(e) => setIsmFamilya(e.target.value)} required />
        </div>

        <div>
          <label className="label">Telefon raqam</label>
          <div className="flex items-stretch">
            <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-[15px]">
              +998
            </span>
            <input
              className="input rounded-l-none"
              placeholder="91 234 56 78"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Parol</label>
          <input
            className="input"
            type="text"
            placeholder="kamida 6 ta belgi"
            value={parol}
            onChange={(e) => setParol(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Rol</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)} required>
            <option value="">Tanlang</option>
            {Object.entries(ROLLAR).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {role === "admin" && (
          <div>
            <label className="label">Filial</label>
            <select className="input" value={filialId} onChange={(e) => setFilialId(e.target.value)} required>
              <option value="">Tanlang</option>
              {filiallar.map((f) => (
                <option key={f.id} value={f.id}>{f.nomi}</option>
              ))}
            </select>
          </div>
        )}

        {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
        {muvaffaqiyat && <div className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">{muvaffaqiyat}</div>}

        <button className="btn-primary w-full" disabled={yuklanmoqda}>
          {yuklanmoqda ? "Qo'shilmoqda…" : "Qo'shish"}
        </button>
      </form>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold text-slate-800 mb-4">Mavjud foydalanuvchilar</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="pb-2 font-medium">Ism</th>
              <th className="pb-2 font-medium">Telefon</th>
              <th className="pb-2 font-medium">Rol</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {foydalanuvchilar.map((f) => (
              <tr key={f.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 font-medium text-slate-700">
                  {f.ism_familya}
                  {f.filiallar?.nomi && <div className="text-xs text-slate-400">{f.filiallar.nomi}</div>}
                </td>
                <td className="py-2.5 text-slate-500">+998 {telefonKorinishi(f.telefon)}</td>
                <td className="py-2.5 text-slate-500">{ROLLAR[f.role]}</td>
                <td className="py-2.5 text-right">
                  <button
                    onClick={() => faollikniOzgartirish(f.id, f.faol)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      f.faol ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {f.faol ? "Faol" : "Faolsiz"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------------------------------- FILIALLAR -------------------------------

function FiliallarBolimi({ filiallar }) {
  const router = useRouter();
  const [nomi, setNomi] = useState("");
  const [xato, setXato] = useState("");

  async function qoshish(e) {
    e.preventDefault();
    setXato("");
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("filiallar").insert({ nomi: nomi.trim() });
    if (error) {
      setXato(error.message);
      return;
    }
    setNomi("");
    router.refresh();
  }

  async function faollikniOzgartirish(id, faol) {
    const supabase = supabaseBrowser();
    await supabase.from("filiallar").update({ faol: !faol }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={qoshish} className="card space-y-4 h-fit">
        <h2 className="font-semibold text-slate-800">Yangi filial</h2>
        <div>
          <label className="label">Filial nomi</label>
          <input className="input" value={nomi} onChange={(e) => setNomi(e.target.value)} required />
        </div>
        {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
        <button className="btn-primary w-full">Qo'shish</button>
      </form>

      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-4">Filiallar</h2>
        <ul className="divide-y divide-slate-50">
          {filiallar.map((f) => (
            <li key={f.id} className="py-2.5 flex justify-between items-center text-sm">
              <span className="font-medium text-slate-700">{f.nomi}</span>
              <button
                onClick={() => faollikniOzgartirish(f.id, f.faol)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  f.faol ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {f.faol ? "Faol" : "Faolsiz"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ------------------------------- GURUHLAR -------------------------------

function GuruhlarBolimi({ guruhlar, filiallar }) {
  const router = useRouter();
  const [nomi, setNomi] = useState("");
  const [filialId, setFilialId] = useState("");
  const [xato, setXato] = useState("");

  async function qoshish(e) {
    e.preventDefault();
    setXato("");
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("guruhlar").insert({ nomi: nomi.trim(), filial_id: filialId });
    if (error) {
      setXato(error.message);
      return;
    }
    setNomi("");
    router.refresh();
  }

  async function faollikniOzgartirish(id, faol) {
    const supabase = supabaseBrowser();
    await supabase.from("guruhlar").update({ faol: !faol }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={qoshish} className="card space-y-4 h-fit">
        <h2 className="font-semibold text-slate-800">Yangi guruh</h2>
        <div>
          <label className="label">Filial</label>
          <select className="input" value={filialId} onChange={(e) => setFilialId(e.target.value)} required>
            <option value="">Tanlang</option>
            {filiallar.map((f) => (
              <option key={f.id} value={f.id}>{f.nomi}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Guruh nomi</label>
          <input className="input" value={nomi} onChange={(e) => setNomi(e.target.value)} required />
        </div>
        {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
        <button className="btn-primary w-full">Qo'shish</button>
      </form>

      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-4">Guruhlar</h2>
        <ul className="divide-y divide-slate-50">
          {guruhlar.map((g) => (
            <li key={g.id} className="py-2.5 flex justify-between items-center text-sm">
              <span>
                <span className="font-medium text-slate-700">{g.nomi}</span>
                <span className="text-slate-400 ml-2">{g.filiallar?.nomi}</span>
              </span>
              <button
                onClick={() => faollikniOzgartirish(g.id, g.faol)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  g.faol ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {g.faol ? "Faol" : "Faolsiz"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ------------------------------- O'QITUVCHILAR -------------------------------

function OqituvchilarBolimi({ oqituvchilar, filiallar }) {
  const router = useRouter();
  const [ismFamilya, setIsmFamilya] = useState("");
  const [turi, setTuri] = useState("");
  const [filialId, setFilialId] = useState("");
  const [xato, setXato] = useState("");

  async function qoshish(e) {
    e.preventDefault();
    setXato("");
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("oqituvchilar")
      .insert({ ism_familya: ismFamilya.trim(), turi, filial_id: filialId });
    if (error) {
      setXato(error.message);
      return;
    }
    setIsmFamilya("");
    setTuri("");
    router.refresh();
  }

  async function faollikniOzgartirish(id, faol) {
    const supabase = supabaseBrowser();
    await supabase.from("oqituvchilar").update({ faol: !faol }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={qoshish} className="card space-y-4 h-fit">
        <h2 className="font-semibold text-slate-800">Yangi o'qituvchi</h2>
        <div>
          <label className="label">Ism familya</label>
          <input className="input" value={ismFamilya} onChange={(e) => setIsmFamilya(e.target.value)} required />
        </div>
        <div>
          <label className="label">Turi</label>
          <select className="input" value={turi} onChange={(e) => setTuri(e.target.value)} required>
            <option value="">Tanlang</option>
            {Object.entries(OQITUVCHI_TURI).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Filial</label>
          <select className="input" value={filialId} onChange={(e) => setFilialId(e.target.value)} required>
            <option value="">Tanlang</option>
            {filiallar.map((f) => (
              <option key={f.id} value={f.id}>{f.nomi}</option>
            ))}
          </select>
        </div>
        {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
        <button className="btn-primary w-full">Qo'shish</button>
      </form>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold text-slate-800 mb-4">O'qituvchilar</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="pb-2 font-medium">Ism</th>
              <th className="pb-2 font-medium">Turi</th>
              <th className="pb-2 font-medium">Filial</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {oqituvchilar.map((o) => (
              <tr key={o.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 font-medium text-slate-700">{o.ism_familya}</td>
                <td className="py-2.5 text-slate-500">{OQITUVCHI_TURI[o.turi]}</td>
                <td className="py-2.5 text-slate-500">{o.filiallar?.nomi}</td>
                <td className="py-2.5 text-right">
                  <button
                    onClick={() => faollikniOzgartirish(o.id, o.faol)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      o.faol ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {o.faol ? "Faol" : "Faolsiz"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
