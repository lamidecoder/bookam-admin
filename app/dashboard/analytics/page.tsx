'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  CreditCard, Calendar, Users, Star, XCircle, Upload, ChevronDown, Loader2,
} from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, XAxis,
} from 'recharts';
import { getAllBookings, getAllProperties, getRecentReviews, errorMessage, type DbBooking, type DbProperty, type ReviewRow } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';

const PALETTE = ['#6B2D82', '#C9A84C', '#D1D1D6', '#3A7BD5', '#2E9E6B'];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AnalyticsPage() {
  const [range, setRange] = useState('30D');
  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [properties, setProperties] = useState<DbProperty[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAllBookings(), getAllProperties(), getRecentReviews(5)])
      .then(([b, p, r]) => {
        setBookings(b);
        setProperties(p);
        setReviews(r);
      })
      .catch((e) => setLoadError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const rangeDays = range === '7D' ? 7 : range === '90D' ? 90 : range === '12M' ? 365 : 30;
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - rangeDays);
    return d;
  }, [rangeDays]);

  const inRange = useMemo(() => bookings.filter((b) => new Date(b.created_at) >= cutoff), [bookings, cutoff]);
  const validBookings = useMemo(() => inRange.filter((b) => b.status !== 'cancelled'), [inRange]);

  function handleExport() {
    // Exports exactly what's currently being analyzed - respects the
    // active date-range filter (7D/30D/90D/12M), not just "everything".
    downloadCsv(
      `bookam-analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`,
      inRange.map((b) => ({
        date: new Date(b.created_at).toLocaleDateString('en-GB'),
        guest_name: b.profiles?.full_name ?? '',
        property: b.properties?.name ?? '',
        property_type: b.properties?.type ?? '',
        total: Number(b.total),
        status: b.status,
      }))
    );
  }

  const revenue = validBookings.reduce((s, b) => s + Number(b.total), 0);
  const uniqueGuests = new Set(inRange.map((b) => b.user_id)).size;
  const cancellations = inRange.filter((b) => b.status === 'cancelled').length;
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';

  const revenueOverTime = useMemo(() => {
    const buckets = new Map<string, { revenue: number; bookings: number }>();
    validBookings.forEach((b) => {
      const key = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      const cur = buckets.get(key) ?? { revenue: 0, bookings: 0 };
      cur.revenue += Number(b.total);
      cur.bookings += 1;
      buckets.set(key, cur);
    });
    return Array.from(buckets.entries()).map(([date, v]) => ({ date, ...v }));
  }, [validBookings]);

  const byPropertyType = useMemo(() => {
    const counts = new Map<string, number>();
    validBookings.forEach((b) => {
      const type = b.properties?.type ?? 'Other';
      counts.set(type, (counts.get(type) ?? 0) + 1);
    });
    const total = validBookings.length || 1;
    return Array.from(counts.entries()).map(([name, count], i) => ({
      name,
      value: Math.round((count / total) * 100),
      color: PALETTE[i % PALETTE.length],
    }));
  }, [validBookings]);

  const occupancy = useMemo(() => {
    return properties
      .map((p) => {
        const count = validBookings.filter((b) => b.property_id === p.id).length;
        return { name: p.name, pct: Math.min(100, count * 8) };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4);
  }, [properties, validBookings]);

  const byWeekday = useMemo(() => {
    const counts = new Array(7).fill(0);
    validBookings.forEach((b) => counts[new Date(b.created_at).getDay()]++);
    const maxIdx = counts.indexOf(Math.max(...counts));
    return WEEKDAY_LABELS.map((day, i) => ({ day, value: counts[i], peak: i === maxIdx }));
  }, [validBookings]);

  const topProperties = useMemo(() => {
    return properties
      .map((p) => {
        const propBookings = validBookings.filter((b) => b.property_id === p.id);
        return { name: p.name, count: propBookings.length, rev: propBookings.reduce((s, b) => s + Number(b.total), 0) };
      })
      .sort((a, b) => b.rev - a.rev)
      .filter((p) => p.count > 0)
      .slice(0, 3);
  }, [properties, validBookings]);

  const retentionPct = useMemo(() => {
    const byGuest = new Map<string, number>();
    inRange.forEach((b) => byGuest.set(b.user_id, (byGuest.get(b.user_id) ?? 0) + 1));
    const repeatGuests = [...byGuest.values()].filter((c) => c > 1).length;
    return byGuest.size ? Math.round((repeatGuests / byGuest.size) * 100) : 0;
  }, [inRange]);

  const STATS = [
    { icon: CreditCard, color: '#C9A84C', bg: '#FFF8E7', value: `₦${revenue.toLocaleString()}`, label: 'REVENUE' },
    { icon: Calendar, color: '#6B2D82', bg: '#F0E6FA', value: String(validBookings.length), label: 'BOOKINGS' },
    { icon: Users, color: '#3A7BD5', bg: '#EFF6FF', value: String(uniqueGuests), label: 'UNIQUE GUESTS' },
    { icon: Star, color: '#C9A84C', bg: '#FFF8E7', value: avgRating, label: 'AVG RATING' },
    { icon: XCircle, color: '#D94F4F', bg: '#FEF2F2', value: String(cancellations), label: 'CANCELLATIONS' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-gray-400">
        <Loader2 size={18} className="animate-spin" /> Loading analytics…
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Track performance, revenue and booking trends across all properties.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border text-sm text-gray-600" style={{ borderColor: '#F0EBF8' }}>
            All Properties <ChevronDown size={14} />
          </button>
          <div className="flex bg-gray-100 rounded-xl p-1">
            {['7D', '30D', '90D', '12M'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ backgroundColor: range === r ? '#6B2D82' : 'transparent', color: range === r ? '#FFFFFF' : '#6B6478' }}
              >
                {r}
              </button>
            ))}
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold" style={{ borderColor: '#6B2D82', color: '#6B2D82' }}>
            <Upload size={14} /> Export
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl p-4 text-sm mb-6" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
          Couldn&apos;t load analytics: {loadError}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#F0EBF8' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: s.bg }}>
                <Icon size={18} color={s.color} />
              </div>
              <p className="text-xs font-bold text-gray-400 mb-1">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        <div className="col-span-2 bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Revenue Over Time</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#6B2D82' }} /> Revenue</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#C9A84C' }} /> Bookings</span>
            </div>
          </div>
          {revenueOverTime.length === 0 ? (
            <p className="text-center text-gray-400 py-16">No bookings in this range yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueOverTime}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9E96A8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E1E1E', borderRadius: 8, border: 'none' }}
                  labelStyle={{ color: '#FFF' }}
                  itemStyle={{ color: '#FFF' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#6B2D82" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="bookings" stroke="#C9A84C" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Bookings by Property Type</h3>
          {byPropertyType.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No data yet.</p>
          ) : (
            <>
              <div className="relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={byPropertyType} dataKey="value" innerRadius={55} outerRadius={80} startAngle={90} endAngle={-270}>
                      {byPropertyType.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center">
                  <p className="text-2xl font-bold text-gray-900">{validBookings.length}</p>
                  <p className="text-xs text-gray-400">Total</p>
                </div>
              </div>
              <div className="space-y-2 mt-2">
                {byPropertyType.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: d.color }} />{d.name}</span>
                    <span className="font-semibold text-gray-900">{d.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
          <h3 className="text-lg font-bold text-gray-900 mb-5">Occupancy Rate by Property</h3>
          {occupancy.length === 0 ? (
            <p className="text-gray-400 text-sm">No properties yet.</p>
          ) : (
            <div className="space-y-5">
              {occupancy.map((o) => (
                <div key={o.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-gray-900">{o.name}</span>
                    <span className="font-semibold text-gray-900">{o.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full" style={{ width: `${o.pct}%`, backgroundColor: '#6B2D82' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
          <h3 className="text-lg font-bold text-gray-900 mb-5">Bookings by Day of Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byWeekday}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9E96A8' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {byWeekday.map((d, i) => (
                  <Cell key={i} fill={d.peak ? '#C9A84C' : '#E0D2EE'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top Performing Properties</h3>
          {topProperties.length === 0 ? (
            <p className="text-gray-400 text-sm">No bookings yet.</p>
          ) : (
            <div className="space-y-4">
              {topProperties.map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.count} Bookings · ₦{(p.rev / 1000000).toFixed(1)}M Rev</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border p-6 flex flex-col items-center justify-center" style={{ borderColor: '#F0EBF8' }}>
          <h3 className="text-lg font-bold text-gray-900 mb-4 self-start">Guest Retention</h3>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={[{ value: retentionPct }, { value: 100 - retentionPct }]} dataKey="value" innerRadius={50} outerRadius={68} startAngle={90} endAngle={-270}>
                <Cell fill="#6B2D82" />
                <Cell fill="#F0EBF8" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <p className="text-2xl font-bold text-gray-900 -mt-20">{retentionPct}%</p>
          <p className="text-sm text-gray-500 text-center mt-12">Share of guests in this range with more than one booking.</p>
        </div>

        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Reviews</h3>
          {reviews.length === 0 ? (
            <p className="text-gray-400 text-sm">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold" style={{ color: '#6B2D82' }}>{r.profiles?.full_name ?? 'Guest'}</p>
                    <span className="text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">&ldquo;{r.body}&rdquo;</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}