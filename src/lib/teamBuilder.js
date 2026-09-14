/**
 * teamBuilder — pure helpers for turning a pool of players into teams and groups.
 *
 * Extracted from TournamentSetupWizard so the league wizard and the local
 * (device-only) wizard share one implementation of the draft algorithm rather
 * than drifting apart. Nothing here touches storage, the network or React.
 */

const LEVEL_SCORE = { beginner: 1, intermediate: 2, advanced: 3 }

export function snakeDraft(sorted, numTeams, teamSize) {
  const slots = Array.from({ length: numTeams }, () => [])
  sorted.forEach((p, i) => {
    const row = Math.floor(i / numTeams)
    const col = row % 2 === 0 ? i % numTeams : numTeams - 1 - (i % numTeams)
    if (slots[col] && slots[col].length < teamSize) slots[col].push(p.id)
  })
  return slots.filter(s => s.length === teamSize)
}


export function interleave(...arrs) {
  const pools = arrs.map(arr => ({ arr, idx: 0 })).filter(p => p.arr.length > 0)
  const result = []
  const total = arrs.reduce((s, a) => s + a.length, 0)
  for (let i = 0; i < total; i++) {
    let best = null, bestScore = Infinity
    for (const p of pools) {
      if (p.idx >= p.arr.length) continue
      const score = p.idx / p.arr.length
      if (score < bestScore) { bestScore = score; best = p }
    }
    if (best) result.push(best.arr[best.idx++])
  }
  return result
}

export function buildTeamGroups(pool, params, teamSize) {
  const n = Math.floor(pool.length / teamSize)
  if (n < 1) return []

  const rand = arr => [...arr].sort(() => Math.random() - 0.5)

  // Map linked-profile gender strings to the canonical sex codes used in player rows
  const PROFILE_TO_SEX = { male: 'M', female: 'F', other: 'X' }
  const sexOf = p => p.sex || PROFILE_TO_SEX[p.gender] || null

  // Sex predicates — fall back to linked profile gender so linked users are never
  // silently bucketed as "Other" just because their players.sex column is null.
  const M = p => sexOf(p) === 'M'
  const F = p => sexOf(p) === 'F'
  const O = p => sexOf(p) !== 'M' && sexOf(p) !== 'F'

  // Sort descending by level but shuffle within each tier so every Regenerate
  // call produces a different valid arrangement (fixes deterministic output).
  const byLevel = arr => {
    const tiers = { advanced: [], intermediate: [], beginner: [], unknown: [] }
    for (const p of arr) {
      const key = Object.prototype.hasOwnProperty.call(LEVEL_SCORE, p.level) ? p.level : 'unknown'
      tiers[key].push(p)
    }
    return [
      ...rand(tiers.advanced),
      ...rand(tiers.intermediate),
      ...rand(tiers.beginner),
      ...rand(tiers.unknown),
    ]
  }

  let sorted
  if      (params.length === 0)                          sorted = rand(pool)
  else if (params[0] === 'sex'   && params.length === 1) sorted = interleave(rand(pool.filter(M)), rand(pool.filter(F)), rand(pool.filter(O)))
  else if (params[0] === 'level' && params.length === 1) sorted = byLevel(pool)
  else if (params[0] === 'sex')                          sorted = interleave(byLevel(pool.filter(M)), byLevel(pool.filter(F)), byLevel(pool.filter(O)))
  else {
    // Level-primary, sex-secondary: sort by tier desc, then randomise within each
    // (level, sex) sub-bucket so Regenerate produces genuinely different teams.
    const TIERS = ['advanced', 'intermediate', 'beginner', 'unknown']
    const SEXES = ['M', 'F', 'X']
    sorted = []
    for (const tier of TIERS) {
      for (const sx of SEXES) {
        sorted.push(...rand(pool.filter(p => {
          const key = Object.prototype.hasOwnProperty.call(LEVEL_SCORE, p.level) ? p.level : 'unknown'
          return key === tier && sexOf(p) === sx
        })))
      }
      // Include players of this tier whose sex is null / unrecognised
      sorted.push(...rand(pool.filter(p => {
        const key = Object.prototype.hasOwnProperty.call(LEVEL_SCORE, p.level) ? p.level : 'unknown'
        return key === tier && sexOf(p) !== 'M' && sexOf(p) !== 'F' && sexOf(p) !== 'X'
      })))
    }
  }

  return snakeDraft(sorted, n, teamSize)
}

export function paramDescription(params) {
  if (params.length === 0)                            return 'Teams generated randomly with no prioritization.'
  if (params[0] === 'sex'   && params.length === 1)   return 'Teams balanced by sex — males and females distributed evenly.'
  if (params[0] === 'level' && params.length === 1)   return 'Teams balanced by skill level using a snake draft.'
  if (params[0] === 'sex')   return 'Primary: balance sex across teams. Secondary: balance skill level within each sex group.'
  return 'Primary: balance skill level across teams. Secondary: alternate sex within the same level.'
}

export function playerColor(name) {
  const palette = ['#C0392B','#8E44AD','#2980B9','#16A085','#27AE60','#E67E22','#9B59B6','#1ABC9C','#D35400','#2C3E50']
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) | 0
  return palette[Math.abs(hash) % palette.length]
}

export function playerInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function formatDateDisplay(iso) {
  if (!iso) return 'Select date'
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const parts = iso.split('-')
  if (parts.length === 3) return `${months[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}`
  return iso
}

export function shortName(name) {
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length < 2) return parts[0] || name
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}


export function genderLabel(sex) {
  if (sex === 'M') return 'Male'
  if (sex === 'F') return 'Female'
  return sex ? 'Other' : null
}

export function getValidGroupOptions(numTeams) {
  return [2, 4, 8].filter(g => Math.floor(numTeams / g) >= 3)
}

export function buildPreviewGroups(teamList, numGroups) {
  const groups = Array.from({ length: numGroups }, (_, i) => ({
    id: `g${i}`,
    name: `Group ${String.fromCharCode(65 + i)}`,
    teamIds: [],
  }))
  teamList.forEach((tm, idx) => { groups[idx % numGroups].teamIds.push(tm.id) })
  return groups
}

