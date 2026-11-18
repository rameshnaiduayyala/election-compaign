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
      // Fetch areas and aggregate voter stats per area
      try {
        const [areasResponse, votersResponse] = await Promise.all([
          supabase.from('areas').select('*').order('name', { ascending: true }),
          supabase.from('voters').select('id, area_name, area_id, is_ysrcp, is_tdp, is_jsp, is_other, amount')
        ])

        const dbAreas = (areasResponse.data && areasResponse.data.length > 0)
          ? areasResponse.data
          : DEFAULT_AREAS

        const voters = votersResponse.data || []

        // Compute KPI metrics per area
        const computedAreaKpis = dbAreas.map(area => {
          const areaVoters = voters.filter(v => 
            (v.area_name && v.area_name.toLowerCase() === area.name.toLowerCase()) ||
            v.area_id === area.id
          )
          const areaTotal = areaVoters.length
          const ysrcp = areaVoters.filter(v => v.is_ysrcp).length
          const tdp = areaVoters.filter(v => v.is_tdp).length
          const jsp = areaVoters.filter(v => v.is_jsp).length
          const other = areaVoters.filter(v => v.is_other).length
          const paidCount = areaVoters.filter(v => Number(v.amount) > 0).length
          const totalPaid = areaVoters.reduce((acc, v) => acc + (Number(v.amount) || 0), 0)

          return {
            id: area.id,
            name: area.name,
            ward_number: area.ward_number || '2',
            description: area.description,
            totalVoters: areaTotal,
            ysrcp,
            tdp,
            jsp,
            other,
            paidCount,
            totalPaid
          }
        })

        // Also check if there are voters with no area assigned
        const unassignedCount = voters.filter(v => !v.area_name && !v.area_id).length
        if (unassignedCount > 0) {
          computedAreaKpis.push({
            id: 'unassigned',
            name: 'Unassigned Area',
            ward_number: '2',
            description: 'Voters pending area assignment',
            totalVoters: unassignedCount,
            ysrcp: voters.filter(v => !v.area_name && !v.area_id && v.is_ysrcp).length,
            tdp: voters.filter(v => !v.area_name && !v.area_id && v.is_tdp).length,
            jsp: voters.filter(v => !v.area_name && !v.area_id && v.is_jsp).length,
            other: voters.filter(v => !v.area_name && !v.area_id && v.is_other).length,
            paidCount: voters.filter(v => !v.area_name && !v.area_id && Number(v.amount) > 0).length,
            totalPaid: voters.filter(v => !v.area_name && !v.area_id).reduce((acc, v) => acc + (Number(v.amount) || 0), 0)
          })
        }

        setAreaStats(computedAreaKpis)
      } catch (areaErr) {
        console.warn('Area stats calculation error:', areaErr)
      }
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

      {/* Area-Wise KPI Cards Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <MapPin size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">Area-Wise Key Performance Indicators</h3>
              <p className="text-xs text-slate-500 m-0">Live elector count and party breakdown by street and neighborhood</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/areas')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
          >
            <span>Manage Areas</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {loading ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-400 font-medium">
              Loading Area-wise metrics…
            </div>
          ) : areaStats.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-400 font-medium">
              No areas configured yet.
            </div>
          ) : (
            areaStats.map(area => (
              <div 
                key={area.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition duration-150 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                        {area.name}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-medium">
                        Ward {area.ward_number} {area.description ? `· ${area.description}` : ''}
                      </span>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-xl border border-blue-200 shadow-2xs">
                      {area.totalVoters} Voters
                    </span>
                  </div>

                  {/* Party Breakdown Mini Badges */}
                  <div className="grid grid-cols-4 gap-1.5 my-3 text-center">
                    <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-1.5">
                      <span className="block text-[10px] font-bold text-emerald-800 uppercase">YSRCP</span>
                      <b className="text-xs font-black text-emerald-700">{area.ysrcp}</b>
                    </div>
                    <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-1.5">
                      <span className="block text-[10px] font-bold text-amber-900 uppercase">TDP</span>
                      <b className="text-xs font-black text-amber-700">{area.tdp}</b>
                    </div>
                    <div className="bg-red-50 border border-red-200/80 rounded-xl p-1.5">
                      <span className="block text-[10px] font-bold text-red-800 uppercase">JSP</span>
                      <b className="text-xs font-black text-red-700">{area.jsp}</b>
                    </div>
                    <div className="bg-purple-50 border border-purple-200/80 rounded-xl p-1.5">
                      <span className="block text-[10px] font-bold text-purple-800 uppercase">OTH</span>
                      <b className="text-xs font-black text-purple-700">{area.other}</b>
                    </div>
                  </div>
                </div>

                {/* Footer Action: View Voters or Print */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  {permissions.canViewAmount && area.paidCount > 0 ? (
                    <span className="text-[11px] font-bold text-slate-600">
                      Paid: <span className="text-emerald-700">{formatRupee(area.totalPaid)}</span> ({area.paidCount})
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      Ward 2 Sector
                    </span>
                  )}

                  <div className="flex items-center gap-2">
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
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
