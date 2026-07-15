'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid, Building2, Tag, Calendar, ClipboardCheck,
  BarChart3, FileText, Users, LogOut, X,
} from 'lucide-react';
import { BookamLogo } from './BookamLogo';
import { supabase } from '@/lib/supabase';
import { useConfirm } from './ConfirmProvider';
import { useToast } from './ToastProvider';

const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', icon: LayoutGrid },
  { label: 'Properties', href: '/dashboard/properties', icon: Building2 },
  { label: 'Pricing', href: '/dashboard/pricing', icon: Tag },
  { label: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { label: 'Bookings', href: '/dashboard/bookings', icon: ClipboardCheck },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Transactions', href: '/dashboard/transactions', icon: FileText },
  { label: 'Users', href: '/dashboard/users', icon: Users },
];

type Props = {
  /** Only used below the lg breakpoint — controls the slide-in drawer. */
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

export function Sidebar({ mobileOpen = false, onCloseMobile }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminName, setAdminName] = useState('Admin User');
  const confirmAction = useConfirm();
  const { showToast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.user.id)
        .single();
      if (profile?.full_name) setAdminName(profile.full_name);
    }).catch(() => {
      // Non-critical: just keep the "Admin User" fallback name if this fails.
    });
  }, []);

  // Close the mobile drawer automatically whenever the route changes,
  // so tapping a nav link doesn't leave the drawer sitting open.
  useEffect(() => {
    onCloseMobile?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function handleLogout() {
    const ok = await confirmAction({
      title: 'Log out?',
      message: "You'll need to sign in again to access the admin dashboard.",
      confirmLabel: 'Log Out',
      cancelLabel: 'Stay Signed In',
      destructive: true,
    });
    if (!ok) return;

    await supabase.auth.signOut();
    showToast("You've been logged out.", 'success');
    router.push('/');
  }

  const initials = adminName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {/* Backdrop — only rendered/visible on mobile while the drawer is open */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 sm:w-64 min-h-screen bg-white border-r
          flex flex-col justify-between transition-transform duration-200 ease-out
          lg:sticky lg:top-0 lg:translate-x-0 lg:z-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ borderColor: '#F0EBF8' }}
      >
        <div>
          <div className="px-6 py-6 flex items-center justify-between">
            <BookamLogo size={24} />
            {/* Close button — mobile drawer only */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden text-gray-400 hover:text-gray-600"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>
          <nav className="px-3 mt-2 space-y-1">
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: active ? '#F0E6FA' : 'transparent',
                    color: active ? '#6B2D82' : '#6B6478',
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="px-4 py-4 border-t" style={{ borderColor: '#F0EBF8' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: '#6B2D82' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{adminName}</p>
              <p className="text-xs" style={{ color: '#9E96A8' }}>Super Admin</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600 flex-shrink-0" title="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}