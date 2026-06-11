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
  onBookingClick: (booking: Booking) => void
  highlightBookingId?: string
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

const ROOM_STYLES = [
  {
    headerBg: '#1a3a5c',
    headerBorder: '#2a5a9c',
    bookingBg: 'rgba(42,90,180,0.18)',
    bookingBorder: 'rgba(42,90,180,0.5)',
    bookingText: '#93c5fd',
    bookingSubText: 'rgba(147,197,253,0.6)',
  },
  {
    headerBg: '#2d1a5c',
    headerBorder: '#6d28d9',
    bookingBg: 'rgba(109,40,217,0.18)',
    bookingBorder: 'rgba(109,40,217,0.5)',
    bookingText: '#c4b5fd',
    bookingSubText: 'rgba(196,181,253,0.6)',
  },
  {
    headerBg: '#0f3040',
    headerBorder: '#0ea5e9',
    bookingBg: 'rgba(14,165,233,0.15)',
    bookingBorder: 'rgba(14,165,233,0.4)',
    bookingText: '#7dd3fc',
    bookingSubText: 'rgba(125,211,252,0.6)',
  },
  {
    headerBg: '#0f3025',
    headerBorder: '#10b981',
    bookingBg: 'rgba(16,185,129,0.15)',
    bookingBorder: 'rgba(16,185,129,0.4)',
    bookingText: '#6ee7b7',
    bookingSubText: 'rgba(110,231,183,0.6)',
  },
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

function NavButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
      style={{ border: '1px solid #78be20', color: '#78be20', background: 'transparent' }}
      onMouseEnter={e => {
        const t = e.currentTarget
        t.style.background = '#78be20'
        t.style.color = '#000000'
      }}
      onMouseLeave={e => {
        const t = e.currentTarget
        t.style.background = 'transparent'
        t.style.color = '#78be20'
      }}
    >
      {children}
    </button>
  )
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
  onBookingClick,
  highlightBookingId,
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
          <NavButton onClick={onBackToMonth}>← Zpět na měsíc</NavButton>
          <p className="text-sm font-medium" style={{ color: '#999999' }}>
            {addDays(weekStart, 0).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })}
            {' – '}
            {addDays(weekStart, 4).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NavButton onClick={() => onWeekChange(-1)}>←</NavButton>
          {!isCurrentWeek && (
            <button
              onClick={onGoToday}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: '#78be20', color: '#000000' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#8fd41e' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#78be20' }}
            >
              Dnes
            </button>
          )}
          <NavButton onClick={() => onWeekChange(1)}>→</NavButton>
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2">
        {DAY_NAMES.map((name, idx) => {
          const dayDate = addDays(weekStart, idx)
          const dateStr = formatDate(dayDate)
          const isToday = dateStr === todayStr
          const isSelected = idx === selectedDayIdx

          let tabStyle: React.CSSProperties
          if (isSelected) {
            tabStyle = { background: '#78be20', border: '1px solid #78be20', color: '#000000' }
          } else if (isToday) {
            tabStyle = { background: '#2a2d31', border: '1px solid rgba(120,190,32,0.5)', color: '#78be20' }
          } else {
            tabStyle = { background: '#2a2d31', border: '1px solid #3a3d42', color: '#999999' }
          }

          return (
            <button
              key={idx}
              onClick={() => onDaySelect(idx)}
              className="flex-1 py-3 px-2 rounded-2xl transition-all flex flex-col items-center gap-1"
              style={tabStyle}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'rgba(120,190,32,0.5)'
                  e.currentTarget.style.color = isToday ? '#78be20' : '#ffffff'
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = isToday ? 'rgba(120,190,32,0.5)' : '#3a3d42'
                  e.currentTarget.style.color = isToday ? '#78be20' : '#999999'
                }
              }}
            >
              <span className="text-xs font-bold uppercase tracking-wide">{name}</span>
              <span className="text-sm font-semibold">{dayDate.getDate()}</span>
              <span className="text-xs opacity-70">
                {dayDate.toLocaleDateString('cs-CZ', { month: 'numeric' })}.
              </span>
            </button>
          )
        })}
      </div>

      {/* Calendar grid */}
      <div
        className="flex-1 overflow-auto rounded-2xl min-h-0"
        style={{ border: '1px solid #3a3d42' }}
      >
        <table
          className="border-collapse"
          style={{ minWidth: `${rooms.length * 200 + 80}px`, width: '100%' }}
        >
          <thead>
            <tr>
              <th
                className="w-20 px-4 py-4 text-left sticky left-0 top-0 z-20 backdrop-blur"
                style={{ background: '#16181b', borderBottom: '1px solid #3a3d42', borderRight: '1px solid #3a3d42' }}
              >
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#555555' }}>Čas</span>
              </th>
              {rooms.map((room, idx) => {
                const s = ROOM_STYLES[idx % ROOM_STYLES.length]
                return (
                  <th
                    key={room.id}
                    className="px-4 py-3 text-left sticky top-0 z-10 backdrop-blur"
                    style={{
                      background: s.headerBg,
                      borderBottom: `2px solid ${s.headerBorder}`,
                      borderLeft: `3px solid ${s.headerBorder}`,
                    }}
                  >
                    <div className="text-sm font-semibold text-white">{room.name}</div>
                    {room.capacity > 0 && (
                      <div className="text-xs mt-0.5 font-normal" style={{ color: '#999999' }}>{room.capacity} osob</div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot, slotIdx) => {
              const isHour = slot.endsWith(':00')
              const rowBg = slotIdx % 2 === 0 ? '#222529' : '#2a2d31'
              return (
                <tr
                  key={slot}
                  style={{ borderBottom: `1px solid ${isHour ? '#3a3d42' : 'rgba(58,61,66,0.4)'}` }}
                >
                  <td
                    className="w-20 px-3 text-[11px] sticky left-0 z-10 backdrop-blur align-middle h-[28px]"
                    style={{
                      background: '#16181b',
                      borderRight: '1px solid #3a3d42',
                      color: isHour ? '#cccccc' : '#555555',
                      fontWeight: isHour ? 600 : 400,
                    }}
                  >
                    {slot}
                  </td>
                  {grid[slotIdx].map((cell, roomIdx) => {
                    if (cell.kind === 'skip') return null
                    const s = ROOM_STYLES[roomIdx % ROOM_STYLES.length]

                    if (cell.kind === 'booking') {
                      const isHighlighted = cell.booking.id === highlightBookingId
                      return (
                        <td
                          key={rooms[roomIdx].id}
                          rowSpan={cell.rowSpan}
                          className="px-1 py-0.5 align-top"
                          style={{ background: rowBg, borderLeft: '1px solid #3a3d42', cursor: 'pointer' }}
                          onClick={() => onBookingClick(cell.booking)}
                        >
                          <div
                            className="h-full rounded px-2 py-1"
                            style={{
                              background: s.bookingBg,
                              border: isHighlighted ? '2px solid #78be20' : `1px solid ${s.bookingBorder}`,
                              borderRadius: '4px',
                              minHeight: `${cell.rowSpan * 28 - 4}px`,
                              transition: 'filter 0.15s',
                              boxShadow: isHighlighted ? '0 0 0 2px rgba(120,190,32,0.25), 0 0 12px rgba(120,190,32,0.15)' : 'none',
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.35)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none' }}
                          >
                            <div className="text-xs font-semibold leading-snug" style={{ color: s.bookingText }}>
                              {cell.booking.title}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: s.bookingSubText }}>
                              {cell.booking.booked_by}
                            </div>
                            {cell.rowSpan >= 2 && (
                              <div className="text-xs mt-1.5" style={{ color: s.bookingSubText }}>
                                {cell.booking.start_time.substring(11, 16)}
                                {' – '}
                                {cell.booking.end_time.substring(11, 16)}
                              </div>
                            )}
                            {(() => {
                              const room = rooms[roomIdx]
                              if (!room?.capacity || cell.booking.attendees == null) return null
                              const pct = Math.min(Math.round((cell.booking.attendees / room.capacity) * 100), 100)
                              const color = pct > 85 ? '#ef4444' : pct > 60 ? '#f97316' : '#78be20'
                              return (
                                <div
                                  title={`${cell.booking.attendees} / ${room.capacity} osob`}
                                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(0,0,0,0.25)' }}
                                >
                                  <div style={{ height: '100%', width: `${pct}%`, background: color }} />
                                </div>
                              )
                            })()}
                          </div>
                        </td>
                      )
                    }

                    return (
                      <td
                        key={rooms[roomIdx].id}
                        className="px-1 py-0 h-[28px] cursor-pointer transition-colors group"
                        style={{ background: rowBg, borderLeft: '1px solid #3a3d42' }}
                        onClick={() => onSlotClick(rooms[roomIdx], slot, selectedDate)}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#323539' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = rowBg }}
                      >
                        <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[11px] font-medium" style={{ color: '#78be20' }}>+ rezervovat</span>
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
