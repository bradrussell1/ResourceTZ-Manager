import React, { useState, useMemo, useCallback, useEffect } from 'react'

// ─── ID Generator ─────────────────────────────────────────────────────────────
let _seq = 500
const uid = () => `x${++_seq}`

// ─── TZ System ────────────────────────────────────────────────────────────────
// Hours each TZ is ahead of PST (fixed offsets, no DST complexity)
const TZ_OFFSET = { PST: 0, MST: 1, CST: 2, EST: 3 }
const TZ_LIST   = ['PST', 'MST', 'CST', 'EST']

const TZ_COLOR = { EST: '#60a5fa', CST: '#2dd4bf', MST: '#fbbf24', PST: '#fb923c' }
const TZ_BG    = { EST: '#0c1829', CST: '#041614', MST: '#1a1100', PST: '#1a0a00' }

// Colors for project segments (used in DayTimeline)
const PROJ_COLORS   = ['#60a5fa', '#4ade80', '#c084fc', '#fb923c', '#f472b6', '#34d399', '#a78bfa', '#fbbf24']
// Colors for person bands (used in ProjectTZTimeline)
const PERSON_COLORS = ['#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#c084fc', '#fb923c', '#34d399', '#a78bfa']

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#090c12',
  panel:   '#0f1420',
  card:    '#141926',
  cardAlt: '#111520',
  field:   '#0b0e17',
  border:  '#212840',
  borderH: '#2e3654',
  t1:      '#e9ecf6',
  t2:      '#8c96b4',
  t3:      '#565f7a',
  amber:   '#f59e0b',
  amberBg: '#160f00',
  amberB:  '#2e2000',
  green:   '#22c55e',
  greenBg: '#031509',
  greenB:  '#0a2e14',
  red:     '#ef4444',
  redBg:   '#150404',
  redB:    '#320c0c',
}

const inputSx = {
  background: C.field,
  border: `1px solid ${C.border}`,
  borderRadius: 3,
  color: C.t1,
  fontSize: 12,
  padding: '5px 8px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
const [P1,P2,P3,P4,P5,P6,P7] = ['p1','p2','p3','p4','p5','p6','p7']
const [J1,J2,J3,J4]           = ['j1','j2','j3','j4']

const SEED_PEOPLE = [
  { id:P1, name:'Sarah Chen',    role:'Senior Designer',   city:'San Francisco', homeTimezone:'PST', workStart:'09:00', workEnd:'18:00' },
  { id:P2, name:'Marcus Webb',   role:'Strategist',         city:'New York',      homeTimezone:'EST', workStart:'09:00', workEnd:'18:00' },
  { id:P3, name:'Priya Patel',   role:'PM',                 city:'Chicago',       homeTimezone:'CST', workStart:'09:00', workEnd:'18:00' },
  { id:P4, name:'Jordan Lee',    role:'Copywriter',         city:'New York',      homeTimezone:'EST', workStart:'09:00', workEnd:'18:00' },
  { id:P5, name:'Tyler Brooks',  role:'Creative Director',  city:'Los Angeles',   homeTimezone:'PST', workStart:'09:00', workEnd:'18:00' },
  { id:P6, name:'Aisha Okonkwo', role:'UX Designer',        city:'Austin',        homeTimezone:'CST', workStart:'09:00', workEnd:'18:00' },
  { id:P7, name:'Daniel Russo',  role:'PM',                 city:'Denver',        homeTimezone:'MST', workStart:'09:00', workEnd:'18:00' },
]

const SEED_PROJECTS = [
  { id:J1, name:'Replit — Brand Platform',   client:'Replit', projectTimezone:'PST', status:'Active' },
  { id:J2, name:'Holcim — Campaign Refresh', client:'Holcim', projectTimezone:'EST', status:'Active' },
  { id:J3, name:'Uniqlo — Holiday Launch',   client:'Uniqlo', projectTimezone:'PST', status:'Active' },
  { id:J4, name:'Apple EDU — Microsite',     client:'Apple',  projectTimezone:'PST', status:'Active' },
]

const SEED_ASSIGNMENTS = [
  { id:'a1',  personId:P1, projectId:J1, hoursPerDay:4, blockStart:'09:00', blockEnd:'13:00' },
  { id:'a2',  personId:P1, projectId:J3, hoursPerDay:4, blockStart:'13:00', blockEnd:'17:00' },
  { id:'a3',  personId:P2, projectId:J2, hoursPerDay:6, blockStart:'09:00', blockEnd:'15:00' },
  { id:'a4',  personId:P2, projectId:J1, hoursPerDay:3, blockStart:'15:00', blockEnd:'18:00' },
  { id:'a5',  personId:P3, projectId:J4, hoursPerDay:5, blockStart:'09:00', blockEnd:'14:00' },
  { id:'a6',  personId:P3, projectId:J2, hoursPerDay:3, blockStart:'14:00', blockEnd:'17:00' },
  { id:'a7',  personId:P4, projectId:J2, hoursPerDay:4, blockStart:'09:00', blockEnd:'13:00' },
  { id:'a8',  personId:P4, projectId:J3, hoursPerDay:5, blockStart:'13:00', blockEnd:'18:00' },
  { id:'a9',  personId:P5, projectId:J1, hoursPerDay:8, blockStart:'09:00', blockEnd:'17:00' },
  { id:'a10', personId:P6, projectId:J3, hoursPerDay:4, blockStart:'09:00', blockEnd:'13:00' },
  { id:'a11', personId:P6, projectId:J4, hoursPerDay:4, blockStart:'13:00', blockEnd:'17:00' },
  { id:'a12', personId:P7, projectId:J4, hoursPerDay:3, blockStart:'09:00', blockEnd:'12:00' },
  { id:'a13', personId:P7, projectId:J1, hoursPerDay:4, blockStart:'12:00', blockEnd:'16:00' },
]

// ─── Utilities ────────────────────────────────────────────────────────────────

// "09:00" → 9.0, "13:30" → 13.5
const parseTime = t => {
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
}

// 9.0 → "9:00am", 13.5 → "1:30pm"
const fmtTime = h => {
  const n    = ((h % 24) + 24) % 24
  const mins = Math.round((n % 1) * 60)
  const hrs  = Math.floor(n)
  const ampm = hrs >= 12 ? 'pm' : 'am'
  const disp = hrs === 0 ? 12 : hrs > 12 ? hrs - 12 : hrs
  return `${disp}:${mins.toString().padStart(2, '0')}${ampm}`
}

// 4 → "4h", 8.5 → "8.5h"
const fmtH = h => `${h}h`

// Convert decimal hours from one TZ to another
// e.g. convertTZ(9, 'EST', 'PST') = 6  (9am EST = 6am PST)
const convertTZ = (time, fromTZ, toTZ) => time + TZ_OFFSET[toTZ] - TZ_OFFSET[fromTZ]

// Compute working-hour overlap between a person and a project's core hours (9am–6pm in projTZ)
// Uses PST as common reference for the intersection calculation
const computeOverlap = (person, projectTZ) => {
  const pStartPST = parseTime(person.workStart) - TZ_OFFSET[person.homeTimezone]
  const pEndPST   = parseTime(person.workEnd)   - TZ_OFFSET[person.homeTimezone]
  const jStartPST = 9  - TZ_OFFSET[projectTZ]
  const jEndPST   = 18 - TZ_OFFSET[projectTZ]
  const oStart    = Math.max(pStartPST, jStartPST)
  const oEnd      = Math.min(pEndPST, jEndPST)
  const hours     = Math.max(0, oEnd - oStart)
  // Express overlap endpoints in projectTZ for display
  return {
    hours,
    displayStart: fmtTime(oStart + TZ_OFFSET[projectTZ]),
    displayEnd:   fmtTime(oEnd   + TZ_OFFSET[projectTZ]),
    tz:           projectTZ,
  }
}

const overlapStatus = hours => {
  if (hours < 4)  return { label:'Low overlap',     color:C.red,   bg:C.redBg,   border:C.redB   }
  if (hours <= 6) return { label:'Partial overlap', color:C.amber, bg:C.amberBg, border:C.amberB }
  return                  { label:'Healthy overlap', color:C.green, bg:C.greenBg, border:C.greenB }
}

const capStatus = hrs => {
  if (hrs >= 9) return { label:'Over capacity', color:C.red,   bg:C.redBg,   border:C.redB   }
  if (hrs >= 8) return { label:'At capacity',   color:C.amber, bg:C.amberBg, border:C.amberB }
  return null
}

const getTotalHours = (personId, assignments) =>
  assignments.filter(a => a.personId === personId).reduce((s, a) => s + a.hoursPerDay, 0)

const projColor = (projectId, projects) =>
  PROJ_COLORS[projects.findIndex(p => p.id === projectId) % PROJ_COLORS.length]

// City → TZ auto-suggest
const cityToTZ = city => {
  const c = city.toLowerCase()
  if (/new york|boston|miami|atlanta|philly|washington|charlotte|detroit/.test(c)) return 'EST'
  if (/chicago|dallas|houston|minneapolis|kansas|nashville|austin|st. louis/.test(c)) return 'CST'
  if (/denver|phoenix|salt lake|albuquerque|boise/.test(c)) return 'MST'
  if (/los angeles|san francisco|seattle|portland|las vegas|san diego/.test(c)) return 'PST'
  return 'PST'
}

// ─── Micro Components ─────────────────────────────────────────────────────────

function TZBadge({ tz }) {
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 3,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      background: TZ_BG[tz], color: TZ_COLOR[tz],
      border: `1px solid ${TZ_COLOR[tz]}44`, fontFamily: 'monospace',
      lineHeight: '18px', whiteSpace: 'nowrap',
    }}>
      {tz}
    </span>
  )
}

