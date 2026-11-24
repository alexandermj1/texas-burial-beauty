import { useEffect, useState } from 'react';
import GlendaleDocumentsPanel from '@/components/admin/GlendaleDocumentsPanel';
import { Button } from '@/components/ui/button';
import { scanRequest } from '@/lib/glendaleScanUpload';
import Seo from '@/components/Seo';
export default function GlendaleScan() {
  const [token] = useState(() => window.location.hash.slice(1));
  const [access, setAccess] = useState<'loading' | 'yes' | 'no' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!/^[a-f0-9]{64}$/.test(token)) { setAccess('no'); return; }
    let cancelled = false; setAccess('loading');
    scanRequest({ action: 'validate', token }).then(() => { if (!cancelled) setAccess('yes'); }).catch((e: unknown) => { if (!cancelled) { setError(e instanceof Error ? e.message : 'Upload link unavailable.'); setAccess('error'); } });
    return () => { cancelled = true; };
  }, [token, retry]);
  return <main className="min-h-svh bg-background px-4 py-6 text-foreground"><Seo title="Glendale document scanner | Texas Cemetery Brokers" description="Private document upload page." noindex />
    <div className="mx-auto max-w-5xl"><p className="mb-6 font-display text-lg">Texas Cemetery Brokers</p>
    {access === 'yes' ? <GlendaleDocumentsPanel uploadToken={token} /> : <div className="space-y-4"><p role={access === 'loading' ? 'status' : 'alert'}>{access === 'loading' ? 'Opening document upload…' : access === 'error' ? error : 'Scan the QR code on the admin page to open document upload.'}</p>{access === 'error' && <Button variant="outline" onClick={() => setRetry(v => v + 1)}>Retry</Button>}</div>}
    </div></main>;
}
