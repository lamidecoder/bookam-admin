'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Ban, CheckCircle2, UploadCloud, Loader2, X, Plus, Trash2, Star } from 'lucide-react';
import { getPropertyById, updateProperty, setPropertyActive, getAllGuests, getReviewsForProperty, addReview, deleteReview, errorMessage, type GuestRow, type ReviewRow } from '@/lib/api';
import { uploadToCloudinary, CLOUDINARY_CONFIGURED } from '@/lib/cloudinary';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmProvider';

const AMENITY_OPTIONS = ['WiFi', 'Parking', 'Pool', 'Generator', 'AC', 'TV', 'Kitchen', 'Security', 'Laundry'];

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
  const [cautionFee, setCautionFee] = useState(0);
  const [images, setImages] = useState<{ url: string; uploading: boolean }[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [houseRules, setHouseRules] = useState<string[]>([]);

  const toggleAmenity = (a: string) =>
    setAmenities((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));
  const removeRule = (i: number) => setHouseRules((cur) => cur.filter((_, idx) => idx !== i));
  const updateRule = (i: number, value: string) =>
    setHouseRules((cur) => cur.map((r, idx) => (idx === i ? value : r)));
  const [urlInput, setUrlInput] = useState('');
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [manualRating, setManualRating] = useState('');
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [newReviewGuestId, setNewReviewGuestId] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewBody, setNewReviewBody] = useState('');
  const [addingReview, setAddingReview] = useState(false);

  function loadReviews() {
    getReviewsForProperty(id).then(setReviews).catch(() => {});
  }

  async function handleAddReview() {
    if (!newReviewGuestId) {
      setErrorMsg('Choose which guest this review is from.');
      return;
    }
    if (!newReviewBody.trim()) {
      setErrorMsg('Enter the review text.');
      return;
    }
    setAddingReview(true);
    try {
      await addReview(id, newReviewGuestId, newReviewRating, newReviewBody.trim());
      setNewReviewGuestId('');
      setNewReviewRating(5);
      setNewReviewBody('');
      loadReviews();
    } catch (e) {
      setErrorMsg(errorMessage(e));
    } finally {
      setAddingReview(false);
    }
  }

  async function handleDeleteReview(reviewId: string) {
    const ok = await confirmAction({
      title: 'Delete this review?',
      message: 'This cannot be undone, and will recalculate the property\'s average rating.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteReview(reviewId, id);
      loadReviews();
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }

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

  useEffect(() => {
    getPropertyById(id)
      .then((p) => {
        setName(p.name);
        setArea(p.area);
        setDescription(p.description || '');
        setPricePerNight(String(p.price_per_night));
        setCautionFee(p.caution_fee || 0);
        setActive(p.active);
        setVerified(p.verified);
        setImages((p.images || []).map((url) => ({ url, uploading: false })));
        setAmenities(p.amenities || []);
        setHouseRules(p.house_rules || []);
        setManualRating(p.rating != null ? String(p.rating) : '');
      })
      .catch((e) => setErrorMsg(e.message))
      .finally(() => setLoading(false));
    loadReviews();
    getAllGuests().then(setGuests).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only load, loadReviews is redefined each render but only needs to run when id changes
  }, [id]);

  const [saved, setSaved] = useState(false);

  async function saveChanges() {
    if (images.some((img) => img.uploading)) {
      setErrorMsg('Please wait for photo uploads to finish before saving.');
      return;
    }
    const ratingValue = Number(manualRating);
    if (manualRating && (isNaN(ratingValue) || ratingValue < 0 || ratingValue > 5)) {
      setErrorMsg('Star rating must be between 0 and 5, e.g. 4.5.');
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
        caution_fee: cautionFee,
        images: images.map((img) => img.url),
        amenities,
        house_rules: houseRules,
        ...(manualRating ? { rating: Math.round(ratingValue * 10) / 10 } : {}),
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
            <h3 className="text-lg font-bold mb-5" style={{ color: '#6B2D82' }}>Pricing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">PRICE PER NIGHT (₦)</label>
                <input value={pricePerNight} onChange={(e) => setPricePerNight(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">REFUNDABLE CAUTION FEE (₦)</label>
                <input type="number" value={cautionFee} onChange={(e) => setCautionFee(Number(e.target.value))} placeholder="0" className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
                <p className="text-xs text-gray-400 mt-1">Refunded after checkout if the property is undamaged.</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              For weekend pricing and special-date overrides, use the <a href="/dashboard/pricing" className="underline" style={{ color: '#6B2D82' }}>Pricing Control</a> page.
            </p>
          </div>

          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold mb-5" style={{ color: '#6B2D82' }}>Amenities</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {AMENITY_OPTIONS.map((a) => {
                const isActive = amenities.includes(a);
                return (
                  <button
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    className="py-3 rounded-lg text-sm font-medium border"
                    style={isActive ? { backgroundColor: '#F0E6FA', color: '#6B2D82', borderColor: '#E0D2EE' } : { backgroundColor: 'white', color: '#6B6478', borderColor: '#F0EBF8' }}
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
              {houseRules.length === 0 && (
                <p className="text-sm text-gray-400">No house rules yet.</p>
              )}
            </div>
            <button onClick={() => setHouseRules((r) => [...r, 'New house rule'])} className="mt-3 flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#6B2D82' }}>
              <Plus size={15} /> Add Rule
            </button>
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
          </div>

          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: '#6B2D82' }}>Reviews</h3>
            <p className="text-xs text-gray-400 mb-5">
              Add a review on behalf of a guest who&apos;s actually stayed here. The property&apos;s star rating updates automatically.
            </p>

            <div className="p-4 rounded-lg mb-5" style={{ backgroundColor: '#FAF8FC' }}>
              <label className="block text-xs font-bold text-gray-500 mb-2">STAR RATING (SHOWN ON THE APP)</label>
              <div className="relative">
                <Star size={15} fill="#F5A623" style={{ color: '#F5A623', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={manualRating}
                  onChange={(e) => setManualRating(e.target.value)}
                  placeholder="e.g. 4.5"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white border border-gray-200 text-sm"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Saves together with the rest of this page — no separate save needed. Adding or deleting a review below recalculates this automatically from real review data, which will overwrite a manually-set number.
              </p>
            </div>

            {reviews.length === 0 ? (
              <p className="text-sm text-gray-400 mb-5">No reviews yet for this property.</p>
            ) : (
              <div className="space-y-3 mb-5">
                {reviews.map((r) => (
                  <div key={r.id} className="p-3 rounded-lg" style={{ backgroundColor: '#FAF8FC' }}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{r.profiles?.full_name ?? 'Guest'}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={12} fill={i < r.rating ? '#F5A623' : 'none'} style={{ color: '#F5A623' }} />
                          ))}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteReview(r.id)} className="flex-shrink-0"><Trash2 size={14} className="text-red-400" /></button>
                    </div>
                    <p className="text-sm text-gray-600">{r.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4" style={{ borderColor: '#F0EBF8' }}>
              <p className="text-xs font-bold text-gray-500 mb-3">ADD A REVIEW</p>
              <label className="block text-xs text-gray-500 mb-1">Guest</label>
              <select
                value={newReviewGuestId}
                onChange={(e) => setNewReviewGuestId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm mb-3"
              >
                <option value="">Select a guest…</option>
                {guests.map((g) => (
                  <option key={g.id} value={g.id}>{g.full_name} ({g.email})</option>
                ))}
              </select>

              <label className="block text-xs text-gray-500 mb-1">Rating</label>
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button key={i} onClick={() => setNewReviewRating(i + 1)}>
                    <Star size={22} fill={i < newReviewRating ? '#F5A623' : 'none'} style={{ color: '#F5A623' }} />
                  </button>
                ))}
              </div>

              <label className="block text-xs text-gray-500 mb-1">Review</label>
              <textarea
                value={newReviewBody}
                onChange={(e) => setNewReviewBody(e.target.value)}
                placeholder="Great stay, very clean and well located..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm mb-4 resize-none"
              />

              <button
                onClick={handleAddReview}
                disabled={addingReview}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold disabled:opacity-60"
                style={{ borderColor: '#6B2D82', color: '#6B2D82' }}
              >
                <Plus size={16} /> {addingReview ? 'Adding…' : 'Add Review'}
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