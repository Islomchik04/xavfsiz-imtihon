# Xavfsiz Imtihon

Davlat (GAI/YHXX) nazariy va amaliy imtihoniga boradigan o'quvchilarni ro'yxatga
olish, hujjatlarini nazorat qilish va imtihon kunida natijasini (o'tdi/o'tmadi)
belgilab boradigan tizim. Har bir nazariy va amaliy o'qituvchining nechta
o'quvchisi imtihondan o'tgani statistikada ko'rinadi.

Texnologiyalar: **Next.js 14** (App Router, JavaScript) + **Supabase**
(Postgres + Auth + Row Level Security) + **Tailwind CSS**. Deploy: **GitHub +
Vercel**.

Loyiha kodi to'liq yozilgan va **haqiqiy `npm install` + `npm run build` bilan
sinovdan o'tkazilgan** (build muvaffaqiyatli, xatosiz). Ishga tushirish uchun
quyidagi qadamlarni ketma-ket bajaring.

---

## 1. Tizim qanday ishlaydi (jarayon)

Har bir talabaning yo'li 3 bosqichdan o'tadi:

1. **Admin** (filial xodimi) talabani ro'yxatga oladi: ism familya, guruh,
   083 forma bor/yo'q, imtihon turi (nazariy / amaliy / ikkalasi bir kunda),
   nazariy va/yoki amaliy o'qituvchi.
2. **Hujjatchi** (imtihon hujjatini tayyorlovchi) ma'lumotni tekshiradi va
   to'ldiradi: 083 forma tasdig'i, tasdiqnoma bor/yo'q, imtihon varaqasi
   bor/yo'q, imtihon sanasi. Shundan so'ng talaba "Imtihonchilar safiga"
   qo'shiladi (hujjat tayyor holatiga o'tadi).
3. **Imtihonchi** imtihon kunida planshet orqali ism familyani qidirib,
   natijani (O'TDI / O'TMADI) — nazariy va amaliyni alohida — belgilaydi.

**Superadmin** — Sozlamalar bo'limida foydalanuvchi (Admin/Hujjatchi/
Imtihonchi), filial, guruh, nazariy/amaliy o'qituvchi qo'shadi.

Har bir bosqichda kim nimani o'zgartira olishi bazada (Postgres RLS + trigger)
orqali qat'iy nazorat qilinadi — frontend kodini chetlab o'tib ham buzib
bo'lmaydi.

**Filiallar bo'yicha ko'rinish:** Admin faqat o'z filialining talabalarini
ko'radi va qo'shadi. Hujjatchi, Imtihonchi va Superadmin barcha filiallarni
ko'radi. Statistika sahifasida filial va o'qituvchi bo'yicha (necha talaba,
nechtasi o'tgan, foizi) jadval bor.

