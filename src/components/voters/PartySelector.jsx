export default function PartySelector({ voter, onToggleParty, canEditParty = true }) {
  // Read-only presentation when user has no party editing rights (user or distributor)
  if (!canEditParty) {
    if (voter.is_ysrcp) return <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">YSRCP</span>
    if (voter.is_tdp) return <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">TDP</span>
    if (voter.is_jsp) return <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-800 border border-red-300">JSP</span>
    if (voter.is_other) return <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">Other</span>
    return <span className="text-slate-400 text-xs italic">Undecided</span>
  }

  const baseBtn = "flex-1 py-1.5 px-1 sm:px-2 rounded-lg text-[11px] font-bold border transition text-center shadow-2xs"

  return (
    <div className="flex items-center gap-1.5 w-full">
      {/* 1. isysrcp */}
      <button
        type="button"
        onClick={() => onToggleParty(voter, 'ysrcp')}
        className={`${baseBtn} ${
          voter.is_ysrcp 
            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' 
            : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
        }`}
        title="Toggle YSRCP"
      >
        YSRCP
      </button>

      {/* 2. isTDP */}
      <button
        type="button"
        onClick={() => onToggleParty(voter, 'tdp')}
        className={`${baseBtn} ${
          voter.is_tdp 
            ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs' 
            : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300'
        }`}
        title="Toggle TDP"
      >
        TDP
      </button>

      {/* 3. isJSP */}
      <button
        type="button"
        onClick={() => onToggleParty(voter, 'jsp')}
        className={`${baseBtn} ${
          voter.is_jsp 
            ? 'bg-red-600 text-white border-red-700 shadow-xs' 
            : 'bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
        }`}
        title="Toggle JSP"
      >
        JSP
      </button>

      {/* 4. other */}
      <button
        type="button"
        onClick={() => onToggleParty(voter, 'other')}
        className={`${baseBtn} ${
          voter.is_other 
            ? 'bg-purple-600 text-white border-purple-700 shadow-xs' 
            : 'bg-white text-slate-600 border-slate-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300'
        }`}
        title="Toggle Other"
      >
        other
      </button>
    </div>
  )
}
