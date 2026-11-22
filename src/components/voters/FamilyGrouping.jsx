import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { DEFAULT_AREAS } from '../areas/AreasManagement'
import { 
  Home, 
  MapPin, 
  Users, 
  Search, 
  Printer, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Phone, 
  ShieldCheck, 
  Hash, 
  Calendar, 
  UserCheck, 
  ArrowLeft,
  Sparkles,
  Layers,
  Building,
  Image as ImageIcon
} from 'lucide-react'
import { FALLBACK_AVATAR } from '../../utils/formatters'

export default function FamilyGrouping({ setNotice, userRole }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const areaFromQuery = searchParams.get('area')

  const [voters, setVoters] = useState([])
  const [areasList, setAreasList] = useState(DEFAULT_AREAS)
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [selectedArea, setSelectedArea] = useState(areaFromQuery || 'ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState('house_asc') // 'house_asc', 'house_desc', 'size_desc', 'size_asc'
  const [minFamilySize, setMinFamilySize] = useState('ALL') // 'ALL', '1', '2', '3', '4+'
  const [expandedHouses, setExpandedHouses] = useState(new Set())
  const [collapseAll, setCollapseAll] = useState(false)
  const [showPhotos, setShowPhotos] = useState(false)

  // Load Data
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        // 1. Fetch all voters
        const { data: votersData, error: votersError } = await supabase
          .from('voters')
          .select('*')
          .order('serial_number', { ascending: true })

        if (votersError) {
          setNotice?.(votersError.message)
        } else {
          setVoters(votersData || [])
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

  // Sync state if URL query param changes
  useEffect(() => {
    if (areaFromQuery) {
      setSelectedArea(areaFromQuery)
    }
  }, [areaFromQuery])

  // Update URL search param on area change
  const handleAreaChange = (newArea) => {
    setSelectedArea(newArea)
    if (newArea === 'ALL') {
      searchParams.delete('area')
      setSearchParams(searchParams)
    } else {
      setSearchParams({ area: newArea })
    }
  }

  // Calculate voter counts per area for dropdown badges
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

  // Step 1: Filter voters by selected Area and Search Query
  const filteredVoters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return voters.filter((voter) => {
      // Area match
      if (selectedArea === '__UNASSIGNED__') {
        const area = (voter.area_name || '').trim()
        if (area && area !== 'Unassigned') return false
      } else if (selectedArea !== 'ALL') {
        if ((voter.area_name || '').trim().toLowerCase() !== selectedArea.trim().toLowerCase()) {
          return false
        }
      }

      // Search match
      if (q) {
        const telugu = (voter.voter_name_telugu || '').toLowerCase()
        const english = (voter.voter_name_english || '').toLowerCase()
        const relative = (voter.relative_name || '').toLowerCase()
        const epic = (voter.voter_id || '').toLowerCase()
        const serial = String(voter.serial_number || '').toLowerCase()
        const house = (voter.house_number || '').toLowerCase()
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
  }, [voters, selectedArea, searchQuery])

  // Step 2: Group voters into Families by House Number (Door No)
  const familyGroups = useMemo(() => {
    const map = new Map()

    filteredVoters.forEach((voter) => {
      // Normalize house number
      let rawHouse = (voter.house_number || '').trim()
      const houseKey = rawHouse ? rawHouse.toUpperCase() : 'NO_HOUSE_NO'

      if (!map.has(houseKey)) {
        map.set(houseKey, {
          houseNumber: rawHouse || 'Unassigned Door No',
          isUnassigned: !rawHouse,
          areaName: voter.area_name || 'Unassigned Area',
          members: []
        })
      }
      map.get(houseKey).members.push(voter)
    })

    let list = Array.from(map.values())

    // Inside each family, sort members:
    // Elders first (age descending), or head of family
    list.forEach((family) => {
      family.members.sort((a, b) => {
        const ageA = parseInt(a.age, 10) || 0
        const ageB = parseInt(b.age, 10) || 0
        if (ageB !== ageA) return ageB - ageA // Oldest elder first
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
    list.sort((a, b) => {
      if (a.isUnassigned) return 1
      if (b.isUnassigned) return -1

      if (sortOption === 'size_desc') {
        return b.members.length - a.members.length
      }
      if (sortOption === 'size_asc') {
        return a.members.length - b.members.length
      }
      if (sortOption === 'house_desc') {
        return b.houseNumber.localeCompare(a.houseNumber, undefined, { numeric: true, sensitivity: 'base' })
      }
      // Default: house_asc
      return a.houseNumber.localeCompare(b.houseNumber, undefined, { numeric: true, sensitivity: 'base' })
    })

    return list
  }, [filteredVoters, minFamilySize, sortOption])

  // Statistics
  const stats = useMemo(() => {
    const totalFamilies = familyGroups.length
    const totalElectors = familyGroups.reduce((acc, f) => acc + f.members.length, 0)
    let singleMember = 0
    let twoToThree = 0
    let fourPlus = 0

    familyGroups.forEach((f) => {
      const sz = f.members.length
      if (sz === 1) singleMember++
      else if (sz === 2 || sz === 3) twoToThree++
      else if (sz >= 4) fourPlus++
    })

    return { totalFamilies, totalElectors, singleMember, twoToThree, fourPlus }
  }, [familyGroups])

  // Expand / Collapse toggles
  const toggleHouse = (houseKey) => {
    setExpandedHouses((prev) => {
      const next = new Set(prev)
      if (next.has(houseKey)) {
        next.delete(houseKey)
      } else {
        next.add(houseKey)
      }
      return next
    })
  }

  const handleToggleAll = () => {
    if (collapseAll) {
      setExpandedHouses(new Set())
      setCollapseAll(false)
    } else {
      const allKeys = new Set(familyGroups.map((f) => f.houseNumber))
      setExpandedHouses(allKeys)
      setCollapseAll(true)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
              <Home className="w-4 h-4" />
              <span>Ward 2 · House-Wise Family Cannvassing</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Family Grouping by House / Door No
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Select an area to view voters automatically grouped by identical house address (houses with 4, 3, 2 or individual electors).
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Print Family Slips / Roster"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Page</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPhotos((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition border ${
                showPhotos 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>{showPhotos ? 'Hide Photos' : 'Show Photos'}</span>
            </button>
            <button
              type="button"
              onClick={handleToggleAll}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
            >
              {collapseAll ? (
                <>
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                  <span>Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                  <span>Expand All</span>
                </>
              )}
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
            <div className="relative">
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
          </div>

          {/* 2. Search Filter */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Search Voter, Door No, or EPIC</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search name, door no (e.g. 1-145), voter ID..."
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

          {/* 4. Sort Families */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>Sort Families</span>
            </label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            >
              <option value="house_asc">Door No (Ascending)</option>
              <option value="house_desc">Door No (Descending)</option>
              <option value="size_desc">Most Members (4, 3, 2...)</option>
              <option value="size_asc">Fewest Members (1, 2...)</option>
            </select>
          </div>
        </div>

        {/* Live KPI Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">Total Houses</span>
            <div className="text-xl sm:text-2xl font-black text-blue-900 mt-0.5">{stats.totalFamilies}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Total Electors</span>
            <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">{stats.totalElectors}</div>
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

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="h-20 bg-slate-100 rounded-xl"></div>
                <div className="h-20 bg-slate-100 rounded-xl"></div>
                <div className="h-20 bg-slate-100 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      ) : familyGroups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Home className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Families Found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            No voter families match the selected area (<span className="font-semibold">{selectedArea}</span>) and search criteria.
          </p>
          {(selectedArea !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedArea('ALL')
                setSearchQuery('')
                setMinFamilySize('ALL')
              }}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        /* Family Group Cards List */
        <div className="space-y-4">
          {familyGroups.map((family, idx) => {
            const isUnassigned = family.isUnassigned
            const memberCount = family.members.length
            const isCollapsed = collapseAll || expandedHouses.has(family.houseNumber)

            // Dynamic color accents based on family size
            const sizeBadgeColor = 
              memberCount >= 4 
                ? 'bg-purple-100 text-purple-800 border-purple-200' 
                : memberCount === 3
                ? 'bg-blue-100 text-blue-800 border-blue-200'
                : memberCount === 2
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'

            return (
              <div 
                key={`${family.houseNumber}-${idx}`}
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition duration-150 break-inside-avoid"
              >
                {/* Family Header */}
                <div 
                  className={`p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 border-b ${
                    isUnassigned ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/70 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                      <Home className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-base sm:text-lg font-black text-slate-900">
                          {isUnassigned ? '⚠️ Unassigned Door No' : `House: ${family.houseNumber}`}
                        </span>

                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${sizeBadgeColor}`}>
                          {memberCount} {memberCount === 1 ? 'Voter' : 'Voters'}
                        </span>

                        {memberCount >= 4 && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            ★ Key Family
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {family.areaName || 'Ward 2'}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span>Serial #{family.members[0]?.serial_number} — #{family.members[family.members.length - 1]?.serial_number}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleHouse(family.houseNumber)}
                      className="p-1.5 hover:bg-slate-200/70 rounded-lg text-slate-500 transition print:hidden"
                      title={isCollapsed ? 'Expand members' : 'Collapse members'}
                    >
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Family Members Grid / Table */}
                {!isCollapsed && (
                  <div className="p-3.5 sm:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {family.members.map((member, mIdx) => {
                        const isElder = mIdx === 0 && (parseInt(member.age, 10) >= 45 || family.members.length > 1)

                        return (
                          <div
                            key={member.id || member.voter_id || mIdx}
                            className={`p-3 rounded-xl border transition flex flex-col justify-between ${
                              isElder 
                                ? 'bg-amber-50/30 border-amber-200/80 shadow-xs' 
                                : 'bg-slate-50/50 border-slate-200/70 hover:bg-white'
                            }`}
                          >
                            <div>
                              {/* Top Bar: Serial & EPIC */}
                              <div className="flex items-center justify-between gap-1.5 border-b border-slate-200/60 pb-2 mb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="bg-blue-50 text-blue-700 font-bold text-[10px] px-1.5 py-0.5 rounded border border-blue-200">
                                    SL #{member.serial_number}
                                  </span>
                                  {isElder && (
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                      Head / Elder
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-[11px] font-bold text-slate-700">
                                  {member.voter_id}
                                </span>
                              </div>

                              {/* Voter Info & Optional Photo */}
                              <div className="flex items-start gap-2.5">
                                {showPhotos && (
                                  <div className="w-12 h-14 rounded-lg bg-slate-200 border border-slate-300 overflow-hidden shrink-0">
                                    <img
                                      src={member.image_path || FALLBACK_AVATAR}
                                      alt={member.voter_name_english}
                                      className="w-full h-full object-cover"
                                      onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR }}
                                    />
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  {/* Telugu Name */}
                                  <div className="text-base font-black text-slate-900 leading-tight truncate">
                                    {member.voter_name_telugu || 'పేరు లేదు'}
                                  </div>

                                  {/* English Name */}
                                  <div className="text-xs font-semibold text-slate-700 truncate">
                                    {member.voter_name_english || '—'}
                                  </div>

                                  {/* Relation */}
                                  <div className="text-[11px] text-slate-500 mt-1 truncate">
                                    <span className="font-medium text-slate-600">{member.relation_type || 'Relation'}:</span>{' '}
                                    <span className="font-bold text-slate-800">{member.relative_name || '—'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Bottom row: Age, Gender, Party Badge */}
                            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-600">
                                {member.age ? `${member.age} Yrs` : '—'} · {member.gender || '—'}
                              </span>

                              {/* Optional Party Indication */}
                              <div className="flex items-center gap-1 font-bold text-[10px]">
                                {member.is_ysrcp && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">YSRCP</span>
                                )}
                                {member.is_tdp && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">TDP</span>
                                )}
                                {member.is_jsp && (
                                  <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">JSP</span>
                                )}
                                {member.is_other && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">OTH</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