**Login:** telefon raqam (`91 234 56 78` shaklida) + parol. Loginlarni faqat
Superadmin beradi (Sozlamalar bo'limidan).

---

## 2. Supabase loyihasini yaratish

1. https://supabase.com — ro'yxatdan o'ting, **New Project** yarating
   (nomi: masalan `xavfsiz-imtihon`, parolni saqlab qo'ying).
2. Loyiha tayyor bo'lgach: **SQL Editor** bo'limiga o'ting.
3. `supabase/migrations/0001_init.sql` faylining **butun mazmunini** nusxalab,
   SQL Editor'ga joylashtiring va **Run** bosing. Bu barcha jadval, huquq
   (RLS) va tekshiruv qoidalarini (trigger) yaratadi. Xato chiqmasligi
   kerak — agar chiqsa, xabarni menga yuboring.
4. **Project Settings → API** bo'limiga o'ting va quyidagilarni nusxalab
   oling (keyingi bosqichda kerak bo'ladi):
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` kalit → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` kalit → `SUPABASE_SERVICE_ROLE_KEY` (**MAXFIY**, hech
     kimga bermang, GitHub'ga committ qilmang)

---

## 3. Birinchi Superadmin'ni yaratish

Tizimga birinchi kirish uchun kamida bitta Superadmin kerak, lekin
Superadmin'ni faqat Superadmin qo'sha oladi — shu "tuxum-tovuq" muammosini
bir martalik qo'lda ishlash bilan hal qilamiz:

1. Supabase Dashboard → **Authentication → Users → Add user**.
   - Email: `<telefon>@xavfsizimtihon.local` — masalan telefon
     `91 234 56 78` bo'lsa email `912345678@xavfsizimtihon.local`
     (agar `.env`da `NEXT_PUBLIC_AUTH_PHONE_DOMAIN`ni o'zgartirsangiz, shu
     domenni ishlating).
   - Password: xohlagan parolingiz (buni birinchi kirishda ishlatasiz).
   - **Auto Confirm User**ni albatta belgilang.
2. **SQL Editor**da quyidagini ishga tushiring (yuqoridagi email bilan
   yaratilgan foydalanuvchining UUID'sini `Authentication → Users`
   ro'yxatidan nusxalab oling):

   ```sql
   insert into profiles (id, telefon, ism_familya, role, filial_id)
   values (
     '<Users bo'limidan nusxalangan UUID>',
     '912345678',              -- telefon (faqat 9 xonali, boshida 0 yo'q)
     'Ism Familya',
     'superadmin',
     null
   );
   ```

3. Tayyor — endi tizimga shu telefon (`91 234 56 78`) va parol bilan kirish
   mumkin. Boshqa barcha foydalanuvchilarni (Admin/Hujjatchi/Imtihonchi)
   keyinchalik shu Superadmin **Sozlamalar** bo'limidan qo'shadi — qo'lda SQL
   yozish shart emas.

---

## 4. Lokal kompyuterda ishga tushirish (ixtiyoriy, tekshirish uchun)

```bash
npm install
cp .env.example .env.local
# .env.local faylini oching va 2-bosqichdagi 3 ta qiymatni joylashtiring
npm run dev
```

Brauzerda `http://localhost:3000` oching.

---

## 5. GitHub'ga yuklash

```bash
git init
git add .
git commit -m "Xavfsiz Imtihon — boshlang'ich versiya"
```

GitHub'da yangi (bo'sh) repository yarating, so'ng:

```bash
git remote add origin https://github.com/<foydalanuvchi-nomi>/xavfsiz-imtihon.git
git branch -M main
git push -u origin main
```

`.env.local` fayli `.gitignore`da bo'lgani uchun GitHub'ga yuklanmaydi —
maxfiy kalitlar xavfsiz qoladi.

---

## 6. Vercel'ga deploy qilish

1. https://vercel.com — GitHub akkountingiz bilan kiring.
2. **Add New → Project** → yuqorida yaratgan `xavfsiz-imtihon`
   repository'ni tanlang → **Import**.
3. **Environment Variables** bo'limida 3 ta qiymatni qo'shing (2-bosqichdan):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - (ixtiyoriy) `NEXT_PUBLIC_AUTH_PHONE_DOMAIN` — agar standart
     `xavfsizimtihon.local`dan farqli nom xohlasangiz.
4. **Deploy** bosing. 1-2 daqiqada tayyor bo'ladi va sizga `.vercel.app`
   manzili beriladi. Xohlasangiz keyinroq **Settings → Domains**dan o'z
   domeningizni (masalan `imtihon.xavfsizhaydovchi.uz`) ulashingiz mumkin.

Har safar GitHub'dagi `main` branchga o'zgarish push qilinganda, Vercel
avtomatik qayta deploy qiladi.

---

## 7. Birinchi marta ishga tushirilgach nima qilish kerak

Superadmin sifatida kirib, **Sozlamalar** bo'limida ketma-ket to'ldiring
(tartib muhim — Filiallar birinchi, chunki qolganlari shunga bog'liq):

1. **Filiallar** — barcha filiallaringiz nomini kiriting.
2. **Guruhlar** — har bir filial uchun guruh nomlarini kiriting.
3. **O'qituvchilar** — har bir filial uchun nazariy va amaliy
   o'qituvchilarni alohida-alohida kiriting (turi: Nazariy / Amaliy).
4. **Foydalanuvchilar** — har bir filial uchun Admin, va markaziy
   Hujjatchi(lar)/Imtihonchi(lar) uchun login (telefon+parol) yarating.

Shundan so'ng Adminlar talaba qo'sha boshlashi, Hujjatchi hujjatlarni
tayyorlashi, Imtihonchi esa imtihon kunida natija belgilashi mumkin.

---

## 8. Loyiha tuzilishi

```
supabase/migrations/0001_init.sql   — bazaning to'liq sxemasi (jadval, RLS, trigger)
src/lib/supabase/                   — Supabase klientlar (browser/server/middleware)
src/lib/telefon.js                  — telefon <-> ichki email mosligi
src/lib/constants.js                — rol, imtihon turi, natija nomlari
src/lib/statistika.js               — dashboard uchun hisob-kitob funksiyalari
src/app/login/                      — kirish sahifasi
src/app/(app)/dashboard/            — statistika
src/app/(app)/talabalar/            — talabalar ro'yxati, yangi qo'shish, detail
src/app/(app)/imtihon/              — imtihon kunidagi tezkor qidiruv (planshet uchun)
src/app/(app)/sozlamalar/           — Superadmin: foydalanuvchi/filial/guruh/o'qituvchi
src/app/api/create-user/            — yangi foydalanuvchi yaratish (service_role)
```

## 9. Xavfsizlik haqida qisqacha

- Har bir rol nimani o'zgartira olishi ikki qatlamda nazorat qilinadi:
  Postgres RLS (qaysi qatorni ko'rish/yozish mumkin) + trigger (qaysi
  ustunni o'zgartirish mumkin). Masalan Admin hujjat tayyor bo'lgach talaba
  ma'lumotini o'zgartira olmaydi; Imtihonchi hujjat tayyor bo'lmagan
  talabaning natijasini belgilay olmaydi.
- `SUPABASE_SERVICE_ROLE_KEY` — bu kalit RLS'ni to'liq chetlab o'tadi. Faqat
  `/api/create-user` route'ida, faqat serverda ishlatiladi va hech qachon
  brauzerga chiqarilmaydi. Buni hech kimga bermang.
- Ichki xodimlar tizimi bo'lgani uchun barcha login qilgan foydalanuvchilar
  bir-birining ism-familya/rolini ko'ra oladi (kim ro'yxatga oldi, kim
  hujjatni tayyorladi kabi ma'lumotlar shuning uchun ko'rinadi) — bu
  qasddan shunday qilingan, maxfiy shaxsiy ma'lumot emas.

## 10. Kelajakda qo'shsa bo'ladigan funksiyalar

Bular hozirgi versiyada yo'q, lekin fundament tayyor — keyingi safar birga
qo'shishimiz mumkin:

- Tasdiqnoma / imtihon varaqasi rasmini (fayl) yuklash (hozircha faqat
  "bor/yo'q" belgisi).
- Excel/PDF hisobot eksporti.
- Imtihon kunida SMS/Telegram orqali natija haqida avtomatik xabar.
- Talabalar ro'yxatida sahifalash (pagination) — hozir oxirgi 300 tasi
  ko'rsatiladi, filial/guruh soni juda ko'payib ketsa kerak bo'ladi.
- Guruh → instruktor avtomatik bog'lanishi (hozir har bir talabaga nazariy
  va amaliy o'qituvchi alohida tanlanadi).

## 11. Muammo yuzaga kelsa

Agar biror joyda xatolik chiqsa yoki funksiya kutilganidek ishlamasa, xato
matnini (yoki skrinshotni) menga yuboring — birga tuzataman.
