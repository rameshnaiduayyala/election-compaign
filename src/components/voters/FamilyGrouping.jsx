import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { DEFAULT_AREAS } from '../areas/AreasManagement'
import { 
  Home, 
  MapPin, 
  Users, 
  Search, 
  Printer, 
  Layers, 
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Edit2,
  X,
  RotateCcw,
  GripVertical,
  Table as TableIcon,
  LayoutGrid
} from 'lucide-react'
import { FALLBACK_AVATAR } from '../../utils/formatters'

export default function FamilyGrouping({ setNotice, userRole }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const areaFromQuery = searchParams.get('area')
  const printAreaRef = useRef(null)

  const [voters, setVoters] = useState([])
  const [areasList, setAreasList] = useState(DEFAULT_AREAS)
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [selectedArea, setSelectedArea] = useState(areaFromQuery || 'ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState('custom') // 'custom', 'house_asc', 'house_desc', 'size_desc', 'size_asc'
  const [minFamilySize, setMinFamilySize] = useState('ALL') // 'ALL', '1', '2', '3', '4+'
  const [viewMode, setViewMode] = useState('table') // 'table' (Default for clean print) | 'cards'
  const [showPhotos, setShowPhotos] = useState(false)
  const [showNotesCol, setShowNotesCol] = useState(true)
  const [showVoteBanner, setShowVoteBanner] = useState(true)

  // Manual Adjustments (Client-side overrides, stored in localStorage per Area)
  // 1. customHouseOverrides: { [voterId]: newHouseNumber } -> allows moving a voter from one house to another
  // 2. customHouseOrder: [houseKey1, houseKey2, ...] -> ordered list of houseKeys for print
  const [customHouseOverrides, setCustomHouseOverrides] = useState(() => {
    try {
      const saved = localStorage.getItem(`family_overrides_${areaFromQuery || 'ALL'}`)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [customHouseOrder, setCustomHouseOrder] = useState(() => {
    try {
      const saved = localStorage.getItem(`family_order_${areaFromQuery || 'ALL'}`)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Editing state for moving a voter or correcting house
  const [editingVoter, setEditingVoter] = useState(null)
  const [targetHouseInput, setTargetHouseInput] = useState('')

  // Drag and drop state for houses
  const [draggedHouseIndex, setDraggedHouseIndex] = useState(null)

  // Load voters and areas from Supabase (read-only)
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const { data: votersData, error: votersError } = await supabase
          .from('voters')
          .select('*')
          .order('serial_number', { ascending: true })

        if (votersError) {
          setNotice?.(votersError.message)
        } else {
          setVoters(votersData || [])
        }

        try {
          const { data: areasData, error: areasError } = await supabase
            .from('areas')
            .select('*')
            .order('name', { ascending: true })

          if (!areasError && areasData && areasData.length > 0) {
            setAreasList(areasData)
          }
        } catch (e) {
          console.warn('Areas not loaded:', e)
        }
      } catch (err) {
        setNotice?.(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [setNotice])

  // Sync state when selected area changes or URL query param changes
  useEffect(() => {
    if (areaFromQuery && areaFromQuery !== selectedArea) {
      setSelectedArea(areaFromQuery)
    }
  }, [areaFromQuery])

  // Reload local storage overrides whenever selected area changes
  useEffect(() => {
    try {
      const savedOverrides = localStorage.getItem(`family_overrides_${selectedArea}`)
      setCustomHouseOverrides(savedOverrides ? JSON.parse(savedOverrides) : {})

      const savedOrder = localStorage.getItem(`family_order_${selectedArea}`)
      setCustomHouseOrder(savedOrder ? JSON.parse(savedOrder) : [])
    } catch {
      setCustomHouseOverrides({})
      setCustomHouseOrder([])
    }
  }, [selectedArea])

  const handleAreaChange = (newArea) => {
    setSelectedArea(newArea)
    if (newArea === 'ALL') {
      searchParams.delete('area')
      setSearchParams(searchParams)
    } else {
      setSearchParams({ area: newArea })
    }
  }

  // Voter count per area
  const areaCounts = useMemo(() => {
    const counts = { ALL: voters.length, unassigned: 0 }
    voters.forEach((v) => {
      const a = (v.area_name || '').trim()
      if (!a) {
        counts.unassigned = (counts.unassigned || 0) + 1
      } else {
        counts[a] = (counts[a] || 0) + 1
      }
    })
    return counts
  }, [voters])

  // Filter voters by selected Area and Search Query
  const filteredVoters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return voters
      .filter((voter) => {
        // Area filter
        if (selectedArea === '__UNASSIGNED__') {
          const area = (voter.area_name || '').trim()
          if (area && area !== 'Unassigned') return false
        } else if (selectedArea !== 'ALL') {
          if ((voter.area_name || '').trim().toLowerCase() !== selectedArea.trim().toLowerCase()) {
            return false
          }
        }

        // Search query
        if (q) {
          const telugu = (voter.voter_name_telugu || '').toLowerCase()
          const english = (voter.voter_name_english || '').toLowerCase()
          const relative = (voter.relative_name || '').toLowerCase()
          const epic = (voter.voter_id || '').toLowerCase()
          const serial = String(voter.serial_number || '').toLowerCase()
          const house = (customHouseOverrides[voter.id] || voter.house_number || '').toLowerCase()
          const areaName = (voter.area_name || '').toLowerCase()

          const matches = 
            telugu.includes(q) ||
            english.includes(q) ||
            relative.includes(q) ||
            epic.includes(q) ||
            serial.includes(q) ||
            house.includes(q) ||
            areaName.includes(q)

          if (!matches) return false
        }

        return true
      })
      .map((voter) => {
        const overriddenHouse = customHouseOverrides[voter.id]
        if (overriddenHouse !== undefined) {
          return { ...voter, house_number: overriddenHouse, is_manually_adjusted: true }
        }
        return voter
      })
  }, [voters, selectedArea, searchQuery, customHouseOverrides])

  // Group voters into Families by House Number
  const familyGroups = useMemo(() => {
    const map = new Map()

    filteredVoters.forEach((voter) => {
      let rawHouse = (voter.house_number || '').trim()
      const houseKey = rawHouse ? rawHouse.toUpperCase() : 'NO_HOUSE_NO'

      if (!map.has(houseKey)) {
        map.set(houseKey, {
          houseKey,
          houseNumber: rawHouse || 'Unassigned Door No',
          isUnassigned: !rawHouse,
          areaName: voter.area_name || 'Unassigned Area',
          members: []
        })
      }
      map.get(houseKey).members.push(voter)
    })

    let list = Array.from(map.values())

    // Inside each family, sort members: elders first (age descending), then serial number
    list.forEach((family) => {
      family.members.sort((a, b) => {
        const ageA = parseInt(a.age, 10) || 0
        const ageB = parseInt(b.age, 10) || 0
        if (ageB !== ageA) return ageB - ageA
        return (parseInt(a.serial_number, 10) || 0) - (parseInt(b.serial_number, 10) || 0)
      })
    })

    // Filter by Min Family Size
    if (minFamilySize !== 'ALL') {
      if (minFamilySize === '4+') {
        list = list.filter((f) => f.members.length >= 4)
      } else {
        const target = parseInt(minFamilySize, 10)
        list = list.filter((f) => f.members.length === target)
      }
    }

    // Sort families
    if (sortOption === 'custom' && customHouseOrder.length > 0) {
      const orderMap = new Map(customHouseOrder.map((key, i) => [key, i]))
      list.sort((a, b) => {
        const idxA = orderMap.has(a.houseKey) ? orderMap.get(a.houseKey) : 999999
        const idxB = orderMap.has(b.houseKey) ? orderMap.get(b.houseKey) : 999999
        if (idxA !== idxB) return idxA - idxB
        return a.houseNumber.localeCompare(b.houseNumber, undefined, { numeric: true, sensitivity: 'base' })
      })
    } else if (sortOption === 'size_desc') {
      list.sort((a, b) => b.members.length - a.members.length)
    } else if (sortOption === 'size_asc') {
      list.sort((a, b) => a.members.length - b.members.length)
    } else if (sortOption === 'house_desc') {
      list.sort((a, b) => b.houseNumber.localeCompare(a.houseNumber, undefined, { numeric: true, sensitivity: 'base' }))
    } else {
      list.sort((a, b) => a.houseNumber.localeCompare(b.houseNumber, undefined, { numeric: true, sensitivity: 'base' }))
    }

    return list
  }, [filteredVoters, minFamilySize, sortOption, customHouseOrder])

  // Quick statistics
  const stats = useMemo(() => {
    const totalFamilies = familyGroups.length
    const totalElectors = familyGroups.reduce((acc, f) => acc + f.members.length, 0)
    let singleMember = 0
    let twoToThree = 0
    let fourPlus = 0
    let male = 0
    let female = 0

    familyGroups.forEach((f) => {
      const sz = f.members.length
      if (sz === 1) singleMember++
      else if (sz === 2 || sz === 3) twoToThree++
      else if (sz >= 4) fourPlus++

      f.members.forEach((m) => {
        const g = String(m.gender || '').trim().toLowerCase()
        if (g.startsWith('m')) male++
        else if (g.startsWith('f')) female++
      })
    })

    return { totalFamilies, totalElectors, singleMember, twoToThree, fourPlus, male, female }
  }, [familyGroups])

  // Manual Adjustments
  const handleSaveVoterHouse = (voterId, newHouse) => {
    const trimmed = (newHouse || '').trim()
    const nextOverrides = { ...customHouseOverrides, [voterId]: trimmed }
    setCustomHouseOverrides(nextOverrides)
    try {
      localStorage.setItem(`family_overrides_${selectedArea}`, JSON.stringify(nextOverrides))
    } catch (e) {
      console.warn('LocalStorage error:', e)
    }
    setEditingVoter(null)
    setTargetHouseInput('')
  }

  const handleResetVoterHouse = (voterId) => {
    const nextOverrides = { ...customHouseOverrides }
    delete nextOverrides[voterId]
    setCustomHouseOverrides(nextOverrides)
    try {
      localStorage.setItem(`family_overrides_${selectedArea}`, JSON.stringify(nextOverrides))
    } catch (e) {
      console.warn('LocalStorage error:', e)
    }
  }

  const handleResetAllAdjustments = () => {
    if (window.confirm('Reset all manual house changes and print order for this area?')) {
      setCustomHouseOverrides({})
      setCustomHouseOrder([])
      try {
        localStorage.removeItem(`family_overrides_${selectedArea}`)
        localStorage.removeItem(`family_order_${selectedArea}`)
      } catch (e) {
        console.warn('LocalStorage error:', e)
      }
    }
  }

  // Move house Up / Down
  const moveHouseUp = (index) => {
    if (index <= 0) return
    const currentKeys = familyGroups.map((f) => f.houseKey)
    const temp = currentKeys[index]
    currentKeys[index] = currentKeys[index - 1]
    currentKeys[index - 1] = temp

    setSortOption('custom')
    setCustomHouseOrder(currentKeys)
    try {
      localStorage.setItem(`family_order_${selectedArea}`, JSON.stringify(currentKeys))
    } catch (e) {
      console.warn('LocalStorage error:', e)
    }
  }

  const moveHouseDown = (index) => {
    if (index >= familyGroups.length - 1) return
    const currentKeys = familyGroups.map((f) => f.houseKey)
    const temp = currentKeys[index]
    currentKeys[index] = currentKeys[index + 1]
    currentKeys[index + 1] = temp

    setSortOption('custom')
    setCustomHouseOrder(currentKeys)
    try {
      localStorage.setItem(`family_order_${selectedArea}`, JSON.stringify(currentKeys))
    } catch (e) {
      console.warn('LocalStorage error:', e)
    }
  }

  // Drag and drop house reordering
  const handleDragStart = (e, index) => {
    setDraggedHouseIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e, targetIndex) => {
    e.preventDefault()
    if (draggedHouseIndex === null || draggedHouseIndex === targetIndex) return

    const currentKeys = familyGroups.map((f) => f.houseKey)
    const [movedItem] = currentKeys.splice(draggedHouseIndex, 1)
    currentKeys.splice(targetIndex, 0, movedItem)

    setSortOption('custom')
    setCustomHouseOrder(currentKeys)
    setDraggedHouseIndex(null)
    try {
      localStorage.setItem(`family_order_${selectedArea}`, JSON.stringify(currentKeys))
    } catch (e) {
      console.warn('LocalStorage error:', e)
    }
  }

  const hasManualChanges = Object.keys(customHouseOverrides).length > 0 || customHouseOrder.length > 0

  return (
    <div className="space-y-6">
      {/* Top Header Card (Hidden on Print) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
              <Home className="w-4 h-4" />
              <span>Ward 2 · House-Wise Family Cannvassing</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Family Grouping — Table & Print View
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Mode Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  viewMode === 'cards' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Card View</span>
              </button>
            </div>

            {hasManualChanges && (
              <button
                type="button"
                onClick={handleResetAllAdjustments}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                title="Reset manual house changes and print order"
              >
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <span>Reset Custom Order</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
              title="Print Table in rearranged order"
            >
              <Printer className="w-4 h-4" />
              <span>Print Table Slips</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 mt-6 pt-5 border-t border-slate-100">
          {/* 1. Area Dropdown Selector */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Select Area / Street</span>
            </label>
            <select
              value={selectedArea}
              onChange={(e) => handleAreaChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            >
              <option value="ALL">📍 All Areas ({areaCounts.ALL || 0} voters)</option>
              {areasList.map((area) => (
                <option key={area.id || area.name} value={area.name}>
                  {area.name} ({areaCounts[area.name] || 0} voters)
                </option>
              ))}
              <option value="__UNASSIGNED__" className="text-amber-700 font-semibold">
                ⚠️ Unassigned Area ({areaCounts.unassigned || 0} voters)
              </option>
            </select>
          </div>

          {/* 2. Search Filter */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Search Voter, Door No, or EPIC</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search name, door no, voter ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* 3. Family Size Filter */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Family Size</span>
            </label>
            <select
              value={minFamilySize}
              onChange={(e) => setMinFamilySize(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            >
              <option value="ALL">All Sizes</option>
              <option value="4+">4+ Members (Large)</option>
              <option value="3">3 Members</option>
              <option value="2">2 Members</option>
              <option value="1">1 Member (Single)</option>
            </select>
          </div>

          {/* 4. Housing Print Order */}
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Housing Order</span>
            </label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            >
              <option value="custom">★ Custom Order (Rearranged)</option>
              <option value="house_asc">Door No (Ascending)</option>
              <option value="house_desc">Door No (Descending)</option>
              <option value="size_desc">Most Members (4, 3, 2...)</option>
              <option value="size_asc">Fewest Members (1, 2...)</option>
            </select>
          </div>
        </div>

        {/* Print Options & Toggles */}
        <div className="flex items-center gap-4 flex-wrap mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-slate-700">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPhotos}
              onChange={(e) => setShowPhotos(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Photos</span>
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showNotesCol}
              onChange={(e) => setShowNotesCol(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span>Include Remarks / Notes Column</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none bg-amber-50/80 border border-amber-300 px-2.5 py-1 rounded-md font-bold text-amber-900">
            <input
              type="checkbox"
              checked={showVoteBanner}
              onChange={(e) => setShowVoteBanner(e.target.checked)}
              className="rounded text-amber-600"
            />
            <span>🍳 Print Campaign Header (Symbol: Cooker)</span>
          </label>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">Total Houses</span>
            <div className="text-xl sm:text-2xl font-black text-blue-900 mt-0.5">{stats.totalFamilies}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Total Electors</span>
            <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{stats.totalElectors}</div>
          </div>
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide">Male / Female</span>
            <div className="text-lg sm:text-xl font-black text-indigo-950 mt-0.5">
              <span>{stats.male} M</span>
              <span className="text-slate-300 font-normal mx-1">·</span>
              <span>{stats.female} F</span>
            </div>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">4+ Member Families</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-900 mt-0.5">{stats.fourPlus}</div>
          </div>
          <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">2 - 3 Member Families</span>
            <div className="text-xl sm:text-2xl font-black text-amber-900 mt-0.5">{stats.twoToThree}</div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* THE PRINT SHEET (Table view styled cleanly for A4 print) */}
      {/* ======================================================== */}
      <div ref={printAreaRef} className="bg-white rounded-2xl print:m-0 print:p-0">
        
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
              Ward 2 — Family Grouping List
            </div>
            <div className="text-slate-600 font-medium">
              Area: <b className="text-slate-900">{selectedArea === 'ALL' ? 'All Areas' : selectedArea}</b>
            </div>
          </div>
          <div className="text-right text-slate-700 font-semibold">
            <div>
              Total Houses: <b className="text-slate-950 font-black">{stats.totalFamilies}</b> · Total Electors: <b className="text-slate-950 font-black">{stats.totalElectors}</b> (Male: <b>{stats.male}</b>, Female: <b>{stats.female}</b>)
            </div>
            <div className="text-slate-500 font-medium text-[11px] mt-0.5">
              Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-semibold animate-pulse">
            Loading voters and families...
          </div>
        ) : familyGroups.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Home className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-800">No Families Found</h3>
            <p className="text-xs text-slate-500 mt-1">Try resetting search or area filters.</p>
          </div>
        ) : viewMode === 'table' ? (
          /* ======================================================== */
          /* TABLE FORMAT: CLEANEST FOR PRINTING                      */
          /* ======================================================== */
          <div className="space-y-4">
            {familyGroups.map((family, fIdx) => (
              <div 
                key={`${family.houseKey}-${fIdx}`}
                draggable
                onDragStart={(e) => handleDragStart(e, fIdx)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, fIdx)}
                className={`border border-slate-200 rounded-xl overflow-hidden bg-white break-inside-avoid print:border-slate-400 print:mb-3.5 print:rounded-none ${
                  draggedHouseIndex === fIdx ? 'opacity-40 border-dashed border-blue-500' : ''
                }`}
              >
                {/* Family House Header */}
                <div className="bg-slate-100/90 print:bg-slate-200 px-3 py-2 flex items-center justify-between border-b border-slate-200 print:border-slate-400">
                  <div className="flex items-center gap-2">
                    {/* Reorder Buttons (Hidden on print) */}
                    <div className="flex items-center gap-0.5 print:hidden">
                      <div 
                        className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700 rounded transition"
                        title="Drag to rearrange house"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                      <button
                        type="button"
                        onClick={() => moveHouseUp(fIdx)}
                        disabled={fIdx === 0}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-20 transition"
                        title="Move House Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveHouseDown(fIdx)}
                        disabled={fIdx === familyGroups.length - 1}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-20 transition"
                        title="Move House Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="font-bold text-xs bg-slate-800 text-white px-2 py-0.5 rounded print:border print:border-black">
                      House #{fIdx + 1}
                    </span>

                    <span className="font-mono text-sm sm:text-base font-black text-slate-900">
                      Door No: {family.houseNumber}
                    </span>

                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 print:border-slate-400">
                      {family.members.length} {family.members.length === 1 ? 'Voter' : 'Voters'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 font-medium">
                    <span className="font-semibold text-slate-800">{family.areaName}</span>
                    <span className="hidden sm:inline text-slate-400 mx-1.5">|</span>
                    <span className="hidden sm:inline">SL #{family.members[0]?.serial_number} — #{family.members[family.members.length - 1]?.serial_number}</span>
                  </div>
                </div>

                {/* Table of voters inside this house */}
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
                        <th className="py-1.5 px-2 text-center w-16">Age/Sex</th>
                        <th className="py-1.5 px-2 text-center w-16">Party</th>
                        {showNotesCol && (
                          <th className="py-1.5 px-3 text-center min-w-[100px]">Remarks / Notes</th>
                        )}
                        <th className="py-1.5 px-2 text-center w-10 print:hidden">Adjust</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                      {family.members.map((member, mIdx) => {
                        const isEditingThis = editingVoter?.id === member.id

                        return (
                          <tr key={member.id || mIdx} className="hover:bg-slate-50/70 print:hover:bg-transparent">
                            {/* Sequence inside house */}
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
                              <div className="font-black text-slate-900 text-sm leading-tight">
                                {member.voter_name_telugu || '—'}
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

                            {/* Age & Sex */}
                            <td className="py-2 px-2 text-center whitespace-nowrap font-medium text-slate-700">
                              {member.age || '—'} / {member.gender ? member.gender.charAt(0) : '—'}
                            </td>

                            {/* Party */}
                            <td className="py-2 px-2 text-center font-bold text-[10px]">
                              {member.is_ysrcp && (
                                <span className="text-blue-700">YSRCP</span>
                              )}
                              {member.is_tdp && (
                                <span className="text-amber-700">TDP</span>
                              )}
                              {member.is_jsp && (
                                <span className="text-red-700">JSP</span>
                              )}
                              {member.is_other && (
                                <span className="text-slate-700">OTH</span>
                              )}
                              {!member.is_ysrcp && !member.is_tdp && !member.is_jsp && !member.is_other && (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Remarks / Notes Column for pen writing */}
                            {showNotesCol && (
                              <td className="py-2 px-3 text-center border-l border-slate-100 print:border-slate-300">
                                <div className="min-h-[22px] border-b border-dashed border-slate-300 print:border-slate-400"></div>
                              </td>
                            )}

                            {/* Manual House Adjust Button (Hidden on Print) */}
                            <td className="py-2 px-2 text-center print:hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingVoter(member)
                                  setTargetHouseInput(member.house_number || '')
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Move voter or fix door number"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Inline House Editor Modal (if voter selected) */}
                {editingVoter && family.members.some((m) => m.id === editingVoter.id) && (
                  <div className="p-2.5 bg-blue-50/90 border-t border-blue-200 flex items-center justify-between gap-2 print:hidden">
                    <span className="text-xs font-bold text-blue-900">
                      Move <b>{editingVoter.voter_name_english}</b> to Door No:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={targetHouseInput}
                        onChange={(e) => setTargetHouseInput(e.target.value)}
                        placeholder="e.g. 1-145"
                        className="bg-white border border-blue-300 rounded px-2 py-1 text-xs font-mono font-bold w-28"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveVoterHouse(editingVoter.id, targetHouseInput)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingVoter(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* ======================================================== */
          /* CARD FORMAT (Optional alternate layout)                   */
          /* ======================================================== */
          <div className="space-y-4">
            {familyGroups.map((family, idx) => (
              <div 
                key={`${family.houseKey}-${idx}`}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                      House #{idx + 1}
                    </span>
                    <span className="font-mono text-base font-black text-slate-900">
                      Door No: {family.houseNumber}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      ({family.members.length} Voters)
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-600">{family.areaName}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {family.members.map((m, mIdx) => (
                    <div key={m.id || mIdx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-blue-700">SL #{m.serial_number}</span>
                        <span className="font-mono font-bold text-slate-700">{m.voter_id}</span>
                      </div>
                      <div className="font-black text-slate-900 text-sm">{m.voter_name_telugu}</div>
                      <div className="text-slate-600 text-xs font-semibold">{m.voter_name_english}</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {m.relation_type}: <span className="font-bold text-slate-700">{m.relative_name}</span> · {m.age}Y/{m.gender}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
