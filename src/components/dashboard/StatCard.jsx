export default function StatCard({ label, value, hint, icon, valueClass }) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-slate-300 transition duration-150">
      <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 sm:mb-2">
        <span className="truncate mr-1">{label}</span>
        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
          {icon}
        </span>
      </div>
      <div className={`text-xl sm:text-3xl font-extrabold tracking-tight ${valueClass || 'text-slate-900'} my-0.5 sm:my-1 truncate`}>
        {value}
      </div>
      <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate mt-0.5 sm:mt-1">
        {hint}
      </div>
    </div>
  )
}
