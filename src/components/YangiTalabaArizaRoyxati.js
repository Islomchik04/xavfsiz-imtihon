"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/Badge";
import { IMTIHON_TURI, TOIFALAR } from "@/lib/constants";
import { telefonKorinishi } from "@/lib/telefon";
import { sanaKorinishi } from "@/lib/imtihonHisob";
import { supabaseBrowser } from "@/lib/supabase/client";
import ArizaRadEtishTugmasi from "@/components/ArizaRadEtishTugmasi";

// "Yangi talaba" orqali qo'shilgan, lekin hujjatchi hali hujjatini tayyor
// deb belgilamagan talabalar ro'yxati — jadval (kompyuter) va kartochka
// (telefon) ko'rinishida. Ikkalasi ham (Nazariy imtihon arizalari va
// Amaliy imtihon arizalari sahifalari) shu bir xil ko'rinishni ishlatadi,
// faqat qaysi imtihon_turi bilan filtrlanganiga qarab ro'yxat farq qiladi.
//
// radEtishRuxsat=true bo'lsa (Hujjatchi/Superadmin) — har bir qatorda
// "Rad etish" tugmasi ko'rsatiladi (sabablar ro'yxatidan sabab tanlab).
//
// ommaviyTasdiqRuxsat=true bo'lsa (Hujjatchi/Superadmin) — bir nechta
// talabani belgilab, ularning hujjatini birdaniga tasdiqlab, tanlangan
// imtihonga (imtihonchilar safiga) ommaviy biriktirish mumkin — xuddi
// har bir talaba sahifasidagi "Hujjatchi formasi"ning ommaviy versiyasi
// (hujjatga_tayyorlash RPC'si har bir talaba uchun alohida chaqiriladi,
// shuning uchun ba'zilari xato bersa ham — masalan qarzdorlik tufayli —
// qolganlari baribir muvaffaqiyatli bajariladi).
//
// ommaviyOchirishRuxsat=true bo'lsa (faqat Superadmin) — belgilangan
// talabalarni bazadan butunlay o'chirish mumkin (talaba sahifasidagi
// "Talabani o'chirish" tugmasining ommaviy versiyasi) — bu amalni
// orqaga qaytarib bo'lmaydi.
export default function YangiTalabaArizaRoyxati({
  royxat,
  error,
  sabablar = [],
  radEtishRuxsat = false,
  imtihonlar = [],
  ommaviyTasdiqRuxsat = false,
  ommaviyOchirishRuxsat = false,
}) {
  const router = useRouter();
  const belgilashRuxsat = ommaviyTasdiqRuxsat || ommaviyOchirishRuxsat;
  const [tanlangan, setTanlangan] = useState(new Set());
  const [panelOchiq, setPanelOchiq] = useState(false);
  const [imtihonId, setImtihonId] = useState("");
  const [izoh, setIzoh] = useState("");
  const [umumiyXato, setUmumiyXato] = useState("");
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [ochirishYuklanmoqda, setOchirishYuklanmoqda] = useState(false);
  const [natijalar, setNatijalar] = useState(null);

  const barchaTanlanganmi = royxat.length > 0 && royxat.every((t) => tanlangan.has(t.id));

  function bittaniAlmashtirish(id) {
    setNatijalar(null);
    setTanlangan((prev) => {
      const yangi = new Set(prev);
      if (yangi.has(id)) yangi.delete(id);
      else yangi.add(id);
      return yangi;
    });
  }

  function hammasiniAlmashtirish() {
    setNatijalar(null);
    setTanlangan((prev) => {
      if (royxat.length > 0 && royxat.every((t) => prev.has(t.id))) return new Set();
      return new Set(royxat.map((t) => t.id));
    });
  }

  function panelniOchish() {
    setUmumiyXato("");
    setNatijalar(null);
    setImtihonId("");
    setIzoh("");
    setPanelOchiq(true);
  }

  function panelniYopish() {
    setPanelOchiq(false);
    setUmumiyXato("");
  }

  async function ommaviyTasdiqlash() {
    if (!imtihonId) {
      setUmumiyXato("Imtihonni tanlang");
      return;
    }
    setUmumiyXato("");
    setYuklanmoqda(true);
    setNatijalar(null);

    const supabase = supabaseBrowser();
    const tanlanganlar = royxat.filter((t) => tanlangan.has(t.id));
    const natija = [];
    for (const t of tanlanganlar) {
      const { error: xato } = await supabase.rpc("hujjatga_tayyorlash", {
        p_talaba_id: t.id,
        p_imtihon_id: imtihonId,
        p_hujjat_forma_083: true,
        p_tasdiqnoma: true,
        p_imtihon_varaqasi: true,
        p_izoh: izoh.trim() || null,
      });
      natija.push({ id: t.id, ism_familya: t.ism_familya, ok: !xato, xato: xato?.message });
    }

    setYuklanmoqda(false);
    setNatijalar(natija);
    const muvaffaqiyatli = new Set(natija.filter((n) => n.ok).map((n) => n.id));
    if (muvaffaqiyatli.size > 0) {
      setTanlangan((prev) => {
        const yangi = new Set(prev);
        muvaffaqiyatli.forEach((id) => yangi.delete(id));
        return yangi;
      });
      router.refresh();
    }
  }

  async function ommaviyOchirish() {
    const tanlanganlar = royxat.filter((t) => tanlangan.has(t.id));
    const tasdiq = confirm(
      `${tanlanganlar.length} ta talabani butunlay o'chirmoqchimisiz?\n\nDIQQAT: bu talabalarning barcha imtihon urinishlari va tarixi ham birga o'chib ketadi. Bu amalni orqaga qaytarib bo'lmaydi.`
    );
    if (!tasdiq) return;

    setOchirishYuklanmoqda(true);
    setNatijalar(null);

    const supabase = supabaseBrowser();
    const natija = [];
    for (const t of tanlanganlar) {
      const { error: xato } = await supabase.from("talabalar").delete().eq("id", t.id);
      natija.push({ id: t.id, ism_familya: t.ism_familya, ok: !xato, xato: xato?.message });
    }

    setOchirishYuklanmoqda(false);
    setNatijalar(natija);
    const muvaffaqiyatli = new Set(natija.filter((n) => n.ok).map((n) => n.id));
    if (muvaffaqiyatli.size > 0) {
      setTanlangan((prev) => {
        const yangi = new Set(prev);
        muvaffaqiyatli.forEach((id) => yangi.delete(id));
        return yangi;
      });
      router.refresh();
    }
  }

  const tanlanganSoni = tanlangan.size;

  return (
    <>
      {error && <div className="card text-rose-600">Xatolik: {error.message}</div>}

      {belgilashRuxsat && tanlanganSoni > 0 && (
        <div className="card border border-brand-200 bg-brand-50/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-brand-800">
              {tanlanganSoni} ta talaba tanlandi
            </span>
            <div className="flex gap-2">
              {ommaviyTasdiqRuxsat && !panelOchiq && (
                <button
                  type="button"
                  className="btn-primary !py-1.5 !px-3 !text-sm"
                  disabled={ochirishYuklanmoqda}
                  onClick={panelniOchish}
                >
                  Imtihonga biriktirish
                </button>
              )}
              {ommaviyOchirishRuxsat && (
                <button
                  type="button"
                  className="btn !py-1.5 !px-3 !text-sm !text-rose-600 !border-rose-200 hover:!bg-rose-50"
                  disabled={ochirishYuklanmoqda || yuklanmoqda}
                  onClick={ommaviyOchirish}
                >
                  {ochirishYuklanmoqda ? "O'chirilmoqda…" : "🗑 O'chirish"}
                </button>
              )}
              <button
                type="button"
                className="btn !py-1.5 !px-3 !text-sm"
                disabled={ochirishYuklanmoqda}
                onClick={() => {
                  setTanlangan(new Set());
                  setPanelOchiq(false);
                  setNatijalar(null);
                }}
              >
                Tanlovni bekor qilish
              </button>
            </div>
          </div>

          {panelOchiq && (
            <div className="space-y-3 pt-1 border-t border-brand-100">
              {imtihonlar.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Hozircha yaratilgan imtihon yo'q. Avval Imtihonlar sahifasidan imtihon yarating.
                </p>
              ) : (
                <>
                  <div>
                    <label className="label">Imtihonga biriktirish</label>
                    <select className="input" value={imtihonId} onChange={(e) => setImtihonId(e.target.value)}>
                      <option value="">Tanlang</option>
                      {imtihonlar.map((i) => (
                        <option key={i.id} value={i.id}>
                          {sanaKorinishi(i.sana)} {i.izoh ? `— ${i.izoh}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-slate-500">
                    Tasdiqlash orqali tanlangan {tanlanganSoni} ta talabaning barchasida 083 forma, tasdiqnoma va
                    imtihon varaqasi mavjudligini tasdiqlaysiz va ularni bir vaqtda imtihonchilar safiga qo'shasiz.
                  </p>
                  <div>
                    <label className="label">Izoh (ixtiyoriy, barchasiga bir xil qo'llanadi)</label>
                    <textarea className="input" rows={2} value={izoh} onChange={(e) => setIzoh(e.target.value)} />
                  </div>
                  {umumiyXato && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{umumiyXato}</div>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-success flex-1"
                      disabled={yuklanmoqda}
                      onClick={ommaviyTasdiqlash}
                    >
                      {yuklanmoqda ? "Bajarilmoqda…" : `${tanlanganSoni} ta talabani tasdiqlash`}
                    </button>
                    <button type="button" className="btn" disabled={yuklanmoqda} onClick={panelniYopish}>
                      Yopish
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {natijalar && (
            <div className="space-y-1 pt-2 border-t border-brand-100">
              <p className="text-xs font-medium text-slate-600">
                Natija: {natijalar.filter((n) => n.ok).length}/{natijalar.length} muvaffaqiyatli
              </p>
              {natijalar
                .filter((n) => !n.ok)
                .map((n) => (
                  <div key={n.id} className="text-xs text-rose-600">
                    ❌ {n.ism_familya}: {n.xato}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100">
              {belgilashRuxsat && (
                <th className="pb-2 font-medium w-8">
                  <input type="checkbox" checked={barchaTanlanganmi} onChange={hammasiniAlmashtirish} />
                </th>
              )}
              <th className="pb-2 font-medium">Ism familya</th>
              <th className="pb-2 font-medium">Telefon</th>
              <th className="pb-2 font-medium">Toifa</th>
              <th className="pb-2 font-medium">Filial / Guruh</th>
              <th className="pb-2 font-medium">Imtihon turi</th>
              <th className="pb-2 font-medium">So'ralgan imtihon</th>
              <th className="pb-2 font-medium">Yuborgan</th>
              <th className="pb-2 font-medium">Sana</th>
              {radEtishRuxsat && <th className="pb-2 font-medium">Amal</th>}
            </tr>
          </thead>
          <tbody>
            {royxat.map((t) => (
              <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                {belgilashRuxsat && (
                  <td className="py-2.5">
                    <input type="checkbox" checked={tanlangan.has(t.id)} onChange={() => bittaniAlmashtirish(t.id)} />
                  </td>
                )}
                <td className="py-2.5">
                  <Link href={`/talabalar/${t.id}`} className="font-medium text-brand-700 hover:underline">
                    {t.ism_familya}
                  </Link>
                  {t.intalim_id && <div className="text-xs text-slate-400">ID: {t.intalim_id}</div>}
                </td>
                <td className="py-2.5 text-slate-500">
                  {t.telefon ? (
                    <a href={`tel:+998${t.telefon}`} className="text-brand-600 hover:underline">
                      +998 {telefonKorinishi(t.telefon)}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2.5">
                  <span className="badge bg-slate-100 text-slate-600">{TOIFALAR[t.toifa] || "—"}</span>
                </td>
                <td className="py-2.5 text-slate-500">
                  {t.filiallar?.nomi} / {t.guruhlar?.nomi}
                </td>
                <td className="py-2.5 text-slate-500">{IMTIHON_TURI[t.imtihon_turi]}</td>
                <td className="py-2.5 text-slate-500">
                  {t.istalgan_imtihon ? (
                    <span className="badge bg-brand-50 text-brand-700">
                      {sanaKorinishi(t.istalgan_imtihon.sana)}
                      {t.istalgan_imtihon.izoh ? ` — ${t.istalgan_imtihon.izoh}` : ""}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2.5 text-slate-500">{t.qoshgan_profil?.ism_familya || "—"}</td>
                <td className="py-2.5 text-slate-400 text-xs">
                  {new Date(t.created_at).toLocaleDateString("uz-UZ")}
                </td>
                {radEtishRuxsat && (
                  <td className="py-2.5">
                    <ArizaRadEtishTugmasi talabaId={t.id} sabablar={sabablar} />
                  </td>
                )}
              </tr>
            ))}
            {royxat.length === 0 && !error && (
              <tr>
                <td
                  colSpan={(belgilashRuxsat ? 1 : 0) + (radEtishRuxsat ? 9 : 8)}
                  className="py-8 text-center text-slate-400"
                >
                  Hozircha ariza yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3 xi-stagger">
        {royxat.length === 0 && !error && (
          <div className="card text-center text-slate-400">Hozircha ariza yo'q</div>
        )}
        {belgilashRuxsat && royxat.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-slate-500 px-1">
            <input type="checkbox" checked={barchaTanlanganmi} onChange={hammasiniAlmashtirish} />
            Hammasini tanlash
          </label>
        )}
        {royxat.map((t) => (
          <div key={t.id} className="card active:scale-[0.98] transition-transform">
            {belgilashRuxsat && (
              <label className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                <input type="checkbox" checked={tanlangan.has(t.id)} onChange={() => bittaniAlmashtirish(t.id)} />
                Tanlash
              </label>
            )}
            <Link href={`/talabalar/${t.id}`} className="block">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-semibold text-brand-700">{t.ism_familya}</div>
                  {t.intalim_id && <div className="text-xs text-slate-400">ID: {t.intalim_id}</div>}
                </div>
                <Badge ton="amber">Hujjat kutilmoqda</Badge>
              </div>
              <div className="text-xs text-slate-400 mb-2">
                {TOIFALAR[t.toifa] || "—"} · {t.filiallar?.nomi} / {t.guruhlar?.nomi} · {IMTIHON_TURI[t.imtihon_turi]}
              </div>
              {t.telefon && (
                <div className="text-xs text-slate-500 mb-2">📞 +998 {telefonKorinishi(t.telefon)}</div>
              )}
              {t.istalgan_imtihon && (
                <div className="text-xs text-brand-700 mb-2">
                  🗓️ So'ralgan imtihon: {sanaKorinishi(t.istalgan_imtihon.sana)}
                  {t.istalgan_imtihon.izoh ? ` — ${t.istalgan_imtihon.izoh}` : ""}
                </div>
              )}
              <div className="text-xs text-slate-400">
                Yuborgan: {t.qoshgan_profil?.ism_familya || "—"} · {new Date(t.created_at).toLocaleDateString("uz-UZ")}
              </div>
            </Link>
            {radEtishRuxsat && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <ArizaRadEtishTugmasi talabaId={t.id} sabablar={sabablar} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
