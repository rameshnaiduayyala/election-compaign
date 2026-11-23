import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  Printer, 
  Plus, 
  Trash2, 
  RotateCcw, 
  ArrowUp, 
  ArrowDown, 
  Edit2, 
  Check, 
  X, 
  Search, 
  FileSpreadsheet, 
  Users, 
  Image as ImageIcon,
  AlertCircle,
  HelpCircle,
  ListPlus
} from 'lucide-react'
import { FALLBACK_AVATAR } from '../../utils/formatters'

export default function SerialTablePrint({ setNotice, userRole }) {
  const [allVoters, setAllVoters] = useState([])
  const [loading, setLoading] = useState(true)

  // Serial input and group settings
  const [serialInput, setSerialInput] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [inputError, setInputError] = useState('')
  const serialInputRef = useRef(null)

  // Groups in the table: array of { id, title, voters: [] }
  // Stored in localStorage for persistent workflow across reloads
  const [tableGroups, setTableGroups] = useState(() => {
    try {
      const saved = localStorage.getItem('election_table_print_groups')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Print controls
  const [showVoteBanner, setShowVoteBanner] = useState(true)
  const [showNotesCol, setShowNotesCol] = useState(true)
  const [showPhotos, setShowPhotos] = useState(false)

  // Editing group title state
  const [editingGroupId, setEditingGroupId] = useState(null)
  const [tempGroupTitle, setTempGroupTitle] = useState('')

  // Map of serial_number -> voter for ultra-fast O(1) lookups
  const voterBySerialMap = useMemo(() => {
    const map = new Map()
    allVoters.forEach((v) => {
      const s = String(v.serial_number || '').trim()
      if (s) {
        map.set(s, v)
        // Also support numbers without leading zeros if any
        const num = parseInt(s, 10)
        if (!isNaN(num)) {
          map.set(String(num), v)
        }
      }
    })
    return map
  }, [allVoters])

  // Load all voters once on mount
  useEffect(() => {
    async function fetchVoters() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('voters')
          .select('*')
          .order('serial_number', { ascending: true })

        if (error) {
          setNotice?.(error.message)
        } else {
          setAllVoters(data || [])
        }
      } catch (err) {
        setNotice?.(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchVoters()
  }, [setNotice])

  // Save table groups to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('election_table_print_groups', JSON.stringify(tableGroups))
    } catch (e) {
      console.warn('LocalStorage error:', e)
    }
  }, [tableGroups])

  // Parse user serial input string (supports commas, spaces, newlines, and ranges like 850-855)
  const parseSerialTokens = (rawText) => {
    if (!rawText) return []
    // Split by comma, whitespace, semicolon
    const parts = rawText
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    const serials = []
    for (const part of parts) {
      // Check for range e.g. 850-853
      if (/^\d+\s*-\s*\d+$/.test(part)) {
        const [startStr, endStr] = part.split('-').map((n) => parseInt(n.trim(), 10))
        if (!isNaN(startStr) && !isNaN(endStr)) {
          const min = Math.min(startStr, endStr)
          const max = Math.max(startStr, endStr)
          // Prevent accidental massive ranges
          if (max - min <= 500) {
            for (let i = min; i <= max; i++) {
              serials.push(String(i))
            }
            continue
          }
        }
      }
      serials.push(part)
    }

    return serials
  }

  // Handle adding a new group of serial numbers to the table
  const handleAddGroup = (e) => {
    if (e) e.preventDefault()
    setInputError('')

    const requestedSerials = parseSerialTokens(serialInput)
    if (requestedSerials.length === 0) {
      setInputError('Please enter at least one serial number (e.g. 221, 882, 228)')
      return
    }

    const matchedVoters = []
    const notFoundSerials = []
    const seenIds = new Set()

    for (const s of requestedSerials) {
      const v = voterBySerialMap.get(s)
      if (v) {
        if (!seenIds.has(v.id)) {
          matchedVoters.push(v)
          seenIds.add(v.id)
        }
      } else {
        notFoundSerials.push(s)
      }
    }

    if (matchedVoters.length === 0) {
      setInputError(`None of the serial number(s) [${requestedSerials.join(', ')}] were found in the database.`)
      return
    }

    const firstVoter = matchedVoters[0]
    const peddaName = firstVoter?.voter_name_telugu 
      ? `${firstVoter.voter_name_telugu}${firstVoter.voter_name_english ? ` (${firstVoter.voter_name_english})` : ''}`
      : (firstVoter?.voter_name_english || `Sl #${firstVoter?.serial_number}`)
    
    const finalTitle = customTitle.trim() || peddaName

    const newGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: finalTitle,
      voters: matchedVoters
    }

    setTableGroups((prev) => [...prev, newGroup])
    setSerialInput('')
    setCustomTitle('')

    if (notFoundSerials.length > 0) {
      setInputError(`Added ${matchedVoters.length} voters. Note: Serial(s) [${notFoundSerials.join(', ')}] not found in database.`)
    }

    // Keep focus on input for fast successive entries
    setTimeout(() => {
      serialInputRef.current?.focus()
    }, 50)
  }

  // Remove entire group
  const handleDeleteGroup = (groupId) => {
    setTableGroups((prev) => prev.filter((g) => g.id !== groupId))
  }

  // Remove single voter from a group
  const handleRemoveVoter = (groupId, voterId) => {
    setTableGroups((prev) =>
      prev
        .map((g) => {
          if (g.id !== groupId) return g
          return {
            ...g,
            voters: g.voters.filter((v) => v.id !== voterId)
          }
        })
        .filter((g) => g.voters.length > 0) // Remove group if it becomes empty
    )
  }

  // Move group Up
  const moveGroupUp = (index) => {
    if (index <= 0) return
    setTableGroups((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[index - 1]
      copy[index - 1] = temp
      return copy
    })
  }

  // Move group Down
  const moveGroupDown = (index) => {
    if (index >= tableGroups.length - 1) return
    setTableGroups((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[index + 1]
      copy[index + 1] = temp
      return copy
    })
  }

  // Rename group title
  const handleSaveTitle = (groupId) => {
    if (!tempGroupTitle.trim()) {
      setEditingGroupId(null)
      return
    }
    setTableGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, title: tempGroupTitle.trim() } : g))
    )
    setEditingGroupId(null)
    setTempGroupTitle('')
  }

  // Get display title for a group (automatically defaults to just the first serial number's name)
  const getGroupTitle = (group) => {
    if (group.title && !group.title.startsWith('Group ') && !group.title.includes('కుటుంబ పెద్ద')) {
      return group.title
    }
    const firstVoter = group.voters?.[0]
    if (!firstVoter) return group.title || 'Family'
    return firstVoter.voter_name_telugu 
      ? `${firstVoter.voter_name_telugu}${firstVoter.voter_name_english ? ` (${firstVoter.voter_name_english})` : ''}`
      : (firstVoter.voter_name_english || `Sl #${firstVoter.serial_number}`)
  }

  // Clear all groups
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear the entire table?')) {
      setTableGroups([])
      localStorage.removeItem('election_table_print_groups')
      setInputError('')
    }
  }

  // Global Table Statistics
  const stats = useMemo(() => {
    let totalElectors = 0
    let male = 0
    let female = 0

    tableGroups.forEach((g) => {
      totalElectors += g.voters.length
      g.voters.forEach((v) => {
        const gen = String(v.gender || '').trim().toLowerCase()
        if (gen.startsWith('m')) male++
        else if (gen.startsWith('f')) female++
      })
    })

    return {
      totalGroups: tableGroups.length,
      totalElectors,
      male,
      female
    }
  }, [tableGroups])

  return (
    <div className="space-y-6">
      {/* Top Header Card (Hidden on Print) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ward 2 · Venkayammapeta</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
              WARD 2 — ELECTOR SLIPS TABLE
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Enter serial numbers (e.g. <b>221, 882, 228</b>) and press <b>Enter</b> to add a group. Add another set of numbers for the next group, and print clean tabular slips!
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {tableGroups.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                title="Clear all groups from table"
              >
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <span>Clear Table</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              disabled={tableGroups.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Print Table Slips"
            >
              <Printer className="w-4 h-4" />
              <span>Print Table ({stats.totalElectors} Voters)</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* FAST SERIAL INPUT BAR                                    */}
        {/* ======================================================== */}
        <form onSubmit={handleAddGroup} className="mt-6 pt-5 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Serial Numbers Input */}
            <div className="md:col-span-7">
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-blue-600" />
                  <span>Enter Serial Numbers to Add to Table</span>
                </span>
                <span className="text-[11px] font-normal text-slate-400">
                  Separated by comma or space (e.g. <span className="font-mono text-blue-600 font-bold">221, 882, 228</span> or <span className="font-mono text-blue-600 font-bold">848-852</span>)
                </span>
              </label>
              <div className="relative">
                <input
                  ref={serialInputRef}
                  type="text"
                  value={serialInput}
                  onChange={(e) => {
                    setSerialInput(e.target.value)
                    if (inputError) setInputError('')
                  }}
                  placeholder="e.g. 221, 882, 228 or 850, 851, 852"
                  className="w-full bg-slate-50 border-2 border-blue-300 focus:border-blue-600 rounded-xl px-3.5 py-2.5 text-sm sm:text-base font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white shadow-xs transition"
                  autoFocus
                />
              </div>
            </div>

            {/* Optional Group Title */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Group Title / Name (Optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Default: మొదటి SL ఓటరు పేరు"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            {/* Add Button */}
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={!serialInput.trim() || loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Table</span>
              </button>
            </div>
          </div>

          {/* Alert / Feedback message */}
          {inputError && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{inputError}</span>
            </div>
          )}

          {/* Quick Example Chips */}
          <div className="flex items-center gap-2 flex-wrap mt-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-400">Quick Test:</span>
            <button
              type="button"
              onClick={() => setSerialInput('848, 849, 850')}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-mono text-[11px] border border-slate-200 transition"
            >
              848, 849, 850
            </button>
            <button
              type="button"
              onClick={() => setSerialInput('853, 854')}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-mono text-[11px] border border-slate-200 transition"
            >
              853, 854
            </button>
            <button
              type="button"
              onClick={() => setSerialInput('855-858')}
              className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-mono text-[11px] border border-slate-200 transition"
            >
              855-858 (Range)
            </button>
          </div>
        </form>

        {/* Print Toggles & Summary Row */}
        <div className="flex items-center justify-between gap-4 flex-wrap mt-5 pt-4 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-4 flex-wrap text-slate-700 font-medium">
            <label className="flex items-center gap-1.5 cursor-pointer select-none bg-amber-50/80 border border-amber-300 px-2.5 py-1 rounded-md font-bold text-amber-900">
              <input
                type="checkbox"
                checked={showVoteBanner}
                onChange={(e) => setShowVoteBanner(e.target.checked)}
                className="rounded text-amber-600"
              />
              <span>🍳 Print Campaign Header (Symbol: Cooker)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showNotesCol}
                onChange={(e) => setShowNotesCol(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Include Remarks / Notes Line</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPhotos}
                onChange={(e) => setShowPhotos(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Photos</span>
              </span>
            </label>
          </div>

          <div className="text-xs font-bold text-slate-600">
            Total Groups: <b className="text-blue-700 font-black">{stats.totalGroups}</b> · Electors: <b className="text-slate-900 font-black">{stats.totalElectors}</b> (Male: {stats.male}, Female: {stats.female})
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* THE PRINT SHEET (Table view styled cleanly for A4 print) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl print:m-0 print:p-0">
        
        {/* Printable Candidate Campaign Header */}
        {showVoteBanner && (
          <div className="bg-slate-900 text-white px-4 py-2.5 mb-3 rounded-xl flex items-center justify-between border-b-2 border-black print:rounded-none print:bg-black">
            <div className="flex items-center gap-3">
              {/* Pressure Cooker Symbol Icon Graphic */}
              <div className="w-11 h-11 bg-white text-slate-900 rounded-xl flex flex-col items-center justify-center p-1 border-2 border-amber-400 shrink-0 print:border-black">
                <svg viewBox="0 0 48 48" className="w-8 h-8 fill-none stroke-current stroke-2 text-slate-900" strokeLinecap="round" strokeLinejoin="round">
                  {/* Cooker Body */}
                  <path d="M10 20 H38 V36 C38 39 35 42 32 42 H16 C13 42 10 39 10 36 Z" fill="#f1f5f9" />
                  {/* Cooker Lid */}
                  <path d="M8 20 H40 V17 C40 16 38 15 36 15 H12 C10 15 8 16 8 17 Z" fill="#cbd5e1" />
                  {/* Weight / Whistle */}
                  <rect x="22" y="8" width="4" height="7" rx="1" fill="#475569" />
                  <path d="M20 8 H28" />
                  {/* Steam Vent lines */}
                  <path d="M19 5 L17 3 M24 4 L24 2 M29 5 L31 3" stroke="#94a3b8" />
                  {/* Cooker Main Handle */}
                  <path d="M38 18 H46 V22 H38" fill="#1e293b" />
                  {/* Body Sub Handle */}
                  <path d="M10 24 H4 V28 H10" fill="#1e293b" />
                </svg>
              </div>

              <div>
                <div className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex items-center gap-2 flex-wrap">
                  <span className="text-amber-300 print:text-white">VOTE FOR AKULA AJAY</span>
                  <span className="text-xs sm:text-sm font-bold text-white normal-case">
                    (ఆకుల అజయ్)
                  </span>
                  <span className="bg-amber-400 text-slate-950 font-black text-[11px] px-2 py-0.5 rounded uppercase tracking-wider print:border print:border-black">
                    గుర్తు: కుక్కర్ (SYMBOL: COOKER)
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-semibold mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>2వ వార్డు మెంబర్ అభ్యర్థి (Ward 2 Member Candidate)</span>
                  <span>·</span>
                  <span>వెంకాయమ్మపేట, కడియపులంక</span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block px-3 py-1 bg-white text-slate-950 font-black text-xs sm:text-sm rounded uppercase tracking-wider border-2 border-black">
                WARD NO. 2
              </span>
            </div>
          </div>
        )}

        {/* Printable Official Subtitle & Stats */}
        <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-3 text-xs">
          <div>
            <div className="text-base font-black uppercase text-slate-900">
              WARD 2 — ELECTOR SLIPS TABLE
            </div>
            <div className="text-slate-600 font-medium">
              Voter Table Grouping Roster
            </div>
          </div>
          <div className="text-right text-slate-700 font-semibold">
            <div>
              Total Groups: <b className="text-slate-950 font-black">{stats.totalGroups}</b> · Total Electors: <b className="text-slate-950 font-black">{stats.totalElectors}</b> (Male: <b>{stats.male}</b>, Female: <b>{stats.female}</b>)
            </div>
            <div className="text-slate-500 font-medium text-[11px] mt-0.5">
              Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Empty Table State */}
        {tableGroups.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-12 sm:p-16 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
              <ListPlus className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Table is Empty</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Enter serial numbers above (for example <span className="font-mono font-bold text-blue-600">221, 882, 228</span>) and press <b>Enter</b> to add your first group to this table.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <span>Supports individual numbers, lists, or ranges like 848-852</span>
            </div>
          </div>
        ) : (
          /* Grouped Tables */
          <div className="space-y-4">
            {tableGroups.map((group, gIdx) => (
              <div
                key={group.id}
                className="border border-slate-200 rounded-xl overflow-hidden bg-white break-inside-avoid print:border-slate-400 print:mb-3.5 print:rounded-none shadow-xs"
              >
                {/* Group Header Bar */}
                <div className="bg-slate-100/90 print:bg-slate-200 px-3.5 py-2 flex items-center justify-between border-b border-slate-200 print:border-slate-400">
                  <div className="flex items-center gap-2">
                    {/* Reorder Buttons (Hidden on print) */}
                    <div className="flex items-center gap-0.5 print:hidden">
                      <button
                        type="button"
                        onClick={() => moveGroupUp(gIdx)}
                        disabled={gIdx === 0}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-20 transition"
                        title="Move Group Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveGroupDown(gIdx)}
                        disabled={gIdx === tableGroups.length - 1}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-20 transition"
                        title="Move Group Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="font-bold text-xs bg-slate-800 text-white px-2 py-0.5 rounded print:border print:border-black">
                      #{gIdx + 1}
                    </span>

                    {/* Group Title (Editable on screen) */}
                    {editingGroupId === group.id ? (
                      <div className="flex items-center gap-1 print:hidden">
                        <input
                          type="text"
                          value={tempGroupTitle}
                          onChange={(e) => setTempGroupTitle(e.target.value)}
                          className="bg-white border border-blue-400 rounded px-2 py-0.5 text-xs font-bold text-slate-900"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveTitle(group.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGroupId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-sm sm:text-base font-black text-slate-900">
                          {getGroupTitle(group)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroupId(group.id)
                            setTempGroupTitle(getGroupTitle(group))
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition print:hidden"
                          title="Rename group title"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 print:border-slate-400">
                      {group.voters.length} {group.voters.length === 1 ? 'Voter' : 'Voters'}
                    </span>
                  </div>

                  {/* Group Delete Button */}
                  <div className="flex items-center gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition"
                      title="Remove this group from table"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Group</span>
                    </button>
                  </div>
                </div>

                {/* Voters Table within this Group */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 print:border-slate-400 bg-slate-50 print:bg-slate-100 text-[11px] font-bold text-slate-800 uppercase">
                        <th className="py-1.5 px-2 text-center w-8">#</th>
                        {showPhotos && (
                          <th className="py-1.5 px-2 text-center w-12">Photo</th>
                        )}
                        <th className="py-1.5 px-2 text-center w-14">Sl. #</th>
                        <th className="py-1.5 px-2.5 whitespace-nowrap w-28">EPIC ID</th>
                        <th className="py-1.5 px-3">Elector Name (తెలుగు / English)</th>
                        <th className="py-1.5 px-3">Relative Name</th>
                        <th className="py-1.5 px-2.5 text-center">House #</th>
                        {showNotesCol && (
                          <th className="py-1.5 px-3 text-center min-w-[100px]">Remarks / Notes</th>
                        )}
                        <th className="py-1.5 px-2 text-center w-8 print:hidden">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                      {group.voters.map((member, mIdx) => (
                        <tr key={member.id || mIdx} className="hover:bg-slate-50/70 print:hover:bg-transparent">
                          {/* Row Index */}
                          <td className="py-2 px-2 text-center font-mono font-semibold text-slate-500">
                            {mIdx + 1}
                          </td>

                          {/* Optional Photo */}
                          {showPhotos && (
                            <td className="py-1 px-1.5 text-center">
                              <img
                                src={member.image_path || FALLBACK_AVATAR}
                                alt=""
                                className="w-8 h-10 object-cover rounded border border-slate-300 mx-auto bg-slate-100"
                                onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR }}
                              />
                            </td>
                          )}

                          {/* Serial Number */}
                          <td className="py-2 px-2 text-center font-bold text-blue-700 print:text-black">
                            {member.serial_number}
                          </td>

                          {/* EPIC Voter ID */}
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {member.voter_id}
                          </td>

                          {/* Voter Name */}
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-slate-900 text-sm leading-tight">
                                {member.voter_name_telugu || '—'}
                              </span>
                              
                            </div>
                            <div className="text-slate-600 text-[11px] font-semibold mt-0.5">
                              {member.voter_name_english || '—'}
                            </div>
                          </td>

                          {/* Relative Name */}
                          <td className="py-2 px-3 text-slate-700">
                            <span className="font-semibold">{member.relative_name || '—'}</span>
                            <span className="text-[10px] text-slate-500 block">({member.relation_type || 'Relation'})</span>
                          </td>

                          {/* House Number */}
                          <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-800">
                            {member.house_number || '—'}
                          </td>

                          {/* Remarks / Notes Column for Field Notes */}
                          {showNotesCol && (
                            <td className="py-2 px-3 text-center border-l border-slate-100 print:border-slate-300">
                              <div className="min-h-[22px] border-b border-dashed border-slate-300 print:border-slate-400"></div>
                            </td>
                          )}

                          {/* Remove single voter button (Hidden on print) */}
                          <td className="py-2 px-2 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => handleRemoveVoter(group.id, member.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="Remove voter from this group"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
