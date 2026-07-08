import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY = 'https://connector-gateway.lovable.dev/google_maps';
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) throw new Error('Missing Google Maps credentials');
    const { origin, destination } = await req.json();
    if (
      !origin || !destination ||
      typeof origin.lat !== 'number' || typeof origin.lng !== 'number' ||
      typeof destination.lat !== 'number' || typeof destination.lng !== 'number'
    ) {
      return new Response(JSON.stringify({ error: 'origin/destination lat,lng required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const res = await fetch(`${GATEWAY}/routes/directions/v2:computeRoutes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error('routes error', res.status, t);
      return new Response(JSON.stringify({ error: 'Routes API failed', status: res.status, details: t }), { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return new Response(JSON.stringify({ error: 'no route' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const seconds = parseInt(String(route.duration || '0').replace('s', ''), 10);
    return new Response(JSON.stringify({
      durationSeconds: seconds,
      distanceMeters: route.distanceMeters,
      polyline: route.polyline?.encodedPolyline || null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('map-route error', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
