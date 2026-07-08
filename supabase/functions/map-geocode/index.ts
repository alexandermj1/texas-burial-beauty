import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY = 'https://connector-gateway.lovable.dev/google_maps';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `${GATEWAY}/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=us`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY!,
    },
  });
  if (!res.ok) {
    console.error('geocode failed', res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const loc = data?.results?.[0]?.geometry?.location;
  if (!loc) return null;
  return { lat: loc.lat, lng: loc.lng };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) throw new Error('Missing Google Maps credentials');
    const body = await req.json().catch(() => ({}));
    const target: 'cemeteries' | 'query' = body.target || 'cemeteries';

    if (target === 'query') {
      const q = String(body.query || '').trim();
      if (!q) return new Response(JSON.stringify({ error: 'query required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const loc = await geocode(q);
      return new Response(JSON.stringify({ location: loc }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Bulk cemetery geocoding — only rows missing lat/lng
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: rows, error } = await admin
      .from('texas_cemeteries')
      .select('id,name,address,city,latitude,longitude')
      .or('latitude.is.null,longitude.is.null')
      .limit(50);
    if (error) throw error;

    const updated: any[] = [];
    for (const r of rows || []) {
      const q = [r.address, r.city, 'TX'].filter(Boolean).join(', ') || `${r.name}, TX`;
      const loc = await geocode(q);
      if (loc) {
        await admin.from('texas_cemeteries').update({
          latitude: loc.lat, longitude: loc.lng, geocoded_at: new Date().toISOString(),
        }).eq('id', r.id);
        updated.push({ id: r.id, name: r.name, ...loc });
      }
      await new Promise((r) => setTimeout(r, 60));
    }

    return new Response(JSON.stringify({ ok: true, updated: updated.length, remaining: (rows?.length || 0) - updated.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('map-geocode error', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
