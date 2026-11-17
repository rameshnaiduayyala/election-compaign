import { Link, NavLink } from 'react-router-dom'
import { LogOut, X, Smartphone } from 'lucide-react'

export default function Sidebar({ 
  nav, 
  userEmail, 
  onSignOut,
  mobileOpen = false,
  onCloseMobile,
  onInstallApp,
  isInstalled = false
}) {
  return (
    <>
      {/* Mobile Slide-Out Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" 
            onClick={onCloseMobile} 
            aria-label="Close menu"
          />
          <div className="relative w-72 max-w-[80vw] bg-slate-900 border-r border-slate-800 text-white p-5 flex flex-col justify-between z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                <div className="flex items-center gap-3">
                  <img 
                    src="/Ajay-round.png" 
                    alt="Akula Ajay" 
                    className="w-10 h-10 rounded-full object-cover shadow-md border-2 border-blue-500/40"
                  />
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 block">WARD 2 · VENKAYAMMAPETA</span>
                    <b className="text-sm font-bold text-white block">Akula Ajay</b>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={onCloseMobile} 
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  aria-label="Close drawer"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="space-y-1.5">
                {nav.map(item => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      }`
                    }
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800">
              {!isInstalled && (
                <button
                  type="button"
                  onClick={() => { if (onCloseMobile) onCloseMobile(); onInstallApp() }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-500/25 mb-3"
                >
                  <Smartphone size={16} /> 📲 Install Mobile App
                </button>
              )}
              <div className="text-[11px] text-slate-400 mb-3 truncate">
                User: <b className="text-slate-200">{userEmail}</b>
              </div>
              <button
                type="button"
                onClick={() => { if (onCloseMobile) onCloseMobile(); onSignOut() }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition border border-red-500/20"
              >
                <LogOut size={16} /> Sign Out
              </button>
              <div className="text-[10px] text-center text-slate-500 mt-3 pt-2 border-t border-slate-800/80 font-medium">
                Developed by <span className="font-semibold text-slate-300">Ramesh Ayyala</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop & Tablet Navigation Dock */}
      <aside className="hidden md:flex flex-col items-center fixed left-3.5 top-3.5 bottom-3.5 w-16 bg-slate-900 border border-slate-800 rounded-2xl py-4 px-2 z-50 shadow-2xl text-slate-100 print:hidden" aria-label="Main Navigation Dock">
        {/* Brand Icon with hover tooltip */}
        <Link 
          to="/" 
          className="relative group flex items-center justify-center w-11 h-11 rounded-full transition hover:scale-105" 
          title="Akula Ajay · Ward 2"
        >
          <img 
            src="/Ajay-round.png" 
            alt="Akula Ajay" 
            className="w-10 h-10 rounded-full object-cover shadow-md border-2 border-blue-500/40 group-hover:border-blue-400 transition"
          />
          <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 border border-slate-700">
            Akula Ajay (Ward 2)
          </span>
        </Link>

        <div className="w-8 h-px bg-slate-800 my-3" />

        {/* Floating Navigation Icons */}
        <div className="flex flex-col items-center gap-2 flex-1 w-full">
          {nav.map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `relative group flex items-center justify-center w-11 h-11 rounded-xl transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`
              }
              title={item.label}
            >
              <item.icon size={20} />
              <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 border border-slate-700">
                {item.label}
              </span>
            </NavLink>
          ))}
        </div>

        {/* Bottom Floating Items: Avatar and Logout */}
        <div className="flex flex-col items-center gap-2 mt-auto w-full pt-3 border-t border-slate-800/80">
          <div 
            className="relative group flex items-center justify-center w-11 h-11 rounded-xl transition hover:bg-slate-800/80 cursor-pointer" 
            title={userEmail || 'User'}
          >
            <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center border border-slate-600">
              {(userEmail || 'A').slice(0, 1).toUpperCase()}
            </div>
            <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 border border-slate-700">
              {userEmail || 'User Profile'}
            </span>
          </div>

          <button 
            type="button"
            className="relative group flex items-center justify-center w-11 h-11 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
            onClick={onSignOut}
            title="Sign out"
          >
            <LogOut size={19} />
            <span className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-red-300 text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 border border-slate-700">
              Sign out
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
