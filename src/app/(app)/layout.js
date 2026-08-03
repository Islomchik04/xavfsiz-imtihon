import { joriyFoydalanuvchi } from "@/lib/joriyFoydalanuvchi";
import Sidebar from "@/components/Sidebar";
import PageTransition from "@/components/PageTransition";

export default async function AppLayout({ children }) {
  const { profile } = await joriyFoydalanuvchi();

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Dekorativ fon "blob"lari — faqat vizual, kontentga ta'sir qilmaydi */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="xi-blob w-[28rem] h-[28rem] bg-brand-300 -top-32 -left-24" />
        <div
          className="xi-blob w-[24rem] h-[24rem] bg-emerald-200 top-1/3 -right-24"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="xi-blob w-[22rem] h-[22rem] bg-violet-200 bottom-0 left-1/4"
          style={{ animationDelay: "-11s" }}
        />
      </div>

      <Sidebar profile={profile} />

      <main className="md:pl-20 lg:pl-64 transition-[padding] duration-300">
        <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8 xi-mobil-pastki-bosh md:pb-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
