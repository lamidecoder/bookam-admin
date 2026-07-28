'use client';
import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { deleteAllBookings, deleteAllProperties, errorMessage } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

function DangerAction({
  title, description, confirmWord, onConfirm,
}: {
  title: string;
  description: string;
  confirmWord: string;
  onConfirm: () => Promise<void>;
}) {
  const [typed, setTyped] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const canProceed = typed.trim().toUpperCase() === confirmWord;

  async function handleClick() {
    if (!canProceed) return;
    setLoading(true);
    try {
      await onConfirm();
      showToast(`${title} — done.`, 'success');
      setTyped('');
    } catch (e) {
      showToast(errorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-red-200 rounded-xl p-5 bg-red-50/40">
      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <label className="block text-xs font-bold text-gray-500 mb-2">
        Type <span className="font-mono bg-white px-1.5 py-0.5 rounded border text-red-600">{confirmWord}</span> to confirm
      </label>
      <div className="flex items-center gap-3">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={confirmWord}
          className="flex-1 px-4 py-2.5 rounded-lg bg-white border border-gray-200 text-sm font-mono"
        />
        <button
          onClick={handleClick}
          disabled={!canProceed || loading}
          className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
          style={{ backgroundColor: '#D94F4F' }}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : null}
          {loading ? 'Deleting…' : title}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Platform-level configuration and maintenance.</p>
      </div>

      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#F0EBF8' }}>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} className="text-red-500" />
          <h3 className="text-lg font-bold text-red-600">Danger Zone</h3>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          These actions are permanent and cannot be undone. Intended for clearing out test data
          before launch — not something to use once real guests have made real bookings.
        </p>

        <div className="space-y-4">
          <DangerAction
            title="Delete All Bookings"
            description="Permanently removes every booking on the platform, upcoming and past. Properties themselves are not affected."
            confirmWord="DELETE BOOKINGS"
            onConfirm={deleteAllBookings}
          />
          <DangerAction
            title="Delete All Properties"
            description="Permanently removes every property on the platform, and every booking tied to them (a property can't be deleted while bookings still reference it)."
            confirmWord="DELETE PROPERTIES"
            onConfirm={deleteAllProperties}
          />
        </div>

        <p className="text-xs text-gray-400 mt-6">
          To remove a single property instead, use the delete option on that property&apos;s page in{' '}
          <a href="/dashboard/properties" className="underline" style={{ color: '#6B2D82' }}>Properties</a> —
          it will correctly refuse if that property has any bookings on record, protecting real booking history.
        </p>
      </div>
    </div>
  );
}