'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import WeekView from './WeekView'
import MonthView from './MonthView'
import BookingModal from './BookingModal'
import BookingDetailModal from './BookingDetailModal'

type View = 'week' | 'month'

export type Room = { id: string; name: string; capacity: number }
export type Booking = {
  id: string
  room_id: string
  title: string
  booked_by: string
  start_time: string
  end_time: string
  attendees?: number
}

const FALLBACK_ROOMS: Room[] = [
  { id: '8d7358e7-7e8f-49ba-9bbd-7d7ce195455c', name: 'Zasedací místnost č. 1', capacity: 8 },
  { id: 'e2d43bb3-578a-42b6-aa95-3cf6dbaa8342', name: 'Zasedací místnost č. 2 (prosklená)', capacity: 6 },
]

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

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

function initialDayIdx(): number {
  const day = new Date().getDay()
  return day === 0 || day === 6 ? 0 : day - 1
}

export default function Calendar() {
  const [view, setView] = useState<View>('month')
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [selectedDayIdx, setSelectedDayIdx] = useState(initialDayIdx)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), 1)
  })
  const [rooms, setRooms] = useState<Room[]>(FALLBACK_ROOMS)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [modalSlot, setModalSlot] = useState<{
    room: Room
    startTime: string
    date: string
  } | null>(null)
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [highlightedBookingId, setHighlightedBookingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const [startStr, endStr] =
      view === 'week'
        ? [formatDate(weekStart), formatDate(addDays(weekStart, 4))]
        : [
            formatDate(currentMonth),
            formatDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)),
          ]

    const [roomsRes, bookingsRes] = await Promise.all([
      supabase.from('rooms').select('*').order('name'),
      supabase
        .from('bookings')
        .select('*')
        .gte('start_time', `${startStr}T00:00:00`)
        .lte('start_time', `${endStr}T23:59:59`),
    ])

    if (roomsRes.data && roomsRes.data.length > 0) {
      setRooms(roomsRes.data)
    } else if (roomsRes.data?.length === 0) {
      // Table is empty — seed default rooms and use the returned UUIDs
      const { data: seeded } = await supabase
        .from('rooms')
        .upsert(
          FALLBACK_ROOMS.map(({ name, capacity }) => ({ name, capacity })),
          { onConflict: 'name' }
        )
        .select()
      if (seeded && seeded.length > 0) setRooms(seeded)
    }

    setBookings(bookingsRes.data ?? [])
    setLoading(false)
  }, [view, weekStart, currentMonth])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleDayClickFromMonth(date: Date) {
    setWeekStart(getMonday(date))
    const day = date.getDay()
    setSelectedDayIdx(day === 0 || day === 6 ? 0 : day - 1)
    setView('week')
  }

  function handlePillClick(date: Date, bookingId: string) {
    handleDayClickFromMonth(date)
    setHighlightedBookingId(bookingId)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-5 py-4 mb-6 rounded-xl"
        style={{ background: '#16181b', borderBottom: '2px solid #78be20' }}
      >
        <div className="flex items-center gap-4">
          <Image
            src="/Logo.png"
            alt="Logo"
            width={130}
            height={44}
            style={{ objectFit: 'contain', filter: 'brightness(1.3)' }}
            priority
          />
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight leading-none">
              Zasedací místnosti
            </h1>
            <p className="text-xs mt-1" style={{ color: '#999999' }}>Rezervační systém</p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#2a2d31', border: '1px solid #3a3d42' }}>
          {(['week', 'month'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={
                view === v
                  ? { background: '#78be20', color: '#000000' }
                  : { background: 'transparent', color: '#999999' }
              }
            >
              {v === 'week' ? 'Týden' : 'Měsíc'}
            </button>
          ))}
        </div>
      </header>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: '#3a3d42', borderTopColor: '#78be20' }} />
            <span className="text-sm" style={{ color: '#999999' }}>Načítám…</span>
          </div>
        </div>
      ) : view === 'week' ? (
        <WeekView
          rooms={rooms}
          bookings={bookings}
          weekStart={weekStart}
          selectedDayIdx={selectedDayIdx}
          onDaySelect={idx => { setSelectedDayIdx(idx); setHighlightedBookingId(null) }}
          onWeekChange={delta => { setWeekStart(w => addDays(w, delta * 7)); setHighlightedBookingId(null) }}
          onGoToday={() => {
            setWeekStart(getMonday(new Date()))
            setSelectedDayIdx(initialDayIdx())
            setHighlightedBookingId(null)
          }}
          onBackToMonth={() => setView('month')}
          onSlotClick={(room, startTime, date) => setModalSlot({ room, startTime, date })}
          onBookingClick={booking => setDetailBooking(booking)}
          highlightBookingId={highlightedBookingId ?? undefined}
        />
      ) : (
        <MonthView
          bookings={bookings}
          rooms={rooms}
          currentMonth={currentMonth}
          onMonthChange={delta =>
            setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + delta, 1))
          }
          onDayClick={handleDayClickFromMonth}
          onPillClick={handlePillClick}
        />
      )}

      {modalSlot && (
        <BookingModal
          slot={modalSlot}
          rooms={rooms}
          onClose={() => setModalSlot(null)}
          onSuccess={() => fetchData()}
        />
      )}

      {detailBooking && (
        <BookingDetailModal
          booking={detailBooking}
          rooms={rooms}
          onClose={() => setDetailBooking(null)}
          onDeleted={() => { setDetailBooking(null); fetchData() }}
          onEdit={() => {
            const b = detailBooking
            setDetailBooking(null)
            setEditingBooking(b)
          }}
        />
      )}

      {editingBooking && (
        <BookingModal
          slot={{
            room: rooms.find(r => r.id === editingBooking.room_id) ?? rooms[0],
            startTime: editingBooking.start_time.substring(11, 16),
            date: editingBooking.start_time.substring(0, 10),
          }}
          rooms={rooms}
          existingBooking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onSuccess={() => fetchData()}
        />
      )}
    </div>
  )
}
