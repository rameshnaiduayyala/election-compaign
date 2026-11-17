export function getPermissions(role) {
  const r = String(role || '').toLowerCase().trim()
  const isSuperAdmin = r === 'super_admin' || r === 'superadmin' || r === 'super admin'
  const isAdmin = isSuperAdmin || r === 'admin'
  const isAgent = r === 'agent' || r === 'booth_agent'
  const isDistributor = r === 'distributor'
  const isUser = r === 'user' || r === 'staff'

  return {
    role: r,
    isSuperAdmin,
    isAdmin, // true for both super_admin and admin
    isAgent,
    isUser,
    isDistributor,
    
    // Exclusive to Super Admin: Only Super Admin can reset user device binding!
    // Regular Admin cannot reset devices.
    canResetDevice: isSuperAdmin,

    // Shared privileges:
    canEditParty: isAdmin || isAgent,
    canViewAmount: isAdmin || isDistributor,
    canEditAmount: isAdmin || isDistributor,

    // Read-only check:
    isReadOnly: isUser && !isAdmin && !isAgent && !isDistributor,

    // Administrative privileges:
    canAddVoter: isAdmin,
    canDeleteVoter: isAdmin,
    canImportCsv: isAdmin,
    canManageExpenses: isAdmin,
    canManageUsers: isAdmin
  }
}
