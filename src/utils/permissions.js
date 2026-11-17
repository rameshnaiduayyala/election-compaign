export function getPermissions(role) {
  const r = String(role || '').toLowerCase().trim()

  return {
    role: r,
    isAdmin: r === 'admin',
    isAgent: r === 'agent',
    isUser: r === 'user',
    isDistributor: r === 'distributor',
    
    // 1. admin has all rights
    // 2. agent has change or edit Party Tag (isysrcp / isTDP / isJSP / other)
    canEditParty: r === 'admin' || r === 'agent',

    // 3. distributor has change amount (amount is hidden from agent & user)
    canViewAmount: r === 'admin' || r === 'distributor',
    canEditAmount: r === 'admin' || r === 'distributor',

    // 4. user has only show readonly
    isReadOnly: r === 'user',

    // Administrative privileges (Add, Delete, CSV Import)
    canAddVoter: r === 'admin',
    canDeleteVoter: r === 'admin',
    canImportCsv: r === 'admin',
    canManageExpenses: r === 'admin'
  }
}
