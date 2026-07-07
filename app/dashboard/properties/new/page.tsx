'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Minus, Trash2, UploadCloud } from 'lucide-react';
import { createProperty, errorMessage } from '@/lib/api';

const AMENITY_OPTIONS = ['WiFi', 'Parking', 'Pool', 'Generator', 'AC', 'TV', 'Kitchen', 'Security', 'Laundry'];

export default function AddPropertyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<'Hotel' | 'Shortlet' | 'Event Center'>('Shortlet');
  const [area, setArea] = useState('');
  const [location, setLocation] = useState('Lagos');
  const [description, setDescription] = useState('');
  const [pricePerNight, setPricePerNight] = useState('');
  const [serviceFee, setServiceFee] = useState('');
  const [minStay, setMinStay] = useState(1);
  const [cancellationFeePercent, setCancellationFeePercent] = useState(15);
  const [amenities, setAmenities] = useState<string[]>(['WiFi']);
  const [houseRules, setHouseRules] = useState<string[]>(['No smoking inside', 'Check in after 2:00 PM']);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleAmenity = (a: string) =>
    setAmenities((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));
  const removeRule = (i: number) => setHouseRules((cur) => cur.filter((_, idx) => idx !== i));

  async function handleSubmit() {
    if (!name.trim() || !area.trim() || !pricePerNight) {
      setErrorMsg('Name, area, and nightly rate are required.');
      return;
    }
    if (cancellationFeePercent <= 0) {
      setErrorMsg('Cancellation fee cannot be zero — every booking on this platform requires one.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      await createProperty({
        name,
        type,
        location: location || area,
        area,
        description,
        price_per_night: Number(pricePerNight.replace(/,/g, '')),
        service_fee: Number(serviceFee.replace(/,/g, '') || 0),
        amenities,
        house_rules: houseRules,
        min_stay: minStay,
        cancellation_fee_percent: cancellationFeePercent,
      });
      router.push('/dashboard/properties');
    } catch (e) {
      setErrorMsg(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/properties" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Property</h1>
          <p className="text-sm text-gray-500">Fill in all required details to list this space on Bookam.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl p-4 text-sm mb-6" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: '#6B2D82' }}>Basic Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">PROPERTY NAME</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Eko Atlantic Luxury Suite" className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">PROPERTY TYPE</label>
                <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                  <option>Hotel</option>
                  <option>Shortlet</option>
                  <option>Event Center</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">AREA (LAGOS)</label>
                <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Victoria Island" className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">FULL LOCATION</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Victoria Island, Lagos" className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-bold text-gray-500 mb-2">DESCRIPTION</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm resize-none" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: '#6B2D82' }}>Pricing</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">
                  {type === 'Event Center' ? 'FLAT RATE PER BOOKING (₦)' : 'NIGHTLY RATE (₦)'}
                </label>
                <input value={pricePerNight} onChange={(e) => setPricePerNight(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">SERVICE FEE (₦)</label>
                <input value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">MINIMUM STAY (NIGHTS)</label>
                <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <button onClick={() => setMinStay((n) => Math.max(1, n - 1))}><Minus size={14} className="text-gray-500" /></button>
                  <span className="font-semibold">{minStay}</span>
                  <button onClick={() => setMinStay((n) => n + 1)}><Plus size={14} className="text-gray-500" /></button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">CANCELLATION FEE (%)</label>
                <input
                  type="number"
                  value={cancellationFeePercent}
                  onChange={(e) => setCancellationFeePercent(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Cannot be zero — this fee is shown to guests on the property detail screen and booking summary before they pay.
            </p>
          </div>

          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: '#6B2D82' }}>Amenities</h3>
            <div className="grid grid-cols-3 gap-2">
              {AMENITY_OPTIONS.map((a) => {
                const active = amenities.includes(a);
                return (
                  <button
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    className="py-3 rounded-lg text-sm font-medium border"
                    style={active ? { backgroundColor: '#F0E6FA', color: '#6B2D82', borderColor: '#E0D2EE' } : { backgroundColor: 'white', color: '#6B6478', borderColor: '#F0EBF8' }}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: '#6B2D82' }}>House Rules</h3>
            <div className="space-y-2">
              {houseRules.map((rule, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-700">{rule}</span>
                  <button onClick={() => removeRule(i)}><Trash2 size={15} className="text-red-400" /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setHouseRules((r) => [...r, 'New house rule'])} className="mt-3 flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#6B2D82' }}>
              <Plus size={15} /> Add Rule
            </button>
          </div>

          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: '#6B2D82' }}>Photos &amp; Video</h3>
            <div className="border-2 border-dashed rounded-xl py-10 flex flex-col items-center justify-center" style={{ borderColor: '#E0D2EE' }}>
              <UploadCloud size={22} style={{ color: '#6B2D82' }} />
              <p className="font-semibold mt-2" style={{ color: '#6B2D82' }}>Click to upload up to 10 photos</p>
              <p className="text-xs text-gray-400 mt-1">Photo upload to Cloudinary isn&apos;t wired yet — see SETUP.md</p>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-bold text-gray-500 mb-2">VIDEO LINK (INSTAGRAM, TIKTOK, ETC.)</label>
              <input placeholder="https://instagram.com/reels/..." className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-2xl border p-5 sticky top-6" style={{ borderColor: '#F0EBF8' }}>
            <p className="font-semibold text-gray-900 mb-1">Before you publish</p>
            <p className="text-sm text-gray-500 mb-4">
              Properties are reviewed and approved offline before going live. The verified badge appears automatically once active.
            </p>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: '#6B2D82' }}
            >
              {saving ? 'Saving…' : 'Save Property'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
