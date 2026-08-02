import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "Xavfsiz Imtihon",
  description: "Davlat imtihoni uchun talabalarni ro'yxatga olish va nazorat tizimi",
};

// Sahifa chizilishidan OLDIN saqlangan tema (localStorage) qo'llanadi —
// aks holda bir lahza noto'g'ri (kunduzgi) rang ko'rinib, keyin "sakrab"
// tungi rejimga o'tib qolishi mumkin (FOUC).
const TEMA_SKRIPT = `
try {
  var t = localStorage.getItem('xavfsiz-imtihon-tema');
  if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'tungi' : 'kunduzgi';
  if (t === 'tungi') document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <head>
        <link rel="icon" href="/logo.png" />
        <script dangerouslySetInnerHTML={{ __html: TEMA_SKRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
