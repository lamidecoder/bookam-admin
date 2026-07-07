'use client';
import { useEffect, useMemo, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Lock, X, AlertTriangle, CheckCircle2, CalendarOff } from 'lucide-react';
import { getAllProperties, getBookingsForProperty, getBlockedDatesForProperty, blockDates, unblockDate, subscribeToPropertyCalendar, errorMessage, type DbProperty, type DbBooking, type DbBlockedDate } from '@/lib/api';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

type DayStatus = 'open' | 'booked' | 'blocked';
type Day = { iso: string; date: number; status: DayStatus; booking?: DbBooking; blockedInfo?: DbBlockedDate; outOfMonth?: boolean };

function buildGrid(year: number, month: number, bookings: DbBooking[], blocked: DbBlockedDate[]): Day[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const bookingByDate = new Map<string, DbBooking>();
  bookings.forEach((b) => {
    const start = new Date(b.check_in);
    const end = new Date(b.check_out);
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      bookingByDate.set(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, b);
    }
  });
  const blockedByDate = new Map(blocked.map((b) => [b.date, b]));

  const cells: Day[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ iso: '', date: daysInPrev - firstWeekday + 1 + i, status: 'open', outOfMonth: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
    const booking = bookingByDate.get(iso);
    const blockedInfo = blockedByDate.get(iso);
    cells.push({ iso, date: d, status: blockedInfo ? 'blocked' : booking ? 'booked' : 'open', booking, blockedInfo });
  }
  while (cells.length % 7 !== 0) cells.push({ iso: '', date: cells.length, status: 'open', outOfMonth: true });
  return cells;
}

const CELL_STYLE: Record<DayStatus, { bg: string; text: string }> = {
  open: { bg: '#FFFFFF', text: '#1E1E1E' },
  booked: { bg: '#D94F4F', text: '#FFFFFF' },
  blocked: { bg: '#E5E0EA', text: '#9E96A8' },
};

