import { useEffect, useState } from 'react';
import GlendaleDocumentsPanel from '@/components/admin/GlendaleDocumentsPanel';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Seo from '@/components/Seo';
export default function GlendaleScan() {
  const { user, loading, signIn, signOut } = useAuth();
  const [access, setAccess] = useState<'loading' | 'yes' | 'no' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => {
    if (!user) return;
    let cancelled = false; setAccess('loading');
    supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'staff']).then(({data, error}) => { if (!cancelled) setAccess(error ? 'error' : data?.length ? 'yes' : 'no'); });
    return () => { cancelled = true; };
  }, [user?.id, retry]);
  return <main className="min-h-svh bg-background px-4 py-6 text-foreground"><Seo title="Glendale document scanner | Texas Cemetery Brokers" description="Private staff document scanner." noindex />
    <div className="mx-auto max-w-5xl"><p className="mb-6 font-display text-lg">Texas Cemetery Brokers</p>
    {loading ? <p>Checking sign-in…</p> : !user ? <form className="mx-auto max-w-sm space-y-4" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { const {error} = await signIn(email, password); if (error) setError(error.message); } catch { setError('Sign-in is unavailable. Please try again.'); } finally { setBusy(false); } }}>
      <h1 className="font-display text-2xl">Glendale staff sign-in</h1><Input aria-label="Email or username" autoComplete="username" placeholder="Email or username" required value={email} onChange={e => setEmail(e.target.value)} /><Input aria-label="Password" type="password" autoComplete="current-password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} />{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
    </form> : access === 'yes' ? <GlendaleDocumentsPanel phone /> : <div className="space-y-4"><p>{access === 'loading' ? 'Checking staff access…' : access === 'error' ? 'Staff access could not be checked. Please retry.' : 'This account does not have staff access.'}</p><Button variant="outline" onClick={() => setRetry(v => v + 1)}>Retry access check</Button><Button variant="ghost" onClick={() => void signOut()}>Sign out</Button></div>}
    </div></main>;
}
