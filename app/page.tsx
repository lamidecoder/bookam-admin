'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Info, CheckCircle2 } from 'lucide-react';
import { BookamLogo } from '@/components/BookamLogo';
import { BookamSymbol } from '@/components/BookamSymbol';
import { supabase } from '@/lib/supabase';
import { isAllowedAdminEmail } from '@/lib/adminAllowlist';

const GENERIC_ERROR = 'Invalid email or password.';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Checked BEFORE any Supabase call — an email that isn't on the
    // allowlist never even reaches auth, and gets the exact same
    // generic error as a wrong password. This is deliberate: telling
    // someone "that email isn't authorized" (vs "wrong password")
    // would let an attacker enumerate which emails ARE valid admin
    // accounts just by trying different addresses and comparing
    // responses.
    if (!isAllowedAdminEmail(email)) {
      setError(GENERIC_ERROR);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role !== 'admin') {
        await supabase.auth.signOut();
        setError(GENERIC_ERROR);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-center items-center relative px-12"
        style={{ backgroundColor: '#6B2D82' }}
      >
        <div className="flex flex-col items-center text-center max-w-md relative z-10">
          <div
            className="rounded-3xl flex items-center justify-center mb-6"
            style={{ width: 88, height: 88, backgroundColor: 'rgba(255,255,255,0.12)' }}
          >
            <div style={{ width: 52, height: 26, position: 'relative' }}>
              <BookamSymbol width={52} height={26} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Bookam</h1>
          <p className="text-white/80 mb-10 leading-relaxed">
            The complete booking management platform for Lagos properties.
          </p>

          <div className="space-y-4 self-start w-full">
            {[
              'Manage all your properties in one place',
              'Real-time booking and availability control',
              'Full transaction and analytics visibility',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#C9A84C' }}
                >
                  <CheckCircle2 size={14} color="#6B2D82" />
                </div>
                <p className="text-white/90 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="absolute bottom-8 text-white/50 text-sm">Bookam Admin v1.0</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-24 bg-white">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-16">
            <BookamLogo size={26} />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Login</h2>
          <p className="text-gray-500 mb-8">Sign in to access the management dashboard.</p>

          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@bookam.ng"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="text-right mt-2">
                <a href="/forgot-password" className="text-sm font-medium" style={{ color: '#6B2D82' }}>Forgot password?</a>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#6B2D82' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 mt-2">
              <Info size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600 leading-relaxed">
                This portal is for authorised Bookam administrators only. Unauthorised access is prohibited.
              </p>
            </div>
          </form>

          <p className="text-center text-sm text-gray-400 mt-12">© 2025 Bookam. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}