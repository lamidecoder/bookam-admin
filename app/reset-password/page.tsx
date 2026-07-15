'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { BookamLogo } from '@/components/BookamLogo';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The reset link puts the browser into a real recovery session
    // automatically via the URL fragment — this just confirms one
    // actually exists before letting the form render, rather than
    // showing a password form to someone who followed a stale/invalid
    // link and has no way to actually complete the reset.
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => router.push('/'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#FAF7F5' }}>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <BookamLogo size={26} />
        </div>

        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: '#F0EBF8' }}>
          {hasSession === null ? (
            <p className="text-center text-sm text-gray-400 py-6">Checking your link…</p>
          ) : !hasSession ? (
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 mb-2">Link expired</h1>
              <p className="text-sm text-gray-500 mb-6">
                This password reset link is invalid or has expired. Request a new one to continue.
              </p>
              <Link href="/forgot-password" className="text-sm font-semibold" style={{ color: '#6B2D82' }}>
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: '#F0FDF6' }}
              >
                <CheckCircle2 size={24} style={{ color: '#2E9E6B' }} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Password updated</h1>
              <p className="text-sm text-gray-500">Redirecting you to login…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Set a new password</h1>
              <p className="text-sm text-gray-500 mb-6">Your new password must be different from your previous one.</p>

              {error && (
                <div className="rounded-lg p-3 text-sm mb-4" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <label className="block text-xs font-bold text-gray-500 mb-2">NEW PASSWORD</label>
                <div className="relative mb-4">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-10 pr-10 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-4 -mt-2">Minimum 8 characters</p>

                <label className="block text-xs font-bold text-gray-500 mb-2">CONFIRM NEW PASSWORD</label>
                <div className="relative mb-6">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ backgroundColor: '#6B2D82' }}
                >
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}