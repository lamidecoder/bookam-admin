'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Loader2 } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { BookamLogo } from './BookamLogo';
import { supabase } from '@/lib/supabase';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // This is a client-side session check, not a server-side guard —
    // the real security boundary is Supabase RLS, which already blocks
    // any real data from loading without a valid admin session. This
    // just stops an unauthenticated visitor from sitting on an empty
    // dashboard shell and instead sends them straight to login.
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) {
        router.replace('/');
        return;
      }
      setChecked(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/');
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#FAF7F5' }}>
        <Loader2 size={22} className="animate-spin" style={{ color: '#6B2D82' }} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#FAF7F5' }}>
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile-only top bar — the sidebar is hidden below lg, so this is
            the only way to open it (hamburger) and see the brand. */}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b sticky top-0 z-30"
          style={{ borderColor: '#F0EBF8' }}
        >
          <BookamLogo size={20} />
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-600 p-1.5 -mr-1.5"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}