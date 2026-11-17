import { Menu, LogOut, Smartphone } from 'lucide-react'

export default function Topbar({ 
  pageTitle, 
  currentUser = 'User', 
  userRole = 'user',
  onOpenMobileMenu, 
  onSignOut,
  onInstallApp,
  isInstalled = false
}) {
  const getRoleBadge = (role) => {
    switch (String(role).toLowerCase()) {
      case 'admin':
        return <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">Admin</span>
      case 'agent':
        return <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">Agent</span>
      case 'distributor':
        return <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">Distributor</span>
      case 'user':
      default:
        return <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Readonly</span>
    }
  }

  return (
    <header className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs mb-4 sm:mb-6 print:hidden">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button 
          className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 transition shrink-0" 
          onClick={onOpenMobileMenu} 
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <img 
          src="/Ajay-round.png" 
          alt="Akula Ajay" 
          className="md:hidden w-8 h-8 rounded-full object-cover border border-blue-500/30 shrink-0 shadow-xs"
        />
        <div className="min-w-0">
          <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-blue-600 block leading-none mb-0.5 sm:mb-1 truncate">
            WARD 2 · AKULA AJAY
          </span>
          <h1 className="text-sm sm:text-base md:text-xl font-bold text-slate-900 leading-tight m-0 truncate">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Install Mobile App Button */}
        {!isInstalled && (
          <button
            type="button"
            onClick={onInstallApp}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition shadow-2xs"
            title="Install Mobile App on your device"
          >
            <Smartphone size={14} className="text-blue-600 shrink-0" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {/* Logged-in User Name & Role in Top Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-full shadow-xs">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
            {(currentUser || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight truncate max-w-[85px] sm:max-w-[130px]">
              {currentUser}
            </span>
            <span className="text-[9px] text-slate-500 font-medium capitalize hidden sm:block">
              {userRole}
            </span>
          </div>
          <div className="ml-1 hidden md:block">
            {getRoleBadge(userRole)}
          </div>
        </div>

        <button 
          type="button"
          onClick={onSignOut} 
          className="text-slate-400 hover:text-red-600 p-1.5 sm:p-2 rounded-lg hover:bg-slate-50 transition shrink-0" 
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
