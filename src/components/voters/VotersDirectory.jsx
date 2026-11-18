import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { downloadVoterCsv, parseVoterCsv, downloadSampleCsvTemplate } from '../../lib/csv'
import { getPermissions } from '../../utils/permissions'
import VoterTable from './VoterTable'
import VoterCard from './VoterCard'
import AmountModal from './AmountModal'
import AddVoterModal from './AddVoterModal'
import { DEFAULT_AREAS } from '../areas/AreasManagement'
import { Search, Plus, Upload, Download, FileText, Shield, LayoutGrid, Table as TableIcon, Printer, MapPin } from 'lucide-react'

export default function VotersDirectory({ setNotice, userRole, currentUser, onOpenPhoto }) {
  const [searchParams] = useSearchParams()
  const areaQueryParam = searchParams.get('area')

  const permissions = getPermissions(userRole)
  const [allRows, setAllRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid') // 'grid' (Default) | 'table'
  const [search, setSearch] = useState('')
  const [partyFilter, setPartyFilter] = useState('ALL') // 'ALL', 'YSRCP', 'TDP', 'JSP', 'OTHER', 'PAID'
  const [areaFilter, setAreaFilter] = useState(areaQueryParam || 'ALL') // 'ALL' or specific area name
  const [areasList, setAreasList] = useState(DEFAULT_AREAS)
  const [uploading, setUploading] = useState(false)
  const [pageNum, setPageNum] = useState(0)
  const pageSize = 50

  // Amount Edit Modal State
  const [amountModalVoter, setAmountModalVoter] = useState(null)
  const [amountForm, setAmountForm] = useState({
    amount: '',
    amount_given_user: '',
    amount_given_time: '',
    note: ''
  })

  // Add Voter Modal State
  const [voterModalOpen, setVoterModalOpen] = useState(false)
  const [voterForm, setVoterForm] = useState({
    serial_number: '',
    voter_id: '',
    voter_name_english: '',
    voter_name_telugu: '',
    relative_name: '',
    relation_type: 'Father',
    house_number: '',
    age: '',
    gender: 'Female',
    ward_number: '2',
    area_id: null,
    area_name: '',
    image_path: '',
    is_ysrcp: false,
    is_tdp: false,
    is_jsp: false,
    is_other: false,
    amount: '',
    note: ''
  })

  async function loadData() {
    setLoading(true)
    try {
      // 1. Fetch voters
      const { data, error } = await supabase
        .from('voters')
        .select('*')
        .order('serial_number', { ascending: true })

      if (error) {
        setNotice(error.message)
      } else {
        // Strict numerical ascending sort (Starting from 848 sequentially up to 1694)
        const sorted = (data || []).sort((a, b) => {
          const numA = parseInt(a.serial_number, 10)
          const numB = parseInt(b.serial_number, 10)
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB
          return String(a.serial_number || '').localeCompare(String(b.serial_number || ''), undefined, { numeric: true })
        })
        setAllRows(sorted)
      }

      // 2. Fetch areas
      try {
        const { data: areasData, error: areasError } = await supabase
          .from('areas')
          .select('*')
          .order('name', { ascending: true })

        if (!areasError && areasData && areasData.length > 0) {
          setAreasList(areasData)
        }
      } catch (e) {
        console.warn('Areas table not loaded:', e)
      }
    } catch (err) {
      setNotice(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter list based on search, party filter, and area filter
  const filteredRows = useMemo(() => {
    let list = allRows

    if (partyFilter === 'YSRCP') list = list.filter(r => r.is_ysrcp)
    else if (partyFilter === 'TDP') list = list.filter(r => r.is_tdp)
    else if (partyFilter === 'JSP') list = list.filter(r => r.is_jsp)
    else if (partyFilter === 'OTHER') list = list.filter(r => r.is_other)
    else if (partyFilter === 'PAID') list = list.filter(r => Number(r.amount) > 0)

    // Area dropdown filter
    if (areaFilter !== 'ALL') {
      list = list.filter(r => 
        (r.area_name && r.area_name.toLowerCase() === areaFilter.toLowerCase()) ||
        (r.area_id && r.area_id === areaFilter)
      )
    }

    if (search.trim()) {
      const s = search.trim().toLowerCase()
      list = list.filter(r => 
        (r.voter_id && r.voter_id.toLowerCase().includes(s)) ||
        (r.voter_name_english && r.voter_name_english.toLowerCase().includes(s)) ||
        (r.voter_name_telugu && r.voter_name_telugu.toLowerCase().includes(s)) ||
        (r.house_number && r.house_number.toLowerCase().includes(s)) ||
        (r.area_name && r.area_name.toLowerCase().includes(s)) ||
        String(r.serial_number || '').toLowerCase().includes(s)
      )
    }

    return list
  }, [allRows, search, partyFilter, areaFilter])

  // Total pages
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))

  // Paginated slice for current page
  const rows = useMemo(() => {
    const start = pageNum * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, pageNum, pageSize])

  // Direct Supabase mutation for area update
  async function handleAssignArea(voterId, newAreaName) {
    if (!permissions.canEditParty && !permissions.isAdmin) {
      setNotice(`Access Denied: You do not have permission to change voter areas.`)
      return
    }

    const matchedArea = areasList.find(a => a.name === newAreaName)
    const area_id = matchedArea?.id || null
    const area_name = newAreaName || null

    // Optimistic local update
    setAllRows(prev => prev.map(r => r.id === voterId ? { ...r, area_id, area_name } : r))

    try {
      const { error } = await supabase
        .from('voters')
        .update({ area_id, area_name })
        .eq('id', voterId)

      if (error) {
        setNotice(`Failed to update area: ${error.message}. (Did you execute supabase/CREATE_AREAS_TABLE.sql?)`)
        loadData()
      } else {
        setNotice(`Updated area to "${newAreaName || 'None'}" for voter`)
      }
    } catch (err) {
      setNotice(err.message)
      loadData()
    }
  }

  // Direct Supabase mutation for party toggle (Admin and Agent only)
  async function toggleParty(voter, party) {
    if (!permissions.canEditParty) {
      setNotice(`Access Denied: Role '${userRole}' cannot edit party tags. (Agent/Admin only)`)
      return
    }

    const isCurrently = voter[`is_${party.toLowerCase()}`]
    const updates = {
      is_ysrcp: false,
      is_tdp: false,
      is_jsp: false,
      is_other: false
    }
    if (!isCurrently) {
      updates[`is_${party.toLowerCase()}`] = true
    }

    // Optimistic local update
    setAllRows(prev => prev.map(r => r.id === voter.id ? { ...r, ...updates } : r))

    try {
      const { error } = await supabase.from('voters').update(updates).eq('id', voter.id)
      if (error) {
        setNotice(`Supabase update error: ${error.message}`)
        loadData()
      }
    } catch (err) {
      setNotice(err.message)
      loadData()
    }
  }

  // Direct Supabase verification toggle (Admin only)
  async function toggleVerified(voter) {
    if (!permissions.isAdmin) {
      setNotice('Verification status can only be toggled by an Administrator.')
      return
    }
    const newStatus = !voter.is_verified
    // Optimistic local update
    setAllRows(prev => prev.map(r => r.id === voter.id ? { ...r, is_verified: newStatus } : r))

    try {
      const { error } = await supabase.from('voters').update({ is_verified: newStatus }).eq('id', voter.id)
      if (error) {
        setNotice(error.message)
        loadData()
      }
    } catch (err) {
      setNotice(err.message)
      loadData()
    }
  }

  // Open Amount Modal (Admin and Distributor only)
  function openAmountModal(voter) {
    if (!permissions.canEditAmount) {
      setNotice(`Access Denied: Role '${userRole}' cannot edit amounts. (Distributor/Admin only)`)
      return
    }

    if (permissions.isDistributor && Number(voter.amount) > 0) {
      setNotice('Access Denied: In Distributor role, paid records are locked and cannot be edited. Only an Administrator can modify paid records.')
      return
    }

    // Auto-generate local timestamp for input (YYYY-MM-DDTHH:mm)
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const currentLocalTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

    setAmountModalVoter(voter)
    setAmountForm({
      amount: voter.amount || '',
      // Autofill logged-in user if not already set, or preserve previous for admin review
      amount_given_user: voter.amount_given_user || currentUser || '',
      // Auto-generate current date & time
      amount_given_time: voter.amount_given_time ? voter.amount_given_time.slice(0, 16) : currentLocalTime,
      note: voter.note || ''
    })
  }

  // Direct Supabase amount update (Admin and Distributor only)
  async function handleSaveAmount(e) {
    e.preventDefault()
    if (!amountModalVoter) return

    if (!permissions.canEditAmount) {
      setNotice(`Access Denied: Role '${userRole}' cannot change amounts.`)
      setAmountModalVoter(null)
      return
    }

    if (permissions.isDistributor && Number(amountModalVoter.amount) > 0) {
      setNotice('Access Denied: In Distributor role, paid records are locked and cannot be edited. Only an Administrator can modify paid records.')
      setAmountModalVoter(null)
      return
    }

    const parsedAmount = parseFloat(amountForm.amount) || 0
    const updates = {
      amount: parsedAmount,
      amount_given_user: parsedAmount > 0 ? (amountForm.amount_given_user || currentUser) : null,
      amount_given_time: parsedAmount > 0 ? (amountForm.amount_given_time ? new Date(amountForm.amount_given_time).toISOString() : new Date().toISOString()) : null,
      note: amountForm.note
    }

    try {
      const { error } = await supabase.from('voters').update(updates).eq('id', amountModalVoter.id)
      if (error) throw error
      setNotice(`Saved payment details to Supabase for ${amountModalVoter.voter_id}`)
      setAmountModalVoter(null)
      loadData()
    } catch (err) {
      setNotice(`Failed to update Supabase: ${err.message}`)
    }
  }

  // Direct Supabase insert (Admin only)
  async function handleAddVoter(e) {
    e.preventDefault()
    if (!permissions.canAddVoter) {
      setNotice('Only an Administrator can add new voters.')
      return
    }

    const newVoter = {
      ...voterForm,
      age: voterForm.age ? Number(voterForm.age) : null,
      amount: voterForm.amount ? Number(voterForm.amount) : 0,
      amount_given_user: Number(voterForm.amount) > 0 ? currentUser : null,
      amount_given_time: Number(voterForm.amount) > 0 ? new Date().toISOString() : null,
      is_verified: true
    }

    try {
      const { error } = await supabase.from('voters').insert(newVoter)
      if (error) throw error
      setNotice(`Saved voter ${newVoter.voter_id} to Supabase`)
      setVoterModalOpen(false)
      loadData()
    } catch (err) {
      setNotice(`Supabase error: ${err.message}`)
    }
  }

  // Direct Supabase delete (Admin only)
  async function handleDeleteVoter(voterId) {
    if (!permissions.canDeleteVoter) {
      setNotice('Only an Administrator can delete voter records.')
      return
    }
    if (!confirm('Are you sure you want to delete this voter from Supabase?')) return
    try {
      const { error } = await supabase.from('voters').delete().eq('id', voterId)
      if (error) setNotice(error.message)
      else {
        setNotice('Deleted from Supabase.')
        loadData()
      }
    } catch (err) {
      setNotice(err.message)
    }
  }

  // Direct Supabase CSV import (Admin only)
  async function importFile(file) {
    if (!permissions.canImportCsv) {
      setNotice('Only an Administrator can import CSV files.')
      return
    }
    if (!file) return
    setUploading(true)
    try {
      const { rows: parsed } = await parseVoterCsv(file)
      const batchSize = 100
      for (let i = 0; i < parsed.length; i += batchSize) {
        const batch = parsed.slice(i, i + batchSize)
        const { error } = await supabase.from('voters').upsert(batch, { onConflict: 'voter_id' })
        if (error) throw error
      }
      setNotice(`Successfully imported ${parsed.length} voter records to Supabase!`)
      loadData()
    } catch (e) {
      setNotice(`Supabase import failed: ${e.message}`)
    } finally {
      setUploading(false)
    }
  }

  // Direct Supabase CSV export
  async function exportCsv() {
    try {
      const source = allRows.length > 0 
        ? allRows 
        : ((await supabase.from('voters').select('*').order('serial_number', { ascending: true })).data || [])
      
      const sorted = source.slice().sort((a, b) => {
        const numA = parseInt(a.serial_number, 10)
        const numB = parseInt(b.serial_number, 10)
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB
        return String(a.serial_number || '').localeCompare(String(b.serial_number || ''), undefined, { numeric: true })
      })
      downloadVoterCsv(sorted, 'ward2_voters_serial_848_to_1694.csv')
    } catch (err) {
      setNotice(`Export error: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-400 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition">
          <Search size={18} className="shrink-0" />
          <input
            className="w-full bg-transparent border-0 outline-none pl-2.5 text-xs md:text-sm text-slate-800 placeholder-slate-400 font-medium"
            value={search}
            onChange={e => { setPageNum(0); setSearch(e.target.value) }}
            placeholder="Search Supabase: Voter ID (WQN...), Name in Telugu/English..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {permissions.canAddVoter && (
            <button 
              type="button"
              onClick={() => setVoterModalOpen(true)} 
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
            >
              <Plus size={16} /> Add Voter
            </button>
          )}

          {permissions.canImportCsv && (
            <label className={`inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <Upload size={16} />
              {uploading ? 'Importing…' : 'Import CSV'}
              <input
                hidden
                type="file"
                accept=".csv,text/csv"
                disabled={uploading}
                onChange={e => importFile(e.target.files?.[0])}
              />
            </label>
          )}

          <button 
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition" 
            onClick={exportCsv}
          >
            <Download size={16} /> Export CSV
          </button>

          <Link 
            to="/group-voters"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl shadow-xs transition"
            title="Group electors by Street / Family and print slip"
          >
            <Printer size={16} /> Group & Print
          </Link>
        </div>
      </div>

      {/* Filter Tabs / Chips & Area Selector (Scrollable on small mobile screens) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Party Filter Chips */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {[
            { id: 'ALL', label: 'All Voters' },
            { id: 'YSRCP', label: '🟢 isysrcp' },
            { id: 'TDP', label: '🟡 isTDP' },
            { id: 'JSP', label: '🔴 isJSP' },
            { id: 'OTHER', label: '🟣 other' },
            ...(permissions.canViewAmount ? [{ id: 'PAID', label: '₹ amount > 0' }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setPartyFilter(tab.id); setPageNum(0) }}
              className={`whitespace-nowrap px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold border transition shrink-0 ${
                partyFilter === tab.id 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Area Dropdown Filter & Print Area Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <MapPin size={14} className="text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-slate-600 hidden xs:inline">Area:</span>
            <select
              value={areaFilter}
              onChange={e => { setAreaFilter(e.target.value); setPageNum(0) }}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Areas (All Voters)</option>
              {areasList.map(a => {
                // Calculate count for this specific area
                const count = allRows.filter(r => (r.area_name && r.area_name.toLowerCase() === a.name.toLowerCase()) || r.area_id === a.id).length
                return (
                  <option key={a.id || a.name} value={a.name}>
                    {a.name} ({count})
                  </option>
                )
              })}
            </select>
          </div>

          <Link
            to={areaFilter !== 'ALL' ? `/group-voters?area=${encodeURIComponent(areaFilter)}` : '/group-voters'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold rounded-xl shadow-2xs transition shrink-0"
            title="Print voter list for this area"
          >
            <Printer size={14} />
            <span>{areaFilter !== 'ALL' ? `Print ${areaFilter}` : 'Print Area'}</span>
          </Link>
        </div>
      </div>

      {/* Directory Main Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-3.5 sm:px-5 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between gap-2.5 flex-wrap bg-white">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 m-0">Voters Directory</h3>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold text-[11px] border border-slate-200">
              {filteredRows.length} voters
            </span>
          </div>

          <div className="flex items-center gap-2">

            {/* View Switcher: Grid View (Default) vs Table View */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === 'grid' 
                    ? 'bg-white text-blue-700 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Switch to Grid View"
              >
                <LayoutGrid size={14} /> Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === 'table' 
                    ? 'bg-white text-blue-700 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Switch to Table View"
              >
                <TableIcon size={14} /> Table
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Display: Grid View (Default) or Table View */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 sm:p-5 bg-slate-50/50">
            {loading ? (
              <div className="col-span-full text-center py-12 text-slate-500">
                <p className="font-semibold text-sm">Loading voters from Supabase…</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500">
                <p className="font-semibold text-sm">No voters match the selected filter or search.</p>
              </div>
            ) : (
              rows.map(r => (
                <VoterCard 
                  key={r.id}
                  voter={r}
                  areas={areasList}
                  onAssignArea={handleAssignArea}
                  permissions={permissions}
                  onOpenPhoto={onOpenPhoto}
                  onToggleParty={toggleParty}
                  onOpenAmountModal={openAmountModal}
                  onToggleVerified={toggleVerified}
                  onDeleteVoter={handleDeleteVoter}
                />
              ))
            )}
          </div>
        ) : (
          <VoterTable 
            rows={rows}
            loading={loading}
            areas={areasList}
            onAssignArea={handleAssignArea}
            permissions={permissions}
            onOpenPhoto={onOpenPhoto}
            onToggleParty={toggleParty}
            onOpenAmountModal={openAmountModal}
            onToggleVerified={toggleVerified}
            onDeleteVoter={handleDeleteVoter}
          />
        )}

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 font-medium">
          <div>
            Showing <span className="font-semibold text-slate-700">{filteredRows.length > 0 ? pageNum * pageSize + 1 : 0}</span> to <span className="font-semibold text-slate-700">{Math.min((pageNum + 1) * pageSize, filteredRows.length)}</span> of <span className="font-semibold text-slate-700">{filteredRows.length}</span> voters
            {filteredRows.length > 0 && (
              <span className="ml-2 font-mono text-slate-400">
                (Serial {rows[0]?.serial_number} – {rows[rows.length - 1]?.serial_number})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
              disabled={pageNum === 0}
              onClick={() => setPageNum(p => Math.max(0, p - 1))}
            >
              Previous
            </button>
            <span className="px-2 font-semibold text-slate-600">
              Page {pageNum + 1} of {totalPages}
            </span>
            <button
              type="button"
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg shadow-2xs hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
              disabled={pageNum >= totalPages - 1}
              onClick={() => setPageNum(p => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Reusable Modals */}
      {permissions.canEditAmount && (
        <AmountModal 
          voter={amountModalVoter}
          form={amountForm}
          setForm={setAmountForm}
          onSave={handleSaveAmount}
          onClose={() => setAmountModalVoter(null)}
          currentUser={currentUser}
          isAdmin={userRole === 'admin'}
        />
      )}

      {permissions.canAddVoter && (
        <AddVoterModal 
          isOpen={voterModalOpen}
          form={voterForm}
          setForm={setVoterForm}
          onSave={handleAddVoter}
          onClose={() => setVoterModalOpen(false)}
          areas={areasList}
        />
      )}
    </div>
  )
}
