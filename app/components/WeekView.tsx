'use client'

import type { Room, Booking } from './Calendar'

interface Props {
  rooms: Room[]
  bookings: Booking[]
  weekStart: Date
  selectedDayIdx: number
  onDaySelect: (idx: number) => void
  onWeekChange: (delta: number) => void
  onGoToday: () => void
  onBackToMonth: () => void
  onSlotClick: (room: Room, startTime: string, date: string) => void
}

type SlotState =
  | { kind: 'empty' }
  | { kind: 'booking'; booking: Booking; rowSpan: number }
  | { kind: 'skip' }

const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const h = Math.floor(i / 2) + 7
  const m = (i % 2) * 30
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

const DAY_NAMES = ['Po', 'Út', 'St', 'Čt', 'Pá']

const ROOM_COLORS = [
  { bg: 'bg-blue-600/15 border-blue-500/30', text: 'text-blue-300', sub: 'text-blue-400/60', header: 'text-blue-200', headerBg: 'bg-blue-900/80 border-l-4 border-l-blue-500' },
  { bg: 'bg-violet-600/15 border-violet-500/30', text: 'text-violet-300', sub: 'text-violet-400/60', header: 'text-violet-200', headerBg: 'bg-violet-900/80 border-l-4 border-l-violet-500' },
  { bg: 'bg-sky-600/15 border-sky-500/30', text: 'text-sky-300', sub: 'text-sky-400/60', header: 'text-sky-400', headerBg: 'bg-sky-900/50 border-l-4 border-l-sky-500' },
  { bg: 'bg-emerald-600/15 border-emerald-500/30', text: 'text-emerald-300', sub: 'text-emerald-400/60', header: 'text-emerald-400', headerBg: 'bg-emerald-900/50 border-l-4 border-l-emerald-500' },
]

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function timeToSlotIndex(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h - 7) * 2 + m / 30
}

function buildGrid(rooms: Room[], bookings: Booking[]): SlotState[][] {
  const grid: SlotState[][] = TIME_SLOTS.map(() =>
    rooms.map(() => ({ kind: 'empty' }))
  )

  for (const booking of bookings) {
    const roomIdx = rooms.findIndex(r => r.id === booking.room_id)
    if (roomIdx === -1) continue

    const startSlot = timeToSlotIndex(booking.start_time.substring(11, 16))
    const endSlot = timeToSlotIndex(booking.end_time.substring(11, 16))

    if (startSlot < 0 || startSlot >= TIME_SLOTS.length) continue
    const span = Math.min(endSlot - startSlot, TIME_SLOTS.length - startSlot)
    if (span <= 0) continue

    grid[startSlot][roomIdx] = { kind: 'booking', booking, rowSpan: span }
    for (let i = startSlot + 1; i < startSlot + span; i++) {
      if (i < TIME_SLOTS.length) grid[i][roomIdx] = { kind: 'skip' }
    }
  }

  return grid
}

