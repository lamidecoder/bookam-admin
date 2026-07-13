import Link from 'next/link';
import { BookamLogo } from '@/components/BookamLogo';

export function LegalLayout({
  children,
  lastUpdated,
}: {
  children: React.ReactNode;
  lastUpdated: string;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b sticky top-0 bg-white z-10" style={{ borderColor: '#F0EBF8' }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <Link href="/">
            <BookamLogo size={22} />
          </Link>
          <span className="text-xs text-gray-400">Last updated: {lastUpdated}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {children}
      </main>

      <footer className="border-t mt-10" style={{ borderColor: '#F0EBF8' }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 text-xs text-gray-400 flex flex-col sm:flex-row justify-between gap-3">
          <span>© {new Date().getFullYear()} BookamFast Nigeria Ltd. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}