import { useState } from 'react'
import { PieChart, BarChart2, CircleDot } from 'lucide-react'

// Mini circular radial progress gauge for individual party cards
function MiniRoundGauge({ pct, color, size = 44 }) {
  const r = 16
  const C = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * C

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} stroke="#f1f5f9" strokeWidth="4" fill="none" />
        <circle
          cx="20"
          cy="20"
          r={r}
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${C - dash}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-extrabold text-slate-800">
        {pct}%
      </span>
    </div>
  )
}

// Master Round Type Circular Donut Progress Chart
function RoundPartyChart({ stats, percentages }) {
  const { totalVoters, ysrcp, tdp, jsp, other, undecided } = stats
  const { ysrcpPct, tdpPct, jspPct, otherPct, undecidedPct } = percentages

  const r = 40
  const C = 2 * Math.PI * r // 251.327

  const segments = [
    { id: 'ysrcp', label: 'isysrcp', count: ysrcp, pct: ysrcpPct, color: '#10b981' }, // Emerald-500
    { id: 'tdp', label: 'isTDP', count: tdp, pct: tdpPct, color: '#f59e0b' },        // Amber-500
    { id: 'jsp', label: 'isJSP', count: jsp, pct: jspPct, color: '#ef4444' },        // Red-500
    { id: 'other', label: 'other', count: other, pct: otherPct, color: '#a855f7' },   // Purple-500
    { id: 'undecided', label: 'Undecided', count: undecided, pct: undecidedPct, color: '#cbd5e1' } // Slate-300
  ]

  let accumulated = 0
  const decidedPct = Math.max(0, 100 - undecidedPct)

  return (
    <div className="relative w-48 h-48 sm:w-60 sm:h-60 mx-auto flex items-center justify-center shrink-0">
      <svg className="w-full h-full -rotate-90 transform drop-shadow-xs" viewBox="0 0 100 100">
        {/* Background Track Ring */}
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke="#f1f5f9"
          strokeWidth="11"
          fill="none"
        />

        {/* Dynamic Party Segment Arcs */}
        {segments.map((seg) => {
          if (seg.pct <= 0) return null
          const dash = (seg.pct / 100) * C
          const offset = -accumulated
          accumulated += dash

          return (
            <circle
              key={seg.id}
              cx="50"
              cy="50"
              r={r}
              stroke={seg.color}
              strokeWidth="11"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={offset}
              strokeLinecap={seg.pct >= 95 ? 'square' : 'round'}
              fill="none"
              className="transition-all duration-700 ease-out hover:stroke-[13] cursor-pointer"
            >
              <title>{`${seg.label}: ${seg.count} voters (${seg.pct}%)`}</title>
            </circle>
          )
        })}
      </svg>

      {/* Center Informational Badge */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
          Total Voters
        </span>
        <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none my-1 tracking-tight">
          {totalVoters || (ysrcp + tdp + jsp + other + undecided)}
        </span>
        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
          {decidedPct}% Decided
        </span>
      </div>
    </div>
  )
}

export default function PartyProgressBar({ stats, percentages }) {
  const [chartType, setChartType] = useState('round') // 'round' (Default) | 'bar' | 'both'
  const { ysrcp, tdp, jsp, other, undecided } = stats
  const { ysrcpPct, tdpPct, jspPct, otherPct, undecidedPct } = percentages

  const partyList = [
    { id: 'ysrcp', label: 'isysrcp', count: ysrcp, pct: ysrcpPct, color: '#10b981', bg: 'bg-emerald-500', lightBg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    { id: 'tdp', label: 'isTDP', count: tdp, pct: tdpPct, color: '#f59e0b', bg: 'bg-amber-400', lightBg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
    { id: 'jsp', label: 'isJSP', count: jsp, pct: jspPct, color: '#ef4444', bg: 'bg-red-500', lightBg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    { id: 'other', label: 'other', count: other, pct: otherPct, color: '#a855f7', bg: 'bg-purple-500', lightBg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
    { id: 'undecided', label: 'Undecided', count: undecided, pct: undecidedPct, color: '#94a3b8', bg: 'bg-slate-400', lightBg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600' }
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
      {/* Panel Header & Round / Bar Type Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 m-0">Party Support Breakdown</h3>
          </div>
        </div>

        {/* View Switcher: Round Type vs Bar Type (Scrollable on small mobile screens) */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setChartType('round')}
            className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition ${
              chartType === 'round'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Round Type Circular Gauge"
          >
            <CircleDot size={13} /> Round Type
          </button>
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition ${
              chartType === 'bar'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Horizontal Progress Bar"
          >
            <BarChart2 size={13} /> Bar Type
          </button>
          <button
            type="button"
            onClick={() => setChartType('both')}
            className={`whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition ${
              chartType === 'both'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Show Both Visualizations"
          >
            <PieChart size={13} /> Both
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className={`grid gap-6 items-center ${chartType === 'bar' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
        {/* Round Type Circular Donut Ring */}
        {(chartType === 'round' || chartType === 'both') && (
          <div className={`${chartType === 'both' ? 'lg:col-span-5' : 'lg:col-span-5'} flex flex-col items-center justify-center p-4 bg-slate-50/60 rounded-2xl border border-slate-100`}>
            <RoundPartyChart stats={stats} percentages={percentages} />
            <span className="text-[11px] font-semibold text-slate-500 mt-3 flex items-center gap-1">
              <CircleDot size={13} className="text-blue-600" />
              Round Type Multi-Segment Ring
            </span>
          </div>
        )}

        {/* Detailed Party Cards & Mini Round Gauges */}
        <div className={`${chartType === 'bar' ? 'w-full' : 'lg:col-span-7'} space-y-3`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {partyList.map(item => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-3.5 h-3.5 rounded-full ${item.bg} shrink-0 shadow-2xs`} />
                  <div className="min-w-0">
                    <b className="text-xs font-bold text-slate-900 block truncate">{item.label}</b>
                    <span className="text-[11px] text-slate-500">
                      <b className="text-slate-800">{item.count}</b> voters
                    </span>
                  </div>
                </div>

                {/* Individual Round Mini Progress Ring */}
                <MiniRoundGauge pct={item.pct} color={item.color} />
              </div>
            ))}
          </div>

          {/* Linear Stacked Progress Bar (Visible in 'bar' and 'both' modes, or as summary in round mode) */}
          {(chartType === 'bar' || chartType === 'both') && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Stacked Linear Distribution</span>
                <span>{100 - undecidedPct}% Decided Support</span>
              </div>
              <div className="flex h-3.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${ysrcpPct}%` }} title={`isysrcp: ${ysrcp} (${ysrcpPct}%)`} />
                <div className="bg-amber-400 transition-all duration-700" style={{ width: `${tdpPct}%` }} title={`isTDP: ${tdp} (${tdpPct}%)`} />
                <div className="bg-red-500 transition-all duration-700" style={{ width: `${jspPct}%` }} title={`isJSP: ${jsp} (${jspPct}%)`} />
                <div className="bg-purple-500 transition-all duration-700" style={{ width: `${otherPct}%` }} title={`other: ${other} (${otherPct}%)`} />
                <div className="bg-slate-300 transition-all duration-700" style={{ width: `${undecidedPct}%` }} title={`Undecided: ${undecided} (${undecidedPct}%)`} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
