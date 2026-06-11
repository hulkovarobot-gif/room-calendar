'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Booking } from './Calendar'

type Room = { id: string; name: string; capacity: number }

interface Props {
  slot: { room: Room; startTime: string; date: string }
  rooms: Room[]
  onClose: () => void
  onSuccess: () => void
  existingBooking?: Booking
}

type RecurrenceInterval = 'week' | '2weeks' | 'month' | 'year'

// 07:00 – 17:30 in 30-min steps
const START_TIMES = Array.from({ length: 22 }, (_, i) => {
  const h = Math.floor(i / 2) + 7
  const m = (i % 2) * 30
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

function getEndTimes(startTime: string): string[] {
  const [h, m] = startTime.split(':').map(Number)
  const startMinutes = h * 60 + m
  const result: string[] = []
  for (let t = startMinutes + 30; t <= 18 * 60; t += 30) {
    const eh = Math.floor(t / 60)
    const em = t % 60
    result.push(`${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`)
  }
  return result
}

function fmtDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addInterval(d: Date, interval: RecurrenceInterval): void {
  if (interval === 'week') {
    d.setDate(d.getDate() + 7)
  } else if (interval === '2weeks') {
    d.setDate(d.getDate() + 14)
  } else {
    // Clamp to last day of target month (e.g. Jan 31 + 1mo = Feb 28)
    const day = d.getDate()
    d.setDate(1)
    d.setMonth(d.getMonth() + 1)
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
  }
}

function generateDates(startDate: string, interval: RecurrenceInterval, endDate: string): string[] {
  const dates: string[] = [startDate]
  // 'year' = weekly until Dec 31 of the slot's year
  const effectiveInterval: 'week' | '2weeks' | 'month' =
    interval === 'year' ? 'week' : interval
  const effectiveEnd =
    interval === 'year'
      ? `${new Date(`${startDate}T12:00:00`).getFullYear()}-12-31`
      : endDate
  const end = new Date(`${effectiveEnd}T23:59:59`)
  const cur = new Date(`${startDate}T12:00:00`)
  while (true) {
    addInterval(cur, effectiveInterval)
    if (cur > end) break
    dates.push(fmtDate(cur))
  }
  return dates
}

// YYYYMMDDTHHMMSS (local floating time for calendar imports)
function toCalDate(date: string, time: string): string {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`
}

function buildGoogleUrl(title: string, date: string, start: string, end: string, roomName: string): string {
  const details = `Rezervace zasedací místnosti: ${roomName}`
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${toCalDate(date, start)}/${toCalDate(date, end)}` +
    `&details=${encodeURIComponent(details)}` +
    `&location=${encodeURIComponent(roomName)}`
  )
}

function downloadIcs(title: string, date: string, start: string, end: string, roomName: string): void {
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Room Calendar//CS',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@room-calendar`,
    `DTSTAMP:${now}`,
    `DTSTART:${toCalDate(date, start)}`,
    `DTEND:${toCalDate(date, end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:Rezervace zasedací místnosti\\: ${roomName}`,
    `LOCATION:${roomName}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rezervace-${date}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  background: '#1e2023',
  border: '1px solid #3a3d42',
  color: '#ffffff',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.15s',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#999999' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export default function BookingModal({ slot, rooms, onClose, onSuccess, existingBooking }: Props) {
  const isEditing = !!existingBooking

  const [title, setTitle] = useState(existingBooking?.title ?? '')
  const [bookedBy, setBookedBy] = useState(existingBooking?.booked_by ?? '')
  const [roomId, setRoomId] = useState(existingBooking?.room_id ?? slot.room.id)
  const [startTime, setStartTime] = useState(
    existingBooking?.start_time.substring(11, 16) ?? slot.startTime
  )
  const [endTime, setEndTime] = useState(() => {
    if (existingBooking) return existingBooking.end_time.substring(11, 16)
    const opts = getEndTimes(slot.startTime)
    return opts[1] ?? opts[0] ?? ''
  })
  const [attendees, setAttendees] = useState(existingBooking?.attendees ?? 1)
  const [recurring, setRecurring] = useState(false)
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval>('week')
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [createdCount, setCreatedCount] = useState(1)

  const endTimes = getEndTimes(startTime)

  // Recurrence date bounds
  const maxRecurrenceDate = fmtDate(new Date(new Date().setMonth(new Date().getMonth() + 3)))
  const minRecurrenceDate = (() => {
    const d = new Date(`${slot.date}T12:00:00`)
    d.setDate(d.getDate() + 1)
    return fmtDate(d)
  })()

  function handleStartChange(newStart: string) {
    setStartTime(newStart)
    const [sh, sm] = newStart.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    if (eh * 60 + em <= sh * 60 + sm) {
      const next = sh * 60 + sm + 30
      setEndTime(`${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`)
    }
  }

  function handleRecurringToggle(checked: boolean) {
    setRecurring(checked)
    if (checked && !recurrenceEndDate) {
      // Default: 4 weeks from slot date, clamped to max
      const d = new Date(`${slot.date}T12:00:00`)
      d.setDate(d.getDate() + 28)
      const max = new Date(`${maxRecurrenceDate}T12:00:00`)
      setRecurrenceEndDate(fmtDate(d > max ? max : d))
    }
  }

  const previewDates =
    recurring && (recurrenceInterval === 'year' || !!recurrenceEndDate)
      ? generateDates(slot.date, recurrenceInterval, recurrenceEndDate)
      : [slot.date]

  const dateLabel = new Date(`${slot.date}T12:00:00`).toLocaleDateString('cs-CZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const roomName = rooms.find(r => r.id === roomId)?.name ?? slot.room.name

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    if (isEditing) {
      const { error: err } = await supabase
        .from('bookings')
        .update({
          title,
          booked_by: bookedBy,
          room_id: roomId,
          start_time: `${slot.date}T${startTime}:00`,
          end_time: `${slot.date}T${endTime}:00`,
          attendees,
        })
        .eq('id', existingBooking!.id)

      setSubmitting(false)
      if (err) { setError(err.message) } else { setCreatedCount(1); setConfirmed(true); onSuccess() }
      return
    }

    const rows = previewDates.map(d => ({
      title,
      booked_by: bookedBy,
      room_id: roomId,
      start_time: `${d}T${startTime}:00`,
      end_time: `${d}T${endTime}:00`,
      attendees,
    }))

    const { error: err } = await supabase.from('bookings').insert(rows)
    setSubmitting(false)
    if (err) {
      setError(err.message)
    } else {
      setCreatedCount(rows.length)
      setConfirmed(true)
      onSuccess()
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md shadow-2xl rounded-2xl overflow-hidden"
        style={{ background: '#2a2d31', border: '1px solid #3a3d42' }}
      >
        {confirmed ? (
          /* ── Confirmation screen ── */
          <>
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid #3a3d42' }}
            >
              <h2 className="text-lg font-bold text-white">Rezervace dokončena</h2>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-full text-xl leading-none"
                style={{ color: '#999999', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = '#3a3d42' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#999999'; e.currentTarget.style.background = 'transparent' }}
              >
                ×
              </button>
            </div>

            <div className="p-6 flex flex-col items-center gap-5">
              <div
                className="flex items-center justify-center"
                style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(120,190,32,0.12)', border: '2px solid #78be20' }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12.5l4.5 4.5L19 7" stroke="#78be20" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="text-center">
                <p className="text-xl font-extrabold text-white">
                  {isEditing
                    ? 'Rezervace aktualizována!'
                    : createdCount > 1
                      ? `Vytvořeno ${createdCount} rezervací!`
                      : 'Rezervace vytvořena!'}
                </p>
                <p className="text-sm mt-1" style={{ color: '#999999' }}>
                  {createdCount > 1
                    ? 'Přidejte první událost do svého kalendáře'
                    : 'Přidejte událost do svého kalendáře'}
                </p>
              </div>

              <div
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{ background: '#1e2023', border: '1px solid #3a3d42' }}
              >
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-1" style={{ color: '#999999' }}>{roomName}</p>
                <p className="mt-0.5 capitalize" style={{ color: '#999999' }}>
                  {dateLabel} · {startTime} – {endTime}
                </p>
                {createdCount > 1 && (
                  <p className="mt-1 text-xs font-semibold" style={{ color: '#78be20' }}>
                    + {createdCount - 1} opakování
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 w-full">
                <a
                  href={buildGoogleUrl(title, slot.date, startTime, endTime, roomName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: '#78be20', color: '#000000' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#8fd41e' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#78be20' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M3 9h18" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Přidat do Google Kalendáře
                </a>

                <button
                  onClick={() => downloadIcs(title, slot.date, startTime, endTime, roomName)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: 'transparent', border: '1px solid #3a3d42', color: '#cccccc' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#78be20'; e.currentTarget.style.color = '#ffffff' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#3a3d42'; e.currentTarget.style.color = '#cccccc' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3v13M7 11l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Přidat do Apple / Outlook kalendáře
                </button>

                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 rounded-lg text-sm"
                  style={{ color: '#666666' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#999999' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#666666' }}
                >
                  Zavřít
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ── Booking form ── */
          <>
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid #3a3d42' }}
            >
              <h2 className="text-lg font-bold text-white">
                {isEditing ? 'Upravit rezervaci' : 'Nová rezervace'}
              </h2>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-full text-xl leading-none"
                style={{ color: '#999999', background: 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = '#3a3d42' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#999999'; e.currentTarget.style.background = 'transparent' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div
                className="px-4 py-3 rounded-xl text-sm"
                style={{ background: '#1e2023', border: '1px solid #3a3d42' }}
              >
                <div className="font-semibold text-white capitalize">{dateLabel}</div>
                <div className="mt-0.5" style={{ color: '#999999' }}>
                  {startTime}{endTime ? ` – ${endTime}` : ''}
                </div>
              </div>

              <Field label="Název meetingu">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Stand-up, Sprint review, 1:1…"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#78be20' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#3a3d42' }}
                />
              </Field>

              <Field label="Vaše jméno">
                <input
                  type="text"
                  required
                  value={bookedBy}
                  onChange={e => setBookedBy(e.target.value)}
                  placeholder="Jan Novák"
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#78be20' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#3a3d42' }}
                />
              </Field>

              <Field label="Místnost">
                <select
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = '#78be20' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#3a3d42' }}
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id} style={{ background: '#2a2d31' }}>
                      {r.name}{r.capacity ? ` (${r.capacity} os.)` : ''}
                    </option>
                  ))}
                </select>
              </Field>

              {/* ── Attendees + capacity bar ── */}
              {(() => {
                const roomIdx = rooms.findIndex(r => r.id === roomId)
                const roomCapacity = rooms.find(r => r.id === roomId)?.capacity ?? 0
                const pct = roomCapacity > 0 ? Math.min(Math.round((attendees / roomCapacity) * 100), 100) : 0
                const roomColors = ['#93c5fd', '#c4b5fd', '#7dd3fc', '#6ee7b7']
                const barColor = pct > 85 ? '#ef4444' : pct > 60 ? '#f97316' : roomColors[Math.max(0, roomIdx) % roomColors.length]
                return (
                  <Field label="Počet účastníků">
                    <input
                      type="number"
                      min={1}
                      max={roomCapacity || undefined}
                      value={attendees}
                      onChange={e => setAttendees(Math.max(1, parseInt(e.target.value) || 1))}
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = '#78be20' }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#3a3d42' }}
                    />
                    {roomCapacity > 0 && (
                      <div className="mt-2">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: '#666' }}>Kapacita místnosti</span>
                          <span style={{ fontSize: 12, color: barColor, fontWeight: 600 }}>
                            {attendees} / {roomCapacity} osob ({pct}%)
                          </span>
                        </div>
                        <div style={{ height: 6, background: '#3a3d42', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.2s, background 0.2s' }} />
                        </div>
                      </div>
                    )}
                  </Field>
                )
              })()}

              <div className="flex gap-3">
                <Field label="Začátek">
                  <select
                    value={startTime}
                    onChange={e => handleStartChange(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = '#78be20' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#3a3d42' }}
                  >
                    {START_TIMES.map(t => (
                      <option key={t} value={t} style={{ background: '#2a2d31' }}>{t}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Konec">
                  <select
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = '#78be20' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#3a3d42' }}
                  >
                    {endTimes.map(t => (
                      <option key={t} value={t} style={{ background: '#2a2d31' }}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* ── Recurrence section (new bookings only) ── */}
              {!isEditing && (
                <div
                  className="rounded-xl p-4 flex flex-col gap-3"
                  style={{
                    background: '#1e2023',
                    border: `1px solid ${recurring ? '#78be20' : '#3a3d42'}`,
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* Checkbox row */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={recurring}
                      onChange={e => handleRecurringToggle(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        background: recurring ? '#78be20' : 'transparent',
                        border: `2px solid ${recurring ? '#78be20' : '#3a3d42'}`,
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                    >
                      {recurring && (
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-white">Opakovat rezervaci</span>
                  </label>

                  {/* Expanded options */}
                  {recurring && (
                    <div className="flex gap-3 pt-1" style={{ borderTop: '1px solid #3a3d42' }}>
                      <Field label="Opakovat každý">
                        <select
                          value={recurrenceInterval}
                          onChange={e => setRecurrenceInterval(e.target.value as RecurrenceInterval)}
                          style={inputStyle}
                          onFocus={e => { e.currentTarget.style.borderColor = '#78be20' }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#3a3d42' }}
                        >
                          <option value="week" style={{ background: '#2a2d31' }}>Týden</option>
                          <option value="2weeks" style={{ background: '#2a2d31' }}>2 týdny</option>
                          <option value="month" style={{ background: '#2a2d31' }}>Měsíc</option>
                          <option value="year" style={{ background: '#2a2d31' }}>Celý rok (do konce roku)</option>
                        </select>
                      </Field>

                      {recurrenceInterval !== 'year' && (
                        <Field label="Do data">
                          <input
                            type="date"
                            required={recurring}
                            value={recurrenceEndDate}
                            min={minRecurrenceDate}
                            max={maxRecurrenceDate}
                            onChange={e => setRecurrenceEndDate(e.target.value)}
                            style={{ ...inputStyle, colorScheme: 'dark' }}
                            onFocus={e => { e.currentTarget.style.borderColor = '#78be20' }}
                            onBlur={e => { e.currentTarget.style.borderColor = '#3a3d42' }}
                          />
                        </Field>
                      )}
                    </div>
                  )}

                  {/* Preview count */}
                  {recurring && (recurrenceInterval === 'year' || !!recurrenceEndDate) && (
                    <p className="text-xs font-semibold" style={{ color: '#78be20' }}>
                      Vytvoří se {previewDates.length} {previewDates.length === 1 ? 'rezervace' : previewDates.length < 5 ? 'rezervace' : 'rezervací'}
                    </p>
                  )}
                </div>
              )}

              {error && (
                <p
                  className="text-sm rounded-lg px-3 py-2"
                  style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
                >
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: '#3a3d42', color: '#cccccc' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#464a50' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#3a3d42' }}
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#78be20', color: '#000000' }}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#8fd41e' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#78be20' }}
                >
                  {submitting
                    ? 'Ukládám…'
                    : isEditing
                      ? 'Uložit změny'
                      : recurring && previewDates.length > 1
                        ? `Rezervovat (${previewDates.length}×)`
                        : 'Rezervovat'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
