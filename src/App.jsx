import { useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, UserCheck, Printer } from 'lucide-react'

// Modular Components
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import BottomNav from './components/layout/BottomNav'
import Dashboard from './components/dashboard/Dashboard'
import VotersDirectory from './components/voters/VotersDirectory'
import GroupVoters from './components/groups/GroupVoters'
import PhotoPreviewModal from './components/voters/PhotoPreviewModal'
import UsersManagement from './components/users/UsersManagement'
import Login from './components/auth/Login'
import Notice from './components/ui/Notice'

const BASE_NAV = [
  { id: 'dashboard', path: '/', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { id: 'voters', path: '/voters', label: 'Voters Directory', shortLabel: 'Voters', icon: Users },
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

  const currentUserName = session?.user?.full_name || session?.user?.username || 'User'
  const currentUserRole = String(session?.user?.role || 'user').toLowerCase()
  const isAdmin = currentUserRole === 'admin'

  // Only admins get User Management in navigation
  const navItems = isAdmin 
    ? [...BASE_NAV, { id: 'users', path: '/users', label: 'User Management', shortLabel: 'Users', icon: UserCheck }]
    : BASE_NAV

  // Page title derived from current URL path
  const currentPageTitle = 
    location.pathname === '/voters' ? 'Voters Directory' :
    location.pathname === '/group-voters' ? 'Group & Print Voters' :
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
              />

              {/* Main Content Area */}
              <main className="flex-1 min-w-0 md:ml-24 p-2.5 sm:p-4 md:p-6 pb-24 md:pb-8 flex flex-col print:m-0 print:p-0 print:ml-0">
                <Topbar 
                  pageTitle={currentPageTitle}
                  currentUser={currentUserName}
                  userRole={currentUserRole}
                  onOpenMobileMenu={() => setMobileNav(true)}
                  onSignOut={handleSignOut}
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
                  {isAdmin && (
                    <Route 
                      path="/users" 
                      element={
                        <UsersManagement 
                          setNotice={setNotice}
                          currentUserId={session.user.id}
                        />
                      } 
                    />
                  )}
                  {/* Redirect unmatched nested paths to home */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>

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
