'use client'

import type { Booking } from './Calendar'

interface Props {
  bookings: Booking[]
  currentMonth: Date
  onMonthChange: (delta: number) => void
  onDayClick: (date: Date) => void
}

const DAY_HEADERS = ['Po', 'Út', 'St', 'Čt', 'Pá']

const MONTH_NAMES = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
  'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec',
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

// Returns weeks as arrays of 7 days (Mon–Sun); callers slice to first 5
function getMonthWeeks(month: Date): Date[][] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)

  const startDay = getMonday(firstDay)
  const lastDow = lastDay.getDay()
  const endDay = new Date(lastDay)
  endDay.setDate(endDay.getDate() + (lastDow === 0 ? 0 : 7 - lastDow))

  const weeks: Date[][] = []
  const cur = new Date(startDay)
  while (cur <= endDay) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur))
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

function countsByDate(bookings: Booking[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const b of bookings) {
    const d = b.start_time.substring(0, 10)
    out[d] = (out[d] ?? 0) + 1
  }
  return out
}

export default function MonthView({ bookings, currentMonth, onMonthChange, onDayClick }: Props) {
  const weeks = getMonthWeeks(currentMonth)
  const counts = countsByDate(bookings)
  const todayStr = formatDate(new Date())

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-200">
          {MONTH_NAMES[currentMonth.getMonth()]}{' '}
          <span className="text-zinc-500">{currentMonth.getFullYear()}</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMonthChange(-1)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-300 transition-colors text-sm"
          >
            ←
          </button>
          <button
            onClick={() => onMonthChange(1)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-300 transition-colors text-sm"
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar grid — 5 columns, weekends hidden */}
      <div className="flex-1 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col min-h-0">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-5 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
          {DAY_HEADERS.map(label => (
            <div
              key={label}
              className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Week rows — only Mon–Fri (indices 0–4) */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          {weeks.map((week, wi) => (
            <div
              key={wi}
              className="grid grid-cols-5 border-b border-zinc-800/60 last:border-0"
              style={{ minHeight: '96px' }}
            >
              {week.slice(0, 5).map((day, di) => {
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
                const dateStr = formatDate(day)
                const isToday = dateStr === todayStr
                const count = counts[dateStr] ?? 0

                return (
                  <div
                    key={dateStr}
                    onClick={() => isCurrentMonth && onDayClick(day)}
                    className={[
                      'p-3 flex flex-col gap-2 transition-colors',
                      di > 0 ? 'border-l border-zinc-800/40' : '',
                      isCurrentMonth
                        ? 'cursor-pointer hover:bg-zinc-800/50 active:bg-zinc-700/40'
                        : 'opacity-25 cursor-default',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={[
                          'w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold',
                          isToday
                            ? 'bg-indigo-600 text-white'
                            : 'text-zinc-300',
                        ].join(' ')}
                      >
                        {day.getDate()}
                      </span>

                      {count > 0 && isCurrentMonth && (
                        <span className="text-xs font-semibold bg-indigo-600/20 text-indigo-400 rounded-full px-2 py-0.5 leading-none">
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
