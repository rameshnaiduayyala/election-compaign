import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatRupee } from '../../utils/formatters'
import { getPermissions } from '../../utils/permissions'
import { DEFAULT_AREAS } from '../areas/AreasManagement'
import StatCard from './StatCard'
import PartyProgressBar from './PartyProgressBar'
import { Users, ShieldCheck, IndianRupee, RefreshCw, MapPin, ArrowRight } from 'lucide-react'

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
  const [areaStats, setAreaStats] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchStats() {
    setLoading(true)
    try {
      // 1. Fetch voters data with fields needed for dashboard stats
      const [votersResponse, areasResponse] = await Promise.all([
        supabase.from('voters').select('id, area_name, area_id, gender, is_ysrcp, is_tdp, is_jsp, is_other, is_verified, amount'),
        supabase.from('areas').select('*').order('name', { ascending: true })
      ])

      if (votersResponse.error) {
        throw votersResponse.error
      }

      const voters = votersResponse.data || []
      const dbAreas = (areasResponse.data && areasResponse.data.length > 0)
        ? areasResponse.data
        : DEFAULT_AREAS

      const total = voters.length
      let ysrcp = 0
      let tdp = 0
      let jsp = 0
      let other = 0
      let verified = 0
      let male = 0
      let female = 0
      let totalAmount = 0
      let fundedVotersCount = 0

      voters.forEach(v => {
        if (v.is_ysrcp) ysrcp++
        if (v.is_tdp) tdp++
        if (v.is_jsp) jsp++
        if (v.is_other) other++
        if (v.is_verified) verified++

        const g = String(v.gender || '').trim().toLowerCase()
        if (g.startsWith('m')) male++
        else if (g.startsWith('f')) female++

        const amt = Number(v.amount) || 0
        if (amt > 0) {
          totalAmount += amt
          fundedVotersCount++
        }
      })

      const undecided = Math.max(0, total - (ysrcp + tdp + jsp + other))

      setStats({
        totalVoters: total,
        male,
        female,
        ysrcp,
        tdp,
        jsp,
        other,
        undecided,
        verified,
        totalAmount,
        fundedVotersCount
      })

      // 2. Compute KPI metrics per area
      const computedAreaKpis = dbAreas.map(area => {
        const areaVoters = voters.filter(v => 
          (v.area_name && v.area_name.toLowerCase() === area.name.toLowerCase()) ||
          v.area_id === area.id
        )
        const areaTotal = areaVoters.length
        const areaMale = areaVoters.filter(v => String(v.gender || '').trim().toLowerCase().startsWith('m')).length
        const areaFemale = areaVoters.filter(v => String(v.gender || '').trim().toLowerCase().startsWith('f')).length
        const aYsrcp = areaVoters.filter(v => v.is_ysrcp).length
        const aTdp = areaVoters.filter(v => v.is_tdp).length
        const aJsp = areaVoters.filter(v => v.is_jsp).length
        const aOther = areaVoters.filter(v => v.is_other).length
        const paidCount = areaVoters.filter(v => Number(v.amount) > 0).length
        const totalPaid = areaVoters.reduce((acc, v) => acc + (Number(v.amount) || 0), 0)

        return {
          id: area.id,
          name: area.name,
          ward_number: area.ward_number || '2',
          description: area.description,
          totalVoters: areaTotal,
          male: areaMale,
          female: areaFemale,
          ysrcp: aYsrcp,
          tdp: aTdp,
          jsp: aJsp,
          other: aOther,
          paidCount,
          totalPaid
        }
      })

      // Check for unassigned voters
      const unassignedVoters = voters.filter(v => !v.area_name && !v.area_id)
      if (unassignedVoters.length > 0) {
        computedAreaKpis.push({
          id: 'unassigned',
          name: 'Unassigned Area',
          ward_number: '2',
          description: 'Voters pending area assignment',
          totalVoters: unassignedVoters.length,
          male: unassignedVoters.filter(v => String(v.gender || '').trim().toLowerCase().startsWith('m')).length,
          female: unassignedVoters.filter(v => String(v.gender || '').trim().toLowerCase().startsWith('f')).length,
          ysrcp: unassignedVoters.filter(v => v.is_ysrcp).length,
          tdp: unassignedVoters.filter(v => v.is_tdp).length,
          jsp: unassignedVoters.filter(v => v.is_jsp).length,
          other: unassignedVoters.filter(v => v.is_other).length,
          paidCount: unassignedVoters.filter(v => Number(v.amount) > 0).length,
          totalPaid: unassignedVoters.reduce((acc, v) => acc + (Number(v.amount) || 0), 0)
        })
      }

      setAreaStats(computedAreaKpis)
    } catch (err) {
      console.error('Dashboard load error:', err)
      setNotice?.(`Supabase error: ${err.message}`)
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

      {/* KPI Cards: total voters, male/female, isysrcp, isTDP, isJSP, other, amount */}
      <div className={`grid gap-2.5 sm:gap-4 ${permissions.canViewAmount ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-7' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6'}`}>
        <StatCard 
          label="Total Voters" 
          value={loading ? '…' : stats.totalVoters.toLocaleString('en-IN')} 
          hint={`${stats.verified} Verified in Supabase`}
          icon={<Users size={18} />}
        />

        <StatCard 
          label="Male / Female" 
          value={loading ? '…' : `${stats.male || 0} / ${stats.female || 0}`} 
          hint={`M: ${Math.round(((stats.male || 0) / (stats.totalVoters || 1)) * 100)}% · F: ${Math.round(((stats.female || 0) / (stats.totalVoters || 1)) * 100)}%`}
          icon={<Users size={18} />}
          valueClass="text-indigo-700"
        />

        <StatCard 
          label="YSRCP" 
          value={loading ? '…' : stats.ysrcp.toLocaleString('en-IN')} 
          hint={`${percentages.ysrcpPct}% of total`}
          icon={<ShieldCheck size={18} />}
          valueClass="text-emerald-700"
        />

        <StatCard 
          label="TDP" 
          value={loading ? '…' : stats.tdp.toLocaleString('en-IN')} 
          hint={`${percentages.tdpPct}% of total`}
          icon={<ShieldCheck size={18} />}
          valueClass="text-amber-700"
        />

        <StatCard 
          label="JSP" 
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


      
      {/* Area-Wise Summary Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <MapPin size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">Area-Wise Voters Summary</h3>
              <p className="text-xs text-slate-500 m-0">Elector count and distribution by street & colony</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/areas')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100/70"
          >
            <span>Manage Areas</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Area / Street</th>
                <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Ward No</th>
                <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Total Voters</th>
                <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Male / Female</th>
                {permissions.canViewAmount && (
                  <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Disbursement</th>
                )}
                <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={permissions.canViewAmount ? 6 : 5} className="text-center py-10 text-slate-400 font-medium">
                    Loading Area-wise metrics…
                  </td>
                </tr>
              ) : areaStats.length === 0 ? (
                <tr>
                  <td colSpan={permissions.canViewAmount ? 6 : 5} className="text-center py-10 text-slate-500 font-medium">
                    No areas configured yet.
                  </td>
                </tr>
              ) : (
                areaStats.map(area => (
                  <tr key={area.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3">
                      <b className="text-slate-900 block text-xs sm:text-sm">{area.name}</b>
                      {area.description && (
                        <span className="text-[11px] text-slate-400 block line-clamp-1">{area.description}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-600">
                      Ward {area.ward_number || '2'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {area.totalVoters} Voters
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-xs text-slate-700">
                      <span className="font-bold text-blue-800">{area.male || 0} M</span>
                      <span className="text-slate-300 mx-1.5">/</span>
                      <span className="font-bold text-pink-700">{area.female || 0} F</span>
                    </td>
                    {permissions.canViewAmount && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {area.paidCount > 0 ? (
                          <div>
                            <span className="font-bold text-emerald-700 block">{formatRupee(area.totalPaid)}</span>
                            <span className="text-[10px] text-slate-400">({area.paidCount} funded)</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">₹0</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/voters?area=${encodeURIComponent(area.name)}`)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200 transition"
                          title={`View voters in ${area.name}`}
                        >
                          View List
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/group-voters?area=${encodeURIComponent(area.name)}`)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-lg border border-blue-200 transition"
                          title={`Print voter slips for ${area.name}`}
                        >
                          Print Slips
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Party Share Progress Bar */}
      <PartyProgressBar stats={stats} percentages={percentages} />

    </div>
  )
}
