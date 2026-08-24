/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // @react-pdf/renderer (pdfkit/fontkit) o'zining standart shrift
    // fayllarini (Helvetica va h.k. uchun .afm) va yoga-layout WASM
    // modulini ishga tushirish vaqtida topadi — bularni webpack orqali
    // to'liq "bundle" qilish o'rniga paketni tashqi (external) deb
    // belgilaymiz, shunda Vercel'ning serverless funksiyasi haqiqiy
    // Node.js talab qilish (require) mexanizmidan foydalanadi.
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
    // Vercel deploy paytida faqat "kerakli" fayllarni funksiyaga
    // qo'shadi (file tracing) — pdfkit/fontkit ba'zi fayllarni
    // dinamik yo'l bilan o'qigani uchun bu jarayon ularni avtomatik
    // aniqlay olmasligi mumkin, shu sabab aniq ko'rsatib qo'yamiz.
    outputFileTracingIncludes: {
      "/api/imtihon-royxati-pdf": [
        "./node_modules/pdfkit/js/data/**/*",
        "./node_modules/@react-pdf/**/*",
        "./node_modules/fontkit/**/*",
        "./node_modules/yoga-layout/**/*",
        "./node_modules/brotli/**/*",
      ],
    },
  },
};

module.exports = nextConfig;