function BlockConfirmationSheet({
  propertyName,
  dates,
  reason,
  notes,
  onClose,
}: {
  propertyName: string;
  dates: string[];
  reason: string;
  notes: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#F0FDF6' }}>
          <CheckCircle2 size={28} style={{ color: '#2E9E6B' }} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 text-center mb-1">Dates Blocked</h3>
        <p className="text-sm text-gray-500 text-center mb-5">
          {dates.length} date{dates.length === 1 ? '' : 's'} on <span className="font-semibold text-gray-700">{propertyName}</span> {dates.length === 1 ? 'is' : 'are'} now unavailable to guests.
        </p>

        <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: '#FAF8FC' }}>
          <p className="text-xs font-bold text-gray-500 mb-2">DATES BLOCKED</p>
          <div className="flex flex-wrap gap-2">
            {dates.sort().map((iso) => (
              <span key={iso} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border" style={{ borderColor: '#F0EBF8', color: '#1E1E1E' }}>
                {new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2 text-sm mb-5">
          <div className="flex justify-between"><span className="text-gray-500">Reason</span><span className="font-semibold text-gray-900">{reason}</span></div>
          {notes && <div className="flex justify-between gap-4"><span className="text-gray-500 flex-shrink-0">Notes</span><span className="font-medium text-gray-700 text-right">{notes}</span></div>}
        </div>

        <p className="text-xs text-gray-400 mb-5">This is already live in the guest app — these dates can&apos;t be booked until you unblock them.</p>

        <button onClick={onClose} className="w-full py-3 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: '#6B2D82' }}>
          Done
        </button>
      </div>
    </div>
  );
}

export default function CalendarOverridePage() {
  return (
    <Suspense fallback={<p className="text-center text-gray-400 py-24">Loading calendar…</p>}>
      <CalendarOverrideInner />
    </Suspense>
  );
}

function CalendarOverrideInner() {
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<DbProperty[]>([]);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [blocked, setBlocked] = useState<DbBlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Day | null>(null);
  const [overrideMode, setOverrideMode] = useState(false);
  const [pickedDates, setPickedDates] = useState<string[]>([]);
  const [reason, setReason] = useState('Owner Use');
  const [notes, setNotes] = useState('');
  const [confirmation, setConfirmation] = useState<{ dates: string[]; reason: string; notes: string } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    getAllProperties()
      .then((data) => {
        setProperties(data);
        const fromLink = searchParams.get('property');
        const matchExists = fromLink && data.some((p) => p.id === fromLink);
        if (matchExists) {
          setPropertyId(fromLink);
        } else if (data.length) {
          setPropertyId(data[0].id);
        }
      })
      .catch((e) => setLoadError(errorMessage(e)));
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const monthStart = `${cursor.year}-${pad(cursor.month + 1)}-01`;
      const monthEnd = `${cursor.year}-${pad(cursor.month + 1)}-${new Date(cursor.year, cursor.month + 1, 0).getDate()}`;
      const [b, bd] = await Promise.all([
        getBookingsForProperty(propertyId, monthStart, monthEnd),
        getBlockedDatesForProperty(propertyId, monthStart, monthEnd),
      ]);
      setBookings(b);
      setBlocked(bd);
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [propertyId, cursor]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount; repo has no Suspense/use() data layer yet
    load();
  }, [load]);

  useEffect(() => {
    if (!propertyId) return;
    const sub = subscribeToPropertyCalendar(propertyId, load);
    return () => {
      sub.unsubscribe();
    };
  }, [propertyId, load]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  const grid = useMemo(() => buildGrid(cursor.year, cursor.month, bookings, blocked), [cursor, bookings, blocked]);
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const selectedProperty = properties.find((p) => p.id === propertyId);

  const monthStats = useMemo(() => {
    const real = grid.filter((d) => !d.outOfMonth);
    const openCount = real.filter((d) => d.status === 'open').length;
    const bookedCount = real.filter((d) => d.status === 'booked').length;
    const blockedCount = real.filter((d) => d.status === 'blocked').length;
    return {
      total: real.length,
      open: openCount,
      booked: bookedCount,
      blocked: blockedCount,
      occupancy: real.length ? Math.round((bookedCount / real.length) * 100) : 0,
    };
  }, [grid]);

  const blockedThisMonth = useMemo(
    () => grid.filter((d) => !d.outOfMonth && d.status === 'blocked').sort((a, b) => a.date - b.date),
    [grid]
  );

  function changeMonth(delta: number) {
    setSelected(null);
    setPickedDates([]);
    setCursor((c) => {
      const next = new Date(c.year, c.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function switchProperty(id: string) {
    setPropertyId(id);
    setSelected(null);
    setPickedDates([]);
    setNotes('');
    setReason('Owner Use');
  }

  // Per the spec: admin can tap ANY date regardless of status — even
  // booked ones, for disputes/emergencies — and toggle it into the
  // override selection.
  function handleDayClick(day: Day) {
    if (day.outOfMonth) return;
    if (overrideMode) {
      setPickedDates((cur) => (cur.includes(day.iso) ? cur.filter((d) => d !== day.iso) : [...cur, day.iso]));
      return;
    }
    setSelected(day);
  }

  async function confirmOverride() {
    if (!propertyId || pickedDates.length === 0) return;
    try {
      await blockDates(propertyId, pickedDates, reason, notes || undefined);
      setConfirmation({ dates: [...pickedDates], reason, notes });
      setOverrideMode(false);
      setPickedDates([]);
      setNotes('');
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  async function handleUnblock(iso: string) {
    if (!propertyId) return;
    if (!confirm('Unblock this date? It becomes bookable again immediately.')) return;
    try {
      await unblockDate(propertyId, iso);
      setSelected(null);
      setFlash(`Unblocked ${new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}.`);
    } catch (e) {
      alert(errorMessage(e));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar Override</h1>
          <p className="text-gray-500 mt-1">Full control over any property&apos;s availability calendar.</p>
        </div>
        <button
          onClick={() => {
            setOverrideMode((v) => !v);
            setPickedDates([]);
            setSelected(null);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold"
          style={{ backgroundColor: overrideMode ? '#D94F4F' : '#6B2D82' }}
        >
          <Lock size={16} /> {overrideMode ? 'Cancel Override' : 'Block / Unblock Dates'}
        </button>
      </div>

      {flash && (
        <div className="rounded-xl p-3 text-sm mb-4 flex items-center gap-2" style={{ backgroundColor: '#F0FDF6', color: '#2E9E6B' }}>
          <CheckCircle2 size={15} /> {flash}
        </div>
      )}

      <div className="bg-white rounded-2xl border p-4 mb-6 flex items-center justify-between" style={{ borderColor: '#F0EBF8' }}>
        <select
          value={propertyId || ''}
          onChange={(e) => switchProperty(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm font-medium"
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <button onClick={() => changeMonth(-1)} className="text-gray-400"><ChevronLeft size={18} /></button>
          <span className="font-semibold text-gray-900">{monthLabel}</span>
          <button onClick={() => changeMonth(1)} className="text-gray-400"><ChevronRight size={18} /></button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl p-4 text-sm mb-6" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
          Couldn&apos;t load calendar: {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#F0EBF8' }}>
          {loading ? (
            <p className="text-center text-gray-400 py-20">Loading calendar…</p>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
                  <div key={w} className="text-center text-xs font-semibold text-gray-400 py-1">{w}</div>
                ))}
                {grid.map((day, i) => {
                  const isPicked = pickedDates.includes(day.iso) && !day.outOfMonth;
                  const style = day.outOfMonth ? { bg: 'transparent', text: '#D1D1D6' } : isPicked ? { bg: '#FFFBEB', text: '#92660E' } : CELL_STYLE[day.status];
                  return (
                    <button
                      key={i}
                      onClick={() => handleDayClick(day)}
                      disabled={day.outOfMonth}
                      className="aspect-square rounded-lg sm:rounded-xl p-1 sm:p-2 text-left text-xs sm:text-sm flex flex-col items-start"
                      style={{ backgroundColor: style.bg, color: style.text, boxShadow: isPicked ? 'inset 0 0 0 2px #C9A84C' : undefined }}
                    >
                      <span className="font-semibold">{day.date}</span>
                      {day.booking && <span className="text-[10px] mt-auto truncate">{day.booking.profiles?.full_name}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-5 mt-5 text-xs text-gray-500">
                <Legend color="#FFFFFF" border label="Available" />
                <Legend color="#D94F4F" label="Booked" />
                <Legend color="#E5E0EA" label="Blocked" />
              </div>
            </>
          )}
        </div>

        <div className="space-y-5">
          {overrideMode ? (
            <div
              className="bg-white rounded-2xl border-t-[3px] p-5"
              style={{
                borderLeftColor: '#F0EBF8',
                borderRightColor: '#F0EBF8',
                borderBottomColor: '#F0EBF8',
                borderTopColor: '#6B2D82',
              }}
            >
              <h3 className="font-bold text-gray-900 mb-1">Override Selected Dates</h3>
              <p className="text-sm text-gray-500 mb-3">
                {pickedDates.length} date{pickedDates.length === 1 ? '' : 's'} selected — tap any date, including booked ones.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {pickedDates.length === 0 && <p className="text-sm text-gray-400">Tap dates on the calendar to select them.</p>}
                {pickedDates.sort().map((iso) => (
                  <span key={iso} className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: '#FFFBEB', color: '#92660E' }}>
                    {iso}
                    <button onClick={() => setPickedDates((cur) => cur.filter((x) => x !== iso))}><X size={11} /></button>
                  </span>
                ))}
              </div>
              <label className="block text-xs font-bold text-gray-500 mb-2">REASON</label>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm mb-3">
                <option>Owner Use</option>
                <option>Maintenance</option>
                <option>Dispute / Emergency Adjustment</option>
                <option>Other</option>
              </select>
              <label className="block text-xs font-bold text-gray-500 mb-2">NOTES (OPTIONAL)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm resize-none mb-4" />
              <div className="flex gap-2 p-3 rounded-lg mb-4" style={{ backgroundColor: '#FFFBEB' }}>
                <AlertTriangle size={15} style={{ color: '#E8922A' }} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs" style={{ color: '#92660E' }}>
                  This is reflected instantly in the guest app. If any selected date already has a booking, only the calendar availability changes — the booking itself isn&apos;t cancelled automatically.
                </p>
              </div>
              <button onClick={confirmOverride} disabled={pickedDates.length === 0} className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: '#6B2D82' }}>
                Confirm Block
              </button>
            </div>
          ) : selected?.status === 'blocked' ? (
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#F0EBF8' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">{new Date(selected.iso).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => setSelected(null)} className="text-gray-400"><X size={18} /></button>
              </div>
              <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3" style={{ backgroundColor: '#E5E0EA', color: '#6B6478' }}>Blocked</span>
              <p className="text-sm text-gray-500 mb-1">Reason: <span className="font-medium text-gray-900">{selected.blockedInfo?.reason || '—'}</span></p>
              {selected.blockedInfo?.notes && <p className="text-sm text-gray-500 mb-4">Notes: {selected.blockedInfo.notes}</p>}
              <button onClick={() => handleUnblock(selected.iso)} className="w-full py-3 rounded-xl text-sm font-semibold border mt-4" style={{ color: '#6B2D82', borderColor: '#6B2D82' }}>
                Unblock This Date
              </button>
            </div>
          ) : selected?.booking ? (
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#F0EBF8' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">{new Date(selected.iso).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => setSelected(null)} className="text-gray-400"><X size={18} /></button>
              </div>
              <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 uppercase" style={{ backgroundColor: '#F0FDF6', color: '#2E9E6B' }}>{selected.booking.status}</span>
              <p className="text-sm text-gray-500">Guest: <span className="font-medium text-gray-900">{selected.booking.profiles?.full_name ?? '—'}</span></p>
              <p className="text-sm text-gray-500">Check In/Out: {selected.booking.check_in} — {selected.booking.check_out}</p>
              <p className="text-sm text-gray-500">Total: <span className="font-bold" style={{ color: '#6B2D82' }}>₦{Number(selected.booking.total).toLocaleString()}</span></p>
              <a href={`/dashboard/bookings/${selected.booking.id}`} className="block mt-4 text-center py-3 rounded-xl text-sm font-semibold border" style={{ color: '#6B2D82', borderColor: '#6B2D82' }}>
                View Full Booking
              </a>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#F0EBF8' }}>
                <h3 className="font-bold text-gray-900 mb-4">{monthLabel} Summary{selectedProperty ? ` — ${selectedProperty.name}` : ''}</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500">Total Days</dt><dd className="font-semibold text-gray-900">{monthStats.total}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Open</dt><dd className="font-semibold text-gray-900">{monthStats.open}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Booked</dt><dd className="font-semibold text-gray-900">{monthStats.booked}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Blocked</dt><dd className="font-semibold text-gray-900">{monthStats.blocked}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Occupancy Rate</dt><dd className="font-bold" style={{ color: '#6B2D82' }}>{monthStats.occupancy}%</dd></div>
                </dl>
              </div>

              <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#F0EBF8' }}>
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <CalendarOff size={16} style={{ color: '#6B6478' }} /> Blocked Dates This Month
                </h3>
                <p className="text-xs text-gray-400 mb-3">Tap any date below to unblock it.</p>
                {blockedThisMonth.length === 0 ? (
                  <p className="text-sm text-gray-400">No dates are blocked this month.</p>
                ) : (
                  <div className="space-y-2">
                    {blockedThisMonth.map((d) => (
                      <button
                        key={d.iso}
                        onClick={() => setSelected(d)}
                        className="w-full flex items-center justify-between p-3 rounded-lg text-left"
                        style={{ backgroundColor: '#FAF8FC' }}
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {new Date(d.iso).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-xs text-gray-400">{d.blockedInfo?.reason || 'No reason given'}</p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#E5E0EA', color: '#6B6478' }}>Blocked</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {confirmation && selectedProperty && (
        <BlockConfirmationSheet
          propertyName={selectedProperty.name}
          dates={confirmation.dates}
          reason={confirmation.reason}
          notes={confirmation.notes}
          onClose={() => setConfirmation(null)}
        />
      )}
    </div>
  );
}

function Legend({ color, border, label }: { color: string; border?: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded" style={{ backgroundColor: color, border: border ? '1px solid #D1D1D6' : undefined }} />
      {label}
    </span>
  );
}