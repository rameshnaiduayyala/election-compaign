import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, UserCheck, Printer, MapPin, Home, FileSpreadsheet } from 'lucide-react'
import { supabase } from './lib/supabase'
import { getDeviceId } from './utils/deviceBinding'

// Modular Components
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import BottomNav from './components/layout/BottomNav'
import Dashboard from './components/dashboard/Dashboard'
import VotersDirectory from './components/voters/VotersDirectory'
import FamilyGrouping from './components/voters/FamilyGrouping'
import SerialTablePrint from './components/voters/SerialTablePrint'
import GroupVoters from './components/groups/GroupVoters'
import AreasManagement from './components/areas/AreasManagement'
import PhotoPreviewModal from './components/voters/PhotoPreviewModal'
import UsersManagement from './components/users/UsersManagement'
import Login from './components/auth/Login'
import Notice from './components/ui/Notice'
import { usePWAInstall } from './utils/usePWAInstall'

const BASE_NAV = [
  { id: 'dashboard', path: '/', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { id: 'voters', path: '/voters', label: 'Voters Directory', shortLabel: 'Voters', icon: Users },
  { id: 'families', path: '/family-grouping', label: 'Family Grouping', shortLabel: 'Families', icon: Home },
  { id: 'table-print', path: '/table-print', label: 'Elector Slips Table', shortLabel: 'Slips Table', icon: FileSpreadsheet },
  { id: 'groups', path: '/group-voters', label: 'Group & Print', shortLabel: 'Print', icon: Printer }
]

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  // Session loaded from sessionStorage for users table auth
  const [session, setSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('election_user_session')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [mobileNav, setMobileNav] = useState(false)
  const [notice, setNotice] = useState('')
  const [photoPreview, setPhotoPreview] = useState(null)
  const { isInstalled, triggerInstall } = usePWAInstall()

  const handleLogin = (userSession) => {
    setSession(userSession)
    try {
      sessionStorage.setItem('election_user_session', JSON.stringify(userSession))
    } catch (e) {
      console.warn('SessionStorage error:', e)
    }
    navigate('/')
  }

  const handleSignOut = () => {
    setSession(null)
    sessionStorage.removeItem('election_user_session')
    navigate('/login')
  }

  // Active Single-Device Verification:
  // If Super Admin resets device binding, or if credentials were transferred to another machine,
  // revoke session immediately.
  // NOTE: Super Admin is completely exempt from device locks (can log in from any and every device without bounding).
  useEffect(() => {
    if (!session?.user?.id) return

    const normalizedRole = String(session.user.role || '').toLowerCase().trim().replace(/[\s_-]+/g, '')
    if (normalizedRole === 'superadmin') {
      return // Super Admin has unrestricted multi-device access and zero bounding
    }

    const currentDeviceId = getDeviceId()

    // 1. Local hardware check
    if (session.user.bound_device_id && session.user.bound_device_id !== currentDeviceId) {
      handleSignOut()
      return
    }

    // 2. Live Supabase database check
    async function verifyDeviceIntegrity() {
      try {
        const { data: user, error } = await supabase
          .from('users')
          .select('bound_device_id, is_active')
          .eq('id', session.user.id)
          .maybeSingle()

        if (error || !user) return
        
        // Deactivated user or device unbound by Admin
        if (!user.is_active || (user.bound_device_id && user.bound_device_id !== currentDeviceId)) {
          handleSignOut()
        }
      } catch (err) {
        console.warn('Device verification check error:', err)
      }
    }

    verifyDeviceIntegrity()
  }, [session])

  const currentUserName = session?.user?.full_name || session?.user?.username || 'User'
  const currentUserRole = String(session?.user?.role || 'user').toLowerCase()
  const isSuperAdmin = currentUserRole === 'super_admin' || currentUserRole === 'superadmin'
  const isAdmin = isSuperAdmin || currentUserRole === 'admin'

  // Only admins get User Management and Area Management in navigation
  const navItems = isAdmin 
    ? [
        ...BASE_NAV, 
        { id: 'areas', path: '/areas', label: 'Area Management', shortLabel: 'Areas', icon: MapPin },
        { id: 'users', path: '/users', label: 'User Management', shortLabel: 'Users', icon: UserCheck }
      ]
    : BASE_NAV

  // Page title derived from current URL path
  const currentPageTitle = 
    location.pathname === '/voters' ? 'Voters Directory' :
    location.pathname === '/family-grouping' ? 'Family Grouping' :
    location.pathname === '/table-print' ? 'WARD 2 — ELECTOR SLIPS TABLE' :
    location.pathname === '/group-voters' ? 'Group & Print Voters' :
    location.pathname === '/areas' ? 'Area Management' :
    location.pathname === '/users' ? 'User Management' :
    'Dashboard'

  return (
    <Routes>
      {/* Login Route */}
      <Route 
        path="/login" 
        element={!session?.user ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />} 
      />

      {/* Protected App Routes */}
      <Route 
        path="/*" 
        element={
          !session?.user ? (
            <Navigate to="/login" replace />
          ) : (
            <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased">
              {/* Desktop & Tablet Floating Navigation Dock + Mobile Slide-Out Drawer */}
              <Sidebar 
                nav={navItems}
                userEmail={`${currentUserName} (${currentUserRole})`}
                onSignOut={handleSignOut}
                mobileOpen={mobileNav}
                onCloseMobile={() => setMobileNav(false)}
                onInstallApp={triggerInstall}
                isInstalled={isInstalled}
              />

              {/* Main Content Area */}
              <main className="flex-1 min-w-0 md:ml-24 p-2.5 sm:p-4 md:p-6 pb-24 md:pb-8 flex flex-col print:m-0 print:p-0 print:ml-0">
                <Topbar 
                  pageTitle={currentPageTitle}
                  currentUser={currentUserName}
                  userRole={currentUserRole}
                  onOpenMobileMenu={() => setMobileNav(true)}
                  onSignOut={handleSignOut}
                  onInstallApp={triggerInstall}
                  isInstalled={isInstalled}
                />

                <Notice 
                  notice={notice} 
                  onDismiss={() => setNotice('')} 
                />

                <Routes>
                  <Route 
                    path="/" 
                    element={<Dashboard userRole={currentUserRole} setNotice={setNotice} />} 
                  />
                  <Route 
                    path="/dashboard" 
                    element={<Navigate to="/" replace />} 
                  />
                  <Route 
                    path="/voters" 
                    element={
                      <VotersDirectory 
                        setNotice={setNotice} 
                        userRole={currentUserRole}
                        currentUser={currentUserName}
                        onOpenPhoto={setPhotoPreview}
                      />
                    } 
                  />
                  <Route 
                    path="/family-grouping" 
                    element={
                      <FamilyGrouping 
                        setNotice={setNotice} 
                        userRole={currentUserRole} 
                      />
                    } 
                  />
                  <Route 
                    path="/table-print" 
                    element={
                      <SerialTablePrint 
                        setNotice={setNotice} 
                        userRole={currentUserRole} 
                      />
                    } 
                  />
                  <Route 
                    path="/group-voters" 
                    element={
                      <GroupVoters 
                        userRole={currentUserRole} 
                        setNotice={setNotice} 
                      />
                    } 
                  />
                  <Route 
                    path="/groups" 
                    element={<Navigate to="/group-voters" replace />} 
                  />
                  <Route 
                    path="/areas" 
                    element={
                      <AreasManagement 
                        setNotice={setNotice}
                        currentUserRole={currentUserRole}
                      />
                    } 
                  />
                  {isAdmin && (
                    <Route 
                      path="/users" 
                      element={
                        <UsersManagement 
                          setNotice={setNotice}
                          currentUserId={session.user.id}
                          currentUserRole={currentUserRole}
                        />
                      } 
                    />
                  )}
                  {/* Redirect unmatched nested paths to home */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>

                {/* Global Application Footer */}
                <footer className="mt-auto pt-8 pb-3 text-center text-xs text-slate-500 font-medium print:hidden">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <span>© {new Date().getFullYear()} Ward 2 Venkayammapeta</span>
                    <span className="text-slate-300 hidden sm:inline">·</span>
                    <span className="font-semibold text-slate-600">
                      Developed by <span className="text-blue-600 font-bold">Ramesh (7989419864)</span>
                    </span>
                  </div>
                </footer>

                {/* Modal: Full Photo Preview */}
                <PhotoPreviewModal 
                  photoPreview={photoPreview} 
                  onClose={() => setPhotoPreview(null)} 
                />
              </main>

              {/* Mobile App Bottom Navigation Bar */}
              <BottomNav nav={navItems} />
            </div>
          )
        } 
      />
    </Routes>
  )
}
