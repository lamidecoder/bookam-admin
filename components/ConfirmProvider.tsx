'use client';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void };

const ConfirmContext = createContext<{ confirmAction: (options: ConfirmOptions | string) => Promise<boolean> } | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirmAction = useCallback((options: ConfirmOptions | string) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirmAction }}>
      {children}
      {pending && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: pending.destructive ? '#FEF2F2' : '#F0E6FA' }}
            >
              <AlertTriangle size={22} style={{ color: pending.destructive ? '#D94F4F' : '#6B2D82' }} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{pending.title ?? 'Are you sure?'}</h3>
            <p className="text-sm text-gray-500 mb-6">{pending.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => close(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ color: '#6B2D82', borderColor: '#6B2D82' }}
              >
                {pending.cancelLabel ?? 'Cancel'}
              </button>
              <button
                onClick={() => close(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: pending.destructive ? '#D94F4F' : '#6B2D82' }}
              >
                {pending.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx.confirmAction;
}