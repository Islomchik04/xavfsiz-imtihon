export default function Badge({ children, ton = "slate" }) {
  const tonlar = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-brand-100 text-brand-700",
  };
  return <span className={`badge ${tonlar[ton]}`}>{children}</span>;
}