export default function WeekView({
  rooms,
  bookings,
  weekStart,
  selectedDayIdx,
  onDaySelect,
  onWeekChange,
  onGoToday,
  onBackToMonth,
  onSlotClick,
}: Props) {
  const todayStr = formatDate(new Date())
  const isCurrentWeek = formatDate(weekStart) === formatDate(getMonday(new Date()))
  const selectedDate = formatDate(addDays(weekStart, selectedDayIdx))
  const dayBookings = bookings.filter(b => b.start_time.startsWith(selectedDate))
  const grid = buildGrid(rooms, dayBookings)

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToMonth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors text-sm"
          >
            ← Zpět na měsíc
          </button>
          <p className="text-sm text-zinc-400 font-medium">
            {addDays(weekStart, 0).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })}
            {' – '}
            {addDays(weekStart, 4).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onWeekChange(-1)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-300 transition-colors text-sm"
          >
            ←
          </button>
          {!isCurrentWeek && (
            <button
              onClick={onGoToday}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors text-sm font-medium"
            >
              Dnes
            </button>
          )}
          <button
            onClick={() => onWeekChange(1)}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-zinc-300 transition-colors text-sm"
          >
            →
          </button>
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2">
        {DAY_NAMES.map((name, idx) => {
          const dayDate = addDays(weekStart, idx)
          const dateStr = formatDate(dayDate)
          const isToday = dateStr === todayStr
          const isSelected = idx === selectedDayIdx
          return (
            <button
              key={idx}
              onClick={() => onDaySelect(idx)}
              className={[
                'flex-1 py-3 px-2 rounded-2xl transition-all flex flex-col items-center gap-1 border',
                isSelected
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-950/60'
                  : isToday
                    ? 'bg-zinc-800 border-indigo-600/40 text-indigo-400'
                    : 'bg-zinc-800/50 border-zinc-700/40 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-600',
              ].join(' ')}
            >
              <span className="text-xs font-bold uppercase tracking-wide">{name}</span>
              <span className={`text-sm font-semibold ${isSelected ? 'text-white' : isToday ? 'text-indigo-300' : 'text-zinc-300'}`}>
                {dayDate.getDate()}
              </span>
              <span className={`text-xs ${isSelected ? 'text-indigo-200' : 'text-zinc-600'}`}>
                {dayDate.toLocaleDateString('cs-CZ', { month: 'numeric' })}.
              </span>
            </button>
          )
        })}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto rounded-2xl border border-zinc-800 min-h-0">
        <table
          className="border-collapse"
          style={{ minWidth: `${rooms.length * 200 + 80}px`, width: '100%' }}
        >
          <thead>
            <tr>
              <th className="w-20 px-4 py-4 text-left sticky left-0 top-0 z-20 bg-zinc-900/95 backdrop-blur border-b border-r border-zinc-800">
                <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Čas</span>
              </th>
              {rooms.map((room, idx) => {
                const color = ROOM_COLORS[idx % ROOM_COLORS.length]
                return (
                  <th
                    key={room.id}
                    className={`px-4 py-2 text-left sticky top-0 z-10 backdrop-blur border-b border-b-zinc-800 ${color.headerBg}`}
                  >
                    <div className={`text-sm font-semibold ${color.header}`}>{room.name}</div>
                    {room.capacity > 0 && (
                      <div className="text-xs text-zinc-500 mt-0.5 font-normal">{room.capacity} osob</div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot, slotIdx) => {
              const isHour = slot.endsWith(':00')
              return (
                <tr
                  key={slot}
                  className={`border-b last:border-0 ${isHour ? 'border-zinc-800' : 'border-zinc-800/25'}`}
                >
                  <td
                    className={[
                      'w-20 px-3 text-[11px] sticky left-0 z-10 bg-zinc-900/95 backdrop-blur',
                      'border-r border-zinc-800 align-middle h-[28px]',
                      isHour ? 'text-zinc-400 font-semibold' : 'text-zinc-700',
                    ].join(' ')}
                  >
                    {slot}
                  </td>
                  {grid[slotIdx].map((cell, roomIdx) => {
                    if (cell.kind === 'skip') return null
                    const color = ROOM_COLORS[roomIdx % ROOM_COLORS.length]

                    if (cell.kind === 'booking') {
                      return (
                        <td
                          key={rooms[roomIdx].id}
                          rowSpan={cell.rowSpan}
                          className="px-1 py-0.5 border-l-2 border-zinc-700 align-top"
                        >
                          <div
                            className={`h-full rounded-lg border px-2 py-1 ${color.bg}`}
                            style={{ minHeight: `${cell.rowSpan * 28 - 4}px` }}
                          >
                            <div className={`text-xs font-semibold leading-snug ${color.text}`}>
                              {cell.booking.title}
                            </div>
                            <div className={`text-xs mt-0.5 ${color.sub}`}>
                              {cell.booking.booked_by}
                            </div>
                            {cell.rowSpan >= 2 && (
                              <div className={`text-xs mt-1.5 ${color.sub}`}>
                                {cell.booking.start_time.substring(11, 16)}
                                {' – '}
                                {cell.booking.end_time.substring(11, 16)}
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    }

                    return (
                      <td
                        key={rooms[roomIdx].id}
                        className={`px-1 py-0 border-l-2 border-zinc-700 h-[28px] cursor-pointer hover:bg-zinc-800/40 transition-colors group ${slotIdx % 2 === 0 ? 'bg-zinc-800/[0.07]' : ''}`}
                        onClick={() => onSlotClick(rooms[roomIdx], slot, selectedDate)}
                      >
                        <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[11px] text-zinc-600 font-medium">+ rezervovat</span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
