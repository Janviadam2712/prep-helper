'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Tab = 'google' | 'email' | 'phone';
type EmailMode = 'signup' | 'signin';

export default function LoginPage() {
  const [tab,       setTab]       = useState<Tab>('google');
  const [emailMode, setEmailMode] = useState<EmailMode>('signup');
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [otp,       setOtp]       = useState('');
  const [otpSent,   setOtpSent]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [count,     setCount]     = useState<number | null>(null);

  const supabase = createClient();
  const router   = useRouter();

  useEffect(() => {
    fetch('/api/student-count')
      .then(r => r.json())
      .then(d => setCount(d.count))
      .catch(() => {});
  }, []);

  const clear = () => { setError(''); setSuccess(''); };

  const handleGoogle = async () => {
    setLoading(true); clear();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  const handleEmail = async () => {
    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return; }
    if (emailMode === 'signup' && !name.trim()) { setError('Please enter your full name.'); return; }
    setLoading(true); clear();
    if (emailMode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setSuccess('Check your email to confirm your account, then sign in below.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push('/welcome');
    }
    setLoading(false);
  };

  const handleSendOTP = async () => {
    if (!phone.trim()) { setError('Enter your phone number.'); return; }
    setLoading(true); clear();
    const formatted = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
    if (error) setError(error.message);
    else { setOtpSent(true); setSuccess(`OTP sent to ${formatted}`); }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) { setError('Enter the OTP from your SMS.'); return; }
    setLoading(true); clear();
    const formatted = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
    const { error } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: 'sms' });
    if (error) setError(error.message);
    else router.push('/welcome');
    setLoading(false);
  };

  const page: React.CSSProperties = { minHeight: '100vh', background: '#07071A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--font-sg), Space Grotesk, system-ui, sans-serif' };
  const card: React.CSSProperties = { width: '100%', maxWidth: '400px', background: '#0E0D22', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '22px' };
  const inp: React.CSSProperties = { width: '100%', background: '#141330', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '11px 14px', color: '#F5F0FF', fontSize: '14px', fontFamily: 'inherit', outline: 'none' };
  const btnPri: React.CSSProperties = { width: '100%', padding: '12px', background: 'linear-gradient(135deg, #6C47FF, #F0A500)', color: 'white', border: 'none', borderRadius: '11px', fontFamily: 'inherit', fontWeight: 700, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, letterSpacing: '-0.01em' };
  const btnGhost: React.CSSProperties = { width: '100%', padding: '11px', background: '#141330', color: '#F5F0FF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '11px', fontFamily: 'inherit', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' };
  const label: React.CSSProperties = { display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#453F60', marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' };
  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '12px', fontWeight: 600,
    borderRadius: '8px', transition: 'all .15s',
    backgroundColor: active ? '#0E0D22' : 'transparent',
    color: active ? '#F0A500' : '#453F60',
    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
  });

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #6C47FF, #F0A500)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '15px' }}>P</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '14px', color: '#F5F0FF', letterSpacing: '-0.03em' }}>Prep Helper</p>
              <p style={{ fontSize: '9.5px', color: '#453F60', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Active Learning AI</p>
            </div>
          </div>
          <div>
            <h1 style={{ fontSize: '21px', fontWeight: 700, color: '#F5F0FF', letterSpacing: '-0.04em', marginBottom: '8px', lineHeight: 1.2 }}>
              {emailMode === 'signup' ? 'Start learning smarter' : 'Welcome back'}
            </h1>
            {count !== null && count > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: 'rgba(108,71,255,0.1)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: '99px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00E5A0' }} />
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#9D7FFF' }}>{count.toLocaleString()} students already inside</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px', background: '#141330', borderRadius: '11px', padding: '4px' }}>
          {(['google', 'email', 'phone'] as Tab[]).map(t => (
            <button key={t} style={tabBtn(tab === t)} onClick={() => { setTab(t); clear(); }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {t === 'google' && (
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {t === 'email' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M2 7l10 6 10-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
                {t === 'phone' && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="6" y="2" width="12" height="20" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <line x1="11" y1="18" x2="13" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
                {t === 'google' ? 'Google' : t === 'email' ? 'Email' : 'Phone'}
              </span>
            </button>
          ))}
        </div>

        {tab === 'google' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button style={btnGhost} onClick={handleGoogle} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {loading ? 'Connecting…' : 'Continue with Google'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '11.5px', color: '#453F60', fontWeight: 500 }}>Fastest option — one click, no password.</p>
          </div>
        )}

        {tab === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            {emailMode === 'signup' && (
              <div><label style={label}>Full Name</label><input style={inp} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} /></div>
            )}
            <div><label style={label}>Email</label><input style={inp} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><label style={label}>Password</label><input style={inp} type="password" placeholder={emailMode === 'signup' ? 'Min 8 characters' : 'Your password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEmail()} /></div>
            <button style={btnPri} onClick={handleEmail} disabled={loading}>{loading ? 'Loading…' : emailMode === 'signup' ? 'Create Account' : 'Sign In'}</button>
            <p style={{ textAlign: 'center', fontSize: '12.5px', color: '#9590B0' }}>
              {emailMode === 'signup' ? 'Already have an account? ' : 'New here? '}
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9D7FFF', fontWeight: 700, fontFamily: 'inherit', fontSize: '12.5px', padding: 0 }} onClick={() => { setEmailMode(emailMode === 'signup' ? 'signin' : 'signup'); clear(); }}>
                {emailMode === 'signup' ? 'Sign in' : 'Create account'}
              </button>
            </p>
          </div>
        )}

        {tab === 'phone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            {!otpSent ? (
              <>
                <div>
                  <label style={label}>Phone Number</label>
                  <p style={{ fontSize: '11px', color: '#453F60', marginBottom: '8px', fontWeight: 500 }}>Indian numbers: enter 10 digits — we add +91 automatically</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ ...inp, width: '52px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#453F60', fontSize: '13px', padding: '11px 8px' }}>+91</div>
                    <input style={{ ...inp, flex: 1 }} type="tel" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} maxLength={10} onKeyDown={e => e.key === 'Enter' && handleSendOTP()} />
                  </div>
                </div>
                <button style={btnPri} onClick={handleSendOTP} disabled={loading}>{loading ? 'Sending…' : 'Send OTP'}</button>
              </>
            ) : (
              <>
                <div><label style={label}>Enter OTP</label><input style={{ ...inp, fontSize: '24px', letterSpacing: '0.35em', textAlign: 'center' }} type="number" placeholder="------" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()} /></div>
                <button style={btnPri} onClick={handleVerifyOTP} disabled={loading}>{loading ? 'Verifying…' : 'Verify & Enter →'}</button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9D7FFF', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: 600, padding: 0, textAlign: 'center' }} onClick={() => { setOtpSent(false); setOtp(''); clear(); }}>← Change number</button>
              </>
            )}
          </div>
        )}

        {error   && <p style={{ background: 'rgba(255,80,96,0.08)', border: '1px solid rgba(255,80,96,0.2)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: '#FF8090', fontWeight: 500 }}>⚠️ {error}</p>}
        {success && <p style={{ background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: '#00E5A0', fontWeight: 500 }}>✅ {success}</p>}

        <p style={{ textAlign: 'center', fontSize: '10.5px', color: '#453F60', fontWeight: 500 }}>By continuing you agree to our Terms &amp; Privacy Policy.</p>
      </div>
    </div>
  );
}