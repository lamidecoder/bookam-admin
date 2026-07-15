'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { BookamLogo } from '@/components/BookamLogo';
import { supabase } from '@/lib/supabase';
import { isAllowedAdminEmail } from '@/lib/adminAllowlist';

export default function AdminForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Only actually send a reset email if the address is on the
    // allowlist — but we navigate to the next step either way, with
    // the same generic messaging, so a visitor can never tell from the
    // outside whether a given email is actually authorized.
    if (isAllowedAdminEmail(email)) {
      await supabase.auth.resetPasswordForEmail(email.trim());
    }

    setLoading(false);
    // This project's email template sends a 6-digit CODE, not a
    // clickable link — so the next step is a page where the code gets
    // typed in and verified, not a redirect target for a magic link.
    router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FAF7F5' }}>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <BookamLogo size={26} />
        </div>

        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: '#F0EBF8' }}>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Reset password</h1>
          <p className="text-sm text-gray-500 mb-6">
            Enter the admin email address and, if it&apos;s authorised, we&apos;ll email a 6-digit code to reset the password.
          </p>
          <form onSubmit={handleSubmit}>
            <label className="block text-xs font-bold text-gray-500 mb-2">EMAIL ADDRESS</label>
            <div className="relative mb-5">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@bookamfast.com"
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none"
                style={{ borderColor: '#F0EBF8' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: '#6B2D82' }}
            >
              {loading ? 'Sending…' : 'Send Reset Code'}
            </button>
          </form>
          <Link href="/" className="flex items-center justify-center gap-1.5 mt-5 text-sm font-medium text-gray-500 hover:text-gray-700">
            <ArrowLeft size={14} /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}