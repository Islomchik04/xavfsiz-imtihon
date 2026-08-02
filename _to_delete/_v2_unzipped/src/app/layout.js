import "./globals.css";

export const metadata = {
  title: "Xavfsiz Imtihon",
  description: "Davlat imtihoni uchun talabalarni ro'yxatga olish va nazorat tizimi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
