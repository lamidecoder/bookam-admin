'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Mail, AlertTriangle, X } from 'lucide-react';
import { getGuestProfile, getGuestBookings, suspendGuest, reactivateGuest, errorMessage, type DbProfile, type DbBooking } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/ToastProvider';

function SuspendModal({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const [ack, setAck] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="text-xl font-bold text-gray-900">Suspend Guest Account</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="px-6 space-y-4">
          <div className="flex gap-3 p-4 rounded-xl text-white" style={{ backgroundColor: '#D94F4F' }}>
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm">This guest will be unable to make new bookings or log into their account immediately.</p>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F0E6FA' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#6B2D82' }}>
              {name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <p className="font-semibold text-gray-900">{name}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">SUSPENSION REASON</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
              <option value="">Select reason</option>
              <option>Fraudulent activity</option>
              <option>Repeated cancellations</option>
              <option>Abusive behaviour</option>
              <option>Payment dispute</option>
            </select>
          </div>
          <label className="flex items-start gap-3 text-sm text-gray-700 border rounded-xl p-3" style={{ borderColor: '#F0EBF8' }}>
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
            I understand this restricts the guest&apos;s access immediately.
          </label>
        </div>
        <div className="flex items-center justify-between p-6 mt-2">
          <button onClick={onClose} className="text-sm font-semibold" style={{ color: '#6B2D82' }}>Cancel</button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!ack || !reason}
            className="px-6 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: '#D94F4F' }}
          >
            Confirm Suspension
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GuestProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSuspend, setShowSuspend] = useState(false);

  function load() {
    setLoadError(null);
    Promise.all([getGuestProfile(id), getGuestBookings(id)])
      .then(([p, b]) => {
        setProfile(p);
        setBookings(b);
      })
      .catch((e) => setLoadError(errorMessage(e)))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount; repo has no Suspense/use() data layer yet
  useEffect(load, [id]);

  async function confirmSuspend(reason: string) {
    try {
      await suspendGuest(id, reason);
      setShowSuspend(false);
      load();
      showToast('Guest account suspended.', 'success');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }

  async function handleReactivate() {
    try {
      await reactivateGuest(id);
      load();
      showToast('Guest account reactivated.', 'success');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    }
  }

  if (loading) return <p className="text-center text-gray-400 py-24">Loading guest…</p>;
  if (loadError) {
    return (
      <div className="rounded-xl p-4 text-sm m-6" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
        Couldn&apos;t load this guest: {loadError}
      </div>
    );
  }
  if (!profile) return <p className="text-center text-gray-400 py-24">Guest not found.</p>;

  const totalSpent = bookings
    .filter((b) => b.status === 'completed' || b.status === 'confirmed')
    .reduce((s, b) => s + Number(b.total), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/users')} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></button>
          <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
          <StatusBadge status={profile.status} />
        </div>
        {profile.status === 'suspended' ? (
          <button onClick={handleReactivate} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: '#2E9E6B' }}>
            Reactivate Account
          </button>
        ) : (
          <button onClick={() => setShowSuspend(true)} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: '#D94F4F' }}>
            Suspend Account
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border p-5 text-center" style={{ borderColor: '#F0EBF8' }}>
            <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: '#6B2D82' }}>
              {profile.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
            </div>
            <h2 className="font-bold text-gray-900">{profile.full_name}</h2>
            <p className="text-xs text-gray-400 mb-4">
              Profile last updated {new Date(profile.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <div className="h-px bg-gray-100 mb-4" />
            <div className="text-left space-y-2 text-sm text-gray-600">
              <p className="flex items-center gap-2"><Mail size={14} /> {profile.email}</p>
              <p className="flex items-center gap-2"><Phone size={14} /> {profile.phone || 'No phone on file'}</p>
            </div>
            {profile.suspension_reason && (
              <div className="mt-4 text-left text-xs rounded-lg p-3" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
                Suspended: {profile.suspension_reason}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#F0EBF8' }}>
            <p className="text-xs text-gray-400 mb-1">TOTAL SPENT</p>
            <p className="text-xl font-bold" style={{ color: '#6B2D82' }}>₦{totalSpent.toLocaleString()}</p>
          </div>
        </div>

        <div className="col-span-2">
          <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Booking History</h3>
            {bookings.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No bookings yet.</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Property</th>
                    <th className="pb-3 font-medium">Nights</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t" style={{ borderColor: '#F5F2F8' }}>
                      <td className="py-3 text-gray-700">{new Date(b.created_at).toLocaleDateString()}</td>
                      <td className="py-3 font-medium text-gray-900">{b.properties?.name}</td>
                      <td className="py-3 text-gray-700">{b.nights}</td>
                      <td className="py-3 font-semibold text-gray-900">₦{Number(b.total).toLocaleString()}</td>
                      <td className="py-3"><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSuspend && <SuspendModal name={profile.full_name} onClose={() => setShowSuspend(false)} onConfirm={confirmSuspend} />}
    </div>
  );
}