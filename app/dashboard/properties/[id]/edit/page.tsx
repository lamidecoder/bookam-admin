'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Ban, CheckCircle2 } from 'lucide-react';
import { getPropertyById, updateProperty, setPropertyActive, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const confirmAction = useConfirm();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [verified, setVerified] = useState(false);

  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerNight, setPricePerNight] = useState('');
  const [minStay, setMinStay] = useState(1);
  const [cancellationFeePercent, setCancellationFeePercent] = useState(15);

  useEffect(() => {
    getPropertyById(id)
      .then((p) => {
        setName(p.name);
        setArea(p.area);
        setDescription(p.description || '');
        setPricePerNight(String(p.price_per_night));
        setMinStay(p.min_stay || 1);
        setCancellationFeePercent(p.cancellation_fee_percent || 15);
        setActive(p.active);
        setVerified(p.verified);
      })
      .catch((e) => setErrorMsg(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const [saved, setSaved] = useState(false);

  async function saveChanges() {
    if (cancellationFeePercent <= 0) {
      setErrorMsg('Cancellation fee cannot be zero — every booking on this platform requires one.');
      return;
    }
    setSaving(true);
    setSaved(false);
    setErrorMsg(null);
    try {
      await updateProperty(id, {
        name,
        area,
        description,
        price_per_night: Number(pricePerNight.replace(/,/g, '')),
        min_stay: minStay,
        cancellation_fee_percent: cancellationFeePercent,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setErrorMsg(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    const next = !active;
    if (!next) {
      const ok = await confirmAction({
        title: 'Deactivate this property?',
        message: 'It will be removed from guest search immediately, but not deleted. You can reactivate it any time.',
        confirmLabel: 'Deactivate',
        destructive: true,
      });
      if (!ok) return;
    }
    try {
      await setPropertyActive(id, next);
      setActive(next);
      showToast(next ? 'Property reactivated.' : 'Property deactivated.', 'success');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }

  async function toggleVerified() {
    const next = !verified;
    try {
      await updateProperty(id, { verified: next });
      setVerified(next);
      showToast(next ? 'Property marked as verified.' : 'Verification removed.', 'success');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }

  if (loading) return <p className="text-center text-gray-400 py-24">Loading property…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/properties')} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Property</h1>
        </div>
        {verified && (
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ backgroundColor: '#FFF8E7', color: '#C9A84C' }}>
            ✓ Verified
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-xl p-4 text-sm mb-6" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
          {errorMsg}
        </div>
      )}
      {saved && (
        <div className="rounded-xl p-4 text-sm mb-6" style={{ backgroundColor: '#F0FDF6', color: '#2E9E6B' }}>
          ✓ Saved successfully.
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: '#6B2D82' }}>General Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">PROPERTY NAME</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">AREA</label>
                <input value={area} onChange={(e) => setArea(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-bold text-gray-500 mb-2">DESCRIPTION</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm resize-none" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: '#6B2D82' }}>Pricing &amp; Policy</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">PRICE PER NIGHT (₦)</label>
                <input value={pricePerNight} onChange={(e) => setPricePerNight(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">MIN STAY (NIGHTS)</label>
                <input type="number" value={minStay} onChange={(e) => setMinStay(Number(e.target.value))} className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">CANCELLATION FEE (%)</label>
                <input type="number" value={cancellationFeePercent} onChange={(e) => setCancellationFeePercent(Number(e.target.value))} className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              For weekend pricing and special-date overrides, use the <a href="/dashboard/pricing" className="underline" style={{ color: '#6B2D82' }}>Pricing Control</a> page.
            </p>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-2xl border p-5 sticky top-6 space-y-3" style={{ borderColor: '#F0EBF8' }}>
            <button onClick={saveChanges} disabled={saving} className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: saved ? '#2E9E6B' : '#6B2D82' }}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
            </button>
            <button onClick={() => router.push('/dashboard/properties')} className="w-full py-3 rounded-xl text-sm font-semibold border" style={{ color: '#6B2D82', borderColor: '#6B2D82' }}>
              Discard Changes
            </button>
            <div className="h-px bg-gray-100 my-2" />
            <button
              onClick={toggleVerified}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border"
              style={{ color: '#C9A84C', borderColor: '#C9A84C' }}
            >
              {verified ? 'Remove Verification' : '✓ Mark as Verified'}
            </button>
            <button
              onClick={toggleActive}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: active ? '#D94F4F' : '#2E9E6B' }}
            >
              {active ? <Ban size={16} /> : <CheckCircle2 size={16} />}
              {active ? 'Deactivate Property' : 'Reactivate Property'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              {active
                ? 'Removes this property from guest search immediately. Can be reactivated any time.'
                : 'This property is currently hidden from guest search.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}