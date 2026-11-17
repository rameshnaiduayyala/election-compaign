export default function Notice({ notice, onDismiss }) {
  if (!notice) return null

  return (
    <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center justify-between shadow-xs">
      <span className="font-medium">{notice}</span>
      <button 
        type="button" 
        onClick={onDismiss}
        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline ml-3 shrink-0"
      >
        Dismiss
      </button>
    </div>
  )
}
