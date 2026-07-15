'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Upload, Plus, Search, ChevronDown, Pencil, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { getAllProperties, setPropertyActive, subscribeToAllProperties, errorMessage, type DbProperty } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<DbProperty[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const confirmAction = useConfirm();

  useEffect(() => {
    getAllProperties()
      .then(setProperties)
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));

    const sub = subscribeToAllProperties(setProperties);
    return () => {
      sub.unsubscribe();
    };
  }, []);

  async function toggleActive(p: DbProperty) {
    if (p.active) {
      const ok = await confirmAction({
        title: 'Deactivate this property?',
        message: `"${p.name}" will be removed from guest search immediately. You can reactivate it any time.`,
        confirmLabel: 'Deactivate',
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      await setPropertyActive(p.id, !p.active);
      showToast(p.active ? 'Property deactivated.' : 'Property reactivated.', 'success');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }

  const filtered = properties.filter((p) =>
    `${p.name} ${p.area}`.toLowerCase().includes(search.toLowerCase())
  );

  function handleExport() {
    // Exports whatever's currently visible (respects active search/filter)
    // rather than always dumping every property regardless of what the
    // admin is actually looking at.
    downloadCsv(
      `bookam-properties-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((p) => ({
        name: p.name,
        type: p.type,
        area: p.area,
        price_per_night: p.price_per_night,
        rating: p.rating ?? '',
        verified: p.verified ? 'yes' : 'no',
        active: p.active ? 'yes' : 'no',
        created_at: p.created_at,
      }))
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-500 mt-1">All listings managed from one table.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold text-gray-700" style={{ borderColor: '#F0EBF8' }}>
            <Upload size={16} /> Export List
          </button>
          <Link
            href="/dashboard/properties/new"
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: '#6B2D82' }}
          >
            <Plus size={16} /> Add Property
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border mb-6 flex items-center gap-3" style={{ borderColor: '#F0EBF8' }}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search properties by name or area"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600">
          All Types <ChevronDown size={14} />
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600">
          All Statuses <ChevronDown size={14} />
        </button>
      </div>

      {loading && <p className="text-center text-gray-400 py-16">Loading properties…</p>}
      {error && (
        <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
          Couldn&apos;t load properties: {error}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed py-16 text-center text-gray-400" style={{ borderColor: '#F0EBF8' }}>
          No properties yet. Click &ldquo;Add Property&rdquo; to list your first space.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#F0EBF8' }}>
            <div className="relative h-44 w-full bg-gray-100">
              {p.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-orange-100 to-purple-200" />
              )}
              {p.verified && (
                <span className="absolute left-3 top-3 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: 'white', color: '#C9A84C' }}>
                  ✓ Verified
                </span>
              )}
              <span className="absolute right-3 top-3">
                <StatusBadge status={p.active ? 'active' : 'inactive'} />
              </span>
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold uppercase" style={{ color: '#6B2D82' }}>{p.type}</p>
              <h3 className="text-lg font-bold text-gray-900 mt-1">{p.name}</h3>
              <p className="text-sm text-gray-500">📍 {p.area}</p>

              <div className="flex items-center justify-between mt-3 text-sm">
                <span className="text-gray-500">{p.review_count ? `★ ${p.rating} (${p.review_count})` : 'No reviews yet'}</span>
              </div>

              <div className="flex items-center justify-between mt-3">
                <p className="text-lg font-bold" style={{ color: '#6B2D82' }}>
                  ₦{Number(p.price_per_night).toLocaleString()} <span className="text-sm font-normal text-gray-400">/ night</span>
                </p>
                <div className="flex gap-2">
                  <Link href={`/dashboard/properties/${p.id}/edit`} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F8F5FA' }}>
                    <Pencil size={15} className="text-gray-600" />
                  </Link>
                  <button onClick={() => toggleActive(p)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF2F2' }} title={p.active ? 'Deactivate' : 'Reactivate'}>
                    <Trash2 size={15} className="text-red-500" />
                  </button>
                </div>
              </div>

              <Link
                href={`/dashboard/calendar?property=${p.id}`}
                className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: '#F8F5FA', color: '#6B2D82' }}
              >
                <CalendarIcon size={14} /> View Calendar
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}