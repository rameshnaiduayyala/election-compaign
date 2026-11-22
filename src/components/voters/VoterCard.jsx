import { formatRupee, FALLBACK_AVATAR } from '../../utils/formatters'
import PartySelector from './PartySelector'
import { IndianRupee, Image as ImageIcon, Trash2, User, Clock, Lock, CheckCircle2, MapPin, Edit3 } from 'lucide-react'

export default function VoterCard({ 
  voter, 
  areas = [],
  onAssignArea,
  permissions,
  onOpenPhoto, 
  onEditVoter,
  onToggleParty, 
  onOpenAmountModal, 
  onToggleVerified, 
  onDeleteVoter 
}) {
  const { canEditParty, canEditAmount, canViewAmount, canDeleteVoter, canAddVoter, canEditVoter, isAdmin, isDistributor } = permissions
  const isPaid = Number(voter.amount) > 0
  
  // In distributor role, if amount is already paid, it cannot be edited! Only Admin can edit paid records.
  const canEditThisVoterAmount = isAdmin || (isDistributor && !isPaid)

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-slate-300 transition duration-150 relative overflow-hidden">
      {/* PAID Watermark Stamped Across Card (when amount is paid) */}
      {isPaid && canViewAmount && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10 overflow-hidden select-none">
          <div className="transform -rotate-25 border-4 border-dashed border-emerald-600/30 text-red-600/25 font-black text-3xl sm:text-4xl uppercase tracking-widest px-6 py-2 rounded-2xl whitespace-nowrap bg-emerald-50/25 backdrop-blur-[0.5px]">
            PAID {formatRupee(voter.amount)}
          </div>
        </div>
      )}

      {/* Top Bar: Serial Number & EPIC Voter ID & Status */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="bg-blue-50 text-blue-700 font-bold text-[11px] px-2 py-0.5 rounded-md border border-blue-200">
            SL #{voter.serial_number}
          </span>
          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
            {voter.voter_id || 'ID —'}
          </span>
          {/* Prominent PAID badge in top bar visible to all distributor & admin roles */}
          {isPaid && canViewAmount && (
            <span className="bg-emerald-600 text-white font-black text-[11px] px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1">
              <CheckCircle2 size={12} className="text-white" />
              <span>PAID: {formatRupee(voter.amount)}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => canAddVoter && onToggleVerified(voter)}
          disabled={!canAddVoter}
          className={`text-[10px] font-bold inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full transition ${
            voter.is_verified 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
          title={canAddVoter ? 'Click to toggle verification status' : 'Verification status'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${voter.is_verified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {voter.is_verified ? 'Verified' : 'Pending'}
        </button>
      </div>

      {/* Main Body: Real Photo & Voter Identity Info (No clipping for Telugu & English) */}
      <div className="flex items-start gap-3 my-2.5">
        <div className="relative group shrink-0">
          {voter.image_path ? (
            <img
              src={voter.image_path}
              alt={voter.voter_name_english || 'Voter photo'}
              className="w-14 h-16 sm:w-16 sm:h-20 object-cover rounded-xl border border-slate-200 bg-slate-100 shadow-2xs group-hover:scale-105 transition shrink-0 cursor-pointer"
              onClick={() => onOpenPhoto(voter)}
              onError={(e) => { e.target.src = FALLBACK_AVATAR }}
              title="Click to enlarge photo"
            />
          ) : (
            <div className="w-14 h-16 sm:w-16 sm:h-20 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-lg shrink-0">
              {(voter.voter_name_english || 'V')[0]}
            </div>
          )}
          <button
            type="button"
            onClick={() => onOpenPhoto(voter)}
            className="absolute inset-0 bg-black/40 text-white rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
            title="Enlarge photo"
          >
            <ImageIcon size={16} />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <b className="text-slate-900 text-sm sm:text-[15px] leading-snug block font-bold break-words" title={voter.voter_name_telugu}>
            {voter.voter_name_telugu || '—'}
          </b>
          <span className="text-slate-600 text-xs sm:text-[13px] font-medium block mt-0.5 break-words" title={voter.voter_name_english}>
            {voter.voter_name_english || '—'}
          </span>
          {voter.relative_name && (
            <span className="text-slate-500 text-[11px] block mt-1 break-words">
              {voter.relation_type || 'Relation'}: <b className="text-slate-700">{voter.relative_name}</b>
            </span>
          )}
        </div>
      </div>

      {/* Key Voter Details Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-slate-600 mb-2.5">
        <div><b className="text-slate-800">Door / House:</b> <span className="block truncate">{voter.house_number || '—'}</span></div>
        <div><b className="text-slate-800">Age / Gender:</b> <span className="block truncate">{voter.age || '—'} / {voter.gender || '—'}</span></div>
        <div><b className="text-slate-800">Ward No:</b> <span className="block truncate">{voter.ward_number || '2'}</span></div>
        <div className="relative">
          <b className="text-slate-800 block text-[11px] mb-0.5">Area / Street:</b>
          {onAssignArea && (isAdmin || canEditParty) ? (
            <select
              value={voter.area_name || ''}
              onChange={(e) => onAssignArea(voter.id, e.target.value)}
              className="w-full bg-white border border-blue-200 rounded-lg px-1.5 py-1 text-[11px] font-bold text-blue-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
              title="Select area for this voter"
            >
              <option value="">-- No Area --</option>
              {areas.map(a => (
                <option key={a.id || a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="block truncate text-blue-700 font-semibold" title={voter.area_name || 'Not assigned'}>
              {voter.area_name || 'Not assigned'}
            </span>
          )}
        </div>
      </div>

      {/* Party Affiliation Selection Tag */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/90 mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Party Tag
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {canEditParty ? 'Click to switch' : 'Read-only'}
          </span>
        </div>
        <PartySelector 
          voter={voter} 
          onToggleParty={onToggleParty} 
          canEditParty={canEditParty} 
        />
      </div>

      {/* Bottom Footer: Disbursement Amount, Issued Name & Actions */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {canViewAmount ? (
            <div className="flex items-center gap-2 flex-wrap">
              {/* If user can edit (Admin or Distributor with unpaid amount) */}
              {canEditThisVoterAmount ? (
                <button
                  type="button"
                  onClick={() => onOpenAmountModal(voter)}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition ${
                    isPaid 
                      ? 'bg-emerald-600 border-emerald-700 text-white font-bold hover:bg-emerald-700 shadow-2xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-blue-400'
                  }`}
                  title={isPaid ? "Admin: Click to edit paid disbursement" : "Click to add disbursement amount"}
                >
                  <IndianRupee size={13} className={isPaid ? 'text-white' : 'text-slate-400'} />
                  <span>{isPaid ? `Paid: ${formatRupee(voter.amount)}` : '+ Add Amount'}</span>
                </button>
              ) : (
                /* Distributor when amount is already paid: strictly locked and not editable */
                <span 
                  className="text-xs font-bold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 border border-emerald-700 text-white shadow-2xs select-none"
                  title="Locked: Paid amounts cannot be edited by Distributor (Only Admin can edit)"
                >
                  <CheckCircle2 size={13} className="text-white shrink-0" />
                  <span>Paid: {formatRupee(voter.amount)}</span>
                  <Lock size={12} className="text-emerald-100 ml-1 shrink-0" />
                </span>
              )}

              {/* Amount Issued User Name */}
              {isPaid && voter.amount_given_user && (
                <span 
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-900 shadow-2xs"
                  title={`Amount issued by: ${voter.amount_given_user}`}
                >
                  <User size={12} className="text-blue-600 shrink-0" />
                  <span className="truncate max-w-[130px]">By: {voter.amount_given_user}</span>
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">
              Ward 2 · Verified Elector
            </span>
          )}

          {/* Action icons */}
          <div className="flex items-center gap-1 ml-auto">
            {canEditVoter && onEditVoter && (
              <button
                type="button"
                onClick={() => onEditVoter(voter)}
                className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                title="Edit voter details (Admin)"
              >
                <Edit3 size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenPhoto(voter)}
              className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              title="View voter photo"
            >
              <ImageIcon size={16} />
            </button>

            {canDeleteVoter && (
              <button
                type="button"
                onClick={() => onDeleteVoter(voter.id)}
                className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                title="Delete voter record"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Timestamp and Note row if amount exists */}
        {canViewAmount && (voter.amount_given_time || voter.note) && (
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100/80">
            {voter.amount_given_time && (
              <span className="flex items-center gap-1 text-slate-400">
                <Clock size={11} className="shrink-0" />
                {new Date(voter.amount_given_time).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}

            {voter.note && (
              <span className="italic truncate max-w-[160px] ml-auto text-slate-500" title={voter.note}>
                "{voter.note}"
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
