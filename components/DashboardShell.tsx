'use client';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { BookamLogo } from './BookamLogo';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

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