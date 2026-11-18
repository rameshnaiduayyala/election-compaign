import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { MapPin, Plus, Trash2, Edit2, Check, X, Users, RefreshCw } from 'lucide-react'

// Default fallback areas if table has not been created or is empty yet
export const DEFAULT_AREAS = [
  { id: 'area-1', name: 'Ramalayam Veedhi', ward_number: '2', description: 'Ramalayam Temple Street & surroundings' },
  { id: 'area-2', name: 'Main Road Street', ward_number: '2', description: 'Main Road Commercial & Residential' },
  { id: 'area-3', name: 'BC Colony', ward_number: '2', description: 'BC Colony community sector' },
  { id: 'area-4', name: 'Golla Veedhi', ward_number: '2', description: 'Golla family residential street' },
  { id: 'area-5', name: 'Kadiyala Street', ward_number: '2', description: 'Kadiyala lane & neighborhood' },
  { id: 'area-6', name: 'Panchayat Office Ward', ward_number: '2', description: 'Panchayat office area' }
]

export default function AreasManagement({ setNotice, currentUserRole }) {
  const [areas, setAreas] = useState([])
  const [voterCounts, setVoterCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isUsingFallback, setIsUsingFallback] = useState(false)

  // Add new area modal/form state
  const [newName, setNewName] = useState('')
  const [newWard, setNewWard] = useState('2')
  const [newDesc, setNewDesc] = useState('')
  const [adding, setAdding] = useState(false)

  // Inline edit state
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editWard, setEditWard] = useState('2')
  const [editDesc, setEditDesc] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'super_admin' || currentUserRole === 'superadmin'

  async function loadAreasAndCounts() {
    setLoading(true)
    try {
      // 1. Fetch areas from database
      const { data: areasData, error: areasError } = await supabase
        .from('areas')
        .select('*')
        .order('name', { ascending: true })

      if (areasError) {
        // Table probably not yet created or schema cache pending
        setIsUsingFallback(true)
        setAreas(DEFAULT_AREAS)
      } else if (areasData && areasData.length > 0) {
        setIsUsingFallback(false)
        setAreas(areasData)
      } else {
        // Empty table, fallback to defaults
        setIsUsingFallback(true)
        setAreas(DEFAULT_AREAS)
      }

      // 2. Fetch voter counts per area
      try {
        const { data: votersData } = await supabase
          .from('voters')
          .select('area_name, area_id')

        if (votersData && Array.isArray(votersData)) {
          const counts = {}
          votersData.forEach(v => {
            if (v.area_name) {
              counts[v.area_name] = (counts[v.area_name] || 0) + 1
            }
            if (v.area_id) {
              counts[v.area_id] = (counts[v.area_id] || 0) + 1
            }
          })
          setVoterCounts(counts)
        }
      } catch (e) {
        console.warn('Voter counts lookup error:', e)
      }
    } catch (err) {
      console.error(err)
      setIsUsingFallback(true)
      setAreas(DEFAULT_AREAS)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAreasAndCounts()
  }, [])

  async function handleAddArea(e) {
    e.preventDefault()
    if (!newName.trim()) return

    setAdding(true)
    try {
      const { data, error } = await supabase
        .from('areas')
        .insert({
          name: newName.trim(),
          ward_number: newWard.trim() || '2',
          description: newDesc.trim() || null
        })
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('areas')) {
          setNotice('Please run supabase/CREATE_AREAS_TABLE.sql in your Supabase SQL Editor first!')
        } else {
          setNotice(`Failed to add area: ${error.message}`)
        }
      } else {
        setNotice(`Area "${newName.trim()}" added successfully!`)
        setNewName('')
        setNewDesc('')
        loadAreasAndCounts()
      }
    } catch (err) {
      setNotice(err.message)
    } finally {
      setAdding(false)
    }
  }

  function startEdit(area) {
    setEditingId(area.id)
    setEditName(area.name)
    setEditWard(area.ward_number || '2')
    setEditDesc(area.description || '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditDesc('')
  }

  async function handleSaveEdit(id) {
    if (!editName.trim()) return
    setSavingEdit(true)
    try {
      const { error } = await supabase
        .from('areas')
        .update({
          name: editName.trim(),
          ward_number: editWard.trim() || '2',
          description: editDesc.trim() || null
        })
        .eq('id', id)

      if (error) {
        setNotice(`Failed to update: ${error.message}`)
      } else {
        setNotice(`Area updated successfully!`)
        setEditingId(null)
        loadAreasAndCounts()
      }
    } catch (err) {
      setNotice(err.message)
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDeleteArea(area) {
    const count = voterCounts[area.name] || voterCounts[area.id] || 0
    if (count > 0) {
      if (!confirm(`Warning: ${count} voter(s) are currently assigned to "${area.name}". Are you sure you want to delete this area?`)) {
        return
      }
    } else {
      if (!confirm(`Delete area "${area.name}"?`)) return
    }

    try {
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', area.id)

      if (error) {
        setNotice(`Failed to delete: ${error.message}`)
      } else {
        setNotice(`Area "${area.name}" deleted.`)
        loadAreasAndCounts()
      }
    } catch (err) {
      setNotice(err.message)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
            <MapPin size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Area Management</h2>
            <p className="text-xs text-slate-500">
              Create and manage localized areas, streets, and colonies for Ward 2 electors.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setRefreshing(true); loadAreasAndCounts() }}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {isUsingFallback && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
          <span className="font-bold text-amber-600">ℹ Note:</span>
          <div>
            <p className="font-semibold mb-1">
              Currently showing preset Ward 2 default areas.
            </p>
            <p className="text-amber-800">
              To persist custom areas and assign them to voters in Supabase, execute the script <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">supabase/CREATE_AREAS_TABLE.sql</code> in your Supabase SQL Editor.
            </p>
          </div>
        </div>
      )}

      {/* Add New Area Form (Admins Only) */}
      {isAdmin && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus size={16} className="text-blue-600" />
            Add New Area / Street
          </h3>
          <form onSubmit={handleAddArea} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Area / Street Name *
              </label>
              <input
                required
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Ramalayam Veedhi, BC Colony"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ward No.
              </label>
              <input
                type="text"
                value={newWard}
                onChange={e => setNewWard(e.target.value)}
                placeholder="2"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Notes
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Optional description"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={adding || !newName.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {adding ? 'Adding…' : '+ Add Area'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Areas Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Defined Areas</h3>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold text-xs border border-blue-200">
              {areas.length} Areas
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium">
            Loading areas from Supabase…
          </div>
        ) : areas.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-medium">
            No areas defined yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {areas.map(area => {
              const isEditing = editingId === area.id
              const count = voterCounts[area.name] || voterCounts[area.id] || 0

              if (isEditing) {
                return (
                  <div key={area.id} className="p-4 bg-blue-50/50 flex flex-col sm:flex-row gap-3 items-center">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none"
                      placeholder="Area Name"
                    />
                    <input
                      type="text"
                      value={editWard}
                      onChange={e => setEditWard(e.target.value)}
                      className="w-20 px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none"
                      placeholder="Ward"
                    />
                    <input
                      type="text"
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none"
                      placeholder="Description"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(area.id)}
                        disabled={savingEdit || !editName.trim()}
                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        title="Save"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={area.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                      <MapPin size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{area.name}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-semibold border border-slate-200">
                          Ward {area.ward_number || '2'}
                        </span>
                      </div>
                      {area.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{area.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Voters assigned badge */}
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                      <Users size={13} className="text-slate-500" />
                      <span>{count} Voters</span>
                    </div>

                    {isAdmin && !isUsingFallback && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(area)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Area"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArea(area)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Area"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
