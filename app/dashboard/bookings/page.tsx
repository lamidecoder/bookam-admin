'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Upload, Search, Eye, ClipboardList, CheckCircle2, Clock, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getBookingsPage, errorMessage, type DbBooking } from '@/lib/api';

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string }> = {
    confirmed: { bg: '#F0FDF6', text: '#2E9E6B' },
    pending: { bg: '#FFFBEB', text: '#E8922A' },
    cancelled: { bg: '#FEF2F2', text: '#D94F4F' },
    completed: { bg: '#F5F5F5', text: '#6B6478' },
  };
  const c = cfg[status] || cfg.pending;
  return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full capitalize" style={{ backgroundColor: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

export default function BookingsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<DbBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount; repo has no Suspense/use() data layer yet
    setLoading(true);
    getBookingsPage({ page, pageSize: PAGE_SIZE, search })
      .then(({ rows, total }) => {
        setRows(rows);
        setTotal(total);
      })
      .catch((e) => setLoadError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [page, search]);

  // Stats computed from the current page's loaded total + status counts
  // would need a separate aggregate query to be fully accurate across all
  // pages; keeping this simple and scoped to what's actually loaded.
  const stats = useMemo(() => {
    return {
      confirmed: rows.filter((r) => r.status === 'confirmed').length,
      pending: rows.filter((r) => r.status === 'pending').length,
      cancelled: rows.filter((r) => r.status === 'cancelled').length,
    };
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 mt-1">Manage all guest bookings across every property.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: '#6B2D82' }}>
          <Upload size={16} /> Export Bookings
        </button>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#F0EBF8' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#F0E6FA' }}>
            <ClipboardList size={20} color="#6B2D82" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-sm text-gray-500 mt-1">Total Bookings</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#F0EBF8' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#F0FDF6' }}>
            <CheckCircle2 size={20} color="#2E9E6B" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.confirmed}</p>
          <p className="text-sm text-gray-500 mt-1">Confirmed (this page)</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#F0EBF8' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#FFFBEB' }}>
            <Clock size={20} color="#E8922A" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
          <p className="text-sm text-gray-500 mt-1">Pending (this page)</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#F0EBF8' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#FEF2F2' }}>
            <XCircle size={20} color="#D94F4F" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
          <p className="text-sm text-gray-500 mt-1">Cancelled (this page)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border mb-6 flex items-center gap-3" style={{ borderColor: '#F0EBF8' }}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by guest name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none"
          />
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl p-4 text-sm mb-6" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
          Couldn&apos;t load bookings: {loadError}
        </div>
      )}

      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#F0EBF8' }}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
            <Loader2 size={18} className="animate-spin" /> Loading bookings…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-400 py-16">No bookings match your search.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#FAF8FC' }}>
                {['BOOKING REF', 'GUEST NAME', 'PROPERTY', 'CHECK IN', 'CHECK OUT', 'NIGHTS', 'AMOUNT', 'STATUS', 'ACTIONS'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold" style={{ color: '#6B2D82' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b, i) => (
                <tr key={b.id} className="border-t" style={{ borderColor: '#F5F2F8', backgroundColor: i % 2 ? '#FFFCF8' : '#FFFFFF' }}>
                  <td className="px-5 py-4 font-semibold text-gray-900">{b.payment_ref ?? b.id.slice(0, 8)}</td>
                  <td className="px-5 py-4 text-gray-700">{b.profiles?.full_name ?? '—'}</td>
                  <td className="px-5 py-4 text-gray-700">{b.properties?.name ?? '—'}</td>
                  <td className="px-5 py-4 text-gray-700">{b.check_in}</td>
                  <td className="px-5 py-4 text-gray-700">{b.check_out}</td>
                  <td className="px-5 py-4 text-gray-700">{b.nights}</td>
                  <td className="px-5 py-4 font-semibold text-gray-900">₦{Number(b.total).toLocaleString()}</td>
                  <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/bookings/${b.id}`} className="text-gray-400 hover:text-purple-700"><Eye size={16} /></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: '#F0EBF8' }}>
          <p className="text-sm text-gray-500">
            Showing {rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + rows.length} of {total} bookings
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg text-gray-500 disabled:opacity-30 flex items-center justify-center"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600 px-2">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="w-8 h-8 rounded-lg text-gray-500 disabled:opacity-30 flex items-center justify-center"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}