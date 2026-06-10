'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Room = { id: string; name: string; capacity: number }

interface Props {
  slot: { room: Room; startTime: string; date: string }
  rooms: Room[]
  onClose: () => void
  onSuccess: () => void
}

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

export default function BookingModal({ slot, rooms, onClose, onSuccess }: Props) {
  const endTimes = getEndTimes(slot.startTime)

  const [title, setTitle] = useState('')
  const [bookedBy, setBookedBy] = useState('')
  const [roomId, setRoomId] = useState(slot.room.id)
  const [endTime, setEndTime] = useState(endTimes[1] ?? endTimes[0] ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const dateLabel = new Date(`${slot.date}T12:00:00`).toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { error: err } = await supabase.from('bookings').insert({
      title,
      booked_by: bookedBy,
      room_id: roomId,
      start_time: `${slot.date}T${slot.startTime}:00`,
      end_time: `${slot.date}T${endTime}:00`,
    })

    setSubmitting(false)
    if (err) {
      setError(err.message)
    } else {
      onSuccess()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Nová rezervace</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3 text-sm">
            <div className="text-zinc-200 font-medium capitalize">{dateLabel}</div>
            <div className="text-zinc-400 mt-0.5">
              {slot.startTime}
              {endTime ? ` – ${endTime}` : ''}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">
              Název meetingu
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Stand-up, Sprint review, 1:1…"
              className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-sm transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">
              Vaše jméno
            </label>
            <input
              type="text"
              required
              value={bookedBy}
              onChange={e => setBookedBy(e.target.value)}
              placeholder="Jan Novák"
              className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-sm transition-colors"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">
                Místnost
              </label>
              <select
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-sm transition-colors"
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.capacity ? ` (${r.capacity} os.)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">
                Konec
              </label>
              <select
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-sm transition-colors"
              >
                {endTimes.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm font-medium"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Ukládám…' : 'Rezervovat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
