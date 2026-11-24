import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { glendaleScanUrl } from '@/lib/glendaleDocuments';

export default function GlendaleScanQr({ className = '' }: { className?: string }) {
  const [qr, setQr] = useState('');
  const [scanUrl, setScanUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setBusy(true); setError(''); setQr(''); setScanUrl('');
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('glendale-scan', { body: { action: 'create_link' } });
        if (error || !data?.token) throw new Error('Link unavailable');
        const url = glendaleScanUrl(data.token);
        const image = await QRCode.toDataURL(url, { width: 220, margin: 2 });
        if (!cancelled) { setScanUrl(url); setQr(image); }
      } catch { if (!cancelled) setError('Could not create the phone upload link. Please retry.'); }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [refresh]);
  return (
    <div className={`flex flex-wrap items-center gap-5 ${className}`}>
      {qr && <img src={qr} alt="QR code for the private Glendale scanning page" className="h-36 w-36" />}
      <div className="space-y-2">
        <h2 className="font-medium">Phone scanner</h2>
        <p className="text-sm text-muted-foreground">No sign-in · Upload only · Link valid for 24 hours</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {scanUrl && <Button variant="outline" asChild><a href={scanUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open phone page</a></Button>}
          <Button variant="ghost" disabled={busy} onClick={() => setRefresh(v => v + 1)}><RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} />{busy ? 'Preparing QR code…' : 'New QR code'}</Button>
        </div>
      </div>
    </div>
  );
}
