// Weekly full CRM backup (Fridays) — dumps EVERY business table to CSV and
// emails the archive to the owners. Designed so that, if the live database were
// lost, the CRM could be rebuilt row-for-row from these files alone.
//
// Safety design:
//  - Every table is paginated (1000 rows/page) so nothing is silently truncated.
//  - Every column of every row is exported (no column allow-lists).
//  - A storage inventory (bucket + path + size of every uploaded deed, contract,
//    ID, etc.) is included so files can be re-linked after a restore.
//  - A MANIFEST file records row counts per table + a checksum of each CSV.
//  - If the payload is too large for email, it is written to the private
//    `backups` storage bucket and the email carries 7-day signed links instead.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const FROM_EMAIL = "texascemeterybrokers@gmail.com";
const TO_EMAILS = [
  "alexandermaclarenjames@gmail.com",
  "simonjamesphd@gmail.com",
  "emmamaclaren@gmail.com",
];

// Every table that carries business data. Order matters only for readability.
const TABLES: string[] = [
  // Core CRM
  "contact_submissions",
  "customer_profiles",
  "customer_notes",
  "customer_files",
  "customer_activity_log",
  "submission_documents",
  "submission_views",
  // Money + paperwork
  "contracts",
  "poa_records",
  "quote_estimates",
  "quote_revisions",
  "payment_transactions",
  // Communications
  "email_messages",
  "reminder_log",
  "ai_draft_edits",
  "user_notifications",
  // Inventory / listings
  "listings",
  "sales",
  "plot_reservations",
  "buyer_recommendations",
  "inventory_requests",
  "ca_inventory",
  "ca_sold_history",
  "agent_sales",
  "agent_locations",
  // Reference data
  "texas_cemeteries",
  "cemetery_files",
  // Marketing
  "marketing_contacts",
  "marketing_campaigns",
  "marketing_sends",
  // Team / access
  "team_tasks",
  "profiles",
  "user_roles",
];

