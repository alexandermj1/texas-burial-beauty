import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function glendaleScanUrl() {
  const origin = window.location.hostname === 'localhost' ? 'https://www.texascemeterybrokers.com' : window.location.origin;
  return `${origin}/admin/glendale-scan`;
}

export default function GlendaleScanQr({ className = '' }: { className?: string }) {
  const [qr, setQr] = useState('');
  const [failed, setFailed] = useState(false);
  const scanUrl = glendaleScanUrl();
  useEffect(() => {
    QRCode.toDataURL(scanUrl, { width: 220, margin: 2 }).then(setQr).catch(() => setFailed(true));
  }, [scanUrl]);
  return (
    <div className={`flex flex-wrap items-center gap-5 ${className}`}>
      {qr && <img src={qr} alt="QR code for the private Glendale scanning page" className="h-36 w-36" />}
      <div className="space-y-2">
        <h2 className="font-medium">Phone scanner</h2>
        <p className="text-sm text-muted-foreground">Staff sign-in required · Private document folder</p>
        {failed && <p role="alert" className="text-sm text-destructive">Could not create the QR code. Use Open phone page instead.</p>}
        <Button variant="outline" asChild><a href={scanUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open phone page</a></Button>
      </div>
    </div>
  );
}
