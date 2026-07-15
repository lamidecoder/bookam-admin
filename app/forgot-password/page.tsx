'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { BookamLogo } from '@/components/BookamLogo';
import { supabase } from '@/lib/supabase';
import { isAllowedAdminEmail } from '@/lib/adminAllowlist';

// Always shown, regardless of whether the email is actually allowed or
// has an account — same anti-enumeration reasoning as the login page.
// If this said something different for "not authorized" vs "sent", a
// visitor could try addresses one at a time and see which ones are
// real admin accounts.
const GENERIC_MESSAGE =
  "If that email is associated with an admin account, we've sent a password reset link to it.";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Only actually send a reset email if the address is on the
    // allowlist — but the UI response is identical either way, so this
    // check itself is never observable from outside.
    if (isAllowedAdminEmail(email)) {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    }

    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FAF7F5' }}>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <BookamLogo size={26} />
        </div>

        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: '#F0EBF8' }}>
          {submitted ? (
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: '#F0FDF6' }}
              >
                <Mail size={24} style={{ color: '#2E9E6B' }} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
              <p className="text-sm text-gray-500 mb-6">{GENERIC_MESSAGE}</p>
              <Link href="/" className="text-sm font-semibold" style={{ color: '#6B2D82' }}>
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Reset password</h1>
              <p className="text-sm text-gray-500 mb-6">
                Enter the admin email address and we&apos;ll send a reset link if it&apos;s authorised.
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
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <Link href="/" className="flex items-center justify-center gap-1.5 mt-5 text-sm font-medium text-gray-500 hover:text-gray-700">
                <ArrowLeft size={14} /> Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}