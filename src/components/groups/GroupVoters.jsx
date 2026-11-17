import { useState, useEffect, useMemo, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { supabase } from '../../lib/supabase'
import { getPermissions } from '../../utils/permissions'
import { formatRupee } from '../../utils/formatters'
import { 
  Printer, 
  Search, 
  Plus, 
  Trash2, 
  Check, 
  RotateCcw, 
  Users, 
  Home, 
  FileText, 
  Filter, 
  Sparkles,
  UserPlus,
  CheckSquare,
  Square,
  Eye,
  SlidersHorizontal
} from 'lucide-react'

const PRESET_HEADINGS = [
  'Ramalayam Veedhi',
  'Main Road Street',
  'BC Colony',
  'Golla Family',
  'Kadiyala Family',
  'Panchayat Office Ward'
]

export default function GroupVoters({ userRole = 'user', setNotice }) {
  const permissions = useMemo(() => getPermissions(userRole), [userRole])
  const { canViewAmount } = permissions

  const [allVoters, setAllVoters] = useState([])
  const [loading, setLoading] = useState(true)

  // Heading & Subtitle inputs
  const [heading, setHeading] = useState(() => {
    return sessionStorage.getItem('group_voters_heading') || 'Ramalayam Veedhi / Family Group'
  })
  const [subheading, setSubheading] = useState(() => {
    return sessionStorage.getItem('group_voters_subheading') || 'Ward 2, Kadiyapulanka · Canvassing & Polling List'
  })

  // Selected Group Voters (List to Print)
  const [selectedVoters, setSelectedVoters] = useState(() => {
    try {
      const saved = sessionStorage.getItem('group_voters_selected')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Search & Filter State
  const [search, setSearch] = useState('')
  const [selectedHouse, setSelectedHouse] = useState('')
  const [partyFilter, setPartyFilter] = useState('ALL')
  const [checkedIds, setCheckedIds] = useState(new Set())

  // Print Option Toggles
  const [showSignCol, setShowSignCol] = useState(true)
  const [showPartyCol, setShowPartyCol] = useState(true)
  const [showHouseCol, setShowHouseCol] = useState(true)
  const [showRelativeCol, setShowRelativeCol] = useState(true)
  const [showAmountCol, setShowAmountCol] = useState(false)

  // Mobile View Switcher: 'select' (Picker) vs 'preview' (Print Sheet)
  const [mobileTab, setMobileTab] = useState('select')

  // Persist selections to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('group_voters_heading', heading)
      sessionStorage.setItem('group_voters_subheading', subheading)
      sessionStorage.setItem('group_voters_selected', JSON.stringify(selectedVoters))
    } catch (e) {
      console.warn('Could not save group selection to sessionStorage', e)
    }
  }, [heading, subheading, selectedVoters])

  // Load all electors from Supabase
  useEffect(() => {
    async function fetchElectors() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('voters')
          .select('*')
          .order('serial_number', { ascending: true })

        if (error) throw error
        // Numerical sort from start (848) to end (1694)
        const sorted = (data || []).sort((a, b) => {
          const numA = parseInt(a.serial_number, 10)
          const numB = parseInt(b.serial_number, 10)
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB
          return String(a.serial_number || '').localeCompare(String(b.serial_number || ''), undefined, { numeric: true })
        })
        setAllVoters(sorted)
      } catch (err) {
        if (setNotice) setNotice(`Failed to load electors: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchElectors()
  }, [setNotice])

  // Extract unique house numbers for quick street/house selector
  const uniqueHouses = useMemo(() => {
    const map = new Map()
    allVoters.forEach(v => {
      const h = (v.house_number || '').trim()
      if (h) {
        map.set(h, (map.get(h) || 0) + 1)
      }
    })
    return Array.from(map.entries())
      .map(([house, count]) => ({ house, count }))
      .sort((a, b) => a.house.localeCompare(b.house, undefined, { numeric: true }))
  }, [allVoters])

  // Filtered voters in the left selector panel
  const filteredVoters = useMemo(() => {
    let list = allVoters

    if (selectedHouse) {
      list = list.filter(v => (v.house_number || '').trim().toLowerCase() === selectedHouse.toLowerCase())
    }

    if (partyFilter === 'YSRCP') list = list.filter(v => v.is_ysrcp)
    else if (partyFilter === 'TDP') list = list.filter(v => v.is_tdp)
    else if (partyFilter === 'JSP') list = list.filter(v => v.is_jsp)
    else if (partyFilter === 'OTHER') list = list.filter(v => v.is_other)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(v => 
        (v.voter_name_english && v.voter_name_english.toLowerCase().includes(q)) ||
        (v.voter_name_telugu && v.voter_name_telugu.toLowerCase().includes(q)) ||
        (v.voter_id && v.voter_id.toLowerCase().includes(q)) ||
        (v.house_number && v.house_number.toLowerCase().includes(q)) ||
        String(v.serial_number) === q
      )
    }

    return list
  }, [allVoters, search, selectedHouse, partyFilter])

  // Set of already selected voter IDs for fast lookup
  const selectedIdsSet = useMemo(() => {
    return new Set(selectedVoters.map(v => v.id))
  }, [selectedVoters])

  // Add individual voter
  const handleAddVoter = (voter) => {
    if (selectedIdsSet.has(voter.id)) return
    setSelectedVoters(prev => [...prev, voter])
  }

  // Remove individual voter
  const handleRemoveVoter = (id) => {
    setSelectedVoters(prev => prev.filter(v => v.id !== id))
  }

  // Add all in currently selected house
  const handleAddEntireHouse = () => {
    if (!selectedHouse) return
    const houseVoters = allVoters.filter(v => (v.house_number || '').trim().toLowerCase() === selectedHouse.toLowerCase())
    const newToAdd = houseVoters.filter(v => !selectedIdsSet.has(v.id))
    if (newToAdd.length === 0) {
      if (setNotice) setNotice(`All voters in House #${selectedHouse} are already in this group.`)
      return
    }
    setSelectedVoters(prev => [...prev, ...newToAdd])
    if (setNotice) setNotice(`Added ${newToAdd.length} voter(s) from House #${selectedHouse} to group.`)
  }

  // Bulk add checked or all filtered
  const handleAddAllFiltered = () => {
    const unadded = filteredVoters.filter(v => !selectedIdsSet.has(v.id))
    if (unadded.length === 0) {
      if (setNotice) setNotice('All filtered electors are already added.')
      return
    }
    setSelectedVoters(prev => [...prev, ...unadded])
    if (setNotice) setNotice(`Added ${unadded.length} electors to group list.`)
  }

  // Clear entire group
  const handleClearGroup = () => {
    if (selectedVoters.length === 0) return
    if (window.confirm('Are you sure you want to clear all voters from this group?')) {
      setSelectedVoters([])
      if (setNotice) setNotice('Cleared group list.')
    }
  }

  const printRef = useRef(null)

  // Third-party printing via react-to-print
  const triggerReactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: heading ? `${heading.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')}_Ward2` : 'Ward_2_Voter_Slip',
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 10mm 10mm 12mm 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          background: #ffffff !important;
          color: #0f172a !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .no-print {
          display: none !important;
        }
        .print-container {
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        table {
          width: 100% !important;
          border-collapse: collapse !important;
        }
        tr {
          page-break-inside: avoid !important;
        }
        th, td {
          border-color: #cbd5e1 !important;
        }
      }
    `
  })

  // Trigger print using react-to-print
  const handlePrint = () => {
    if (selectedVoters.length === 0) {
      if (setNotice) setNotice('Please select at least one voter to print.')
      return
    }
    triggerReactToPrint()
  }

  // Gender breakdown of selected group
  const stats = useMemo(() => {
    let m = 0, f = 0
    selectedVoters.forEach(v => {
      const g = (v.gender || '').toUpperCase()
      if (g.startsWith('M')) m++
      else if (g.startsWith('F')) f++
    })
    return { total: selectedVoters.length, male: m, female: f }
  }, [selectedVoters])

  const getPartyBadge = (v) => {
    if (v.is_ysrcp) return <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">YSRCP</span>
    if (v.is_tdp) return <span className="text-[10px] font-bold text-yellow-800 bg-yellow-50 border border-yellow-300 px-1.5 py-0.5 rounded">TDP</span>
    if (v.is_jsp) return <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">JSP</span>
    if (v.is_other) return <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded">OTH</span>
    return <span className="text-[10px] text-slate-400">—</span>
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Top Banner / Actions Bar (Hidden when printing) */}
      <div className="no-print bg-white border border-slate-200/90 rounded-2xl p-4 md:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={18} />
            </span>
            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight m-0">
              Group Voters & Print Slip
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          <button
            type="button"
            onClick={handleClearGroup}
            disabled={selectedVoters.length === 0}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-xl transition border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Clear all selected electors"
          >
            <RotateCcw size={14} />
            <span>Clear List</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={selectedVoters.length === 0}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md shadow-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Open browser print preview"
          >
            <Printer size={16} />
            <span>Print Sheet ({selectedVoters.length})</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher (Visible on mobile/tablet only, hidden on lg screens & print) */}
      <div className="no-print lg:hidden flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setMobileTab('select')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
            mobileTab === 'select'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus size={14} />
          <span>1. Electors ({filteredVoters.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
            mobileTab === 'preview'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Printer size={14} />
          <span>2. Sheet ({selectedVoters.length})</span>
        </button>
      </div>

      {/* Main Two-Column Layout (Interactive screen mode) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: VOTER SELECTOR & SEARCH (Hidden on print)    */}
        {/* ======================================================== */}
        <div className={`no-print lg:col-span-5 flex-col gap-4 ${mobileTab === 'select' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <UserPlus size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 m-0">Select Electors</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {filteredVoters.length} available
              </span>
            </div>

            {/* Quick House / Street Filter */}
            <div className="mb-3">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Filter by House / Door No.
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedHouse}
                  onChange={(e) => setSelectedHouse(e.target.value)}
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Houses ({uniqueHouses.length} doors)</option>
                  {uniqueHouses.map(({ house, count }) => (
                    <option key={house} value={house}>
                      House #{house} ({count} voters)
                    </option>
                  ))}
                </select>

                {selectedHouse && (
                  <button
                    type="button"
                    onClick={handleAddEntireHouse}
                    className="shrink-0 px-2.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition flex items-center gap-1"
                    title="Add all electors in this house"
                  >
                    <Plus size={13} />
                    <span>Add House</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Search Input */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, Telugu, EPIC, Sl #..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Party Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              {['ALL', 'YSRCP', 'TDP', 'JSP', 'OTHER'].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPartyFilter(p)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                    partyFilter === p
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Batch Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 mb-2">
              <span className="text-[11px] text-slate-500">
                Showing top results
              </span>
              <button
                type="button"
                onClick={handleAddAllFiltered}
                disabled={filteredVoters.length === 0}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Add All Filtered ({filteredVoters.length})
              </button>
            </div>

            {/* List of Electors (Clean, NO PHOTOS as requested!) */}
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {loading ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  Loading electors from Supabase…
                </div>
              ) : filteredVoters.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No electors found matching criteria.
                </div>
              ) : (
                filteredVoters.slice(0, 100).map(voter => {
                  const isAdded = selectedIdsSet.has(voter.id)

                  return (
                    <div
                      key={voter.id}
                      className={`pt-2 flex items-center justify-between gap-2.5 p-2 rounded-xl transition ${
                        isAdded ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            #{voter.serial_number}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-800">
                            {voter.voter_id}
                          </span>
                          {getPartyBadge(voter)}
                        </div>

                        {/* Telugu & English Name */}
                        <div className="text-xs font-bold text-slate-900 mt-0.5 leading-snug">
                          {voter.voter_name_telugu && (
                            <span className="text-blue-900 mr-1.5">{voter.voter_name_telugu}</span>
                          )}
                          <span className="text-slate-700 font-semibold">{voter.voter_name_english}</span>
                        </div>

                        {/* Meta: Relative & Door & Age */}
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                          {voter.relative_name ? (
                            <span>{voter.relation_type || 'Rel'}: <b className="text-slate-700">{voter.relative_name}</b></span>
                          ) : null}
                          <span>D.No: <b className="text-slate-700">{voter.house_number || '—'}</b></span>
                          <span>Age: {voter.age || '—'}/{voter.gender || '—'}</span>
                        </div>
                      </div>

                      {/* Add Button */}
                      <button
                        type="button"
                        onClick={() => handleAddVoter(voter)}
                        disabled={isAdded}
                        className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                          isAdded
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check size={12} />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus size={12} />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
            {filteredVoters.length > 100 && (
              <p className="text-[10px] text-center text-slate-400 mt-2 m-0">
                Showing first 100 results. Use search or house filter to narrow down.
              </p>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: GROUP PRINT SHEET / PREVIEW               */}
        {/* ======================================================== */}
        <div className={`lg:col-span-7 flex-col gap-4 ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
          
          {/* Custom Heading & Presets Card (Hidden on print) */}
          <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <label className="text-xs font-bold text-slate-800 block mb-1.5">
              Street Name / Family Name (Heading Input)
            </label>
            <input
              type="text"
              value={heading}
              onChange={(e) => setHeading(e.target.value)}
              placeholder="e.g. Ramalayam Veedhi / Golla Family / Main Road..."
              className="w-full text-base font-bold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />

            {/* Quick Heading Preset Chips */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Presets:
              </span>
              {PRESET_HEADINGS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setHeading(p)}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition text-slate-600"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Sub-heading / Reference Note Input */}
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Sub-heading / Polling Notes (Optional)
            </label>
            <input
              type="text"
              value={subheading}
              onChange={(e) => setSubheading(e.target.value)}
              placeholder="e.g. Ward 2, Booth 2 · Canvassing Roll..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Display Column Toggles */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-wrap text-xs text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSignCol}
                    onChange={(e) => setShowSignCol(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Sign / Remark box</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPartyCol}
                    onChange={(e) => setShowPartyCol(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Party tag</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showRelativeCol}
                    onChange={(e) => setShowRelativeCol(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Relative</span>
                </label>
                {canViewAmount && (
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showAmountCol}
                      onChange={(e) => setShowAmountCol(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <span>Amount</span>
                  </label>
                )}
              </div>

              <div className="text-xs font-bold text-slate-500">
                Selected: <span className="text-blue-600 font-extrabold">{stats.total}</span> (M: {stats.male}, F: {stats.female})
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* THE PRINT SHEET (Rendered on screen & formatted on print) */}
          {/* ======================================================== */}
          <div ref={printRef} className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-xs print:border-none print:shadow-none print:p-0 print:m-0 print-container">
            
            {/* Sheet Official Header (Formatted cleanly for print and screen) */}
            <div className="border-b-2 border-slate-800 pb-3 mb-4">
              <div className="flex items-center justify-between text-[11px] text-slate-600 uppercase tracking-widest font-bold mb-1">
                <span>WARD 2 · KADIYAPULANKA</span>
                <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight m-0 uppercase">
                {heading || 'Voter Group List'}
              </h1>
              {subheading && (
                <p className="text-xs text-slate-600 font-medium mt-0.5 m-0">
                  {subheading}
                </p>
              )}
              <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2 font-medium">
                <span>Total Electors: <b className="text-slate-800 font-bold">{stats.total}</b></span>
                <span>Male: <b className="text-slate-800 font-bold">{stats.male}</b></span>
                <span>Female: <b className="text-slate-800 font-bold">{stats.female}</b></span>
                <span className="hidden print:inline">Booth: Ward 2</span>
              </div>
            </div>

            {/* Selected Voters Table (Without photo - clean & printable) */}
            {selectedVoters.length === 0 ? (
              <div className="no-print text-center py-16 border-2 border-dashed border-slate-200 rounded-xl p-6">
                <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700 m-0">No Electors in this Group Yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Pick a House / Door No. or search for names on the left, then click <b>+ Add</b> to compile your street or family sheet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-800 bg-slate-50 print:bg-slate-100 text-[11px] font-bold text-slate-900 uppercase">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2 text-center w-14">Sl. #</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">EPIC ID</th>
                      <th className="py-2 px-3">Elector Name</th>
                      {showRelativeCol && (
                        <th className="py-2 px-3">Relative Name</th>
                      )}
                      {showHouseCol && (
                        <th className="py-2 px-2.5 text-center">House #</th>
                      )}
                      <th className="py-2 px-2.5 text-center">Age/Sex</th>
                      {showPartyCol && (
                        <th className="py-2 px-2.5 text-center">Party</th>
                      )}
                      {canViewAmount && showAmountCol && (
                        <th className="py-2 px-2.5 text-center">Amount</th>
                      )}
                      {showSignCol && (
                        <th className="py-2 px-4 text-center min-w-[90px]">Signature / Remark</th>
                      )}
                      <th className="no-print py-2 px-2 text-center w-10">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedVoters.map((voter, idx) => (
                      <tr key={voter.id} className="hover:bg-slate-50/60 print:hover:bg-transparent">
                        <td className="py-2 px-2 text-center font-mono font-semibold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-2 text-center font-bold text-blue-700">
                          {voter.serial_number}
                        </td>
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {voter.voter_id}
                        </td>
                        <td className="py-2 px-3 leading-snug">
                          {voter.voter_name_telugu && (
                            <div className="font-bold text-slate-950 text-xs">{voter.voter_name_telugu}</div>
                          )}
                          <div className="text-slate-700 text-[11px] font-medium">{voter.voter_name_english}</div>
                        </td>
                        {showRelativeCol && (
                          <td className="py-2 px-3 leading-snug text-slate-600 text-[11px]">
                            {voter.relative_name ? (
                              <div>
                                <span className="font-semibold text-slate-900">{voter.relative_name}</span>
                                {voter.relation_type && (
                                  <span className="text-[10px] text-slate-400 block">({voter.relation_type})</span>
                                )}
                              </div>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                        )}
                        {showHouseCol && (
                          <td className="py-2 px-2.5 text-center font-bold text-slate-800">
                            {voter.house_number || '—'}
                          </td>
                        )}
                        <td className="py-2 px-2.5 text-center text-slate-700 font-medium whitespace-nowrap">
                          {voter.age || '—'} / {voter.gender || '—'}
                        </td>
                        {showPartyCol && (
                          <td className="py-2 px-2.5 text-center">
                            {getPartyBadge(voter)}
                          </td>
                        )}
                        {canViewAmount && showAmountCol && (
                          <td className="py-2 px-2.5 text-center font-bold text-emerald-700 whitespace-nowrap">
                            {Number(voter.amount) > 0 ? formatRupee(voter.amount) : '—'}
                          </td>
                        )}
                        {showSignCol && (
                          <td className="py-2 px-4 text-center">
                            <div className="w-16 h-6 border border-dashed border-slate-400 rounded mx-auto print:border-slate-800" />
                          </td>
                        )}
                        <td className="no-print py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveVoter(voter.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="Remove from group"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Print Footer / Verification Box */}
            {selectedVoters.length > 0 && (
              <div className="mt-8 pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                <div>
                  Printed by: <b>{userRole.toUpperCase()}</b> · Ward 2 Kadiyapulanka
                </div>
                <div className="text-right">
                  Agent / Incharge Signature: _______________________
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
