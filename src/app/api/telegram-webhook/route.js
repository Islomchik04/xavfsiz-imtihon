import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { telefonNormallash, telefonKorinishi } from "@/lib/telefon";

// Telegram bot webhook — domlalar "erkin/mustaqil o'quvchi" (o'zi imtihon
// topshirgan, lekin domlaning oldiga maslahatga kelgan) uchun rasm + ma'lumot
// yuboradi. Bu yerda:
//   1) Domla /start bosganda yoki telefon raqamini ulashganda —
//      oqituvchilar jadvalidagi telefon bilan solishtirib bog'laymiz.
//   2) Bog'langan domla rasm (+ izoh) yuborsa — erkin_talaba_arizalari
//      jadvaliga "kutilmoqda" holatida yozamiz (Hujjatchi/Superadmin keyin
//      Arizalar sahifasida ko'rib chiqadi).
//
// DIQQAT: bu route service_role kalit bilan ishlaydi (supabaseAdmin) —
// login qilinmagan Telegram foydalanuvchisi to'g'ridan-to'g'ri yozadi,
// shuning uchun so'rov haqiqatan ham Telegram'dan kelayotganini
// TELEGRAM_WEBHOOK_SECRET orqali tekshiramiz (Telegram setWebhook'da
// secret_token sifatida bir xil qiymat ko'rsatilishi kerak).

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BAZA = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function xabarYuborish(chatId, matn) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${API_BAZA}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: matn }),
    });
  } catch {
    // Xabar yubora olmasak ham — asosiy oqim (ariza saqlash) davom etishi kerak.
  }
}

// Xabar matnidan (caption) ism-familya / telefon / urinish raqamini
// ajratishga harakat qiladi. Domla erkin formatda yozishi mumkin — bu
// "eng yaxshi urinish" tarzida ishlaydi, aniq ajratib bo'lmasa ham butun
// matn "izoh" sifatida saqlanadi va Hujjatchi qo'lda o'qib qaror qiladi.
function keracakMalumotAjratish(matn) {
  const xom = String(matn || "").trim();
  const qatorlar = xom.split(/\n|,/).map((s) => s.trim()).filter(Boolean);

  const telefonMos = xom.match(/(\+?\d[\d\s-]{7,}\d)/);
  const telefon = telefonMos ? telefonNormallash(telefonMos[1]) : null;

  const urinishMos = xom.match(/(\d+)\s*-?\s*urinish/i);
  const urinishRaqami = urinishMos ? parseInt(urinishMos[1], 10) : null;

  // Ism sifatida — telefon/urinish haqidagi qatorlar bo'lmagan birinchi qator.
  const ismQatori = qatorlar.find(
    (q) => !/\d+\s*-?\s*urinish/i.test(q) && !/^\+?\d[\d\s-]{7,}\d$/.test(q)
  );

  return {
    ismFamilya: ismQatori || xom.slice(0, 120) || "Noma'lum",
    telefon,
    urinishRaqami,
  };
}

