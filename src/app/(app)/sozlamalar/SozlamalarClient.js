"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ROLLAR, OQITUVCHI_TURI } from "@/lib/constants";
import { telefonKorinishi, telefonNormallash } from "@/lib/telefon";

const TABLAR = [
  { key: "foydalanuvchilar", label: "Foydalanuvchilar" },
  { key: "filiallar", label: "Filiallar" },
  { key: "guruhlar", label: "Guruhlar" },
  { key: "oqituvchilar", label: "O'qituvchilar" },
  { key: "sabablar", label: "Sabablar" },
  { key: "xavfli", label: "Xavfli zona" },
];

export default function SozlamalarClient({
  boshlangichFiliallar,
  boshlangichGuruhlar,
  boshlangichOqituvchilar,
  boshlangichFoydalanuvchilar,
  boshlangichSabablar,
}) {
  const [tab, setTab] = useState("foydalanuvchilar");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Sozlamalar</h1>
        <p className="text-sm text-slate-500 mt-0.5">Foydalanuvchi, filial, guruh va o'qituvchilarni boshqarish</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABLAR.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
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
      {tab === "guruhlar" && <GuruhlarBolimi guruhlar={boshlangichGuruhlar} />}
      {tab === "oqituvchilar" && <OqituvchilarBolimi oqituvchilar={boshlangichOqituvchilar} filiallar={boshlangichFiliallar} />}
      {tab === "sabablar" && <SabablarBolimi sabablar={boshlangichSabablar} />}
      {tab === "xavfli" && <XavfliZonaBolimi />}
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
  const [tahrirId, setTahrirId] = useState(null);

  const royxat = foydalanuvchilar.filter((f) => f.role !== "oqituvchi");

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

  async function ochirish(id, ism) {
    if (!confirm(`"${ism}" foydalanuvchisini butunlay o'chirmoqchimisiz?`)) return;
    const javob = await fetch("/api/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const natija = await javob.json();
    if (!javob.ok) {
      alert(natija.xato || "Xatolik yuz berdi");
      return;
    }
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
            placeholder="kamida 4 ta belgi"
            value={parol}
            onChange={(e) => setParol(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Rol</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)} required>
            <option value="">Tanlang</option>
            {Object.entries(ROLLAR)
              .filter(([k]) => k !== "oqituvchi")
              .map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">
            O'qituvchilarga login "O'qituvchilar" bo'limidan beriladi.
          </p>
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

      <div className="card overflow-x-auto hidden md:block">
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
            {royxat.map((f) => (
              <FoydalanuvchiQatori
                key={f.id}
                foydalanuvchi={f}
                filiallar={filiallar}
                tahrirlanmoqda={tahrirId === f.id}
                onTahrirBoshlash={() => setTahrirId(f.id)}
                onTahrirYopish={() => setTahrirId(null)}
                onFaollikniOzgartirish={() => faollikniOzgartirish(f.id, f.faol)}
                onOchirish={() => ochirish(f.id, f.ism_familya)}
                onYangilandi={() => {
                  setTahrirId(null);
                  router.refresh();
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="card md:hidden">
        <h2 className="font-semibold text-slate-800 mb-4">Mavjud foydalanuvchilar</h2>
        <div className="space-y-3 xi-stagger">
          {royxat.map((f) => (
            <div key={f.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-700">{f.ism_familya}</div>
                  <div className="text-xs text-slate-400 mt-0.5">+998 {telefonKorinishi(f.telefon)}</div>
                </div>
                <span className="text-xs font-medium text-slate-500">{ROLLAR[f.role]}</span>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50 dark:border-slate-800">
                <button onClick={() => setTahrirId(tahrirId === f.id ? null : f.id)} className="text-xs font-medium text-brand-600">
                  Tahrirlash
                </button>
                <button onClick={() => ochirish(f.id, f.ism_familya)} className="text-xs font-medium text-rose-600">
                  O'chirish
                </button>
                <button
                  onClick={() => faollikniOzgartirish(f.id, f.faol)}
                  className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full ${
                    f.faol ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {f.faol ? "Faol" : "Faolsiz"}
                </button>
              </div>
              {tahrirId === f.id && (
                <div className="mt-3">
                  <FoydalanuvchiTahrirForma
                    foydalanuvchi={f}
                    filiallar={filiallar}
                    onBekor={() => setTahrirId(null)}
                    onSaqlandi={() => {
                      setTahrirId(null);
                      router.refresh();
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FoydalanuvchiQatori({
  foydalanuvchi: f,
  filiallar,
  tahrirlanmoqda,
  onTahrirBoshlash,
  onTahrirYopish,
  onFaollikniOzgartirish,
  onOchirish,
  onYangilandi,
}) {
  return (
    <>
      <tr className="border-b border-slate-50 last:border-0">
        <td className="py-2.5 font-medium text-slate-700">
          {f.ism_familya}
          {f.filiallar?.nomi && <div className="text-xs text-slate-400">{f.filiallar.nomi}</div>}
        </td>
        <td className="py-2.5 text-slate-500">+998 {telefonKorinishi(f.telefon)}</td>
        <td className="py-2.5 text-slate-500">{ROLLAR[f.role]}</td>
        <td className="py-2.5 text-right whitespace-nowrap">
          <button onClick={onTahrirBoshlash} className="text-xs font-medium text-brand-600 hover:underline mr-3">
            Tahrirlash
          </button>
          <button onClick={onOchirish} className="text-xs font-medium text-rose-600 hover:underline mr-3">
            O'chirish
          </button>
          <button
            onClick={onFaollikniOzgartirish}
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              f.faol ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {f.faol ? "Faol" : "Faolsiz"}
          </button>
        </td>
      </tr>
      {tahrirlanmoqda && (
        <tr>
          <td colSpan={4} className="pb-4">
            <FoydalanuvchiTahrirForma
              foydalanuvchi={f}
              filiallar={filiallar}
              onBekor={onTahrirYopish}
              onSaqlandi={onYangilandi}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function FoydalanuvchiTahrirForma({ foydalanuvchi, filiallar, onBekor, onSaqlandi }) {
  const [ismFamilya, setIsmFamilya] = useState(foydalanuvchi.ism_familya);
  const [telefon, setTelefon] = useState(telefonKorinishi(foydalanuvchi.telefon));
  const [parol, setParol] = useState("");
  const [role, setRole] = useState(foydalanuvchi.role);
  const [filialId, setFilialId] = useState(foydalanuvchi.filial_id || "");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  async function saqlash(e) {
    e.preventDefault();
    setXato("");
    if (role === "admin" && !filialId) {
      setXato("Admin uchun filial majburiy");
      return;
    }
    setYuklanmoqda(true);
    const javob = await fetch("/api/edit-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: foydalanuvchi.id,
        ismFamilya,
        telefon,
        parol: parol || undefined,
        role,
        filialId: role === "admin" ? filialId : null,
      }),
    });
    const natija = await javob.json();
    setYuklanmoqda(false);
    if (!javob.ok) {
      setXato(natija.xato || "Xatolik yuz berdi");
      return;
    }
    onSaqlandi();
  }

  return (
    <form onSubmit={saqlash} className="bg-slate-50 rounded-xl p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Ism familya</label>
          <input className="input" value={ismFamilya} onChange={(e) => setIsmFamilya(e.target.value)} required />
        </div>
        <div>
          <label className="label">Telefon raqam</label>
          <div className="flex items-stretch">
            <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-white text-slate-500 text-[15px]">
              +998
            </span>
            <input
              className="input rounded-l-none"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className="label">Yangi parol (ixtiyoriy)</label>
          <input
            className="input"
            type="text"
            placeholder="o'zgartirmaslik uchun bo'sh qoldiring"
            value={parol}
            onChange={(e) => setParol(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Rol</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)} required>
            {Object.entries(ROLLAR)
              .filter(([k]) => k !== "oqituvchi")
              .map(([k, v]) => (
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

// ------------------------------- FILIALLAR -------------------------------

function FiliallarBolimi({ filiallar }) {
  const router = useRouter();
  const [nomi, setNomi] = useState("");
  const [kpiBor, setKpiBor] = useState(true);
  const [xato, setXato] = useState("");

  async function qoshish(e) {
    e.preventDefault();
    setXato("");
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("filiallar").insert({ nomi: nomi.trim(), kpi_bor: kpiBor });
    if (error) {
      setXato(error.message);
      return;
    }
    setNomi("");
    setKpiBor(true);
    router.refresh();
  }

  async function faollikniOzgartirish(id, faol) {
    const supabase = supabaseBrowser();
    await supabase.from("filiallar").update({ faol: !faol }).eq("id", id);
    router.refresh();
  }

  // Superadmin har bir filial uchun "KPI bormi?" belgisini o'rnatadi — "yo'q"
  // deb belgilangan filialning o'quvchilari (o'qituvchi biriktirilgan bo'lsa
  // ham) hech qachon o'qituvchi KPI/maosh hisobiga kirmaydi (Express toifa
  // bilan bir xil mantiq — qarang: imtihonHisob.js#kpigaKirmaydimi).
  async function kpiniOzgartirish(id, kpiBorHozir) {
    const supabase = supabaseBrowser();
    await supabase.from("filiallar").update({ kpi_bor: !kpiBorHozir }).eq("id", id);
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
        <div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={kpiBor} onChange={(e) => setKpiBor(e.target.checked)} />
            KPI hisoblanadi
          </label>
          <p className="text-xs text-slate-400 mt-1">
            O'chirilsa, shu filial o'quvchilari o'qituvchi KPI/maosh hisobiga hech qachon kirmaydi.
          </p>
        </div>
        {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
        <button className="btn-primary w-full">Qo'shish</button>
      </form>

      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-4">Filiallar</h2>
        <ul className="divide-y divide-slate-50">
          {filiallar.map((f) => (
            <li key={f.id} className="py-2.5 flex justify-between items-center gap-2 text-sm">
              <span className="font-medium text-slate-700">{f.nomi}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => kpiniOzgartirish(f.id, f.kpi_bor)}
                  title="KPI hisoblanadimi?"
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    f.kpi_bor ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {f.kpi_bor ? "KPI bor" : "KPI yo'q"}
                </button>
                <button
                  onClick={() => faollikniOzgartirish(f.id, f.faol)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    f.faol ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {f.faol ? "Faol" : "Faolsiz"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ------------------------------- GURUHLAR -------------------------------
// Guruhlar endi bu yerda QO'LDA yaratilmaydi — Admin yoki Hujjatchi talaba
// qo'shganda guruh raqamini yozadi, tizim avtomatik topadi yoki yaratadi.
// Bu yerda faqat mavjud guruhlarni ko'rish va (agar kerak bo'lsa) faolsiz
// qilish mumkin.

function GuruhlarBolimi({ guruhlar }) {
  const router = useRouter();

  async function faollikniOzgartirish(id, faol) {
    const supabase = supabaseBrowser();
    await supabase.from("guruhlar").update({ faol: !faol }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="card max-w-xl">
      <h2 className="font-semibold text-slate-800 mb-1">Guruhlar</h2>
      <p className="text-sm text-slate-500 mb-4">
        Guruhlar bu yerda qo'lda yaratilmaydi — Admin yoki Hujjatchi talaba qo'shganda
        Int'alim guruh raqamini kiritadi, tizim mos guruhni avtomatik topadi yoki yaratadi. Bir xil
        nomli guruh turli filiallardan bo'lsa ham bitta guruhga birlashadi.
      </p>
      {guruhlar.length === 0 ? (
        <p className="text-sm text-slate-400">Hozircha guruh yo'q.</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {guruhlar.map((g) => (
            <li key={g.id} className="py-2.5 flex justify-between items-center text-sm">
              <span>
                <span className="font-medium text-slate-700">{g.nomi}</span>
                <span className="text-slate-400 ml-2">boshlang'ich: {g.filiallar?.nomi}</span>
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
      )}
    </div>
  );
}

// ------------------------------- O'QITUVCHILAR -------------------------------

function OqituvchilarBolimi({ oqituvchilar, filiallar }) {
  const router = useRouter();
  const [ismFamilya, setIsmFamilya] = useState("");
  const [turi, setTuri] = useState("");
  const [tanlanganFiliallar, setTanlanganFiliallar] = useState([]);
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [tahrirId, setTahrirId] = useState(null);
  const [loginId, setLoginId] = useState(null);

  function filialniAlmashtirish(id) {
    setTanlanganFiliallar((royxat) =>
      royxat.includes(id) ? royxat.filter((x) => x !== id) : [...royxat, id]
    );
  }

  async function qoshish(e) {
    e.preventDefault();
    setXato("");
    if (tanlanganFiliallar.length === 0) {
      setXato("Kamida bitta filial tanlang");
      return;
    }
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { data: yangiOqituvchi, error } = await supabase
      .from("oqituvchilar")
      .insert({ ism_familya: ismFamilya.trim(), turi })
      .select("id")
      .single();

    if (error) {
      setYuklanmoqda(false);
      setXato(error.message);
      return;
    }

    const { error: bogXatosi } = await supabase
      .from("oqituvchi_filiallar")
      .insert(tanlanganFiliallar.map((filialId) => ({ oqituvchi_id: yangiOqituvchi.id, filial_id: filialId })));

    setYuklanmoqda(false);
    if (bogXatosi) {
      setXato(bogXatosi.message);
      return;
    }

    setIsmFamilya("");
    setTuri("");
    setTanlanganFiliallar([]);
    router.refresh();
  }

  async function faollikniOzgartirish(id, faol) {
    const supabase = supabaseBrowser();
    await supabase.from("oqituvchilar").update({ faol: !faol }).eq("id", id);
    router.refresh();
  }

  const filialNomi = (id) => filiallar.find((f) => f.id === id)?.nomi || "";

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
          <label className="label">Filiallar (bir nechtasini tanlash mumkin)</label>
          <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto">
            {filiallar.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tanlanganFiliallar.includes(f.id)}
                  onChange={() => filialniAlmashtirish(f.id)}
                />
                {f.nomi}
              </label>
            ))}
          </div>
        </div>
        {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
        <button className="btn-primary w-full" disabled={yuklanmoqda}>
          {yuklanmoqda ? "Qo'shilmoqda…" : "Qo'shish"}
        </button>
      </form>

      <div className="card overflow-x-auto hidden md:block">
        <h2 className="font-semibold text-slate-800 mb-4">O'qituvchilar</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              <th className="pb-2 font-medium">Ism</th>
              <th className="pb-2 font-medium">Turi</th>
              <th className="pb-2 font-medium">Filiallar</th>
              <th className="pb-2 font-medium">Login</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {oqituvchilar.map((o) => (
              <OqituvchiQatori
                key={o.id}
                oqituvchi={o}
                filiallar={filiallar}
                filialNomi={filialNomi}
                tahrirlanmoqda={tahrirId === o.id}
                loginBerilmoqda={loginId === o.id}
                onTahrirBoshlash={() => {
                  setTahrirId(o.id);
                  setLoginId(null);
                }}
                onTahrirYopish={() => setTahrirId(null)}
                onLoginBoshlash={() => {
                  setLoginId(o.id);
                  setTahrirId(null);
                }}
                onLoginYopish={() => setLoginId(null)}
                onFaollikniOzgartirish={() => faollikniOzgartirish(o.id, o.faol)}
                onYangilandi={() => router.refresh()}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="card md:hidden">
        <h2 className="font-semibold text-slate-800 mb-4">O'qituvchilar</h2>
        <div className="space-y-3 xi-stagger">
          {oqituvchilar.map((o) => (
            <div key={o.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-700">{o.ism_familya}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {OQITUVCHI_TURI[o.turi]} · {(o.filial_idlar || []).map(filialNomi).join(", ") || "—"}
                  </div>
                </div>
                {o.login_profil ? (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-brand-100 text-brand-700 whitespace-nowrap">
                    +998 {telefonKorinishi(o.login_profil.telefon)}
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setLoginId(loginId === o.id ? null : o.id);
                      setTahrirId(null);
                    }}
                    className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap"
                  >
                    Login berish
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50 dark:border-slate-800">
                <button
                  onClick={() => {
                    setTahrirId(tahrirId === o.id ? null : o.id);
                    setLoginId(null);
                  }}
                  className="text-xs font-medium text-brand-600"
                >
                  Tahrirlash
                </button>
                <button
                  onClick={() => faollikniOzgartirish(o.id, o.faol)}
                  className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full ${
                    o.faol ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {o.faol ? "Faol" : "Faolsiz"}
                </button>
              </div>
              {tahrirId === o.id && (
                <div className="mt-3">
                  <OqituvchiTahrirForma
                    oqituvchi={o}
                    filiallar={filiallar}
                    onBekor={() => setTahrirId(null)}
                    onSaqlandi={() => {
                      setTahrirId(null);
                      router.refresh();
                    }}
                  />
                </div>
              )}
              {loginId === o.id && (
                <div className="mt-3">
                  <OqituvchiLoginForma
                    oqituvchi={o}
                    onBekor={() => setLoginId(null)}
                    onBerildi={() => {
                      setLoginId(null);
                      router.refresh();
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OqituvchiQatori({
  oqituvchi: o,
  filiallar,
  filialNomi,
  tahrirlanmoqda,
  loginBerilmoqda,
  onTahrirBoshlash,
  onTahrirYopish,
  onLoginBoshlash,
  onLoginYopish,
  onFaollikniOzgartirish,
  onYangilandi,
}) {
  return (
    <>
      <tr className="border-b border-slate-50 last:border-0">
        <td className="py-2.5 font-medium text-slate-700">{o.ism_familya}</td>
        <td className="py-2.5 text-slate-500">{OQITUVCHI_TURI[o.turi]}</td>
        <td className="py-2.5 text-slate-500">
          {(o.filial_idlar || []).map(filialNomi).join(", ") || "—"}
        </td>
        <td className="py-2.5">
          {o.login_profil ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand-100 text-brand-700">
              +998 {telefonKorinishi(o.login_profil.telefon)}
            </span>
          ) : (
            <button
              onClick={onLoginBoshlash}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              Login berish
            </button>
          )}
        </td>
        <td className="py-2.5 text-right whitespace-nowrap">
          <button onClick={onTahrirBoshlash} className="text-xs font-medium text-brand-600 hover:underline mr-3">
            Tahrirlash
          </button>
          <button
            onClick={onFaollikniOzgartirish}
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              o.faol ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {o.faol ? "Faol" : "Faolsiz"}
          </button>
        </td>
      </tr>
      {tahrirlanmoqda && (
        <tr>
          <td colSpan={5} className="pb-4">
            <OqituvchiTahrirForma
              oqituvchi={o}
              filiallar={filiallar}
              onBekor={onTahrirYopish}
              onSaqlandi={() => {
                onTahrirYopish();
                onYangilandi();
              }}
            />
          </td>
        </tr>
      )}
      {loginBerilmoqda && (
        <tr>
          <td colSpan={5} className="pb-4">
            <OqituvchiLoginForma
              oqituvchi={o}
              onBekor={onLoginYopish}
              onBerildi={() => {
                onLoginYopish();
                onYangilandi();
              }}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function OqituvchiTahrirForma({ oqituvchi, filiallar, onBekor, onSaqlandi }) {
  const [ismFamilya, setIsmFamilya] = useState(oqituvchi.ism_familya);
  const [turi, setTuri] = useState(oqituvchi.turi);
  const [tanlanganFiliallar, setTanlanganFiliallar] = useState(oqituvchi.filial_idlar || []);
  const [telefon, setTelefon] = useState(oqituvchi.telefon ? telefonKorinishi(oqituvchi.telefon) : "");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  function filialniAlmashtirish(id) {
    setTanlanganFiliallar((royxat) =>
      royxat.includes(id) ? royxat.filter((x) => x !== id) : [...royxat, id]
    );
  }

  async function saqlash(e) {
    e.preventDefault();
    setXato("");
    if (tanlanganFiliallar.length === 0) {
      setXato("Kamida bitta filial tanlang");
      return;
    }
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();

    const telefonNormal = telefon.trim() ? telefonNormallash(telefon) : null;
    const { error: ozErr } = await supabase
      .from("oqituvchilar")
      .update({ ism_familya: ismFamilya.trim(), turi, telefon: telefonNormal })
      .eq("id", oqituvchi.id);
    if (ozErr) {
      setYuklanmoqda(false);
      setXato(ozErr.message);
      return;
    }

    const eski = oqituvchi.filial_idlar || [];
    const qoshiladigan = tanlanganFiliallar.filter((id) => !eski.includes(id));
    const olibTashlanadigan = eski.filter((id) => !tanlanganFiliallar.includes(id));

    if (qoshiladigan.length > 0) {
      const { error } = await supabase
        .from("oqituvchi_filiallar")
        .insert(qoshiladigan.map((filialId) => ({ oqituvchi_id: oqituvchi.id, filial_id: filialId })));
      if (error) {
        setYuklanmoqda(false);
        setXato(error.message);
        return;
      }
    }
    if (olibTashlanadigan.length > 0) {
      const { error } = await supabase
        .from("oqituvchi_filiallar")
        .delete()
        .eq("oqituvchi_id", oqituvchi.id)
        .in("filial_id", olibTashlanadigan);
      if (error) {
        setYuklanmoqda(false);
        setXato(error.message);
        return;
      }
    }

    setYuklanmoqda(false);
    onSaqlandi();
  }

  return (
    <form onSubmit={saqlash} className="bg-slate-50 rounded-xl p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Ism familya</label>
          <input className="input" value={ismFamilya} onChange={(e) => setIsmFamilya(e.target.value)} required />
        </div>
        <div>
          <label className="label">Turi</label>
          <select className="input" value={turi} onChange={(e) => setTuri(e.target.value)} required>
            {Object.entries(OQITUVCHI_TURI).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Filiallar</label>
        <div className="grid grid-cols-2 gap-2 border border-slate-200 bg-white rounded-xl p-3 max-h-40 overflow-y-auto">
          {filiallar.map((f) => (
            <label key={f.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tanlanganFiliallar.includes(f.id)}
                onChange={() => filialniAlmashtirish(f.id)}
              />
              {f.nomi}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Telefon (Telegram bot uchun, ixtiyoriy)</label>
        <div className="flex items-stretch">
          <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-white text-slate-500 text-[15px]">
            +998
          </span>
          <input
            className="input rounded-l-none"
            type="tel"
            inputMode="numeric"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            placeholder="91 234 56 78"
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {oqituvchi.telegram_chat_id
            ? "🤖 Telegram bot bilan bog'langan."
            : "Kiritilsa, o'qituvchi botga shu raqamni ulashib \"erkin o'quvchi\" KPI so'rovlarini yuboradi."}
        </p>
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

function OqituvchiLoginForma({ oqituvchi, onBekor, onBerildi }) {
  const [telefon, setTelefon] = useState("");
  const [parol, setParol] = useState("");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  async function berish(e) {
    e.preventDefault();
    setXato("");
    setYuklanmoqda(true);
    const javob = await fetch("/api/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telefon,
        parol,
        ismFamilya: oqituvchi.ism_familya,
        role: "oqituvchi",
        oqituvchiId: oqituvchi.id,
      }),
    });
    const natija = await javob.json();
    setYuklanmoqda(false);
    if (!javob.ok) {
      setXato(natija.xato || "Xatolik yuz berdi");
      return;
    }
    onBerildi();
  }

  return (
    <form onSubmit={berish} className="bg-slate-50 rounded-xl p-4 space-y-3">
      <p className="text-sm text-slate-500">
        <strong className="text-slate-700">{oqituvchi.ism_familya}</strong> uchun login yaratish — o'qituvchi
        shu telefon raqam va parol bilan tizimga kirib, o'z statistikasi va KPI'sini ko'ra oladi.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Telefon raqam</label>
          <div className="flex items-stretch">
            <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-white text-slate-500 text-[15px]">
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
            placeholder="kamida 4 ta belgi"
            value={parol}
            onChange={(e) => setParol(e.target.value)}
            required
          />
        </div>
      </div>
      {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={yuklanmoqda}>
          {yuklanmoqda ? "Yaratilmoqda…" : "Login berish"}
        </button>
        <button type="button" onClick={onBekor} className="btn-secondary">
          Bekor qilish
        </button>
      </div>
    </form>
  );
}

// ------------------------------- SABABLAR -------------------------------
// "Boshqa" natija tanlanganda Imtihon boshqaruvchisi shu ro'yxatdan sababni
// tanlaydi. Faqat superadmin qo'sha/tahrirlay/faolsizlantira oladi (RLS bilan
// himoyalangan — sabablar_yozish policy).

function SabablarBolimi({ sabablar }) {
  const router = useRouter();
  const [matn, setMatn] = useState("");
  const [xato, setXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [tahrirId, setTahrirId] = useState(null);

  async function qoshish(e) {
    e.preventDefault();
    setXato("");
    if (!matn.trim()) return;
    setYuklanmoqda(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("sabablar").insert({ matn: matn.trim() });
    setYuklanmoqda(false);
    if (error) {
      setXato(error.message);
      return;
    }
    setMatn("");
    router.refresh();
  }

  async function faollikniOzgartirish(id, faol) {
    const supabase = supabaseBrowser();
    await supabase.from("sabablar").update({ faol: !faol }).eq("id", id);
    router.refresh();
  }

  async function saqlashTahrir(id, yangiMatn) {
    if (!yangiMatn.trim()) return;
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("sabablar").update({ matn: yangiMatn.trim() }).eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setTahrirId(null);
    router.refresh();
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={qoshish} className="card space-y-4 h-fit">
        <h2 className="font-semibold text-slate-800">Yangi sabab</h2>
        <p className="text-sm text-slate-500">
          Imtihon kunida talaba "Boshqa" natija bilan belgilanganda, Imtihon boshqaruvchisi shu
          ro'yxatdan sababni tanlaydi (masalan: "Hujjat muammosi", "Kasal bo'ldi" va h.k.).
        </p>
        <div>
          <label className="label">Sabab matni</label>
          <input className="input" value={matn} onChange={(e) => setMatn(e.target.value)} required />
        </div>
        {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{xato}</div>}
        <button className="btn-primary w-full" disabled={yuklanmoqda}>
          {yuklanmoqda ? "Qo'shilmoqda…" : "Qo'shish"}
        </button>
      </form>

      <div className="card">
        <h2 className="font-semibold text-slate-800 mb-4">Sabablar</h2>
        {sabablar.length === 0 ? (
          <p className="text-sm text-slate-400">Hozircha sabab yo'q.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {sabablar.map((s) =>
              tahrirId === s.id ? (
                <SababTahrirQatori
                  key={s.id}
                  sabab={s}
                  onBekor={() => setTahrirId(null)}
                  onSaqlash={(yangiMatn) => saqlashTahrir(s.id, yangiMatn)}
                />
              ) : (
                <li key={s.id} className="py-2.5 flex justify-between items-center text-sm gap-2">
                  <span className="font-medium text-slate-700">{s.matn}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setTahrirId(s.id)}
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      Tahrirlash
                    </button>
                    <button
                      onClick={() => faollikniOzgartirish(s.id, s.faol)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        s.faol ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {s.faol ? "Faol" : "Faolsiz"}
                    </button>
                  </span>
                </li>
              )
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

// ------------------------------- XAVFLI ZONA -------------------------------
// Superadmin uchun statistikani 0 ga tushirish (test ma'lumotlarini
// tozalash). Filiallar, o'qituvchilar va foydalanuvchi (login) ma'lumotlariga
// HECH QACHON tegilmaydi — faqat talabalar/imtihonlar/natijalar/guruhlar.

const TOZALASH_DARAJALARI = [
  {
    key: "natijalar",
    sarlavha: "Faqat imtihon natijalari",
    tavsif: "Barcha urinishlar/natijalar o'chadi. Talabalar ro'yxati saqlanadi (ularni qayta imtihonga biriktirish kerak bo'ladi).",
  },
  {
    key: "talaba_imtihon",
    sarlavha: "Talabalar + imtihonlar + natijalar",
    tavsif: "Talabalar, imtihon sessiyalari va natijalar to'liq o'chadi. Filiallar, o'qituvchilar va foydalanuvchi loginlari saqlanadi.",
  },
  {
    key: "toliq",
    sarlavha: "To'liq test reset",
    tavsif: "Yuqoridagilar + avtomatik yaratilgan guruhlar ham o'chadi. Faqat filiallar, o'qituvchilar va login ma'lumotlari qoladi.",
  },
];

const TASDIQ_MATNI = "TOZALASH";

function XavfliZonaBolimi() {
  const router = useRouter();
  const [daraja, setDaraja] = useState("natijalar");
  const [tasdiq, setTasdiq] = useState("");
  const [xato, setXato] = useState("");
  const [muvaffaqiyat, setMuvaffaqiyat] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  const tanlangan = TOZALASH_DARAJALARI.find((d) => d.key === daraja);
  const tasdiqTogri = tasdiq === TASDIQ_MATNI;

  async function tozalash() {
    setXato("");
    setMuvaffaqiyat("");
    if (!tasdiqTogri) return;
    if (
      !confirm(
        `Rostdan ham "${tanlangan.sarlavha}" bo'yicha tozlamoqchimisiz? Bu amalni ORTGA QAYTARIB BO'LMAYDI.`
      )
    ) {
      return;
    }
    setYuklanmoqda(true);
    const javob = await fetch("/api/tozalash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ daraja, tasdiq }),
    });
    const natija = await javob.json();
    setYuklanmoqda(false);
    if (!javob.ok) {
      setXato(natija.xato || "Xatolik yuz berdi");
      return;
    }
    setTasdiq("");
    setMuvaffaqiyat("Tozalandi — statistika 0 dan boshlanadi.");
    router.refresh();
  }

  return (
    <div className="card max-w-2xl border-2 border-rose-200 dark:border-rose-900/50">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">⚠️</span>
        <h2 className="font-semibold text-rose-700">Xavfli zona — ma'lumotlarni tozalash</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Statistikani 0 ga tushirish uchun ishlatiladi (masalan test ma'lumotlaridan keyin). Filiallar,
        o'qituvchilar va foydalanuvchi loginlariga HECH QACHON tegilmaydi. Bu amalni ortga qaytarib
        bo'lmaydi — ehtiyot bo'ling.
      </p>

      <div className="space-y-2 mb-4">
        {TOZALASH_DARAJALARI.map((d) => (
          <label
            key={d.key}
            className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition ${
              daraja === d.key
                ? "border-rose-400 bg-rose-50 dark:bg-rose-950/20"
                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            }`}
          >
            <input
              type="radio"
              name="tozalash-darajasi"
              className="mt-1"
              checked={daraja === d.key}
              onChange={() => {
                setDaraja(d.key);
                setMuvaffaqiyat("");
              }}
            />
            <span>
              <span className="block text-sm font-semibold text-slate-700">{d.sarlavha}</span>
              <span className="block text-xs text-slate-500 mt-0.5">{d.tavsif}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="mb-4">
        <label className="label">
          Tasdiqlash uchun <code className="text-rose-600 font-mono">{TASDIQ_MATNI}</code> deb yozing
        </label>
        <input
          className="input"
          value={tasdiq}
          onChange={(e) => setTasdiq(e.target.value)}
          placeholder={TASDIQ_MATNI}
        />
      </div>

      {xato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2 mb-3">{xato}</div>}
      {muvaffaqiyat && (
        <div className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2 mb-3">{muvaffaqiyat}</div>
      )}

      <button
        onClick={tozalash}
        disabled={!tasdiqTogri || yuklanmoqda}
        className="btn-danger w-full"
      >
        {yuklanmoqda ? "Tozalanmoqda…" : `Tozalash: ${tanlangan.sarlavha}`}
      </button>
    </div>
  );
}

function SababTahrirQatori({ sabab, onBekor, onSaqlash }) {
  const [matn, setMatn] = useState(sabab.matn);
  return (
    <li className="py-2.5">
      <div className="flex items-center gap-2">
        <input className="input" value={matn} onChange={(e) => setMatn(e.target.value)} autoFocus />
        <button
          onClick={() => onSaqlash(matn)}
          className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-brand-600 text-white shrink-0"
        >
          Saqlash
        </button>
        <button onClick={onBekor} className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 shrink-0">
          Bekor
        </button>
      </div>
    </li>
  );
}
