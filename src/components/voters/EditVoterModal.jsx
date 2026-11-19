import { X } from 'lucide-react'

export default function EditVoterModal({ isOpen, form, setForm, onSave, onClose, areas = [] }) {
  if (!isOpen) return null

  const inputClass = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
  const labelClass = "block text-xs font-bold text-slate-700 mb-1"

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 m-0">Edit Voter Record</h3>
            <span className="text-[11px] font-mono text-blue-600 font-semibold">{form.voter_id}</span>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSave} className="flex flex-col overflow-hidden">
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-3.5 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Voter ID (EPIC) *
                </label>
                <input
                  required
                  value={form.voter_id}
                  onChange={e => setForm({ ...form, voter_id: e.target.value.toUpperCase() })}
                  placeholder="e.g. WQN2431674"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Serial Number
                </label>
                <input
                  value={form.serial_number}
                  onChange={e => setForm({ ...form, serial_number: e.target.value })}
                  placeholder="e.g. 848"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Name in Telugu
                </label>
                <input
                  value={form.voter_name_telugu}
                  onChange={e => setForm({ ...form, voter_name_telugu: e.target.value })}
                  placeholder="ఓటరు పేరు (తెలుగు)"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Name in English *
                </label>
                <input
                  required
                  value={form.voter_name_english}
                  onChange={e => setForm({ ...form, voter_name_english: e.target.value })}
                  placeholder="Voter name in English"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Father / Husband Name
                </label>
                <input
                  value={form.relative_name}
                  onChange={e => setForm({ ...form, relative_name: e.target.value })}
                  placeholder="Relative name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Relation Type
                </label>
                <select
                  value={form.relation_type || 'Father'}
                  onChange={e => setForm({ ...form, relation_type: e.target.value })}
                  className={inputClass}
                >
                  <option value="Father">Father</option>
                  <option value="Husband">Husband</option>
                  <option value="Mother">Mother</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  House / Door Number
                </label>
                <input
                  value={form.house_number}
                  onChange={e => setForm({ ...form, house_number: e.target.value })}
                  placeholder="e.g. 1-191"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Area / Street
                </label>
                <select
                  value={form.area_name || ''}
                  onChange={e => {
                    const selected = areas.find(a => a.name === e.target.value)
                    setForm({ 
                      ...form, 
                      area_name: e.target.value,
                      area_id: selected?.id || null 
                    })
                  }}
                  className={inputClass}
                >
                  <option value="">-- Select Area --</option>
                  {areas.map(a => (
                    <option key={a.id || a.name} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Age
                </label>
                <input
                  type="number"
                  min="18"
                  max="120"
                  value={form.age || ''}
                  onChange={e => setForm({ ...form, age: e.target.value })}
                  placeholder="Age"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Gender
                </label>
                <select
                  value={form.gender || 'Female'}
                  onChange={e => setForm({ ...form, gender: e.target.value })}
                  className={inputClass}
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <span className={labelClass}>Party Tag:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_ysrcp: !form.is_ysrcp, is_tdp: false, is_jsp: false, is_other: false })}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    form.is_ysrcp 
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50'
                  }`}
                >
                  isysrcp
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_tdp: !form.is_tdp, is_ysrcp: false, is_jsp: false, is_other: false })}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    form.is_tdp 
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50'
                  }`}
                >
                  isTDP
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_jsp: !form.is_jsp, is_ysrcp: false, is_tdp: false, is_other: false })}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    form.is_jsp 
                      ? 'bg-red-600 text-white border-red-700 shadow-xs' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-red-50'
                  }`}
                >
                  isJSP
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_other: !form.is_other, is_ysrcp: false, is_tdp: false, is_jsp: false })}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition ${
                    form.is_other 
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-purple-50'
                  }`}
                >
                  other
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>
                Disbursement Amount (INR ₹)
              </label>
              <input
                type="number"
                min="0"
                value={form.amount || ''}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Notes / Remarks
              </label>
              <input
                type="text"
                value={form.note || ''}
                onChange={e => setForm({ ...form, note: e.target.value })}
                placeholder="Optional notes or remarks"
                className={inputClass}
              />
            </div>
          </div>

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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
