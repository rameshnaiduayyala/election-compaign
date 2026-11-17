import { X, Lock, User, Clock } from 'lucide-react'

export default function AmountModal({ 
  voter, 
  form, 
  setForm, 
  onSave, 
  onClose,
  currentUser = 'User',
  isAdmin = false
}) {
  if (!voter) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 m-0">Disbursement & Notes (Supabase)</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Recording fund distribution to PostgreSQL</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSave} className="flex flex-col overflow-hidden">
          <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto">
            {/* Voter Details Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs flex items-center gap-3">
              {voter.image_path ? (
                <img 
                  src={voter.image_path} 
                  alt={voter.voter_name_english} 
                  className="w-11 h-14 object-cover rounded-lg border border-slate-200 bg-white shrink-0 shadow-2xs" 
                />
              ) : (
                <div className="w-11 h-14 rounded-lg bg-slate-200 border border-slate-300 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">
                  {(voter.voter_name_english || 'V')[0]}
                </div>
              )}
              <div className="min-w-0">
                <b className="text-slate-900 text-sm block truncate">{voter.voter_name_telugu || voter.voter_name_english}</b>
                {voter.voter_name_english && <span className="text-slate-600 block text-xs">{voter.voter_name_english}</span>}
                <p className="text-slate-500 mt-0.5">
                  EPIC: <span className="font-mono font-bold text-slate-800">{voter.voter_id}</span> · House: <b>{voter.house_number || '—'}</b> · Ward {voter.ward_number || '2'}
                </p>
              </div>
            </div>

            {/* Amount Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount Distributed (amount in INR ₹) *
              </label>
              <input
                type="number"
                min="0"
                step="50"
                required
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="e.g. 500, 1000, 2000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition font-medium"
              />
            </div>

            {/* Amount Given By & Date/Time Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Amount Given By: Autofilled logged user, read-only unless Admin */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User size={13} className="text-slate-400" />
                    <span>Amount Given By</span>
                    {!isAdmin && <Lock size={12} className="text-amber-600" />}
                  </label>
=
       
                </div>
                <input
                  type="text"
                  required
                  readOnly={!isAdmin}
                  value={form.amount_given_user}
                  onChange={e => isAdmin && setForm({ ...form, amount_given_user: e.target.value })}
                  placeholder="Logged-in agent name"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition ${
                    !isAdmin 
                      ? 'bg-slate-100/90 border border-slate-200 text-slate-700 cursor-not-allowed select-none font-semibold' 
                      : 'bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 font-medium'
                  }`}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {!isAdmin 
                    ? `Autofilled with logged-in user (${currentUser}). Read-only (Only Admin can edit).` 
                    : 'Admin privilege: you can edit this name if wrong.'}
                </p>
              </div>

              {/* Date & Time: Auto-generated, read-only unless Admin */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400" />
                    <span>Date & Time</span>
                    {!isAdmin && <Lock size={12} className="text-amber-600" />}
                  </label>
                </div>
                <input
                  type="datetime-local"
                  required
                  readOnly={!isAdmin}
                  value={form.amount_given_time}
                  onChange={e => isAdmin && setForm({ ...form, amount_given_time: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition ${
                    !isAdmin 
                      ? 'bg-slate-100/90 border border-slate-200 text-slate-700 cursor-not-allowed select-none font-semibold' 
                      : 'bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 font-medium'
                  }`}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {!isAdmin 
                    ? 'Auto-generated current timestamp. Read-only.' 
                    : 'Auto-generated timestamp. Admin can override if necessary.'}
                </p>
              </div>
            </div>

            {/* Note Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Field Note / Remarks (note)
              </label>
              <textarea
                rows="3"
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
                placeholder="Optional payment remarks, verification notes, or disbursal details..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              Save to Supabase
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
