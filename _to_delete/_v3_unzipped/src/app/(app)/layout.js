import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }) {
  const { profile } = await joriyFoydalanuvchi();

  return (
    <div className="min-h-screen">
      <Sidebar profile={profile} />
      <main className="lg:pl-64">
        <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
