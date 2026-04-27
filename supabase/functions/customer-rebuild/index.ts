// Rebuilds the customer_profiles table from contact_submissions + email_messages.
// Matches by (lowercased) email exact, then phone digits exact, then fuzzy name.
// Idempotent — safe to call repeatedly.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normEmail = (e?: string | null) => (e ? e.trim().toLowerCase() : null);
const normPhone = (p?: string | null) => (p ? p.replace(/\D/g, "") : null);
const normName = (n?: string | null) =>
  n ? n.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((t) => t.length > 1).sort().join(" ") : null;

interface Person {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  customer_kind?: string | null;
  source: "submission" | "email";
  source_id: string;
  ts: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull all submissions + emails
    const [subsRes, emailsRes] = await Promise.all([
      supabase
        .from("contact_submissions")
        .select("id,name,email,phone,customer_kind,source,created_at,customer_profile_id")
        .order("created_at", { ascending: true }),
      supabase
        .from("email_messages")
        .select("id,from_name,from_email,received_at,customer_profile_id")
        .order("received_at", { ascending: true }),
    ]);

    const people: Person[] = [];
    for (const s of subsRes.data ?? []) {
      people.push({
        name: s.name,
        email: s.email,
        phone: s.phone,
        customer_kind: s.customer_kind ?? s.source,
        source: "submission",
        source_id: s.id,
        ts: s.created_at,
      });
    }
    for (const e of emailsRes.data ?? []) {
      people.push({
        name: e.from_name,
        email: e.from_email,
        phone: null,
        source: "email",
        source_id: e.id,
        ts: e.received_at,
      });
    }

    // Cluster: walk people in time order, find or create a profile.
    const profiles: Array<{
      id?: string;
      primary_name: string | null;
      primary_email: string | null;
      primary_phone: string | null;
      alt_emails: Set<string>;
      alt_phones: Set<string>;
      name_keys: Set<string>;
      customer_kind: string | null;
      members: Person[];
      last_interaction_at: string;
    }> = [];

    const findProfile = (p: Person) => {
      const e = normEmail(p.email);
      const ph = normPhone(p.phone);
      const nk = normName(p.name);

      for (const prof of profiles) {
        if (e && (normEmail(prof.primary_email) === e || prof.alt_emails.has(e))) return prof;
        if (ph && (normPhone(prof.primary_phone) === ph || prof.alt_phones.has(ph))) return prof;
        // Fuzzy name only when there is at least an email or phone present in the candidate
        // to avoid merging two unrelated "John" anonymous submissions.
        if (nk && prof.name_keys.has(nk) && (e || ph || prof.primary_email || prof.primary_phone)) return prof;
      }
      return null;
    };

    for (const p of people) {
      let prof = findProfile(p);
      if (!prof) {
        prof = {
          primary_name: p.name ?? null,
          primary_email: p.email ?? null,
          primary_phone: p.phone ?? null,
          alt_emails: new Set<string>(),
          alt_phones: new Set<string>(),
          name_keys: new Set<string>(),
          customer_kind: p.customer_kind ?? null,
          members: [],
          last_interaction_at: p.ts,
        };
        profiles.push(prof);
      }
      prof.members.push(p);
      const e = normEmail(p.email);
      const ph = normPhone(p.phone);
      const nk = normName(p.name);
      if (e) {
        if (!prof.primary_email) prof.primary_email = p.email!;
        else if (normEmail(prof.primary_email) !== e) prof.alt_emails.add(e);
      }
      if (ph) {
        if (!prof.primary_phone) prof.primary_phone = p.phone!;
        else if (normPhone(prof.primary_phone) !== ph) prof.alt_phones.add(ph);
      }
      if (nk) prof.name_keys.add(nk);
      if (!prof.primary_name && p.name) prof.primary_name = p.name;
      if (!prof.customer_kind && p.customer_kind) prof.customer_kind = p.customer_kind;
      if (new Date(p.ts) > new Date(prof.last_interaction_at)) prof.last_interaction_at = p.ts;
    }

    // Wipe + reinsert (small dataset; safe approach for full rebuild)
    await supabase.from("customer_profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    let createdCount = 0;
    let linkedSubs = 0;
    let linkedEmails = 0;

    for (const prof of profiles) {
      const { data: ins, error } = await supabase
        .from("customer_profiles")
        .insert({
          primary_name: prof.primary_name,
          primary_email: prof.primary_email,
          primary_phone: prof.primary_phone,
          alt_emails: Array.from(prof.alt_emails),
          alt_phones: Array.from(prof.alt_phones),
          customer_kind: prof.customer_kind,
          last_interaction_at: prof.last_interaction_at,
        })
        .select()
        .single();
      if (error || !ins) {
        console.error("insert profile failed", error);
        continue;
      }
      createdCount++;
      const profId = ins.id;
      const subIds = prof.members.filter((m) => m.source === "submission").map((m) => m.source_id);
      const emailIds = prof.members.filter((m) => m.source === "email").map((m) => m.source_id);
      if (subIds.length > 0) {
        const { error: e1 } = await supabase
          .from("contact_submissions")
          .update({ customer_profile_id: profId })
          .in("id", subIds);
        if (!e1) linkedSubs += subIds.length;
      }
      if (emailIds.length > 0) {
        const { error: e2 } = await supabase
          .from("email_messages")
          .update({ customer_profile_id: profId })
          .in("id", emailIds);
        if (!e2) linkedEmails += emailIds.length;
      }
    }

    return new Response(
      JSON.stringify({
        profiles_created: createdCount,
        submissions_linked: linkedSubs,
        emails_linked: linkedEmails,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("customer-rebuild error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
