import { NavLink } from 'react-router-dom'

export default function BottomNav({ nav }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 shadow-lg px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] print:hidden">
      <div className="flex h-15 items-center justify-around">
        {nav.map(item => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 min-w-[58px] text-[10px] font-bold transition rounded-xl ${
                isActive 
                  ? 'text-blue-600 font-extrabold' 
                  : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            <item.icon size={18} className="shrink-0" />
            <span className="truncate max-w-[70px] tracking-tight">{item.shortLabel || item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
