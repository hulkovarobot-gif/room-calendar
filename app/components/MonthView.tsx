'use client'

import type { Booking, Room } from './Calendar'

interface Props {
  bookings: Booking[]
  rooms: Room[]
  currentMonth: Date
  onMonthChange: (delta: number) => void
  onDayClick: (date: Date) => void
  onPillClick: (date: Date, bookingId: string) => void
}

const DAY_HEADERS = ['Po', 'Út', 'St', 'Čt', 'Pá']

const MONTH_NAMES = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
]

// Match WeekView ROOM_STYLES colors for visual consistency
const PILL_STYLES = [
  { bg: 'rgba(42,90,180,0.25)',   border: 'rgba(42,90,180,0.55)',   text: '#93c5fd' },
  { bg: 'rgba(109,40,217,0.25)',  border: 'rgba(109,40,217,0.55)',  text: '#c4b5fd' },
  { bg: 'rgba(14,165,233,0.2)',   border: 'rgba(14,165,233,0.45)',  text: '#7dd3fc' },
  { bg: 'rgba(16,185,129,0.2)',   border: 'rgba(16,185,129,0.45)', text: '#6ee7b7' },
]

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getMonthDays(month: Date): Date[] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const startDay = getMonday(firstDay)
  const lastDow = lastDay.getDay()
  const endDay = new Date(lastDay)
  endDay.setDate(endDay.getDate() + (lastDow === 0 ? 0 : 7 - lastDow))

  const days: Date[] = []
  const cur = new Date(startDay)
  while (cur <= endDay) {
    for (let i = 0; i < 5; i++) {
      days.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    cur.setDate(cur.getDate() + 2)
  }
  return days
}

function bookingsByDate(bookings: Booking[]): Record<string, Booking[]> {
  const out: Record<string, Booking[]> = {}
  for (const b of bookings) {
    const d = b.start_time.substring(0, 10)
    if (!out[d]) out[d] = []
    out[d].push(b)
  }
  for (const d in out) {
    out[d].sort((a, b) => a.start_time.localeCompare(b.start_time))
  }
  return out
}

// "Veronika Horáčková" → "Veronika H"
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[1][0]}`
}

export default function MonthView({ bookings, rooms, currentMonth, onMonthChange, onDayClick, onPillClick }: Props) {
  const days = getMonthDays(currentMonth)
  const byDate = bookingsByDate(bookings)
  const todayStr = formatDate(new Date())

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">
          {MONTH_NAMES[currentMonth.getMonth()]}{' '}
          <span style={{ color: '#999999' }}>{currentMonth.getFullYear()}</span>
        </h2>
        <div className="flex items-center gap-2">
          {[[-1, '←'], [1, '→']].map(([delta, label]) => (
            <button
              key={label}
              onClick={() => onMonthChange(delta as number)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{ border: '1px solid #78be20', color: '#78be20' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#78be20'; e.currentTarget.style.color = '#000' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#78be20' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-5 gap-1.5 mb-1.5">
          {DAY_HEADERS.map(label => (
            <div
              key={label}
              className="py-2 text-center text-xs font-bold uppercase tracking-wider"
              style={{ color: '#78be20' }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-5 gap-1.5">
          {days.map(day => {
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
            const dateStr = formatDate(day)
            const isToday = dateStr === todayStr
            const dayBookings = isCurrentMonth ? (byDate[dateStr] ?? []) : []
            const visible = dayBookings.slice(0, 2)
            const hiddenCount = dayBookings.length - visible.length

            return (
              <div
                key={dateStr}
                onClick={() => isCurrentMonth && onDayClick(day)}
                style={{ minHeight: '80px' }}
                className={[
                  'calendar-day-cell p-2 flex flex-col gap-1',
                  isCurrentMonth ? 'clickable' : 'opacity-25 cursor-default',
                ].join(' ')}
              >
                {/* Day number row */}
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold flex-shrink-0"
                    style={isToday ? { background: '#78be20', color: '#000' } : { color: '#fff' }}
                  >
                    {day.getDate()}
                  </span>
                </div>

                {/* Reservation pills */}
                <div className="flex flex-col gap-0.5">
                  {visible.map(b => {
                    const roomIdx = rooms.findIndex(r => r.id === b.room_id)
                    const ps = PILL_STYLES[Math.max(0, roomIdx) % PILL_STYLES.length]
                    const time = b.start_time.substring(11, 16)
                    const name = shortName(b.booked_by)
                    const roomName = rooms.find(r => r.id === b.room_id)?.name ?? ''
                    return (
                      <div
                        key={b.id}
                        onClick={e => { e.stopPropagation(); onPillClick(day, b.id) }}
                        title={`${time} ${b.booked_by} — ${roomName}`}
                        style={{
                          background: ps.bg,
                          border: `1px solid ${ps.border}`,
                          color: ps.text,
                          borderRadius: '4px',
                          padding: '1px 5px',
                          fontSize: '11px',
                          fontWeight: 500,
                          lineHeight: '18px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer',
                          transition: 'filter 0.1s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.3)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none' }}
                      >
                        {time} {name}{b.attendees != null && b.attendees > 1 ? ` · 👥${b.attendees}` : ''}
                      </div>
                    )
                  })}

                  {hiddenCount > 0 && (
                    <div
                      onClick={e => { e.stopPropagation(); onDayClick(day) }}
                      style={{
                        fontSize: '11px',
                        lineHeight: '18px',
                        padding: '0 5px',
                        color: '#999999',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#cccccc' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#999999' }}
                    >
                      +{hiddenCount} další
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
