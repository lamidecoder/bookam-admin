'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Upload, Search, Users as UsersIcon, ShieldAlert } from 'lucide-react';
import { getAllGuests, subscribeToGuests, errorMessage, type GuestRow } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { StatusBadge } from '@/components/StatusBadge';

export default function UsersPage() {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getAllGuests()
      .then(setGuests)
      .catch((e) => setLoadError(errorMessage(e)))
      .finally(() => setLoading(false));

    const sub = subscribeToGuests(setGuests);
    return () => {
      sub.unsubscribe();
    };
  }, []);

  const filtered = guests.filter((g) => `${g.full_name} ${g.email}`.toLowerCase().includes(search.toLowerCase()));

  function handleExport() {
    downloadCsv(
      `bookam-users-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((g) => ({
        full_name: g.full_name,
        email: g.email,
        phone: g.phone ?? '',
        booking_count: g.bookingCount,
        total_spent: g.totalSpent,
        status: g.status,
      }))
    );
  }
  const suspendedCount = guests.filter((g) => g.status === 'suspended').length;
  const totalSpend = guests.reduce((s, g) => s + g.totalSpent, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">All registered guest accounts on the platform.</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: '#6B2D82' }}>
          <Upload size={16} /> Export Directory
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#F0EBF8' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#F0E6FA' }}>
            <UsersIcon size={20} color="#6B2D82" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{guests.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Registered Guests</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#F0EBF8' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#FFF8E7' }}>
            <UsersIcon size={20} color="#C9A84C" />
          </div>
          <p className="text-2xl font-bold text-gray-900">₦{totalSpend.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Total Guest Spend</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#F0EBF8' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: '#FEF2F2' }}>
            <ShieldAlert size={20} color="#D94F4F" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{suspendedCount}</p>
          <p className="text-sm text-gray-500 mt-1">Suspended Accounts</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border mb-6 flex items-center gap-3" style={{ borderColor: '#F0EBF8' }}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by guest name or email" className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl p-4 text-sm mb-6" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
          Couldn&apos;t load guests: {loadError}
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-16">Loading guests…</p>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#F0EBF8' }}>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#FAF8FC' }}>
                {['GUEST NAME', 'EMAIL', 'PHONE', 'BOOKINGS', 'TOTAL SPENT', 'STATUS'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold" style={{ color: '#6B2D82' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, i) => (
                <tr key={g.id} className="border-t" style={{ borderColor: '#F5F2F8', backgroundColor: i % 2 ? '#FFFCF8' : '#FFFFFF' }}>
                  <td className="px-5 py-4">
                    <Link href={`/dashboard/users/${g.id}`} className="flex items-center gap-3 font-semibold text-gray-900 hover:text-purple-700">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#6B2D82' }}>
                        {g.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      {g.full_name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-gray-700">{g.email}</td>
                  <td className="px-5 py-4 text-gray-700">{g.phone || '—'}</td>
                  <td className="px-5 py-4 text-gray-700">{g.bookingCount}</td>
                  <td className="px-5 py-4 font-semibold" style={{ color: '#6B2D82' }}>₦{g.totalSpent.toLocaleString()}</td>
                  <td className="px-5 py-4"><StatusBadge status={g.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No guests match your search.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}