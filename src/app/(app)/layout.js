import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import Navbar from "@/components/Navbar";

export default async function AppLayout({ children }) {
  const { profile } = await joriyFoydalanuvchi();

  return (
    <div className="min-h-screen">
      <Navbar profile={profile} />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
