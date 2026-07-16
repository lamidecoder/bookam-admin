'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Ban, CheckCircle2, UploadCloud, Loader2, X } from 'lucide-react';
import { getPropertyById, updateProperty, setPropertyActive, errorMessage } from '@/lib/api';
import { uploadToCloudinary, CLOUDINARY_CONFIGURED } from '@/lib/cloudinary';
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
  const [images, setImages] = useState<{ url: string; uploading: boolean }[]>([]);
  const [urlInput, setUrlInput] = useState('');

  const removeImage = (i: number) => setImages((cur) => cur.filter((_, idx) => idx !== i));

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
        setImages((p.images || []).map((url) => ({ url, uploading: false })));
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
    if (images.some((img) => img.uploading)) {
      setErrorMsg('Please wait for photo uploads to finish before saving.');
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
        images: images.map((img) => img.url),
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: '#6B2D82' }}>General Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: '#6B2D82' }}>Photos</h3>
            <p className="text-xs text-gray-400 mb-5">The first photo is the main listing photo guests see first.</p>

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
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border" style={{ borderColor: '#F0EBF8' }}>
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