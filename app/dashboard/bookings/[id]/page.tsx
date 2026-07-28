'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Download, MapPin, Phone, Mail,
  MessageSquare, PhoneCall, Building2, X, AlertTriangle, Loader2,
} from 'lucide-react';
import { getBookingById, adminCancelBooking, getBookingNotes, addBookingNote, errorMessage, type DbBooking, type BookingNote } from '@/lib/api';

function CancelBookingModal({
  booking,
  onClose,
  onCancelled,
}: {
  booking: DbBooking;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refund = Number(booking.total);

  async function confirm() {
    if (!reason) {
      setErrorMsg('Select a cancellation reason first.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await adminCancelBooking(booking.id);
      onCancelled();
    } catch (e) {
      setErrorMsg(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Cancel Booking</h3>
            <p className="text-sm text-gray-500 mt-1">REF: {booking.payment_ref ?? booking.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="px-6 space-y-5">
          {errorMsg && (
            <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>{errorMsg}</div>
          )}

          <div className="border rounded-xl p-4 flex gap-3" style={{ borderColor: '#F0EBF8' }}>
            <div className="w-14 h-14 rounded-lg bg-gray-200 flex-shrink-0" />
            <div>
              <p className="font-bold text-gray-900">{booking.properties?.name ?? 'Property'}</p>
              <p className="text-sm text-gray-500">{booking.check_in} – {booking.check_out} · {booking.nights} nights</p>
              <p className="text-sm font-medium" style={{ color: '#6B2D82' }}>Guest: {booking.profiles?.full_name ?? '—'}</p>
            </div>
          </div>

          <div className="flex gap-3 p-4 rounded-xl" style={{ backgroundColor: '#FEF2F2' }}>
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">This action cannot be undone. Once confirmed, the dates will be released and the cancellation policy will be applied immediately.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">CANCELLATION REASON</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
              <option value="">Select a reason...</option>
              <option>Guest requested cancellation</option>
              <option>Property unavailable</option>
              <option>Payment issue</option>
              <option>Duplicate booking</option>
              <option>Other</option>
            </select>
          </div>

          <div className="rounded-xl p-5" style={{ backgroundColor: '#F0E6FA' }}>
            <p className="text-xs font-bold mb-3" style={{ color: '#6B2D82' }}>REFUND BREAKDOWN</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Amount Paid</span><span className="font-medium">₦{Number(booking.total).toLocaleString()}</span></div>
              <div className="border-t pt-2 flex justify-between font-bold" style={{ borderColor: '#E0D2EE' }}>
                <span>Refund Amount</span><span style={{ color: '#2E9E6B' }}>₦{refund.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              This updates the booking&apos;s status in Supabase immediately. Actually moving the refund through Paystack happens from the Transactions page.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 mt-2">
          <button onClick={onClose} className="text-sm font-semibold" style={{ color: '#6B2D82' }}>Go Back</button>
          <button
            onClick={confirm}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: '#D94F4F' }}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<DbBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<BookingNote[]>([]);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  function load() {
    setLoadError(null);
    getBookingById(id)
      .then(setBooking)
      .catch((e) => setLoadError(errorMessage(e)))
      .finally(() => setLoading(false));
    getBookingNotes(id)
      .then(setNotes)
      .catch((e) => setNotesError(errorMessage(e)));
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount; repo has no Suspense/use() data layer yet
  useEffect(load, [id]);

  async function saveNote() {
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      const created = await addBookingNote(id, note.trim());
      setNotes((cur) => [created, ...cur]);
      setNote('');
    } catch (e) {
      setNotesError(errorMessage(e));
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) {
    return <p className="text-center text-gray-400 py-24">Loading booking…</p>;
  }
  if (loadError) {
    return (
      <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
        Couldn&apos;t load this booking: {loadError}
      </div>
    );
  }
  if (!booking) {
    return <p className="text-center text-gray-400 py-24">Booking not found.</p>;
  }

  const timeline = [
    { title: 'Booking Created', time: new Date(booking.created_at).toLocaleString(), done: true },
    { title: 'Payment Confirmed', time: booking.paystack_ref ?? 'Not yet confirmed', done: !!booking.paystack_ref },
    { title: 'Check-in Due', time: booking.check_in, done: booking.status === 'completed' },
    ...(booking.status === 'cancelled'
      ? [{ title: 'Cancelled', time: booking.cancelled_at ? new Date(booking.cancelled_at).toLocaleString() : '—', done: true }]
      : []),
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/bookings')} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><ArrowLeft size={20} /></button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">Booking Detail</h1>
            <p className="text-sm text-gray-500 truncate">Ref: {booking.payment_ref ?? booking.id.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full uppercase" style={{ backgroundColor: '#F0FDF6', color: '#2E9E6B' }}>{booking.status}</span>
          <button className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#6B2D82' }}>
            <Download size={16} /> Download Receipt
          </button>
          {booking.status !== 'cancelled' && (
            <button
              onClick={() => setShowCancel(true)}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: '#D94F4F' }}
            >
              Cancel Booking
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border overflow-hidden flex flex-col sm:flex-row" style={{ borderColor: '#F0EBF8' }}>
            <div className="w-full h-40 sm:w-56 sm:h-40 bg-gradient-to-br from-orange-200 to-purple-300 flex-shrink-0" />
            <div className="p-5 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-gray-900 truncate">{booking.properties?.name ?? 'Property'}</h3>
                <span className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: '#F0E6FA', color: '#6B2D82' }}>
                  {booking.properties?.type?.toUpperCase() ?? ''}
                </span>
              </div>
              <Link href={`/dashboard/properties/${booking.property_id}/edit`} className="text-sm font-medium" style={{ color: '#6B2D82' }}>View Property</Link>
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                <MapPin size={14} /> {booking.properties?.location ?? '—'}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold text-gray-900 mb-5">Booking Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 text-sm">
              <div><p className="text-gray-400 mb-1">Check In</p><p className="font-bold text-gray-900">{booking.check_in}</p></div>
              <div><p className="text-gray-400 mb-1">Payment Method</p><p className="font-bold text-gray-900 flex items-center gap-1"><Building2 size={14} color="#3A7BD5" /> {booking.payment_method ?? 'Paystack'}</p></div>
              <div><p className="text-gray-400 mb-1">Checkout</p><p className="font-bold text-gray-900">{booking.check_out}</p></div>
              <div><p className="text-gray-400 mb-1">Paystack Ref</p><p className="font-bold text-gray-900">{booking.paystack_ref ?? '—'}</p></div>
              <div><p className="text-gray-400 mb-1">Duration</p><p className="font-bold text-gray-900">{booking.nights} Nights</p></div>
              <div><p className="text-gray-400 mb-1">Amount Paid</p><p className="font-bold" style={{ color: '#6B2D82' }}>₦{Number(booking.total).toLocaleString()}</p></div>
              <div><p className="text-gray-400 mb-1">Booked On</p><p className="font-bold text-gray-900">{new Date(booking.created_at).toLocaleDateString()}</p></div>
              <div><p className="text-gray-400 mb-1">Service Fee</p><p className="font-bold text-gray-900">₦{Number(booking.service_fee).toLocaleString()}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold text-gray-900 mb-5">Status Timeline</h3>
            <div className="space-y-5">
              {timeline.map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.done ? '#2E9E6B' : '#D1D1D6' }} />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" style={{ minHeight: 24 }} />}
                  </div>
                  <div className="pb-1">
                    <p className={`text-sm font-bold ${t.done ? 'text-gray-900' : 'text-gray-400'}`}>{t.title}</p>
                    <p className="text-xs text-gray-400">{t.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border p-6 text-center" style={{ borderColor: '#F0EBF8' }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: '#6B2D82' }}>
              {(booking.profiles?.full_name ?? '? ?').split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <h3 className="font-bold text-gray-900">{booking.profiles?.full_name ?? 'Guest'}</h3>
            <div className="text-left space-y-2 text-sm mb-4 mt-4">
              <div className="flex items-center gap-2 text-gray-600"><Phone size={14} /> {booking.profiles?.phone ?? '—'}</div>
              <div className="flex items-center gap-2 text-gray-600"><Mail size={14} /> {booking.profiles?.email ?? '—'}</div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: '#25D366' }}>
                <MessageSquare size={14} /> WhatsApp
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: '#6B2D82' }}>
                <PhoneCall size={14} /> Call Guest
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="font-bold text-gray-900 mb-3">Internal Notes</h3>
            {notesError && (
              <div className="rounded-lg p-3 text-sm mb-3" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>{notesError}</div>
            )}
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg p-3 text-sm text-gray-600 mb-3" style={{ backgroundColor: '#F8F5FA' }}>
                <p>{n.note}</p>
                <p className="text-xs text-gray-400 mt-1.5">
                  {n.created_by_name ?? 'Admin'} · {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm resize-none mb-3"
            />
            <button onClick={saveNote} disabled={savingNote || !note.trim()} className="w-full py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: '#6B2D82' }}>
              {savingNote ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </div>
      </div>

      {showCancel && (
        <CancelBookingModal
          booking={booking}
          onClose={() => setShowCancel(false)}
          onCancelled={() => {
            setShowCancel(false);
            load();
          }}
        />
      )}
    </div>
  );
}