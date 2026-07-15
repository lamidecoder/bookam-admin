'use client';
import { useEffect, useMemo, useState } from 'react';
import { Home, CreditCard, Calendar, XCircle, Eye, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getAllBookings, getAllProperties, errorMessage, type DbBooking, type DbProperty } from '@/lib/api';

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string }> = {
    confirmed: { bg: '#F0FDF6', text: '#2E9E6B' },
    pending: { bg: '#FFFBEB', text: '#E8922A' },
    cancelled: { bg: '#FEF2F2', text: '#D94F4F' },
    completed: { bg: '#F5F5F5', text: '#6B6478' },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full uppercase" style={{ backgroundColor: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

function isToday(dateStr: string) {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

export default function OverviewPage() {
  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [properties, setProperties] = useState<DbProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAllBookings(), getAllProperties()])
      .then(([b, p]) => {
        setBookings(b);
        setProperties(p);
      })
      .catch((e) => setLoadError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const todays = bookings.filter((b) => isToday(b.created_at));
    return {
      totalToday: todays.length,
      revenueToday: todays.reduce((s, b) => s + Number(b.total), 0),
      checkinsToday: bookings.filter((b) => isToday(b.check_in) && b.status === 'confirmed').length,
      cancellationsToday: bookings.filter((b) => b.cancelled_at && isToday(b.cancelled_at)).length,
    };
  }, [bookings]);

  const recent = bookings.slice(0, 5);
  const checkinsToday = bookings.filter((b) => isToday(b.check_in) && b.status === 'confirmed');
  const checkoutsToday = bookings.filter((b) => isToday(b.check_out));

  const occupancy = useMemo(() => {
    return properties
      .map((p) => {
        const count = bookings.filter((b) => b.property_id === p.id && b.status !== 'cancelled').length;
        return { name: p.name, pct: Math.min(100, count * 8) };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [properties, bookings]);

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const STATS_CARDS = [
    { icon: Home, color: '#6B2D82', bg: '#F0E6FA', value: String(stats.totalToday), label: 'Total Bookings Today' },
    { icon: CreditCard, color: '#C9A84C', bg: '#FFF8E7', value: `₦${stats.revenueToday.toLocaleString()}`, label: 'Revenue Today' },
    { icon: Calendar, color: '#3A7BD5', bg: '#EFF6FF', value: String(stats.checkinsToday), label: 'Check-ins Today' },
    { icon: XCircle, color: '#D94F4F', bg: '#FEF2F2', value: String(stats.cancellationsToday), label: 'Cancellations Today' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border" style={{ borderColor: '#F0EBF8' }}>
          <Calendar size={16} />
          {todayLabel}
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl p-4 text-sm mb-6" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
          Couldn&apos;t load dashboard data: {loadError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-gray-400">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            {STATS_CARDS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#F0EBF8' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: s.bg }}>
                    <Icon size={20} color={s.color} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
            <div className="col-span-2 bg-white rounded-2xl p-6 border" style={{ borderColor: '#F0EBF8' }}>
              <h3 className="text-lg font-bold text-gray-900">Recent Bookings</h3>
              <p className="text-sm text-gray-500 mb-4">Most recent activity, live</p>
              {recent.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No bookings yet.</p>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 text-xs">
                      <th className="pb-3 font-medium">Ref</th>
                      <th className="pb-3 font-medium">Guest Name</th>
                      <th className="pb-3 font-medium">Property</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((b) => (
                      <tr key={b.id} className="border-t" style={{ borderColor: '#F5F2F8' }}>
                        <td className="py-3 font-medium text-gray-900">{b.payment_ref ?? b.id.slice(0, 8)}</td>
                        <td className="py-3 text-gray-700">{b.profiles?.full_name ?? '—'}</td>
                        <td className="py-3 text-gray-700">{b.properties?.name ?? '—'}</td>
                        <td className="py-3"><StatusBadge status={b.status} /></td>
                        <td className="py-3 font-semibold text-gray-900">₦{Number(b.total).toLocaleString()}</td>
                        <td className="py-3">
                          <Link href={`/dashboard/bookings/${b.id}`} className="text-gray-400 hover:text-purple-700"><Eye size={16} /></Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#F0EBF8' }}>
              <h3 className="text-lg font-bold text-gray-900">Property Occupancy</h3>
              <p className="text-sm text-gray-500 mb-5">By active booking volume</p>
              {occupancy.length === 0 ? (
                <p className="text-sm text-gray-400">No properties yet.</p>
              ) : (
                <div className="space-y-5">
                  {occupancy.map((o) => (
                    <div key={o.name}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-gray-900">{o.name}</span>
                        <span className="font-semibold" style={{ color: '#6B2D82' }}>{o.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div className="h-2 rounded-full" style={{ width: `${o.pct}%`, backgroundColor: '#6B2D82' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#F0EBF8' }}>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Today&apos;s Check-ins</h3>
              {checkinsToday.length === 0 ? (
                <p className="text-sm text-gray-400">No check-ins today.</p>
              ) : (
                <div className="space-y-3">
                  {checkinsToday.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#FAF8FC' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#6B2D82' }}>
                          {(b.profiles?.full_name ?? '? ?').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{b.profiles?.full_name ?? '—'}</p>
                          <p className="text-xs text-gray-500">{b.properties?.name ?? '—'}</p>
                        </div>
                      </div>
                      <StatusBadge status="confirmed" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#F0EBF8' }}>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Today&apos;s Check-outs</h3>
              {checkoutsToday.length === 0 ? (
                <p className="text-sm text-gray-400">No check-outs today.</p>
              ) : (
                <div className="space-y-3">
                  {checkoutsToday.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: '#FAF8FC' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#6B2D82' }}>
                          {(b.profiles?.full_name ?? '? ?').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{b.profiles?.full_name ?? '—'}</p>
                          <p className="text-xs text-gray-500">{b.properties?.name ?? '—'}</p>
                        </div>
                      </div>
                      <StatusBadge status="completed" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}