export async function POST(so_rov) {
  // Telegram'dan kelayotganini tasdiqlash
  if (process.env.TELEGRAM_WEBHOOK_SECRET) {
    const kelganMaxfiy = so_rov.headers.get("x-telegram-bot-api-secret-token");
    if (kelganMaxfiy !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }
  if (!BOT_TOKEN) {
    return NextResponse.json({ ok: false, xato: "TELEGRAM_BOT_TOKEN sozlanmagan" }, { status: 500 });
  }

  let yangilanish;
  try {
    yangilanish = await so_rov.json();
  } catch {
    return NextResponse.json({ ok: true }); // noto'g'ri so'rov — Telegram qayta urinmasin
  }

  const xabar = yangilanish?.message;
  if (!xabar) return NextResponse.json({ ok: true });

  const chatId = xabar.chat?.id;
  const admin = supabaseAdmin();

  // --- /start yoki oddiy matn ---------------------------------------------
  if (xabar.text?.startsWith("/start")) {
    await xabarYuborish(
      chatId,
      "Assalomu alaykum! Bu bot orqali mustaqil (o'zi imtihon topshirgan) o'quvchingiz uchun KPI so'rovi yuborishingiz mumkin.\n\n" +
        "1) Avval pastdagi 📞 tugma orqali telefon raqamingizni yuboring — tizimdagi o'qituvchi profilingiz bilan bog'laymiz.\n" +
        "2) Bog'langandan so'ng, o'quvchining rasmini (izohga ism-familyasi, telefoni va nechinchi urinishda o'tgani bilan) yuboring."
    );
    return NextResponse.json({ ok: true });
  }

  // --- Telefon ulashildi (bog'lash) ---------------------------------------
  if (xabar.contact?.phone_number) {
    const telefon = telefonNormallash(xabar.contact.phone_number);
    const { data: oqituvchi } = await admin
      .from("oqituvchilar")
      .select("id, ism_familya")
      .eq("telefon", telefon)
      .eq("faol", true)
      .maybeSingle();

    if (!oqituvchi) {
      await xabarYuborish(
        chatId,
        `Kechirasiz, +998 ${telefonKorinishi(telefon)} raqami tizimda topilmadi. Superadmindan Sozlamalar → O'qituvchilar bo'limida shu raqamni kiritishini so'rang.`
      );
      return NextResponse.json({ ok: true });
    }

    await admin.from("oqituvchilar").update({ telegram_chat_id: chatId }).eq("id", oqituvchi.id);
    await xabarYuborish(
      chatId,
      `✅ Bog'landi! Siz — ${oqituvchi.ism_familya}. Endi o'quvchi rasmini (izohga ism-familya, telefon, nechinchi urinishda o'tgani bilan) yuborishingiz mumkin.`
    );
    return NextResponse.json({ ok: true });
  }

  // --- Rasm yuborildi (ariza) ----------------------------------------------
  if (xabar.photo?.length > 0) {
    const { data: oqituvchi } = await admin
      .from("oqituvchilar")
      .select("id, ism_familya")
      .eq("telegram_chat_id", chatId)
      .maybeSingle();

    if (!oqituvchi) {
      await xabarYuborish(
        chatId,
        "Avval telefon raqamingizni yuborib bog'lanishingiz kerak. /start bosing."
      );
      return NextResponse.json({ ok: true });
    }

    const eng_katta = xabar.photo[xabar.photo.length - 1]; // Telegram eng kichikdan kattaga saralaydi
    const { ismFamilya, telefon, urinishRaqami } = keracakMalumotAjratish(xabar.caption);

    let rasmYoli = null;
    try {
      const faylJavobi = await fetch(`${API_BAZA}/getFile?file_id=${eng_katta.file_id}`).then((r) => r.json());
      const faylYoli = faylJavobi?.result?.file_path;
      if (faylYoli) {
        const faylData = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${faylYoli}`);
        const buffer = Buffer.from(await faylData.arrayBuffer());
        const kengaytma = faylYoli.split(".").pop() || "jpg";
        rasmYoli = `${oqituvchi.id}/${Date.now()}.${kengaytma}`;
        await admin.storage.from("erkin-fotolar").upload(rasmYoli, buffer, {
          contentType: faylData.headers.get("content-type") || "image/jpeg",
        });
      }
    } catch {
      rasmYoli = null; // rasm saqlanmasa ham arizani (izoh bilan) yaratamiz
    }

    const { error: xato } = await admin.from("erkin_talaba_arizalari").insert({
      oqituvchi_id: oqituvchi.id,
      ism_familya: ismFamilya,
      telefon,
      urinish_raqami: urinishRaqami,
      rasm_yoli: rasmYoli,
      izoh: xabar.caption || null,
      telegram_chat_id: chatId,
      telegram_message_id: xabar.message_id,
    });

    if (xato) {
      await xabarYuborish(chatId, "Xatolik yuz berdi, arizangiz saqlanmadi. Qayta urinib ko'ring.");
    } else {
      await xabarYuborish(chatId, `✅ Qabul qilindi — "${ismFamilya}" uchun so'rov ko'rib chiqilmoqda.`);
    }
    return NextResponse.json({ ok: true });
  }

  // --- Boshqa matn (rasm kutilmoqda) ---------------------------------------
  await xabarYuborish(chatId, "Iltimos, o'quvchining rasmini (izoh bilan) yuboring.");
  return NextResponse.json({ ok: true });
}