const BUCKETS = ["cemetery-files", "contracts", "customer-files", "listing-photos", "portal-uploads"];
const BACKUP_BUCKET = "backups";
const PAGE = 1000;
const MAX_EMAIL_BYTES = 15 * 1024 * 1024; // keep well under Gmail's 25MB limit

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  // Union of keys across all rows so a null-heavy first row can't drop columns.
  const cols: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) if (!seen.has(k)) { seen.add(k); cols.push(k); }
  return [cols.join(","), ...rows.map((r) => cols.map((c) => csvEscape(r[c])).join(","))].join("\n");
}
function b64url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    if (!GOOGLE_MAIL_API_KEY) throw new Error("GOOGLE_MAIL_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const stamp = now.toISOString().slice(0, 10);

    // ---- 1. Dump every table, fully paginated -----------------------------
    const files: { name: string; body: string }[] = [];
    const manifest: string[] = [
      `Texas Cemetery Brokers — full CRM backup`,
      `Generated: ${now.toISOString()}`,
      ``,
      `table,rows,columns,sha256_16,status`,
    ];
    const counts: Record<string, number> = {};

    for (const table of TABLES) {
      const rows: Record<string, unknown>[] = [];
      let from = 0;
      let status = "ok";
      // Pull in pages until a short page comes back.
      // deno-lint-ignore no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .order("created_at", { ascending: true, nullsFirst: true })
          .range(from, from + PAGE - 1);
        if (error) {
          // Some tables have no created_at — retry unordered before giving up.
          const retry = await supabase.from(table).select("*").range(from, from + PAGE - 1);
          if (retry.error) { status = `error: ${retry.error.message}`; break; }
          rows.push(...((retry.data ?? []) as Record<string, unknown>[]));
          if ((retry.data ?? []).length < PAGE) break;
        } else {
          rows.push(...((data ?? []) as Record<string, unknown>[]));
          if ((data ?? []).length < PAGE) break;
        }
        from += PAGE;
        if (from > 200_000) { status = "truncated at 200k rows"; break; }
      }
      const csv = toCSV(rows);
      counts[table] = rows.length;
      files.push({ name: `${table}.csv`, body: csv });
      manifest.push(`${table},${rows.length},${rows.length ? csv.split("\n")[0].split(",").length : 0},${await sha256(csv)},${status}`);
    }

    // ---- 2. Storage inventory (so uploaded files can be re-linked) --------
    const storageRows: Record<string, unknown>[] = [];
    async function walk(bucket: string, prefix: string, depth: number) {
      if (depth > 4) return;
      const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
      if (error || !data) return;
      for (const item of data) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id) {
          storageRows.push({
            bucket,
            path,
            size_bytes: (item.metadata as Record<string, unknown> | null)?.size ?? "",
            mime_type: (item.metadata as Record<string, unknown> | null)?.mimetype ?? "",
            created_at: item.created_at ?? "",
            updated_at: item.updated_at ?? "",
          });
        } else {
          await walk(bucket, path, depth + 1);
        }
      }
    }
    for (const b of BUCKETS) await walk(b, "", 0);
    files.push({ name: "storage_inventory.csv", body: toCSV(storageRows) });
    manifest.push(`storage_objects,${storageRows.length},6,${await sha256(toCSV(storageRows))},ok`);

    // ---- 3. Auth users (so logins can be recreated / mapped) --------------
    const authRows: Record<string, unknown>[] = [];
    try {
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        const users = data?.users ?? [];
        for (const u of users) {
          authRows.push({
            id: u.id,
            email: u.email ?? "",
            phone: u.phone ?? "",
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at ?? "",
            email_confirmed_at: (u as unknown as Record<string, unknown>).email_confirmed_at ?? "",
            providers: (u.app_metadata?.providers ?? []).join("|"),
            user_metadata: JSON.stringify(u.user_metadata ?? {}),
          });
        }
        if (users.length < 200) break;
      }
    } catch (_e) { /* non-fatal */ }
    files.push({ name: "auth_users.csv", body: toCSV(authRows) });
    manifest.push(`auth_users,${authRows.length},8,${await sha256(toCSV(authRows))},ok (no password hashes — users reset on restore)`);

    manifest.push(
      ``,
      `RESTORE NOTES`,
      `1. Recreate the schema, then import each CSV into the table of the same name.`,
      `2. Import order: profiles, user_roles, customer_profiles, texas_cemeteries, contact_submissions,`,
      `   then every remaining table (they reference the ones above by id).`,
      `3. auth_users.csv contains identities only — passwords are never exported.`,
      `   Recreate users with the same ids, then send password resets.`,
      `4. storage_inventory.csv lists every uploaded deed/contract/photo by bucket + path`,
      `   so the database rows that point at them stay valid once files are restored.`,
      `5. All ids are preserved exactly, so relationships survive a full reimport.`,
    );
    files.unshift({ name: "MANIFEST.txt", body: manifest.join("\n") });

    // ---- 4. Deliver -------------------------------------------------------
    const totalBytes = files.reduce((a, f) => a + f.body.length, 0);
    const boundary = "----=_Part_" + crypto.randomUUID();
    const oversized = totalBytes > MAX_EMAIL_BYTES;
    const links: string[] = [];

    if (oversized) {
      // Too big to email — park it in private storage and send signed links.
      await supabase.storage.createBucket(BACKUP_BUCKET, { public: false }).catch(() => {});
      for (const f of files) {
        const path = `${stamp}/${f.name}`;
        await supabase.storage.from(BACKUP_BUCKET).upload(path, new Blob([f.body], { type: "text/csv" }), { upsert: true });
        const { data } = await supabase.storage.from(BACKUP_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
        if (data?.signedUrl) links.push(`<li><a href="${data.signedUrl}">${f.name}</a></li>`);
      }
    }

    const rowsTotal = Object.values(counts).reduce((a, b) => a + b, 0);
    const html = `
<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#222;">
  <h1 style="border-bottom:2px solid #6b8e5a;padding-bottom:8px;">Weekly full CRM backup — ${stamp}</h1>
  <p>This is a complete, restorable snapshot of the CRM: <strong>${rowsTotal.toLocaleString("en-US")}</strong> rows across <strong>${TABLES.length}</strong> tables, plus a storage inventory and the user list.</p>
  <table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;font-size:13px;width:100%;">
    <tr style="background:#f0ede4;"><th align="left">Table</th><th align="right">Rows</th></tr>
    ${TABLES.map((t) => `<tr><td>${t}</td><td align="right">${(counts[t] ?? 0).toLocaleString("en-US")}</td></tr>`).join("")}
    <tr><td>storage objects</td><td align="right">${storageRows.length.toLocaleString("en-US")}</td></tr>
    <tr><td>auth users</td><td align="right">${authRows.length.toLocaleString("en-US")}</td></tr>
  </table>
  ${oversized
    ? `<p><strong>The archive was too large to attach.</strong> Download it here (links valid 7 days):</p><ul>${links.join("")}</ul>`
    : `<p>Every table is attached as its own CSV. <strong>MANIFEST.txt</strong> lists row counts, checksums and restore instructions.</p>`}
  <p style="font-size:12px;color:#888;">Keep this email. With these files the entire CRM can be rebuilt exactly as it stands today.</p>
</div>`.trim();

    const parts: string[] = [
      `From: Texas Cemetery Brokers <${FROM_EMAIL}>`,
      `To: ${TO_EMAILS.join(", ")}`,
      `Subject: Weekly CRM backup ${stamp} — ${rowsTotal} rows, ${TABLES.length} tables`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      b64(html).match(/.{1,76}/g)?.join("\r\n") ?? "",
      ``,
    ];

    if (!oversized) {
      for (const f of files) {
        if (!f.body) continue;
        const enc = b64(f.body).match(/.{1,76}/g)?.join("\r\n") ?? "";
        parts.push(
          `--${boundary}`,
          `Content-Type: text/csv; charset="UTF-8"; name="${f.name}"`,
          `Content-Disposition: attachment; filename="${f.name}"`,
          `Content-Transfer-Encoding: base64`,
          ``,
          enc,
          ``,
        );
      }
    }
    parts.push(`--${boundary}--`);

    const sendRes = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: b64url(parts.join("\r\n")) }),
    });
    const sendJson = await sendRes.json();
    if (!sendRes.ok) throw new Error(`Gmail send failed [${sendRes.status}]: ${JSON.stringify(sendJson)}`);

    return new Response(JSON.stringify({ ok: true, tables: counts, storage_objects: storageRows.length, auth_users: authRows.length, bytes: totalBytes, delivered: oversized ? "storage_links" : "attachments" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("full-backup failed", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
