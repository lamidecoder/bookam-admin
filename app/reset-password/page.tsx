'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { BookamLogo } from '@/components/BookamLogo';
import { supabase } from '@/lib/supabase';

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [step, setStep] = useState<'code' | 'password' | 'done'>('code');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      // This is the same verifyOtp({ type: 'recovery' }) pattern already
      // proven working in the mobile app's password reset flow - this
      // project's email template sends a numeric code, not a magic
      // link, so there's no session until this succeeds.
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'recovery',
      });
      if (error) throw error;
      setStep('password');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code is incorrect or has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
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
      setStep('done');
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
          {step === 'code' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Enter the code</h1>
              <p className="text-sm text-gray-500 mb-6">
                If <span className="font-medium text-gray-700">{email || 'that email'}</span> is an authorised admin account, a 6-digit code was sent to it. Enter it below.
              </p>

              {error && (
                <div className="rounded-lg p-3 text-sm mb-4" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyCode}>
                <label className="block text-xs font-bold text-gray-500 mb-2">6-DIGIT CODE</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-lg tracking-[0.3em] text-center font-semibold focus:outline-none mb-5"
                  style={{ borderColor: '#F0EBF8' }}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                  style={{ backgroundColor: '#6B2D82' }}
                >
                  {loading ? 'Verifying…' : 'Verify Code'}
                </button>
              </form>
              <Link href="/forgot-password" className="flex items-center justify-center gap-1.5 mt-5 text-sm font-medium text-gray-500 hover:text-gray-700">
                <ArrowLeft size={14} /> Request a new code
              </Link>
            </>
          )}

          {step === 'password' && (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Set a new password</h1>
              <p className="text-sm text-gray-500 mb-6">Your new password must be different from your previous one.</p>

              {error && (
                <div className="rounded-lg p-3 text-sm mb-4" style={{ backgroundColor: '#FEF2F2', color: '#D94F4F' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSetPassword}>
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

          {step === 'done' && (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}