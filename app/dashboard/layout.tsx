import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#FAF7F5' }}>
      <Sidebar />
      <main className="flex-1 p-8 max-w-[1400px]">{children}</main>
    </div>
  );
}
