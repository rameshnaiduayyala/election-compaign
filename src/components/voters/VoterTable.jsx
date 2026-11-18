import { formatRupee, FALLBACK_AVATAR } from '../../utils/formatters'
import PartySelector from './PartySelector'
import { IndianRupee, Edit3, Trash2, Lock, CheckCircle2 } from 'lucide-react'

export default function VoterTable({ 
  rows, 
  loading, 
  permissions,
  onOpenPhoto, 
  onToggleParty, 
  onOpenAmountModal, 
  onToggleVerified, 
  onDeleteVoter 
}) {
  const { canEditParty, canEditAmount, canViewAmount, canDeleteVoter, isAdmin, isDistributor } = permissions

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            <th className="px-3.5 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Photo</th>
            <th className="px-3.5 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Sl.</th>
            <th className="px-3.5 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Voter ID</th>
            <th className="px-3.5 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Voter Name & Relative</th>
            <th className="px-3.5 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">House / Area</th>
            <th className="px-3.5 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Age / Gen</th>
            <th className="px-3.5 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap min-w-[280px]">Party Tag (isysrcp / isTDP / isJSP / other)</th>
            {canViewAmount && (
              <th className="px-3.5 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Amount</th>
            )}
            <th className="px-3.5 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Status</th>
            <th className="px-3.5 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr><td colSpan={canViewAmount ? 10 : 9} className="text-center py-12 text-slate-400 font-medium">Loading from Supabase…</td></tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={canViewAmount ? 10 : 9} className="text-center py-12 text-slate-400 font-medium">
                No voters found matching your search.
              </td>
            </tr>
          ) : (
            rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-50/70 transition">
                <td className="px-3.5 py-2.5">
                  {r.image_path ? (
                    <img
                      src={r.image_path}
                      alt={r.voter_name_english}
                      className="w-10 h-12 sm:w-11 sm:h-14 object-cover rounded-lg border border-slate-200 bg-slate-100 shadow-2xs hover:scale-110 transition cursor-pointer"
                      title="Click to view photo"
                      onClick={() => onOpenPhoto(r)}
                      onError={(e) => { e.target.src = FALLBACK_AVATAR }}
                    />
                  ) : (
                    <div className="w-10 h-12 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs">
                      {(r.voter_name_english || 'V')[0]}
                    </div>
                  )}
                </td>
                <td className="px-3.5 py-2.5 font-mono text-slate-500 font-semibold">{r.serial_number || '—'}</td>
                <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">{r.voter_id || '—'}</td>
                <td className="px-3.5 py-2.5">
                  <b className="text-slate-900 block leading-tight">{r.voter_name_telugu || r.voter_name_english || '—'}</b>
                  {r.voter_name_english && <span className="text-slate-600 font-medium text-[11px] block">{r.voter_name_english}</span>}
                  {r.relative_name && <small className="text-slate-400 block text-[10px]">{r.relation_type || 'Rel'}: {r.relative_name}</small>}
                </td>
                <td className="px-3.5 py-2.5 whitespace-nowrap">
                  <b className="text-slate-900 block">{r.house_number || '—'}</b>
                  <span className="text-blue-700 font-semibold block text-[10px] truncate max-w-[120px]" title={r.area_name || 'Ward 2'}>
                    {r.area_name || 'Ward 2'}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 whitespace-nowrap">
                  {r.age || '—'} yrs / <span className="font-semibold text-slate-800">{r.gender || '—'}</span>
                </td>
                <td className="px-3.5 py-2.5 min-w-[280px]">
                  <PartySelector 
                    voter={r} 
                    onToggleParty={onToggleParty} 
                    canEditParty={canEditParty} 
                  />
                </td>
                {canViewAmount && (() => {
                  const isPaid = Number(r.amount) > 0
                  const canEditThisAmount = isAdmin || (isDistributor && !isPaid)

                  return (
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {canEditThisAmount ? (
                        <button
                          type="button"
                          onClick={() => onOpenAmountModal(r)}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition ${
                            isPaid 
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold hover:bg-emerald-100' 
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-blue-400'
                          }`}
                          title={isPaid ? "Admin: Click to edit paid disbursement" : "Click to add disbursement amount"}
                        >
                          <IndianRupee size={13} className={isPaid ? 'text-emerald-600' : 'text-slate-400'} />
                          <span>{isPaid ? formatRupee(r.amount) : 'Add ₹'}</span>
                        </button>
                      ) : (
                        <span 
                          className="text-xs font-bold inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-2xs cursor-not-allowed select-none"
                          title="Locked: Paid amounts cannot be edited by Distributor (Only Admin can edit)"
                        >
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          <span>{isPaid ? formatRupee(r.amount) : '0'}</span>
                          {isPaid && isDistributor && <Lock size={11} className="text-emerald-700 ml-0.5 shrink-0" />}
                        </span>
                      )}
                      {r.amount_given_user && (
                        <small className="text-[10px] text-blue-700 font-semibold block mt-1">
                          By: {r.amount_given_user}
                        </small>
                      )}
                    </td>
                  )
                })()}
                <td className="px-3.5 py-2.5 whitespace-nowrap">
                  {canDeleteVoter ? (
                    <button
                      type="button"
                      onClick={() => onToggleVerified(r)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                        r.is_verified 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      }`}
                      title="Toggle verification"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${r.is_verified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {r.is_verified ? 'Verified' : 'Pending'}
                    </button>
                  ) : (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.is_verified ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${r.is_verified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {r.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  )}
                </td>
                <td className="px-3.5 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {canViewAmount && canEditAmount && (isAdmin || !isDistributor || Number(r.amount) === 0) && (
                      <button
                        type="button"
                        onClick={() => onOpenAmountModal(r)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition"
                        title={Number(r.amount) > 0 ? "Edit disbursement" : "Add disbursement"}
                      >
                        <Edit3 size={15} />
                      </button>
                    )}
                    {canDeleteVoter && (
                      <button
                        type="button"
                        onClick={() => onDeleteVoter(r.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        title="Delete voter"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                    {(!canEditAmount || (isDistributor && Number(r.amount) > 0)) && !canDeleteVoter && (
                      <span className="text-[11px] text-slate-400 italic">View only</span>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
