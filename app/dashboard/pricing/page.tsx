'use client';
import { useEffect, useState, useCallback } from 'react';
import { DollarSign, Calendar, Plus, Trash2, Loader2, AlertTriangle, TrendingUp, TrendingDown, Clock, History } from 'lucide-react';
import {
  getAllProperties,
  updatePricing,
  getSpecialRates,
  addSpecialRate,
  deleteSpecialRate,
  logPricingChange,
  getPricingHistory,
  getMonthlyRevenue,
  errorMessage,
  type DbProperty,
  type PricingHistoryEntry,
} from '@/lib/api';
import { useConfirm } from '@/components/ConfirmProvider';
import { useToast } from '@/components/ToastProvider';

type SpecialRate = {
  id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  rate: number;
  reason: string | null;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function PricingPage() {
  const confirmAction = useConfirm();
  const { showToast } = useToast();

  const [properties, setProperties] = useState<DbProperty[]>([]);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [pricePerNight, setPricePerNight] = useState('');
  const [minStay, setMinStay] = useState(1);
  const [cancellationFeePercent, setCancellationFeePercent] = useState('');
  const [weekendEnabled, setWeekendEnabled] = useState(false);
  const [weekendRate, setWeekendRate] = useState('');

  const [specialRates, setSpecialRates] = useState<SpecialRate[]>([]);
  const [specialRatesError, setSpecialRatesError] = useState<string | null>(null);
  const [addingRate, setAddingRate] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newReason, setNewReason] = useState('');

  const [history, setHistory] = useState<PricingHistoryEntry[]>([]);
  const [revenue, setRevenue] = useState<{ thisMonth: number; lastMonth: number } | null>(null);

  useEffect(() => {
    getAllProperties()
      .then((data) => {
        setProperties(data);
        if (data.length) setPropertyId(data[0].id);
      })
      .catch((e) => setLoadError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const selectedProperty = properties.find((p) => p.id === propertyId);

  useEffect(() => {
    if (!selectedProperty) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount; repo has no Suspense/use() data layer yet
    setPricePerNight(String(selectedProperty.price_per_night ?? ''));
    setMinStay(selectedProperty.min_stay ?? 1);
    setCancellationFeePercent(String(selectedProperty.cancellation_fee_percent ?? 0));
    setWeekendEnabled(selectedProperty.weekend_enabled ?? false);
    setWeekendRate(selectedProperty.weekend_rate != null ? String(selectedProperty.weekend_rate) : '');
  }, [selectedProperty]);

  const loadSpecialRates = useCallback((forPropertyId: string) => {
    setSpecialRatesError(null);
    getSpecialRates(forPropertyId)
      .then((data) => setSpecialRates(data as SpecialRate[]))
      .catch((e) => setSpecialRatesError(errorMessage(e)));
  }, []);

  const loadSidebar = useCallback((forPropertyId: string) => {
    getPricingHistory(forPropertyId).then(setHistory).catch(() => setHistory([]));
    getMonthlyRevenue(forPropertyId).then(setRevenue).catch(() => setRevenue(null));
  }, []);

  useEffect(() => {
    if (!propertyId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount; repo has no Suspense/use() data layer yet
    loadSpecialRates(propertyId);
    loadSidebar(propertyId);
  }, [propertyId, loadSpecialRates, loadSidebar]);

  async function handleSavePricing() {
    if (!propertyId || !selectedProperty) return;
    const price = Number(pricePerNight);
    const fee = Number(cancellationFeePercent);
    if (!price || price <= 0) {
      showToast('Enter a valid base nightly rate.', 'error');
      return;
    }
    if (weekendEnabled && (!weekendRate || Number(weekendRate) <= 0)) {
      showToast('Enter a valid weekend rate, or turn weekend pricing off.', 'error');
      return;
    }

    setSaving(true);
    try {
      await updatePricing(propertyId, {
        price_per_night: price,
        weekend_enabled: weekendEnabled,
        weekend_rate: weekendEnabled ? Number(weekendRate) : null,
        min_stay: minStay || 1,
        cancellation_fee_percent: fee || 0,
      });
      setProperties((cur) =>
        cur.map((p) =>
          p.id === propertyId
            ? { ...p, price_per_night: price, weekend_enabled: weekendEnabled, weekend_rate: weekendEnabled ? Number(weekendRate) : null, min_stay: minStay || 1, cancellation_fee_percent: fee || 0 }
            : p
        )
      );
      const priceChanged = price !== selectedProperty.price_per_night;
      const weekendChanged = weekendEnabled !== selectedProperty.weekend_enabled || Number(weekendRate) !== selectedProperty.weekend_rate;
      if (priceChanged) {
        await logPricingChange(propertyId, 'base_rate', `Base rate updated to ₦${price.toLocaleString()}`);
      }
      if (weekendChanged) {
        await logPricingChange(propertyId, 'weekend_pricing', weekendEnabled ? `Weekend pricing enabled at ₦${Number(weekendRate).toLocaleString()}` : 'Weekend pricing disabled');
      }
      showToast('Pricing updated.', 'success');
      loadSidebar(propertyId);
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSpecialRate() {
    if (!propertyId) return;
    if (!newStartDate || !newEndDate) { showToast('Choose a start and end date.', 'error'); return; }
    if (new Date(newEndDate) < new Date(newStartDate)) { showToast('End date must be on or after the start date.', 'error'); return; }
    if (!newRate || Number(newRate) <= 0) { showToast('Enter a valid rate for this period.', 'error'); return; }

    setAddingRate(true);
    try {
      await addSpecialRate({
        property_id: propertyId,
        start_date: newStartDate,
        end_date: newEndDate,
        rate: Number(newRate),
        reason: newReason.trim() || undefined,
      });
      await logPricingChange(
        propertyId,
        'special_rate_added',
        `${newReason.trim() || 'Special rate'} added for ${fmtDate(newStartDate)} – ${fmtDate(newEndDate)}`
      );
      setNewStartDate(''); setNewEndDate(''); setNewRate(''); setNewReason('');
      showToast('Special rate added.', 'success');
      loadSpecialRates(propertyId);
      loadSidebar(propertyId);
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setAddingRate(false);
    }
  }

  async function handleDeleteSpecialRate(r: SpecialRate) {
    const ok = await confirmAction({
      title: 'Remove this special rate?',
      message: 'The property will fall back to its normal pricing for these dates.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok || !propertyId) return;

    try {
      await deleteSpecialRate(r.id);
      await logPricingChange(propertyId, 'special_rate_removed', `${r.reason || 'Special rate'} removed`);
      showToast('Special rate removed.', 'success');
      loadSpecialRates(propertyId);
      loadSidebar(propertyId);
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }

  const revenueChangePercent = revenue && revenue.lastMonth > 0
    ? ((revenue.thisMonth - revenue.lastMonth) / revenue.lastMonth) * 100
    : null;

  const nextSpecialRate = specialRates
    .filter((r) => new Date(r.start_date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pricing Control</h1>
          <p className="text-gray-500 mt-1">Set and manage nightly rates, weekend pricing and special date pricing for all properties.</p>
        </div>
        <button
          onClick={handleSavePricing}
          disabled={saving || !propertyId}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex-shrink-0"
          style={{ backgroundColor: '#6B2D82' }}
        >
          {saving ? 'Saving…' : 'Save All Changes'}
        </button>
      </div>

      <div className="rounded-xl p-4 mb-6 flex items-start gap-3 border-l-4" style={{ backgroundColor: '#FFFBEB', borderColor: '#E8922A' }}>
        <AlertTriangle size={18} style={{ color: '#E8922A' }} className="flex-shrink-0 mt-0.5" />
        <p className="text-sm" style={{ color: '#92600F' }}>
          <span className="font-semibold">Important:</span> Only set the platform price. Never enter the property owner&apos;s rate. Guests only see the platform price.
        </p>
      </div>

      {loadError && (
        <div className="rounded-xl p-4 text-sm mb-6" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
          Couldn&apos;t load properties: {loadError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={22} className="animate-spin" style={{ color: '#6B2D82' }} />
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed py-16 text-center text-gray-400" style={{ borderColor: '#F0EBF8' }}>
          No properties yet. Add a property first to set its pricing.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border p-5 mb-6" style={{ borderColor: '#F0EBF8' }}>
            <p className="text-xs font-bold text-gray-500 mb-3">SELECT PROPERTY</p>
            <div className="flex flex-wrap gap-2">
              {properties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPropertyId(p.id)}
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-colors"
                  style={
                    p.id === propertyId
                      ? { backgroundColor: '#6B2D82', color: '#FFFFFF' }
                      : { backgroundColor: '#F5F5F5', color: '#6B6478' }
                  }
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_320px] gap-5">
            {/* Base Pricing */}
            <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
              <div className="flex items-center gap-2 mb-5">
                <DollarSign size={18} style={{ color: '#6B2D82' }} />
                <h2 className="font-bold text-gray-900">Base Pricing</h2>
              </div>

              <label className="block text-sm text-gray-600 mb-2">Base Nightly Rate</label>
              <div className="relative mb-5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
                <input
                  type="number"
                  value={pricePerNight}
                  onChange={(e) => setPricePerNight(e.target.value)}
                  placeholder="85,000"
                  className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm"
                />
              </div>

              <div className="flex items-center justify-between mb-3">
                <label className="text-sm text-gray-600">Weekend Pricing</label>
                <button
                  onClick={() => setWeekendEnabled((v) => !v)}
                  className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
                  style={{ backgroundColor: weekendEnabled ? '#6B2D82' : '#E2DCEC' }}
                >
                  <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: weekendEnabled ? 22 : 2 }} />
                </button>
              </div>

              {weekendEnabled && (
                <div className="relative mb-5">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
                  <input
                    type="number"
                    value={weekendRate}
                    onChange={(e) => setWeekendRate(e.target.value)}
                    placeholder="105,000"
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm"
                  />
                </div>
              )}

              <label className="block text-sm text-gray-600 mb-2">Minimum Stay (Nights)</label>
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setMinStay((v) => Math.max(1, v - 1))}
                  className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 font-bold flex items-center justify-center flex-shrink-0"
                >
                  −
                </button>
                <div className="flex-1 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-center font-semibold">{minStay}</div>
                <button
                  onClick={() => setMinStay((v) => v + 1)}
                  className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 font-bold flex items-center justify-center flex-shrink-0"
                >
                  +
                </button>
              </div>

              <label className="block text-sm text-gray-600 mb-2 mt-4">Cancellation Fee (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={cancellationFeePercent}
                onChange={(e) => setCancellationFeePercent(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm mb-6"
              />

              <button
                onClick={handleSavePricing}
                disabled={saving}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                style={{ backgroundColor: '#6B2D82' }}
              >
                {saving ? 'Saving…' : 'Update Base Pricing'}
              </button>
            </div>

            {/* Special Date Pricing */}
            <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
              <div className="flex items-center gap-2 mb-5">
                <Calendar size={18} style={{ color: '#6B2D82' }} />
                <h2 className="font-bold text-gray-900">Special Date Pricing</h2>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Start Date</label>
                  <input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">End Date</label>
                  <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
                </div>
              </div>

              <label className="block text-sm text-gray-600 mb-2">Special Rate</label>
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₦</span>
                <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="Rate per night" className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
              </div>

              <label className="block text-sm text-gray-600 mb-2">Reason / Holiday Name</label>
              <input type="text" value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="e.g. Christmas Period" className="w-full px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm mb-5" />

              <button
                onClick={handleAddSpecialRate}
                disabled={addingRate}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold disabled:opacity-60 mb-6"
                style={{ borderColor: '#6B2D82', color: '#6B2D82' }}
              >
                <Plus size={16} /> {addingRate ? 'Adding…' : 'Add Special Rate'}
              </button>

              <div className="border-t pt-4" style={{ borderColor: '#F0EBF8' }}>
                <p className="text-xs font-bold text-gray-500 mb-3">ACTIVE SPECIAL RATES</p>
                {specialRatesError && (
                  <div className="rounded-lg p-3 text-sm mb-3" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>{specialRatesError}</div>
                )}
                {specialRates.length === 0 ? (
                  <p className="text-sm text-gray-400">No special rates set for this property.</p>
                ) : (
                  <div className="space-y-2">
                    {specialRates.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#FAF8FC' }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F0E6FA' }}>
                            <Calendar size={14} style={{ color: '#6B2D82' }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{r.reason || 'Special rate'}</p>
                            <p className="text-xs text-gray-500">{fmtDate(r.start_date)} – {fmtDate(r.end_date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm font-semibold text-gray-900">₦{Number(r.rate).toLocaleString()}</span>
                          <button onClick={() => handleDeleteSpecialRate(r)} className="text-gray-400 hover:text-red-500">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#F0EBF8' }}>
                <h3 className="font-bold text-gray-900 mb-4">Pricing Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Base Nightly Rate</span>
                    <span className="font-semibold text-gray-900">₦{Number(pricePerNight || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Weekend Rate</span>
                    <span className="font-semibold text-gray-900">{weekendEnabled ? `₦${Number(weekendRate || 0).toLocaleString()}` : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Min Stay</span>
                    <span className="font-semibold text-gray-900">{minStay} Night{minStay !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Special Dates Active</span>
                    <span className="font-semibold" style={{ color: '#6B2D82' }}>{specialRates.length} Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Next Special Rate</span>
                    <span className="font-semibold text-gray-900">{nextSpecialRate ? fmtDate(nextSpecialRate.start_date) : '—'}</span>
                  </div>
                </div>

                <div className="mt-5 p-4 rounded-xl" style={{ backgroundColor: '#F5F0FA' }}>
                  <p className="text-xs text-gray-500 mb-1">This Month&apos;s Revenue</p>
                  <p className="text-2xl font-bold" style={{ color: '#6B2D82' }}>
                    {revenue ? `₦${revenue.thisMonth.toLocaleString()}` : '—'}
                  </p>
                  {revenueChangePercent !== null && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: revenueChangePercent >= 0 ? '#2E9E6B' : '#D94F4F' }}>
                      {revenueChangePercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {revenueChangePercent >= 0 ? '+' : ''}{revenueChangePercent.toFixed(1)}% vs last month
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#F0EBF8' }}>
                <div className="flex items-center gap-2 mb-4">
                  <History size={16} style={{ color: '#6B2D82' }} />
                  <h3 className="font-bold text-gray-900">Pricing History</h3>
                </div>
                {history.length === 0 ? (
                  <p className="text-sm text-gray-400">No changes logged yet for this property.</p>
                ) : (
                  <div className="space-y-3">
                    {history.slice(0, 4).map((h) => (
                      <div key={h.id} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#F5F5F5' }}>
                          <Clock size={12} className="text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900">{h.description}</p>
                          <p className="text-xs text-gray-400">{timeAgo(h.created_at)}{h.changed_by_name ? ` · ${h.changed_by_name}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}