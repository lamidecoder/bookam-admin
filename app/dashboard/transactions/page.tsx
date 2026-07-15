'use client';
import { useEffect, useState } from 'react';
import { Upload, Search, Eye, RotateCcw, X, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { getTransactions, processRefund, errorMessage, type DbBooking } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { StatusBadge } from '@/components/StatusBadge';

type Txn = DbBooking;

function RefundModal({ txn, onClose, onDone }: { txn: Txn; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('Guest requested cancellation (Policy compliant)');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);

  // refundAmount cannot exceed the original payment, per spec
  const [refundAmount, setRefundAmount] = useState(String(txn.total));

  async function confirm() {
    setSubmitting(true);
    try {
      const res = await processRefund({
        bookingId: txn.id,
        paystackRef: txn.paystack_ref || '',
        refundAmount: Math.min(Number(refundAmount), txn.total),
        reason,
      });
      setResult({ success: res.success, message: res.message });
      if (res.success) setTimeout(onDone, 1200);
    } catch (e) {
      setResult({ success: false, message: errorMessage(e) });
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: result.success ? '#F0FDF6' : '#FEF2F2' }}>
            {result.success ? <CheckCircle2 size={28} style={{ color: '#2E9E6B' }} /> : <XCircle size={28} style={{ color: '#D94F4F' }} />}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{result.success ? 'Refund Processed Successfully' : 'Refund Failed'}</h3>
          <p className="text-sm text-gray-500 mb-5">{result.message || (result.success ? 'The refund went through Paystack.' : 'No money has been moved.')}</p>
          {!result.success && (
            <button onClick={() => setResult(null)} className="w-full py-3 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: '#6B2D82' }}>Retry</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="text-xl font-bold text-gray-900">Process Refund</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="px-6 space-y-4">
          <div className="rounded-xl p-4 grid grid-cols-2 gap-3 text-sm" style={{ backgroundColor: '#F0E6FA' }}>
            <div><p className="text-xs text-gray-500">GUEST</p><p className="font-semibold">{txn.profiles?.full_name}</p></div>
            <div className="text-right"><p className="text-xs text-gray-500">AMOUNT PAID</p><p className="font-bold" style={{ color: '#6B2D82' }}>₦{Number(txn.total).toLocaleString()}</p></div>
          </div>

          <div className="flex gap-2 p-3 rounded-lg" style={{ backgroundColor: '#FFFBEB' }}>
            <AlertTriangle size={16} style={{ color: '#E8922A' }} className="flex-shrink-0 mt-0.5" />
            <p className="text-sm" style={{ color: '#92660E' }}>Refunds are processed directly through Paystack and cannot be undone once confirmed.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">REFUND AMOUNT (₦) — CANNOT EXCEED ₦{Number(txn.total).toLocaleString()}</label>
            <input
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">REFUND REASON</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
              <option>Guest requested cancellation (Policy compliant)</option>
              <option>Property unavailable</option>
              <option>Duplicate payment</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between p-6 mt-2">
          <button onClick={onClose} className="text-sm font-semibold" style={{ color: '#6B2D82' }}>Cancel</button>
          <button
            onClick={confirm}
            disabled={submitting || Number(refundAmount) > txn.total || Number(refundAmount) <= 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: '#D94F4F' }}
          >
            <RotateCcw size={16} /> {submitting ? 'Processing…' : 'Proceed with Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<Txn | null>(null);

  function load() {
    setLoadError(null);
    getTransactions()
      .then(setTransactions)
      .catch((e) => setLoadError(errorMessage(e)))
      .finally(() => setLoading(false));
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount; repo has no Suspense/use() data layer yet
  useEffect(load, []);

  const filtered = transactions.filter((t) =>
    `${t.profiles?.full_name ?? ''} ${t.properties?.name ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  function handleExport() {
    downloadCsv(
      `bookam-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((t) => ({
        date: new Date(t.created_at).toLocaleDateString('en-GB'),
        guest_name: t.profiles?.full_name ?? '',
        property: t.properties?.name ?? '',
        amount: Number(t.total),
        payment_method: 'Paystack',
        paystack_ref: t.paystack_ref ?? '',
        status: t.status,
      }))
    );
  }

  const totalRevenue = transactions.filter((t) => t.status !== 'cancelled').reduce((s, t) => s + Number(t.total), 0);
  const refundCount = transactions.filter((t) => t.status === 'cancelled').length;
  const refundTotal = transactions.filter((t) => t.status === 'cancelled').reduce((s, t) => s + Number(t.cancellation_fee ? t.total - t.cancellation_fee : t.total), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500 mt-1">Every payment that has gone through the platform via Paystack.</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold text-gray-700" style={{ borderColor: '#F0EBF8' }}>
          <Upload size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#F0EBF8' }}>
          <p className="text-2xl font-bold text-gray-900">₦{totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Total Revenue</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#F0EBF8' }}>
          <p className="text-2xl font-bold text-gray-900">{refundCount}</p>
          <p className="text-sm text-gray-500 mt-1">Refunds Processed</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#F0EBF8' }}>
          <p className="text-2xl font-bold text-gray-900">₦{refundTotal.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Total Refunded</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border mb-6 flex items-center gap-3" style={{ borderColor: '#F0EBF8' }}>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guest or property..." className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-sm" />
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl p-4 text-sm mb-6" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
          Couldn&apos;t load transactions: {loadError}
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-16">Loading transactions…</p>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed py-16 text-center text-gray-400" style={{ borderColor: '#F0EBF8' }}>
          No transactions yet — they appear here the moment a guest pays.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#F0EBF8' }}>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#FAF8FC' }}>
                {['DATE', 'GUEST NAME', 'PROPERTY', 'AMOUNT', 'PAYMENT METHOD', 'PAYSTACK REF', 'STATUS', 'ACTIONS'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold" style={{ color: '#6B2D82' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id} className="border-t" style={{ borderColor: '#F5F2F8', backgroundColor: i % 2 ? '#FFFCF8' : '#FFFFFF' }}>
                  <td className="px-5 py-4 text-gray-700">{new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-5 py-4 font-medium text-gray-900">{t.profiles?.full_name}</td>
                  <td className="px-5 py-4 text-gray-700">{t.properties?.name}</td>
                  <td className="px-5 py-4 font-semibold text-gray-900">₦{Number(t.total).toLocaleString()}</td>
                  <td className="px-5 py-4 text-gray-700">Paystack</td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{t.paystack_ref || '—'}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={t.status === 'cancelled' ? 'Refunded' : t.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-3">
                      <button className="text-gray-400 hover:text-purple-700"><Eye size={16} /></button>
                      {t.status !== 'cancelled' && (
                        <button onClick={() => setRefundTarget(t)} className="text-amber-500 hover:text-amber-600" title="Process refund">
                          <RotateCcw size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {refundTarget && (
        <RefundModal
          txn={refundTarget}
          onClose={() => setRefundTarget(null)}
          onDone={() => {
            setRefundTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}