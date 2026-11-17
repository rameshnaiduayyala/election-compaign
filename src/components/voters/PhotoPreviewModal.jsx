import { X } from 'lucide-react'
import { FALLBACK_AVATAR } from '../../utils/formatters'

export default function PhotoPreviewModal({ photoPreview, onClose }) {
  if (!photoPreview) return null

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-900 m-0 truncate">
            {photoPreview.voter_name_telugu || photoPreview.voter_name_english}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <img 
            src={photoPreview.image_path} 
            alt={photoPreview.voter_name_english} 
            className="max-h-[55vh] max-w-full object-contain mx-auto rounded-xl shadow-md border border-slate-200 bg-slate-50"
            onError={(e) => { e.target.src = FALLBACK_AVATAR }}
          />

          <div className="mt-4 text-xs text-slate-600 space-y-1.5 text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div><b className="text-slate-900">Voter ID:</b> <span className="font-mono text-blue-700 font-bold ml-1">{photoPreview.voter_id}</span></div>
            <div><b className="text-slate-900">Telugu Name:</b> <span className="ml-1">{photoPreview.voter_name_telugu || '—'}</span></div>
            <div><b className="text-slate-900">English Name:</b> <span className="ml-1">{photoPreview.voter_name_english || '—'}</span></div>
            <div><b className="text-slate-900">Relation:</b> <span className="ml-1">{photoPreview.relation_type}: {photoPreview.relative_name}</span></div>
            <div><b className="text-slate-900">House No:</b> <span className="ml-1">{photoPreview.house_number || '—'} · Ward {photoPreview.ward_number || '2'}</span></div>
            <div><b className="text-slate-900">Age / Gender:</b> <span className="ml-1">{photoPreview.age || '—'} yrs / {photoPreview.gender || '—'}</span></div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button 
            type="button" 
            onClick={onClose} 
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  )
}
