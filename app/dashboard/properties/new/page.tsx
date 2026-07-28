'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, UploadCloud, Loader2, X } from 'lucide-react';
import { createProperty, errorMessage } from '@/lib/api';
import { uploadToCloudinary, CLOUDINARY_CONFIGURED } from '@/lib/cloudinary';

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
  const [verified, setVerified] = useState(false);
  const [cautionFee, setCautionFee] = useState(0);
  const [amenities, setAmenities] = useState<string[]>(['WiFi']);
  const [houseRules, setHouseRules] = useState<string[]>(['No smoking inside', 'Check in after 2:00 PM']);
  const [images, setImages] = useState<{ url: string; uploading: boolean }[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleAmenity = (a: string) =>
    setAmenities((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));
  const removeRule = (i: number) => setHouseRules((cur) => cur.filter((_, idx) => idx !== i));
  const updateRule = (i: number, value: string) =>
    setHouseRules((cur) => cur.map((r, idx) => (idx === i ? value : r)));
  const removeImage = (i: number) => setImages((cur) => cur.filter((_, idx) => idx !== i));
  const setAsMain = (i: number) =>
    setImages((cur) => {
      if (i === 0) return cur;
      const picked = cur[i];
      const rest = cur.filter((_, idx) => idx !== i);
      return [picked, ...rest];
    });

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const placeholders = fileArray.map((f) => ({ url: URL.createObjectURL(f), uploading: true }));
    setImages((cur) => [...cur, ...placeholders]);
    const startIndex = images.length;

    for (let i = 0; i < fileArray.length; i++) {
      try {
        const hostedUrl = await uploadToCloudinary(fileArray[i]);
        setImages((cur) => cur.map((img, idx) => (idx === startIndex + i ? { url: hostedUrl, uploading: false } : img)));
      } catch (e) {
        setErrorMsg(errorMessage(e));
        setImages((cur) => cur.filter((_, idx) => idx !== startIndex + i));
      }
    }
  }

  function addImageUrl() {
    const url = urlInput.trim();
    if (!url) return;
    setImages((cur) => [...cur, { url, uploading: false }]);
    setUrlInput('');
  }

  async function handleSubmit() {
    if (!name.trim() || !area.trim() || !pricePerNight) {
      setErrorMsg('Name, area, and nightly rate are required.');
      return;
    }
    if (images.some((img) => img.uploading)) {
      setErrorMsg('Please wait for photo uploads to finish before saving.');
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
        caution_fee: cautionFee,
        images: images.map((img) => img.url),
        verified,
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
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/properties" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Property</h1>
            <p className="text-sm text-gray-500">Fill in all required details to list this space on Bookam.</p>
          </div>
        </div>
        <button
          onClick={() => setVerified((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: verified ? '#FFF8E7' : '#F5F5F5' }}
        >
          <span className="text-xs font-semibold" style={{ color: verified ? '#C9A84C' : '#6B6478' }}>
            {verified ? '✓ Verified' : 'Mark as Verified'}
          </span>
          <span
            className="w-9 h-5 rounded-full relative transition-colors"
            style={{ backgroundColor: verified ? '#C9A84C' : '#D1D5DB' }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: verified ? 18 : 2 }}
            />
          </span>
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl p-4 text-sm mb-6" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: '#6B2D82' }}>Basic Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="mt-4">
              <label className="block text-xs font-bold text-gray-500 mb-2">REFUNDABLE CAUTION FEE (₦)</label>
              <input
                type="number"
                value={cautionFee}
                onChange={(e) => setCautionFee(Number(e.target.value))}
                placeholder="0"
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Refunded after checkout if the property is undamaged.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: '#6B2D82' }}>Amenities</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={rule}
                    onChange={(e) => updateRule(i, e.target.value)}
                    className="flex-1 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700"
                  />
                  <button onClick={() => removeRule(i)} className="flex-shrink-0"><Trash2 size={15} className="text-red-400" /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setHouseRules((r) => [...r, 'New house rule'])} className="mt-3 flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#6B2D82' }}>
              <Plus size={15} /> Add Rule
            </button>
          </div>

          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: '#6B2D82' }}>Photos</h3>
            <p className="text-xs text-gray-400 mb-5">The first photo becomes the main listing photo guests see first.</p>

            {!CLOUDINARY_CONFIGURED && (
              <div className="rounded-lg p-3 text-xs mb-4" style={{ backgroundColor: '#FFFBEB', color: '#92600F' }}>
                Cloudinary isn&apos;t connected yet — uploads will fail until real credentials are added.
              </div>
            )}

            <label className="block border-2 border-dashed rounded-xl py-8 flex flex-col items-center justify-center cursor-pointer" style={{ borderColor: '#E0D2EE' }}>
              <UploadCloud size={22} style={{ color: '#6B2D82' }} />
              <p className="font-semibold mt-2 text-sm" style={{ color: '#6B2D82' }}>Click to upload photos</p>
              <p className="text-xs text-gray-400 mt-1">or drag and drop — JPG, PNG, up to 10 photos</p>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border group" style={{ borderColor: '#F0EBF8' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    {img.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
                        <Loader2 size={18} className="animate-spin" style={{ color: '#6B2D82' }} />
                      </div>
                    )}
                    {!img.uploading && (
                      <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                        <X size={12} className="text-white" />
                      </button>
                    )}
                    {i === 0 && !img.uploading && (
                      <span className="absolute bottom-1 left-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#6B2D82', color: 'white' }}>MAIN</span>
                    )}
                    {i !== 0 && !img.uploading && (
                      <button
                        onClick={() => setAsMain(i)}
                        className="absolute bottom-1 left-1 right-1 text-[10px] font-semibold py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: 'white' }}
                      >
                        Set as Main
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t flex items-center gap-2" style={{ borderColor: '#F0EBF8' }}>
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl(); } }}
                placeholder="Or paste an image URL"
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm"
              />
              <button onClick={addImageUrl} className="px-4 py-2.5 rounded-lg text-sm font-semibold border flex-shrink-0" style={{ borderColor: '#6B2D82', color: '#6B2D82' }}>
                Add
              </button>
            </div>

            <div className="mt-5 pt-4 border-t" style={{ borderColor: '#F0EBF8' }}>
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