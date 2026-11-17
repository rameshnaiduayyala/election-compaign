import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatRupee } from '../../utils/formatters'
import { getPermissions } from '../../utils/permissions'
import StatCard from './StatCard'
import PartyProgressBar from './PartyProgressBar'
import { Users, ShieldCheck, IndianRupee, RefreshCw } from 'lucide-react'

export default function Dashboard({ userRole = 'user', onNavigate, setNotice }) {
  const navigate = useNavigate()
  const permissions = getPermissions(userRole)
  const [stats, setStats] = useState({
    totalVoters: 0,
    ysrcp: 0,
    tdp: 0,
    jsp: 0,
    other: 0,
    undecided: 0,
    verified: 0,
    totalAmount: 0,
    fundedVotersCount: 0
  })
  const [loading, setLoading] = useState(true)

  async function fetchStats() {
    setLoading(true)
    try {
      const [
        totalRes,
        ysrcpRes,
        tdpRes,
        jspRes,
        otherRes,
        verifiedRes,
        amountsRes
      ] = await Promise.all([
        supabase.from('voters').select('*', { count: 'exact', head: true }),
        supabase.from('voters').select('*', { count: 'exact', head: true }).eq('is_ysrcp', true),
        supabase.from('voters').select('*', { count: 'exact', head: true }).eq('is_tdp', true),
        supabase.from('voters').select('*', { count: 'exact', head: true }).eq('is_jsp', true),
        supabase.from('voters').select('*', { count: 'exact', head: true }).eq('is_other', true),
        supabase.from('voters').select('*', { count: 'exact', head: true }).eq('is_verified', true),
        permissions.canViewAmount
          ? supabase.from('voters').select('amount')
          : Promise.resolve({ data: [] })
      ])

      const total = totalRes.count || 0
      const ysrcp = ysrcpRes.count || 0
      const tdp = tdpRes.count || 0
      const jsp = jspRes.count || 0
      const other = otherRes.count || 0
      const verified = verifiedRes.count || 0

      const amountRows = amountsRes.data || []
      const totalAmount = amountRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
      const fundedVotersCount = amountRows.filter(r => Number(r.amount) > 0).length
      const undecided = Math.max(0, total - (ysrcp + tdp + jsp + other))

      setStats({
        totalVoters: total,
        ysrcp,
        tdp,
        jsp,
        other,
        undecided,
        verified,
        totalAmount,
        fundedVotersCount
      })
    } catch (err) {
      setNotice(`Supabase error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const total = stats.totalVoters || 1
  const percentages = {
    ysrcpPct: Math.round((stats.ysrcp / total) * 100) || 0,
    tdpPct: Math.round((stats.tdp / total) * 100) || 0,
    jspPct: Math.round((stats.jsp / total) * 100) || 0,
    otherPct: Math.round((stats.other / total) * 100) || 0,
    undecidedPct: Math.max(0, 100 - (
      (Math.round((stats.ysrcp / total) * 100) || 0) +
      (Math.round((stats.tdp / total) * 100) || 0) +
      (Math.round((stats.jsp / total) * 100) || 0) +
      (Math.round((stats.other / total) * 100) || 0)
    ))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900 m-0">Live Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={fetchStats} 
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button 
            type="button"
            onClick={() => { if (onNavigate) onNavigate('voters'); navigate('/voters') }} 
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            Open Voters Directory →
          </button>
        </div>
      </div>

      {/* KPI Cards: total voters, isysrcp, isTDP, isJSP, other, amount (amount shown to admin/distributor only) */}
      <div className={`grid gap-2.5 sm:gap-4 ${permissions.canViewAmount ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-6' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5'}`}>
        <StatCard 
          label="Total Voters" 
          value={loading ? '…' : stats.totalVoters.toLocaleString('en-IN')} 
          hint={`${stats.verified} Verified in Supabase`}
          icon={<Users size={18} />}
        />

        <StatCard 
          label="isysrcp" 
          value={loading ? '…' : stats.ysrcp.toLocaleString('en-IN')} 
          hint={`${percentages.ysrcpPct}% of total`}
          icon={<ShieldCheck size={18} />}
          valueClass="text-emerald-700"
        />

        <StatCard 
          label="isTDP" 
          value={loading ? '…' : stats.tdp.toLocaleString('en-IN')} 
          hint={`${percentages.tdpPct}% of total`}
          icon={<ShieldCheck size={18} />}
          valueClass="text-amber-700"
        />

        <StatCard 
          label="isJSP" 
          value={loading ? '…' : stats.jsp.toLocaleString('en-IN')} 
          hint={`${percentages.jspPct}% of total`}
          icon={<ShieldCheck size={18} />}
          valueClass="text-red-700"
        />

        <StatCard 
          label="other" 
          value={loading ? '…' : stats.other.toLocaleString('en-IN')} 
          hint={`${percentages.otherPct}% of total`}
          icon={<ShieldCheck size={18} />}
          valueClass="text-purple-700"
        />

        {permissions.canViewAmount && (
          <StatCard 
            label="amount" 
            value={loading ? '…' : formatRupee(stats.totalAmount)} 
            hint={`${stats.fundedVotersCount} voters funded in Supabase`}
            icon={<IndianRupee size={18} />}
            valueClass="text-blue-700"
          />
        )}
      </div>

      {/* Visual Party Share Progress Bar */}
      <PartyProgressBar stats={stats} percentages={percentages} />
    </div>
  )
}
