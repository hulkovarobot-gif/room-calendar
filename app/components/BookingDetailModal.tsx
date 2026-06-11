'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Booking, Room } from './Calendar'

interface Props {
  booking: Booking
  rooms: Room[]
  onClose: () => void
  onDeleted: () => void
  onEdit: () => void
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#78be20' }}>
        {label}
      </p>
      {children}
    </div>
  )
}

export default function BookingDetailModal({ booking, rooms, onClose, onDeleted, onEdit }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const room = rooms.find(r => r.id === booking.room_id)
  const date = booking.start_time.substring(0, 10)
  const startTime = booking.start_time.substring(11, 16)
  const endTime = booking.end_time.substring(11, 16)

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('cs-CZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  async function handleDelete() {
    setDeleting(true)
    const { error: err } = await supabase.from('bookings').delete().eq('id', booking.id)
    setDeleting(false)
    if (err) {
      setError(err.message)
      setConfirmDelete(false)
    } else {
      onDeleted()
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
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #3a3d42' }}
        >
          <h2 className="text-lg font-bold text-white">Detail rezervace</h2>
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

        {/* Details */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <div
            className="rounded-xl px-4 py-4 flex flex-col gap-3"
            style={{ background: '#1e2023', border: '1px solid #3a3d42' }}
          >
            <InfoRow label="Název meetingu">
              <p className="text-white font-semibold text-base leading-snug">{booking.title}</p>
            </InfoRow>

            <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: '1px solid #3a3d42' }}>
              <InfoRow label="Rezervoval/a">
                <p className="text-white text-sm">{booking.booked_by}</p>
              </InfoRow>
              <InfoRow label="Místnost">
                <p className="text-white text-sm">{room?.name ?? '—'}</p>
              </InfoRow>
            </div>

            <div className="pt-3" style={{ borderTop: '1px solid #3a3d42' }}>
              <InfoRow label="Datum a čas">
                <p className="text-white text-sm capitalize mt-0.5">{dateLabel}</p>
                <p className="text-sm mt-0.5" style={{ color: '#999999' }}>{startTime} – {endTime}</p>
              </InfoRow>
            </div>
          </div>

          {error && (
            <p
              className="text-sm rounded-lg px-3 py-2"
              style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
            >
              {error}
            </p>
          )}

          {confirmDelete ? (
            <div
              className="rounded-xl px-4 py-4 flex flex-col gap-3"
              style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)' }}
            >
              <p className="text-sm text-white font-medium">Opravdu chcete smazat tuto rezervaci?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: '#3a3d42', color: '#cccccc' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#464a50' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#3a3d42' }}
                >
                  Ne
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#dc2626', color: '#ffffff' }}
                  onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#dc2626' }}
                >
                  {deleting ? 'Mažu…' : 'Ano, smazat'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.4)', color: '#f87171' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; e.currentTarget.style.borderColor = '#dc2626' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.4)' }}
              >
                Smazat
              </button>
              <button
                onClick={onEdit}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold"
                style={{ background: '#78be20', color: '#000000' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#8fd41e' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#78be20' }}
              >
                Upravit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
