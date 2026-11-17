import Papa from 'papaparse'

export const voterColumns = [
  'serial_number',
  'voter_id',
  'voter_name_telugu',
  'voter_name_english',
  'relative_name',
  'relation_type',
  'house_number',
  'age',
  'gender',
  'ward_number',
  'image_path',
  'is_verified',
  // Political affiliation & fund tracking columns
  'is_ysrcp',
  'is_tdp',
  'is_jsp',
  'is_other',
  'amount',
  'amount_given_user',
  'amount_given_time',
  'note'
]

const parseBool = (val) => {
  if (typeof val === 'boolean') return val
  if (!val) return false
  const s = String(val).trim().toLowerCase()
  return ['true', '1', 'yes', 'y'].includes(s)
}

export function parseVoterCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      complete: ({ data, errors, meta }) => {
        if (errors.length && (!data || data.length === 0)) {
          return reject(new Error(errors[0].message))
        }

        const rows = data.map(row => {
          // Flexible mapping supporting exact user names: isysrcp, isTDP, isJSP, other, amount, amountgivenuser, amountgivenTime, note
          const isYsrcp = parseBool(row.is_ysrcp ?? row.isysrcp ?? row.isYSRCP ?? row.YSRCP ?? row.ysrcp)
          const isTdp = parseBool(row.is_tdp ?? row.isTDP ?? row.istdp ?? row.TDP ?? row.tdp)
          const isJsp = parseBool(row.is_jsp ?? row.isJSP ?? row.isjsp ?? row.JSP ?? row.jsp)
          const isOther = parseBool(row.is_other ?? row.isOther ?? row.other ?? row.isother ?? row.Other)

          const amountVal = row.amount !== undefined && row.amount !== null && String(row.amount).trim() !== ''
            ? parseFloat(String(row.amount).replace(/[^0-9.-]+/g, ''))
            : 0

          const amountGivenTime = row.amount_given_time || row.amountgivenTime || row.amountGivenTime || row['amount_given_time'] || null
          const amountGivenUser = row.amount_given_user || row.amountgivenuser || row.amountGivenUser || null
          const note = row.note || row.Note || row.remarks || null

          return {
            serial_number: row.serial_number || row.serialNumber || row['Serial number'] || row['Sl. No.'] || null,
            voter_id: row.voter_id || row.voterId || row['Voter ID'] || row['voter_id'] || null,
            voter_name_telugu: row.voter_name_telugu || row.voterNameTelugu || row['Voter name (Telugu)'] || null,
            voter_name_english: row.voter_name_english || row.voterNameEnglish || row['Voter name (English)'] || row['Name'] || null,
            relative_name: row.relative_name || row.relativeName || row['Father/Husband name (Telugu)'] || row['Relative Name'] || null,
            relation_type: row.relation_type || row.relationType || row['Relation type'] || null,
            house_number: row.house_number || row.houseNumber || row['House number'] || row['Door No'] || null,
            age: row.age ? Number(row.age) : null,
            gender: row.gender || row.Gender || null,
            ward_number: row.ward_number || row.wardNumber || row['Ward number'] || row['Booth No'] || null,
            image_path: row.image_path || row.imagePath || row['Image Path'] || null,
            is_verified: parseBool(row.is_verified || row.isVerified),
            is_ysrcp: isYsrcp,
            is_tdp: isTdp,
            is_jsp: isJsp,
            is_other: isOther,
            amount: isNaN(amountVal) ? 0 : amountVal,
            amount_given_user: amountGivenUser,
            amount_given_time: amountGivenTime,
            note: note
          }
        }).filter(r => r.voter_id || r.serial_number || r.voter_name_english || r.voter_name_telugu)

        resolve({ rows, headers: meta.fields || [] })
      },
      error: reject
    })
  })
}

export function downloadVoterCsv(rows, filename = 'election-voters-list.csv') {
  const exportData = rows.map(row => ({
    serial_number: row.serial_number ?? '',
    voter_id: row.voter_id ?? '',
    voter_name_telugu: row.voter_name_telugu ?? '',
    voter_name_english: row.voter_name_english ?? '',
    relative_name: row.relative_name ?? '',
    relation_type: row.relation_type ?? '',
    house_number: row.house_number ?? '',
    age: row.age ?? '',
    gender: row.gender ?? '',
    ward_number: row.ward_number ?? '',
    image_path: row.image_path ?? '',
    is_verified: row.is_verified ? '1' : '0',
    isysrcp: row.is_ysrcp ? '1' : '0',
    isTDP: row.is_tdp ? '1' : '0',
    isJSP: row.is_jsp ? '1' : '0',
    other: row.is_other ? '1' : '0',
    amount: row.amount ?? 0,
    amountgivenuser: row.amount_given_user ?? '',
    amountgivenTime: row.amount_given_time ?? '',
    note: row.note ?? ''
  }))

  const csv = Papa.unparse(exportData)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadSampleCsvTemplate() {
  const sample = [
    {
      serial_number: '1',
      voter_id: 'ABC1234567',
      voter_name_telugu: 'రాముడు కొవ్వూరు',
      voter_name_english: 'Ramudu Kovvuru',
      relative_name: 'సుబ్బయ్య',
      relation_type: 'Father',
      house_number: '12-3-45',
      age: '42',
      gender: 'M',
      ward_number: 'Ward 14',
      image_path: '',
      is_verified: '1',
      isysrcp: '1',
      isTDP: '0',
      isJSP: '0',
      other: '0',
      amount: '500',
      amountgivenuser: 'Suresh Kumar',
      amountgivenTime: '2026-05-10 14:30:00',
      note: 'Verified with Aadhaar card'
    },
    {
      serial_number: '2',
      voter_id: 'XYZ9876543',
      voter_name_telugu: 'లక్ష్మి గారు',
      voter_name_english: 'Lakshmi Garu',
      relative_name: 'వెంకటేశ్వర్లు',
      relation_type: 'Husband',
      house_number: '12-3-46',
      age: '38',
      gender: 'F',
      ward_number: 'Ward 14',
      image_path: '',
      is_verified: '1',
      isysrcp: '0',
      isTDP: '1',
      isJSP: '0',
      other: '0',
      amount: '0',
      amountgivenuser: '',
      amountgivenTime: '',
      note: 'TDP supporter'
    },
    {
      serial_number: '3',
      voter_id: 'JSP5544332',
      voter_name_telugu: 'పవన్ కుమార్',
      voter_name_english: 'Pavan Kumar',
      relative_name: 'నారాయణ',
      relation_type: 'Father',
      house_number: '12-4-10',
      age: '24',
      gender: 'M',
      ward_number: 'Ward 14',
      image_path: '',
      is_verified: '0',
      isysrcp: '0',
      isTDP: '0',
      isJSP: '1',
      other: '0',
      amount: '0',
      amountgivenuser: '',
      amountgivenTime: '',
      note: 'Youth leader'
    }
  ]
  const csv = Papa.unparse(sample)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'sample_election_voters_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}
