export default function StatTile({ label, value, accent = "slate", sub }) {
  const accentMap = {
    slate: "text-slate-700 bg-slate-100",
    blue: "text-brand-700 bg-brand-100",
    emerald: "text-emerald-700 bg-emerald-100",
    rose: "text-rose-700 bg-rose-100",
    amber: "text-amber-700 bg-amber-100",
  };

  return (
    <div className="card">
      <div className={`inline-flex text-xs font-semibold rounded-full px-2.5 py-1 mb-3 ${accentMap[accent]}`}>
        {label}
      </div>
      <div className="text-3xl font-bold text-slate-800">{value}</div>
      {sub && <div className="text-sm text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}
