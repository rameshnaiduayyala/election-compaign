import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Edit3, Trash2, Search, X, Shield, Smartphone, RotateCcw, ShieldAlert, CheckCircle2 } from 'lucide-react'

export default function UsersManagement({ setNotice, currentUserId, currentUserRole = 'admin' }) {
  const isSuperAdmin = String(currentUserRole).toLowerCase().trim() === 'super_admin' || String(currentUserRole).toLowerCase().trim() === 'superadmin'
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null) // null = add, object = edit
  const [form, setForm] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'agent',
    phone: '',
    ward_number: '2',
    is_active: true
  })
  const [saving, setSaving] = useState(false)

  async function loadUsers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      setNotice(`Error loading users: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  function openAddModal() {
    setEditingUser(null)
    setForm({
      username: '',
      password: '',
      full_name: '',
      role: 'agent',
      phone: '',
      ward_number: '2',
      is_active: true
    })
    setModalOpen(true)
  }

  function openEditModal(user) {
    if ((user.role === 'super_admin' || user.role === 'superadmin') && !isSuperAdmin) {
      setNotice('Access Denied: Super Admin accounts can only be edited by a Super Admin.')
      return
    }

    setEditingUser(user)
    setForm({
      username: user.username,
      password: user.password,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || '',
      ward_number: user.ward_number || '2',
      is_active: user.is_active
    })
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)

    try {
      const trimmedUser = form.username.trim().toLowerCase()
      const trimmedName = form.full_name.trim()

      if (!trimmedUser || !trimmedName || !form.password) {
        setNotice('Please fill in username, password, and full name.')
        setSaving(false)
        return
      }

      if (form.role === 'super_admin' && !isSuperAdmin) {
        setNotice('Access Denied: Only a Super Admin can create or assign the Super Admin role.')
        setSaving(false)
        return
      }

      if (editingUser) {
        // Update user
        const { error } = await supabase
          .from('users')
          .update({
            password: form.password,
            full_name: trimmedName,
            role: form.role,
            phone: form.phone ? form.phone.trim() : null,
            ward_number: form.ward_number || '2',
            is_active: form.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id)

        if (error) throw error
        setNotice(`User '${trimmedUser}' updated successfully in Supabase!`)
      } else {
        // Insert new user
        const { error } = await supabase
          .from('users')
          .insert([{
            username: trimmedUser,
            password: form.password,
            full_name: trimmedName,
            role: form.role,
            phone: form.phone ? form.phone.trim() : null,
            ward_number: form.ward_number || '2',
            is_active: form.is_active
          }])

        if (error) {
          if (error.code === '23505') {
            throw new Error(`Username '${trimmedUser}' already exists. Please choose a different username.`)
          }
          throw error
        }
        setNotice(`User '${trimmedUser}' created successfully in Supabase!`)
      }

      setModalOpen(false)
      loadUsers()
    } catch (err) {
      setNotice(`Error saving user: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(user) {
    if (user.id === currentUserId) {
      setNotice('Cannot delete your own active administrator account.')
      return
    }

    if ((user.role === 'super_admin' || user.role === 'superadmin') && !isSuperAdmin) {
      setNotice('Access Denied: Regular Administrators cannot delete Super Admin accounts.')
      return
    }

    const confirm = window.confirm(`Are you sure you want to delete user '${user.username}' (${user.role}) from Supabase?`)
    if (!confirm) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

      if (error) throw error
      setNotice(`User '${user.username}' deleted successfully from Supabase.`)
      loadUsers()
    } catch (err) {
      setNotice(`Delete error: ${err.message}`)
    }
  }

  // Super Admin Exclusive Reset Device Binding
  async function handleResetDevice(user) {
    if (!isSuperAdmin) {
      setNotice('Access Denied: Only a Super Admin can reset user device binding. Regular Administrators cannot reset devices.')
      return
    }

    const confirmMsg = `[Super Admin Authorization]\n\nAre you sure you want to reset device binding for '${user.username}' (${user.full_name})?\n\n` +
      `Currently Registered Device: ${user.bound_device_name || 'Registered Device'}\n\n` +
      `Resetting will allow this user to register and bind a new device on their next login.`
    
    if (!window.confirm(confirmMsg)) return

    try {
      // 1. Try server RPC
      const { data: rpcResult, error: rpcError } = await supabase.rpc('reset_user_device_binding', {
        p_user_id: user.id
      })

      if (!rpcError && rpcResult?.success) {
        setNotice(`Device binding for '${user.username}' successfully reset by Super Admin.`)
        loadUsers()
        return
      }

      // 2. Direct Supabase update fallback
      const { error } = await supabase
        .from('users')
        .update({
          bound_device_id: null,
          bound_device_name: null,
          bound_device_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      setNotice(`Device binding for '${user.username}' has been successfully reset! They can now log in and bind a new device.`)
      loadUsers()
    } catch (err) {
      setNotice(`Reset device error: ${err.message}`)
    }
  }

  const roleBadge = (role) => {
    switch (role) {
      case 'super_admin':
      case 'superadmin':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">SUPER ADMIN (All + Device Reset)</span>
      case 'admin':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">ADMIN (No Device Reset)</span>
      case 'agent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">AGENT (Edit Party)</span>
      case 'distributor':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">DISTRIBUTOR (Change Amount)</span>
      case 'user':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">USER (Read-only)</span>
    }
  }

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  )

  const inputClass = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
  const labelClass = "block text-xs font-bold text-slate-700 mb-1"

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-400 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition">
          <Search size={18} className="shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users by username, name, or role..."
            className="w-full bg-transparent border-0 outline-none pl-2.5 text-xs md:text-sm text-slate-800 placeholder-slate-400 font-medium"
          />
        </div>

        <div>
          <button 
            type="button"
            onClick={openAddModal} 
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus size={16} /> Add New User
          </button>
        </div>
      </div>

      {/* Role Guide Card */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <Shield size={16} className="text-blue-600" />
          <span>User Role Rights Summary:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-1 text-[11px]">
          <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 shadow-2xs">
            <b className="text-rose-900 block font-black">super_admin</b>
            <span className="text-rose-700">All admin rights + Exclusive Device Reset authority</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-purple-200 shadow-2xs">
            <b className="text-purple-800 block font-bold">admin</b>
            <span className="text-slate-600">All rights (Voters, Party, Amounts, Users), CANNOT reset devices</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-amber-200 shadow-2xs">
            <b className="text-amber-800 block font-bold">agent</b>
            <span className="text-slate-600">Can change or edit Party Tags (isysrcp, isTDP, isJSP, other)</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-blue-200 shadow-2xs">
            <b className="text-blue-800 block font-bold">distributor</b>
            <span className="text-slate-600">Can change or edit Amount and field notes</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <b className="text-slate-800 block font-bold">user</b>
            <span className="text-slate-600">Strictly read-only access</span>
          </div>
        </div>

        {/* Permanent Single-Device Binding Security Notice */}
        <div className="mt-3 p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start gap-2.5 text-slate-700">
          <Smartphone size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-[11px] leading-snug">
            <span className="font-bold text-blue-900 block">Permanent Single-Device Binding Protection Active:</span>
            <span>
              Each account permanently binds to the first device used for successful login. Unlimited login & logout sessions are permitted on that same device. All other devices are strictly blocked even when logged out. <b>Only Super Admin can reset user devices; Admin cannot reset devices.</b>
            </span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">Users Table</h3>
          </div>
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-bold text-xs border border-slate-200">
            {users.length} accounts configured
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Username</th>
                <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Full Name</th>
                <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Role & Permissions</th>
                <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Registered Device</th>
                <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Ward</th>
                <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Phone</th>
                <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Password</th>
                <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Status</th>
                <th className="px-4 py-3 font-bold text-slate-700 uppercase tracking-wider text-[11px] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="9" className="text-center py-12 text-slate-400 font-medium">Loading accounts from Supabase…</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-12 text-slate-400 font-medium">No users found.</td></tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{u.username}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{u.full_name}</td>
                    <td className="px-4 py-3">{roleBadge(u.role)}</td>
                    <td className="px-4 py-3">
                      {(u.role === 'super_admin' || u.role === 'superadmin') ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                          <span>All Devices Allowed (No Lock)</span>
                        </span>
                      ) : u.bound_device_id ? (
                        <div className="flex flex-col gap-0.5 max-w-[190px]">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                            <Smartphone size={11} className="text-blue-600 shrink-0" />
                            <span className="truncate" title={u.bound_device_name || 'Registered Device'}>
                              {u.bound_device_name || 'Registered Device'}
                            </span>
                          </span>
                          {u.bound_device_at && (
                            <span className="text-[9px] text-slate-400 font-medium">
                              Bound: {new Date(u.bound_device_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <ShieldAlert size={11} className="text-amber-500 shrink-0" />
                          <span>Unbound (1st login)</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">Ward {u.ward_number || '2'}</td>
                    <td className="px-4 py-3 text-slate-600">{u.phone || '—'}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{u.password}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs transition inline-flex items-center gap-1"
                          title="Edit user details"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        {u.bound_device_id && (
                          isSuperAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleResetDevice(u)}
                              className="px-2.5 py-1 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-lg shadow-2xs transition inline-flex items-center gap-1"
                              title="Reset device binding (Super Admin only)"
                            >
                              <RotateCcw size={12} /> Reset Device
                            </button>
                          ) : (
                            <span 
                              className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-medium rounded border border-slate-200 cursor-not-allowed select-none inline-flex items-center gap-1"
                              title="Device reset is restricted to Super Admin only. Admin cannot reset devices."
                            >
                              Reset Locked
                            </span>
                          )
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete user"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add / Edit User */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900 m-0">
                {editingUser ? `Edit User: ${editingUser.username}` : 'Add New User'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col overflow-hidden">
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-3.5 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Username *</label>
                    <input
                      required
                      disabled={Boolean(editingUser)}
                      value={form.username}
                      onChange={e => setForm({ ...form, username: e.target.value })}
                      placeholder="e.g. agent2"
                      className={`${inputClass} ${editingUser ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Password *</label>
                    <input
                      required
                      type="text"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="Enter login password"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Full Name *</label>
                  <input
                    required
                    value={form.full_name}
                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Assigned Role *</label>
                    <select
                      value={form.role}
                      onChange={e => setForm({ ...form, role: e.target.value })}
                      className={inputClass}
                    >
                      {isSuperAdmin && (
                        <option value="super_admin">super_admin (Full Admin + Device Reset)</option>
                      )}
                      <option value="admin">admin (Full Admin, No Device Reset)</option>
                      <option value="agent">agent (Change/edit Party Tag)</option>
                      <option value="distributor">distributor (Change Amount)</option>
                      <option value="user">user (Readonly only)</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Ward Number</label>
                    <input
                      value={form.ward_number}
                      onChange={e => setForm({ ...form, ward_number: e.target.value })}
                      placeholder="2"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      placeholder="9876543210"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Account Status</label>
                    <select
                      value={form.is_active ? 'true' : 'false'}
                      onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}
                      className={inputClass}
                    >
                      <option value="true">Active (Can Sign In)</option>
                      <option value="false">Inactive (Suspended)</option>
                    </select>
                  </div>
                </div>

                {editingUser && editingUser.bound_device_id && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-blue-900 block flex items-center gap-1.5">
                        <Smartphone size={14} className="text-blue-600" />
                        <span>Registered Device Bound</span>
                      </span>
                      <span className="text-blue-700 text-[11px] font-mono block mt-0.5">
                        {editingUser.bound_device_name || 'Bound Device'}
                      </span>
                    </div>
                    {isSuperAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleResetDevice(editingUser)
                          setModalOpen(false)
                        }}
                        className="px-2.5 py-1.5 bg-rose-50 border border-rose-300 hover:bg-rose-100 text-rose-900 font-bold text-xs rounded-lg shadow-2xs transition inline-flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Reset Device
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium italic">
                        (Super Admin only)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)} 
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? 'Saving to Supabase…' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