function CapBadge({ hrs }) {
  const s = capStatus(hrs)
  if (!s) return null
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 3,
      fontSize: 10, fontWeight: 700, background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  )
}

function OverlapBadge({ hours }) {
  const s = overlapStatus(hours)
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 3,
      fontSize: 10, fontWeight: 700, background: s.bg, color: s.color,
      border: `1px solid ${s.border}`, whiteSpace: 'nowrap',
    }}>
      {s.label} · {hours}h
    </span>
  )
}

// ─── Day Timeline (Person Detail) ─────────────────────────────────────────────
// Shows person's working day with colored project blocks

function DayTimeline({ person, personAssignments, projects }) {
  const dayStart = parseTime(person.workStart)
  const dayEnd   = parseTime(person.workEnd)
  const dur      = dayEnd - dayStart

  const pct  = h => `${((h - dayStart) / dur) * 100}%`
  const wPct = (s, e) => `${Math.max(0, (Math.min(dayEnd, e) - Math.max(dayStart, s)) / dur * 100)}%`

  const ticks = []
  for (let h = Math.ceil(dayStart); h < dayEnd; h++) ticks.push(h)

  return (
    <div>
      {/* Bar */}
      <div style={{ position: 'relative', height: 48, background: C.field, borderRadius: 4, overflow: 'hidden' }}>
        {ticks.map(h => (
          <div key={h} style={{
            position: 'absolute', left: pct(h), top: 0, bottom: 0, width: 1,
            background: h % 2 === 0 ? C.borderH : C.border,
          }} />
        ))}
        {personAssignments.map(a => {
          const aS    = parseTime(a.blockStart)
          const aE    = parseTime(a.blockEnd)
          const cS    = Math.max(dayStart, aS)
          const cE    = Math.min(dayEnd, aE)
          if (cE <= cS) return null
          const proj  = projects.find(p => p.id === a.projectId)
          const color = projColor(a.projectId, projects)
          return (
            <div key={a.id} style={{
              position: 'absolute',
              left: pct(cS),
              width: wPct(cS, cE),
              top: 0, bottom: 0,
              background: color,
              opacity: 0.9,
              borderRight: `2px solid ${C.bg}`,
              display: 'flex', alignItems: 'center',
              overflow: 'hidden', paddingLeft: 6,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#06080f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {(proj?.name || '').split('—')[0].trim()} · {fmtH(a.hoursPerDay)}
              </span>
            </div>
          )
        })}
      </div>
      {/* Axis */}
      <div style={{ position: 'relative', height: 18, marginTop: 3 }}>
        <span style={{ position: 'absolute', left: 0,     fontSize: 9, color: C.t3, fontFamily: 'monospace' }}>{fmtTime(dayStart)}</span>
        {ticks.filter(h => h % 2 === 0).map(h => (
          <span key={h} style={{ position: 'absolute', left: pct(h), transform: 'translateX(-50%)', fontSize: 9, color: C.t3, fontFamily: 'monospace' }}>
            {fmtTime(h)}
          </span>
        ))}
        <span style={{ position: 'absolute', right: 0, fontSize: 9, color: C.t3, fontFamily: 'monospace' }}>{fmtTime(dayEnd)}</span>
      </div>
    </div>
  )
}

// ─── Project TZ Timeline (Project Detail) ─────────────────────────────────────
// 24-hour bar in project TZ showing each assigned person's working window

function ProjectTZTimeline({ project, projAssignments, people }) {
  const projTZ = project.projectTimezone
  const toX    = h => `${(Math.max(0, Math.min(24, h)) / 24) * 100}%`
  const toW    = (s, e) => `${Math.max(0, (Math.min(24, e) - Math.max(0, s)) / 24 * 100)}%`
  const rowH   = 24
  const barH   = Math.max(56, projAssignments.length * rowH + 16)

  return (
    <div>
      {/* Hour labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.t3, fontFamily: 'monospace', marginBottom: 4 }}>
        {[0,3,6,9,12,15,18,21,24].map(h => (
          <span key={h}>{h===0?'12am':h===12?'12pm':h<12?`${h}am`:`${h-12}pm`}</span>
        ))}
      </div>
      {/* Bar */}
      <div style={{ position: 'relative', height: barH, background: C.field, borderRadius: 4, overflow: 'hidden' }}>
        {/* Grid lines */}
        {[6,12,18].map(h => (
          <div key={h} style={{ position:'absolute', left:toX(h), top:0, bottom:0, width:1, background:C.borderH }} />
        ))}
        {/* Project core hours band */}
        <div style={{
          position:'absolute', left:toX(9), width:toW(9,18), top:0, bottom:0,
          background:'rgba(255,255,255,0.04)',
          borderLeft:`1px solid ${C.borderH}`, borderRight:`1px solid ${C.borderH}`,
        }} />
        <span style={{ position:'absolute', left:toX(9), top:3, fontSize:8, color:C.t3, paddingLeft:4, fontFamily:'monospace' }}>
          Core 9am–6pm {projTZ}
        </span>
        {/* Person bands */}
        {projAssignments.map((a, i) => {
          const person = people.find(p => p.id === a.personId)
          if (!person) return null
          const pS    = convertTZ(parseTime(person.workStart), person.homeTimezone, projTZ)
          const pE    = convertTZ(parseTime(person.workEnd),   person.homeTimezone, projTZ)
          const color = PERSON_COLORS[i % PERSON_COLORS.length]
          return (
            <div key={a.id} style={{
              position: 'absolute',
              left: toX(pS), width: toW(pS, pE),
              top: 10 + i * rowH, height: rowH - 4,
              background: color, opacity: 0.82, borderRadius: 2,
              display: 'flex', alignItems: 'center',
              overflow: 'hidden', paddingLeft: 5,
              fontSize: 9, fontWeight: 700, color: '#06080f',
            }}>
              {person.name.split(' ')[0]}
            </div>
          )
        })}
      </div>
      {/* Legend */}
      <div style={{ display:'flex', gap:12, marginTop:8, flexWrap:'wrap' }}>
        {projAssignments.map((a, i) => {
          const person = people.find(p => p.id === a.personId)
          if (!person) return null
          const pS    = convertTZ(parseTime(person.workStart), person.homeTimezone, projTZ)
          const pE    = convertTZ(parseTime(person.workEnd),   person.homeTimezone, projTZ)
          const color = PERSON_COLORS[i % PERSON_COLORS.length]
          return (
            <div key={a.id} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:C.t2 }}>
              <div style={{ width:10, height:10, background:color, borderRadius:2, flexShrink:0 }} />
              <span>{person.name}</span>
              <span style={{ fontFamily:'monospace', color:C.t3 }}>
                {fmtTime(pS)}–{fmtTime(pE)} {projTZ}
              </span>
              {person.homeTimezone !== projTZ && <TZBadge tz={person.homeTimezone} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Person Detail ─────────────────────────────────────────────────────────────

function PersonDetail({ person, assignments, projects, people, onBack, onRemoveAssignment, onAddAssignment }) {
  const pa       = assignments.filter(a => a.personId === person.id)
  const totalHrs = pa.reduce((s, a) => s + a.hoursPerDay, 0)
  const cap      = capStatus(totalHrs)

  const [showAdd, setShowAdd]   = useState(false)
  const [newA, setNewA]         = useState({ projectId:'', hoursPerDay:'', blockStart:'09:00', blockEnd:'17:00' })
  const assignedProjIds         = pa.map(a => a.projectId)
  const available               = projects.filter(p => !assignedProjIds.includes(p.id) && p.status === 'Active')

  const handleAdd = () => {
    if (!newA.projectId || !newA.hoursPerDay) return
    onAddAssignment({ personId:person.id, projectId:newA.projectId, hoursPerDay:Number(newA.hoursPerDay), blockStart:newA.blockStart, blockEnd:newA.blockEnd })
    setNewA({ projectId:'', hoursPerDay:'', blockStart:'09:00', blockEnd:'17:00' })
    setShowAdd(false)
  }

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} style={{ background:'none', border:'none', color:C.t2, cursor:'pointer', fontSize:12, padding:'0 0 14px 0', display:'flex', alignItems:'center', gap:5 }}>
        ← Back to People
      </button>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:C.t1 }}>{person.name}</h2>
            <TZBadge tz={person.homeTimezone} />
            {cap && <CapBadge hrs={totalHrs} />}
          </div>
          <div style={{ fontSize:12, color:C.t2 }}>{person.role} · {person.city}</div>
          <div style={{ fontSize:11, color:C.t3, fontFamily:'monospace', marginTop:3 }}>
            Working hours: {fmtTime(parseTime(person.workStart))}–{fmtTime(parseTime(person.workEnd))} {person.homeTimezone}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:28, fontWeight:800, fontFamily:'monospace', color: cap ? cap.color : C.green }}>{fmtH(totalHrs)}</div>
          <div style={{ fontSize:10, color:C.t3 }}>total / day</div>
        </div>
      </div>

      {/* Daily Schedule Timeline */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.15em', textTransform:'uppercase', color:C.t3, marginBottom:12 }}>
          Daily Schedule · {person.homeTimezone}
        </div>
        <DayTimeline person={person} personAssignments={pa} projects={projects} />
        {cap && (
          <div style={{ marginTop:10, padding:'7px 12px', background:cap.bg, border:`1px solid ${cap.border}`, borderRadius:3, fontSize:11, color:cap.color }}>
            ⚠ {cap.label} — {fmtH(totalHrs)} assigned across {pa.length} project{pa.length !== 1?'s':''}
          </div>
        )}
      </div>

      {/* Project Assignments */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, overflow:'hidden', marginBottom:16 }}>
        <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.15em', textTransform:'uppercase', color:C.t3 }}>Project Assignments</span>
          <span style={{ fontSize:11, color:C.t3 }}>{pa.length} project{pa.length!==1?'s':''}</span>
        </div>

        {pa.length === 0 && (
          <div style={{ padding:16, fontSize:12, color:C.t3, fontStyle:'italic' }}>No assignments yet.</div>
        )}

        {pa.map(a => {
          const proj      = projects.find(p => p.id === a.projectId)
          if (!proj) return null
          const isCross   = person.homeTimezone !== proj.projectTimezone
          const overlap   = computeOverlap(person, proj.projectTimezone)
          const oSt       = overlapStatus(overlap.hours)
          const bSPrj     = convertTZ(parseTime(a.blockStart), person.homeTimezone, proj.projectTimezone)
          const bEPrj     = convertTZ(parseTime(a.blockEnd),   person.homeTimezone, proj.projectTimezone)
          const color     = projColor(a.projectId, projects)

          return (
            <div key={a.id} style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:4, minHeight:40, background:color, borderRadius:2, flexShrink:0, marginTop:2 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                    <span style={{ fontSize:13, fontWeight:600, color:C.t1 }}>{proj.name}</span>
                    <TZBadge tz={proj.projectTimezone} />
                    {isCross && <OverlapBadge hours={overlap.hours} />}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'4px 24px' }}>
                    <Row label="Hrs/Day"    val={fmtH(a.hoursPerDay)} mono />
                    <Row label="Block (home TZ)" val={`${fmtTime(parseTime(a.blockStart))}–${fmtTime(parseTime(a.blockEnd))} ${person.homeTimezone}`} mono />
                    {isCross && <Row label="Block (proj TZ)" val={`${fmtTime(bSPrj)}–${fmtTime(bEPrj)} ${proj.projectTimezone}`} mono />}
                    {isCross && <Row label="Overlap window"  val={`${overlap.displayStart}–${overlap.displayEnd} ${overlap.tz} (${overlap.hours}h)`} mono color={oSt.color} />}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveAssignment(a.id)}
                  style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:3, color:C.t3, cursor:'pointer', fontSize:10, padding:'3px 8px', flexShrink:0 }}
                >
                  Remove
                </button>
              </div>
            </div>
          )
        })}

        {/* Add to project */}
        <div style={{ padding:'10px 16px', borderTop:`1px solid ${C.border}` }}>
          {!showAdd ? (
            available.length > 0 && (
              <button onClick={() => setShowAdd(true)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:3, color:C.t2, cursor:'pointer', fontSize:11, padding:'4px 10px' }}>
                + Add to Project
              </button>
            )
          ) : (
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <select style={{ ...inputSx, width:'auto', minWidth:180 }} value={newA.projectId} onChange={e => setNewA(x => ({...x, projectId:e.target.value}))}>
                <option value="">Select project…</option>
                {available.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" style={{ ...inputSx, width:56 }} placeholder="Hrs" min="0" max="24" value={newA.hoursPerDay}
                onChange={e => setNewA(x => ({...x, hoursPerDay:e.target.value}))} />
              <input type="time" style={{ ...inputSx, width:108 }} value={newA.blockStart}
                onChange={e => setNewA(x => ({...x, blockStart:e.target.value}))} />
              <span style={{ color:C.t3, fontSize:11 }}>to</span>
              <input type="time" style={{ ...inputSx, width:108 }} value={newA.blockEnd}
                onChange={e => setNewA(x => ({...x, blockEnd:e.target.value}))} />
              <button onClick={handleAdd} style={{ background:C.green, border:'none', borderRadius:3, color:'#06080f', cursor:'pointer', fontSize:11, padding:'5px 12px', fontWeight:700 }}>Add</button>
              <button onClick={() => setShowAdd(false)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:3, color:C.t3, cursor:'pointer', fontSize:11, padding:'5px 8px' }}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Project Detail ────────────────────────────────────────────────────────────

function ProjectDetail({ project, assignments, projects, people, onBack, onRemoveAssignment, onAddAssignment, navigateToPerson }) {
  const pa   = assignments.filter(a => a.projectId === project.id)
  const [showAdd, setShowAdd] = useState(false)
  const [newA, setNewA]       = useState({ personId:'', hoursPerDay:'', blockStart:'09:00', blockEnd:'17:00' })
  const assignedPersonIds     = pa.map(a => a.personId)
  const available             = people.filter(p => !assignedPersonIds.includes(p.id))

  const handleAdd = () => {
    if (!newA.personId || !newA.hoursPerDay) return
    onAddAssignment({ projectId:project.id, personId:newA.personId, hoursPerDay:Number(newA.hoursPerDay), blockStart:newA.blockStart, blockEnd:newA.blockEnd })
    setNewA({ personId:'', hoursPerDay:'', blockStart:'09:00', blockEnd:'17:00' })
    setShowAdd(false)
  }

  return (
    <div>
      <button onClick={onBack} style={{ background:'none', border:'none', color:C.t2, cursor:'pointer', fontSize:12, padding:'0 0 14px 0', display:'flex', alignItems:'center', gap:5 }}>
        ← Back to Projects
      </button>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:C.t1 }}>{project.name}</h2>
          <TZBadge tz={project.projectTimezone} />
          <span style={{
            fontSize:11, padding:'2px 8px', borderRadius:3, fontWeight:600,
            background: project.status==='Active' ? C.greenBg : project.status==='On Hold' ? C.amberBg : C.field,
            color:       project.status==='Active' ? C.green   : project.status==='On Hold' ? C.amber   : C.t3,
          }}>{project.status}</span>
        </div>
        <div style={{ fontSize:12, color:C.t2 }}>
          Client: {project.client} · Core hours: 9:00am–6:00pm {project.projectTimezone}
        </div>
      </div>

      {/* TZ Timeline */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.15em', textTransform:'uppercase', color:C.t3, marginBottom:12 }}>
          Working Windows in {project.projectTimezone}
        </div>
        <ProjectTZTimeline project={project} projAssignments={pa} people={people} />
      </div>

      {/* Assigned Resources Table */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, overflow:'hidden', marginBottom:16 }}>
        <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.15em', textTransform:'uppercase', color:C.t3 }}>Assigned Resources</span>
          <span style={{ fontSize:11, color:C.t3 }}>{pa.length} person{pa.length!==1?'s':''}</span>
        </div>

        {pa.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 70px 60px 130px 130px 1fr 80px', padding:'6px 16px', borderBottom:`1px solid ${C.border}` }}>
            {['Person','Role','Home TZ','Hrs/Day','Block (Home TZ)','Block (Proj TZ)','Overlap',''].map((h,i) => (
              <span key={i} style={{ fontSize:9, color:C.t3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</span>
            ))}
          </div>
        )}

        {pa.length === 0 && (
          <div style={{ padding:16, fontSize:12, color:C.t3, fontStyle:'italic' }}>No resources assigned.</div>
        )}

        {pa.map(a => {
          const person   = people.find(p => p.id === a.personId)
          if (!person) return null
          const isCross  = person.homeTimezone !== project.projectTimezone
          const overlap  = computeOverlap(person, project.projectTimezone)
          const oSt      = overlapStatus(overlap.hours)
          const bSPrj    = convertTZ(parseTime(a.blockStart), person.homeTimezone, project.projectTimezone)
          const bEPrj    = convertTZ(parseTime(a.blockEnd),   person.homeTimezone, project.projectTimezone)

          return (
            <div
              key={a.id}
              onClick={() => navigateToPerson(person.id)}
              style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 70px 60px 130px 130px 1fr 80px', padding:'10px 16px', borderTop:`1px solid ${C.border}`, cursor:'pointer', alignItems:'center' }}
              onMouseEnter={e => e.currentTarget.style.background = C.cardAlt}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:12, fontWeight:600, color:C.t1 }}>{person.name}</span>
                {isCross && <span style={{ fontSize:9, color:C.amber, background:C.amberBg, padding:'1px 4px', borderRadius:2, fontWeight:700, border:`1px solid ${C.amberB}` }}>cross-TZ</span>}
              </div>
              <span style={{ fontSize:11, color:C.t2 }}>{person.role}</span>
              <TZBadge tz={person.homeTimezone} />
              <span style={{ fontSize:12, fontFamily:'monospace', color:C.t1 }}>{fmtH(a.hoursPerDay)}</span>
              <span style={{ fontSize:11, fontFamily:'monospace', color:C.t2 }}>
                {fmtTime(parseTime(a.blockStart))}–{fmtTime(parseTime(a.blockEnd))}
              </span>
              <span style={{ fontSize:11, fontFamily:'monospace', color: isCross ? C.t2 : C.t3 }}>
                {isCross ? `${fmtTime(bSPrj)}–${fmtTime(bEPrj)}` : '—'}
              </span>
              <OverlapBadge hours={overlap.hours} />
              <div onClick={e => { e.stopPropagation(); onRemoveAssignment(a.id) }}>
                <button style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:3, color:C.t3, cursor:'pointer', fontSize:10, padding:'3px 8px' }}>
                  Remove
                </button>
              </div>
            </div>
          )
        })}

        {/* Add person */}
        <div style={{ padding:'10px 16px', borderTop:`1px solid ${C.border}` }}>
          {!showAdd ? (
            available.length > 0 && (
              <button onClick={() => setShowAdd(true)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:3, color:C.t2, cursor:'pointer', fontSize:11, padding:'4px 10px' }}>
                + Add Person
              </button>
            )
          ) : (
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <select style={{ ...inputSx, width:'auto', minWidth:160 }} value={newA.personId} onChange={e => setNewA(x => ({...x, personId:e.target.value}))}>
                <option value="">Select person…</option>
                {available.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" style={{ ...inputSx, width:56 }} placeholder="Hrs" min="0" max="24" value={newA.hoursPerDay}
                onChange={e => setNewA(x => ({...x, hoursPerDay:e.target.value}))} />
              <input type="time" style={{ ...inputSx, width:108 }} value={newA.blockStart}
                onChange={e => setNewA(x => ({...x, blockStart:e.target.value}))} />
              <span style={{ color:C.t3, fontSize:11 }}>to</span>
              <input type="time" style={{ ...inputSx, width:108 }} value={newA.blockEnd}
                onChange={e => setNewA(x => ({...x, blockEnd:e.target.value}))} />
              <button onClick={handleAdd} style={{ background:C.green, border:'none', borderRadius:3, color:'#06080f', cursor:'pointer', fontSize:11, padding:'5px 12px', fontWeight:700 }}>Add</button>
              <button onClick={() => setShowAdd(false)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:3, color:C.t3, cursor:'pointer', fontSize:11, padding:'5px 8px' }}>Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Small helper: label+value row ────────────────────────────────────────────
function Row({ label, val, mono, color }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
      <span style={{ fontSize:9, color:C.t3, textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</span>
      <span style={{ fontSize:11, color: color || C.t2, fontFamily: mono ? 'monospace' : 'inherit' }}>{val}</span>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function ResourceTZManager() {
  const [people,      setPeople]      = useState(SEED_PEOPLE)
  const [projects,    setProjects]    = useState(SEED_PROJECTS)
  const [assignments, setAssignments] = useState(SEED_ASSIGNMENTS)

  const [view,             setView]            = useState('dashboard')
  const [selectedPersonId, setSelectedPersonId] = useState(null)
  const [selectedProjId,   setSelectedProjId]   = useState(null)

  // Add person form state
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [newPerson, setNewPerson]         = useState({ name:'', role:'', city:'', homeTimezone:'PST', workStart:'09:00', workEnd:'18:00' })

  // Add project form state
  const [showAddProject, setShowAddProject] = useState(false)
  const [newProject, setNewProject]         = useState({ name:'', client:'', projectTimezone:'PST', status:'Active' })

  // Live clock for header
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  const tzClocks = useMemo(() => {
    const tzMap = { PST:'America/Los_Angeles', MST:'America/Denver', CST:'America/Chicago', EST:'America/New_York' }
    return TZ_LIST.map(tz => ({
      tz,
      time: new Intl.DateTimeFormat('en-US', { timeZone:tzMap[tz], hour:'numeric', minute:'2-digit', hour12:true }).format(now),
    }))
  }, [now])

  // ── Derived data ────────────────────────────────────────────────────────────

  const overAllocated = useMemo(() =>
    people
      .map(p => ({ person:p, hrs:getTotalHours(p.id, assignments) }))
      .filter(({ hrs }) => hrs >= 8)
      .sort((a, b) => b.hrs - a.hrs)
  , [people, assignments])

  const crossTZFlags = useMemo(() =>
    assignments
      .filter(a => {
        const person  = people.find(p => p.id === a.personId)
        const project = projects.find(p => p.id === a.projectId)
        return person && project && person.homeTimezone !== project.projectTimezone
      })
      .map(a => {
        const person  = people.find(p => p.id === a.personId)
        const project = projects.find(p => p.id === a.projectId)
        const overlap = computeOverlap(person, project.projectTimezone)
        return { a, person, project, overlap }
      })
      .sort((a, b) => a.overlap.hours - b.overlap.hours)
  , [people, projects, assignments])

  // ── Navigation helpers ───────────────────────────────────────────────────────

  const goToPerson = useCallback((id) => {
    setSelectedPersonId(id)
    setSelectedProjId(null)
    setView('people')
  }, [])

  const goToProject = useCallback((id) => {
    setSelectedProjId(id)
    setSelectedPersonId(null)
    setView('projects')
  }, [])

  const navigateView = (v) => {
    setView(v)
    setSelectedPersonId(null)
    setSelectedProjId(null)
  }

  // ── CRUD handlers ────────────────────────────────────────────────────────────

  const addAssignment = useCallback(data => {
    setAssignments(prev => [...prev, { id:uid(), ...data }])
  }, [])

  const removeAssignment = useCallback(id => {
    setAssignments(prev => prev.filter(a => a.id !== id))
  }, [])

  const handleAddPerson = () => {
    if (!newPerson.name.trim()) return
    setPeople(prev => [...prev, { id:uid(), ...newPerson }])
    setNewPerson({ name:'', role:'', city:'', homeTimezone:'PST', workStart:'09:00', workEnd:'18:00' })
    setShowAddPerson(false)
  }

  const handleAddProject = () => {
    if (!newProject.name.trim()) return
    setProjects(prev => [...prev, { id:uid(), ...newProject }])
    setNewProject({ name:'', client:'', projectTimezone:'PST', status:'Active' })
    setShowAddProject(false)
  }

  const removePerson = useCallback(id => {
    setPeople(prev => prev.filter(p => p.id !== id))
    setAssignments(prev => prev.filter(a => a.personId !== id))
    if (selectedPersonId === id) setSelectedPersonId(null)
  }, [selectedPersonId])

  // ── Resolved detail subjects ─────────────────────────────────────────────────

  const selectedPerson  = people.find(p => p.id === selectedPersonId)
  const selectedProject = projects.find(p => p.id === selectedProjId)

  // ── Shared style helpers ─────────────────────────────────────────────────────

  const panelSx = {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  }

  const thSx = { fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:C.t3, padding:'7px 14px', background:C.panel, borderBottom:`1px solid ${C.border}` }
  const tdSx = { fontSize:12, color:C.t2, padding:'9px 14px', borderBottom:`1px solid ${C.border}` }

  // ── RENDER ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ background:C.bg, minHeight:'100vh', color:C.t1, fontFamily:'Inter, system-ui, -apple-system, sans-serif', fontSize:13 }}>

      {/* ── Nav Bar ── */}
      <header style={{
        background:C.panel, borderBottom:`1px solid ${C.border}`,
        padding:'0 20px', display:'flex', alignItems:'center', gap:0,
        position:'sticky', top:0, zIndex:20, height:46, boxSizing:'border-box',
      }}>
        <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.18em', color:C.t3, textTransform:'uppercase', marginRight:20, whiteSpace:'nowrap' }}>
          ResourceTZ
        </span>

        {[
          { key:'dashboard',    label:'Dashboard' },
          { key:'projects',     label:'Projects' },
          { key:'people',       label:'People' },
          { key:'resource-map', label:'Resource Map' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => navigateView(key)}
            style={{
              background: view === key ? C.card : 'none',
              border: 'none',
              borderBottom: view === key ? `2px solid ${C.green}` : '2px solid transparent',
              color: view === key ? C.t1 : C.t3,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: view === key ? 700 : 400,
              padding: '0 16px',
              height: '100%',
              letterSpacing: '0.04em',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}

        <div style={{ flex:1 }} />

        {/* Live TZ clocks */}
        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
          {tzClocks.map(({ tz, time }) => (
            <div key={tz} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <TZBadge tz={tz} />
              <span style={{ fontSize:11, fontFamily:'monospace', color:C.t2 }}>{time}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{ padding:'24px 28px', maxWidth:1600, margin:'0 auto' }}>

        {/* ══ DASHBOARD ══════════════════════════════════════════════════════ */}
        {view === 'dashboard' && (
          <div>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.18em', textTransform:'uppercase', color:C.t3, marginBottom:20 }}>
              Dashboard — Daily Ops Overview
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:20 }}>

              {/* Over-Allocation Alerts */}
              <div style={panelSx}>
                <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.15em', textTransform:'uppercase', color:C.t3 }}>Over-Allocation Alerts</span>
                  <span style={{
                    fontSize:10, padding:'1px 7px', borderRadius:3, fontWeight:700,
                    background: overAllocated.length > 0 ? C.redBg : C.greenBg,
                    color:       overAllocated.length > 0 ? C.red   : C.green,
                  }}>
                    {overAllocated.length} flagged
                  </span>
                </div>

                {overAllocated.length === 0 && (
                  <div style={{ padding:16, fontSize:12, color:C.green }}>✓ All team members within capacity</div>
                )}

                {overAllocated.map(({ person, hrs }) => {
                  const cap       = capStatus(hrs)
                  const projNames = assignments
                    .filter(a => a.personId === person.id)
                    .map(a => projects.find(p => p.id === a.projectId)?.name?.split('—')[0]?.trim())
                    .filter(Boolean)
                    .join(', ')
                  return (
                    <div
                      key={person.id}
                      onClick={() => goToPerson(person.id)}
                      style={{ padding:'10px 16px', borderTop:`1px solid ${C.border}`, cursor:'pointer', background: cap.bg + '55', display:'grid', gridTemplateColumns:'1fr auto' }}
                      onMouseEnter={e => e.currentTarget.style.background = cap.bg}
                      onMouseLeave={e => e.currentTarget.style.background = cap.bg + '55'}
                    >
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                          <span style={{ fontSize:13, fontWeight:600, color:C.t1 }}>{person.name}</span>
                          <TZBadge tz={person.homeTimezone} />
                          <CapBadge hrs={hrs} />
                        </div>
                        <div style={{ fontSize:10, color:C.t3 }}>{projNames}</div>
                      </div>
                      <div style={{ fontFamily:'monospace', fontSize:20, fontWeight:800, color:cap.color, alignSelf:'center' }}>
                        {fmtH(hrs)}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Cross-Coast Flags */}
              <div style={panelSx}>
                <div style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.15em', textTransform:'uppercase', color:C.t3 }}>Cross-Timezone Assignments</span>
                  <span style={{ fontSize:11, color:C.t3 }}>{crossTZFlags.length} cross-TZ assignment{crossTZFlags.length!==1?'s':''}</span>
                </div>

                {crossTZFlags.length === 0 && (
                  <div style={{ padding:16, fontSize:12, color:C.green }}>✓ No cross-timezone assignments</div>
                )}

                {/* Table header */}
                {crossTZFlags.length > 0 && (
                  <div style={{ display:'grid', gridTemplateColumns:'1.2fr 70px 1.4fr 70px 1.4fr', padding:'6px 16px', borderBottom:`1px solid ${C.border}` }}>
                    {['Person','Home TZ','Project','Proj TZ','Overlap Window'].map((h,i) => (
                      <span key={i} style={{ fontSize:9, color:C.t3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</span>
                    ))}
                  </div>
                )}

                {crossTZFlags.map(({ a, person, project, overlap }) => {
                  const oSt = overlapStatus(overlap.hours)
                  return (
                    <div
                      key={a.id}
                      onClick={() => goToPerson(person.id)}
                      style={{ display:'grid', gridTemplateColumns:'1.2fr 70px 1.4fr 70px 1.4fr', padding:'9px 16px', borderTop:`1px solid ${C.border}`, cursor:'pointer', alignItems:'center' }}
                      onMouseEnter={e => e.currentTarget.style.background = C.cardAlt}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize:12, fontWeight:600, color:C.t1 }}>{person.name}</span>
                      <TZBadge tz={person.homeTimezone} />
                      <span style={{ fontSize:11, color:C.t2 }}>{project.name.split('—')[0].trim()}</span>
                      <TZBadge tz={project.projectTimezone} />
                      <div>
                        <OverlapBadge hours={overlap.hours} />
                        <div style={{ fontSize:9, color:C.t3, fontFamily:'monospace', marginTop:3 }}>
                          {overlap.displayStart}–{overlap.displayEnd} {overlap.tz}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick stats bar */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginTop:4 }}>
              {[
                { label:'Team Members',  val:people.length,      color:C.t1 },
                { label:'Active Projects', val:projects.filter(p=>p.status==='Active').length, color:C.t1 },
                { label:'Total Assignments', val:assignments.length, color:C.t1 },
                { label:'Cross-TZ Pairs', val:crossTZFlags.length, color: crossTZFlags.length > 0 ? C.amber : C.green },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, color:C.t3 }}>{label}</span>
                  <span style={{ fontSize:22, fontWeight:800, fontFamily:'monospace', color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ PROJECTS ════════════════════════════════════════════════════════ */}
        {view === 'projects' && !selectedProject && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.18em', textTransform:'uppercase', color:C.t3 }}>Projects</span>
              <button
                onClick={() => setShowAddProject(o => !o)}
                style={{ background:C.green, border:'none', borderRadius:3, color:'#06080f', cursor:'pointer', fontSize:11, padding:'5px 12px', fontWeight:700 }}
              >
                + Add Project
              </button>
            </div>

            {/* Add project form */}
            {showAddProject && (
              <div style={{ ...panelSx, padding:16 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 100px 120px auto auto', gap:10, alignItems:'end' }}>
                  {[
                    { label:'Project Name', key:'name',    type:'text',   placeholder:'Client — Project' },
                    { label:'Client',       key:'client',  type:'text',   placeholder:'Client name' },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <div style={{ fontSize:9, color:C.t3, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{label}</div>
                      <input type={type} style={inputSx} placeholder={placeholder} value={newProject[key]}
                        onChange={e => setNewProject(x => ({...x, [key]:e.target.value}))} />
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize:9, color:C.t3, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Project TZ</div>
                    <select style={inputSx} value={newProject.projectTimezone} onChange={e => setNewProject(x => ({...x, projectTimezone:e.target.value}))}>
                      {TZ_LIST.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize:9, color:C.t3, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Status</div>
                    <select style={inputSx} value={newProject.status} onChange={e => setNewProject(x => ({...x, status:e.target.value}))}>
                      {['Active','On Hold','Completed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <button onClick={handleAddProject} style={{ background:C.green, border:'none', borderRadius:3, color:'#06080f', cursor:'pointer', fontSize:11, padding:'5px 12px', fontWeight:700, alignSelf:'end', height:30 }}>
                    Add
                  </button>
                  <button onClick={() => setShowAddProject(false)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:3, color:C.t3, cursor:'pointer', fontSize:11, padding:'5px 10px', alignSelf:'end', height:30 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={panelSx}>
              <div style={{ display:'grid', gridTemplateColumns:'1.8fr 1fr 80px 100px 80px', ...Object.fromEntries(Object.entries(thSx)) }}>
                {['Project','Client','TZ','Status','People'].map((h,i) => (
                  <span key={i} style={{ fontSize:9, color:C.t3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', padding:'7px 14px' }}>{h}</span>
                ))}
              </div>

              {projects.map(proj => {
                const count = assignments.filter(a => a.projectId === proj.id).length
                return (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedProjId(proj.id)}
                    style={{ display:'grid', gridTemplateColumns:'1.8fr 1fr 80px 100px 80px', cursor:'pointer', borderTop:`1px solid ${C.border}`, alignItems:'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.cardAlt}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ ...tdSx, fontWeight:600, color:C.t1 }}>{proj.name}</span>
                    <span style={tdSx}>{proj.client}</span>
                    <div style={{ ...tdSx, display:'flex', alignItems:'center' }}><TZBadge tz={proj.projectTimezone} /></div>
                    <div style={{ ...tdSx }}>
                      <span style={{
                        fontSize:11, padding:'2px 8px', borderRadius:3, fontWeight:600,
                        background: proj.status==='Active' ? C.greenBg : proj.status==='On Hold' ? C.amberBg : C.field,
                        color:       proj.status==='Active' ? C.green   : proj.status==='On Hold' ? C.amber   : C.t3,
                      }}>{proj.status}</span>
                    </div>
                    <span style={{ ...tdSx, fontFamily:'monospace', color:C.t1 }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {view === 'projects' && selectedProject && (
          <ProjectDetail
            project={selectedProject}
            assignments={assignments}
            projects={projects}
            people={people}
            onBack={() => setSelectedProjId(null)}
            onRemoveAssignment={removeAssignment}
            onAddAssignment={addAssignment}
            navigateToPerson={goToPerson}
          />
        )}

        {/* ══ PEOPLE ══════════════════════════════════════════════════════════ */}
        {view === 'people' && !selectedPerson && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.18em', textTransform:'uppercase', color:C.t3 }}>People</span>
              <button
                onClick={() => setShowAddPerson(o => !o)}
                style={{ background:C.green, border:'none', borderRadius:3, color:'#06080f', cursor:'pointer', fontSize:11, padding:'5px 12px', fontWeight:700 }}
              >
                + Add Person
              </button>
            </div>

            {/* Add person form */}
            {showAddPerson && (
              <div style={{ ...panelSx, padding:16 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 90px 90px 90px auto auto', gap:10, alignItems:'end' }}>
                  {[
                    { label:'Name', key:'name', placeholder:'Full name' },
                    { label:'Role', key:'role', placeholder:'e.g. Designer' },
                    { label:'City', key:'city', placeholder:'Home city' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <div style={{ fontSize:9, color:C.t3, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{label}</div>
                      <input
                        style={inputSx} placeholder={placeholder} value={newPerson[key]}
                        onChange={e => {
                          const val = e.target.value
                          setNewPerson(x => ({
                            ...x,
                            [key]: val,
                            ...(key === 'city' ? { homeTimezone: cityToTZ(val) } : {}),
                          }))
                        }}
                      />
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize:9, color:C.t3, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Home TZ</div>
                    <select style={inputSx} value={newPerson.homeTimezone} onChange={e => setNewPerson(x => ({...x, homeTimezone:e.target.value}))}>
                      {TZ_LIST.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize:9, color:C.t3, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Work Start</div>
                    <input type="time" style={inputSx} value={newPerson.workStart} onChange={e => setNewPerson(x => ({...x, workStart:e.target.value}))} />
                  </div>
                  <div>
                    <div style={{ fontSize:9, color:C.t3, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Work End</div>
                    <input type="time" style={inputSx} value={newPerson.workEnd} onChange={e => setNewPerson(x => ({...x, workEnd:e.target.value}))} />
                  </div>
                  <button onClick={handleAddPerson} style={{ background:C.green, border:'none', borderRadius:3, color:'#06080f', cursor:'pointer', fontSize:11, padding:'5px 12px', fontWeight:700, alignSelf:'end', height:30 }}>
                    Add
                  </button>
                  <button onClick={() => setShowAddPerson(false)} style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:3, color:C.t3, cursor:'pointer', fontSize:11, padding:'5px 10px', alignSelf:'end', height:30 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={panelSx}>
              <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1.2fr 80px 1fr 60px 80px 80px' }}>
                {['Name','Role','Home TZ','City','Projects','Hrs/Day',''].map((h,i) => (
                  <span key={i} style={{ fontSize:9, color:C.t3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', padding:'7px 14px', background:C.panel, borderBottom:`1px solid ${C.border}` }}>{h}</span>
                ))}
              </div>

              {people.map(person => {
                const hrs   = getTotalHours(person.id, assignments)
                const cap   = capStatus(hrs)
                const count = assignments.filter(a => a.personId === person.id).length
                return (
                  <div
                    key={person.id}
                    style={{ display:'grid', gridTemplateColumns:'1.4fr 1.2fr 80px 1fr 60px 80px 80px', borderTop:`1px solid ${C.border}`, alignItems:'center' }}
                  >
                    <span onClick={() => setSelectedPersonId(person.id)} style={{ ...tdSx, fontWeight:600, color:C.t1, cursor:'pointer' }}>{person.name}</span>
                    <span style={tdSx}>{person.role}</span>
                    <div style={{ ...tdSx, display:'flex', alignItems:'center' }}><TZBadge tz={person.homeTimezone} /></div>
                    <span style={{ ...tdSx, color:C.t3 }}>{person.city}</span>
                    <span style={{ ...tdSx, fontFamily:'monospace', color:C.t1 }}>{count}</span>
                    <div style={{ ...tdSx, background: cap ? cap.bg + '66' : 'transparent' }}>
                      <span style={{ fontFamily:'monospace', fontWeight:700, color: cap ? cap.color : C.t2 }}>
                        {fmtH(hrs)}
                      </span>
                      {cap && <div style={{ fontSize:9, color:cap.color }}>{cap.label}</div>}
                    </div>
                    <div style={{ ...tdSx }}>
                      <button
                        onClick={() => removePerson(person.id)}
                        style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:3, color:C.t3, cursor:'pointer', fontSize:10, padding:'2px 8px' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {view === 'people' && selectedPerson && (
          <PersonDetail
            person={selectedPerson}
            assignments={assignments}
            projects={projects}
            people={people}
            onBack={() => setSelectedPersonId(null)}
            onRemoveAssignment={removeAssignment}
            onAddAssignment={addAssignment}
          />
        )}

        {/* ══ RESOURCE MAP ════════════════════════════════════════════════════ */}
        {view === 'resource-map' && (() => {
          const activeProjects = projects.filter(p => p.status === 'Active')

          return (
            <div>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.18em', textTransform:'uppercase', color:C.t3, marginBottom:20 }}>
                Resource Map — People × Active Projects
              </div>

              <div style={{ overflowX:'auto' }}>
                <table style={{ borderCollapse:'collapse', width:'100%', minWidth:600 }}>
                  <thead>
                    <tr>
                      {/* Person header cell */}
                      <th style={{ ...thSx, textAlign:'left', minWidth:160, position:'sticky', left:0, background:C.panel, zIndex:2 }}>
                        Person
                      </th>
                      {activeProjects.map(proj => (
                        <th key={proj.id} style={{ ...thSx, textAlign:'center', minWidth:120, whiteSpace:'nowrap', cursor:'pointer' }}
                          onClick={() => goToProject(proj.id)}>
                          <div>{proj.name.split('—')[0].trim()}</div>
                          <TZBadge tz={proj.projectTimezone} />
                        </th>
                      ))}
                      <th style={{ ...thSx, textAlign:'center', minWidth:80 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map(person => {
                      const totalHrs = getTotalHours(person.id, assignments)
                      const cap      = capStatus(totalHrs)
                      return (
                        <tr key={person.id}>
                          {/* Person cell */}
                          <td
                            style={{ ...tdSx, position:'sticky', left:0, background:C.card, zIndex:1, cursor:'pointer', fontWeight:600, color:C.t1 }}
                            onClick={() => goToPerson(person.id)}
                          >
                            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                              <span>{person.name}</span>
                              <TZBadge tz={person.homeTimezone} />
                            </div>
                            <div style={{ fontSize:10, color:C.t3, marginTop:2 }}>{person.role}</div>
                          </td>

                          {/* Project cells */}
                          {activeProjects.map(proj => {
                            const asgn    = assignments.find(a => a.personId === person.id && a.projectId === proj.id)
                            if (!asgn) return (
                              <td key={proj.id} style={{ ...tdSx, textAlign:'center', color:C.t3, background:C.field }}>—</td>
                            )
                            const isCross  = person.homeTimezone !== proj.projectTimezone
                            const overlap  = computeOverlap(person, proj.projectTimezone)
                            const cellBg   = !isCross
                              ? C.greenBg
                              : overlap.hours >= 4 ? C.amberBg : C.redBg
                            const cellColor = !isCross
                              ? C.green
                              : overlap.hours >= 4 ? C.amber : C.red
                            return (
                              <td
                                key={proj.id}
                                style={{ ...tdSx, textAlign:'center', background:cellBg, cursor:'pointer' }}
                                onClick={() => goToPerson(person.id)}
                              >
                                <div style={{ fontFamily:'monospace', fontWeight:700, fontSize:14, color:cellColor }}>
                                  {fmtH(asgn.hoursPerDay)}
                                </div>
                                {isCross && (
                                  <div style={{ fontSize:9, color:cellColor, opacity:0.8, marginTop:2 }}>
                                    {overlap.hours}h overlap
                                  </div>
                                )}
                              </td>
                            )
                          })}

                          {/* Row total */}
                          <td style={{ ...tdSx, textAlign:'center', background: cap ? cap.bg : 'transparent' }}>
                            <div style={{ fontFamily:'monospace', fontWeight:700, fontSize:14, color: cap ? cap.color : C.t1 }}>
                              {fmtH(totalHrs)}
                            </div>
                            {cap && <div style={{ fontSize:9, color:cap.color, marginTop:2 }}>{cap.label}</div>}
                          </td>
                        </tr>
                      )
                    })}

                    {/* Column totals */}
                    <tr style={{ borderTop:`2px solid ${C.borderH}` }}>
                      <td style={{ ...tdSx, position:'sticky', left:0, background:C.card, fontWeight:700, color:C.t3, fontSize:10, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                        Total hrs/day
                      </td>
                      {activeProjects.map(proj => {
                        const total = assignments.filter(a => a.projectId === proj.id).reduce((s,a) => s+a.hoursPerDay, 0)
                        return (
                          <td key={proj.id} style={{ ...tdSx, textAlign:'center' }}>
                            <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:14, color:C.t1 }}>{fmtH(total)}</span>
                          </td>
                        )
                      })}
                      <td style={tdSx} />
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div style={{ display:'flex', gap:20, marginTop:16, flexWrap:'wrap' }}>
                {[
                  { color:C.green, bg:C.greenBg, label:'TZ match' },
                  { color:C.amber, bg:C.amberBg, label:'Cross-TZ, overlap ≥ 4h' },
                  { color:C.red,   bg:C.redBg,   label:'Cross-TZ, overlap < 4h' },
                ].map(({ color, bg, label }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:C.t2 }}>
                    <div style={{ width:24, height:14, background:bg, border:`1px solid ${color}44`, borderRadius:2 }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

      </main>
    </div>
  )
}
