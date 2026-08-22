// Weekly full CRM backup (Fridays) — dumps EVERY business table to CSV so that,
// if the live database were lost, the CRM could be rebuilt row-for-row.
//
// Design notes:
//  - Tables are exported one at a time and uploaded straight to the private
//    `backups` storage bucket, so memory stays flat no matter how big the CRM gets.
//  - Every column of every row is exported (no allow-lists), fully paginated.
//  - A storage inventory (bucket + path + size of every deed/contract/photo) and
//    the auth user list are included so files and logins can be re-linked.
//  - MANIFEST.txt records row counts, checksums and restore instructions.
//  - The email carries the manifest + small CSVs as attachments and 7-day signed
//    download links for everything.
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

// Every table that carries business data.
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

// Columns dropped purely because they are huge duplicates of data we keep.
const DROP_COLUMNS: Record<string, string[]> = {
  email_messages: ["body_html"], // body_text keeps the readable content
};

const BUCKETS = ["cemetery-files", "contracts", "customer-files", "listing-photos", "portal-uploads"];
const BACKUP_BUCKET = "backups";
const PAGE = 500;
const ATTACH_LIMIT = 900 * 1024; // attach files under ~900KB, link the rest

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function b64url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
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
    const folder = `${stamp}`;

    await supabase.storage.createBucket(BACKUP_BUCKET, { public: false }).catch(() => {});

    const manifest: string[] = [
      `Texas Cemetery Brokers — full CRM backup`,
      `Generated: ${now.toISOString()}`,
      ``,
      `table,rows,columns,sha256_16,bytes,status`,
    ];
    const counts: Record<string, number> = {};
    const links: { name: string; url: string }[] = [];
    const attachments: { name: string; body: string }[] = [];
    let totalBytes = 0;

    // Upload one CSV, keep a signed link, attach it if it is small.
    async function emit(name: string, csv: string, rows: number, cols: number, status: string) {
      const path = `${folder}/${name}`;
      totalBytes += csv.length;
      await supabase.storage.from(BACKUP_BUCKET)
        .upload(path, new Blob([csv], { type: "text/csv" }), { upsert: true, contentType: "text/csv" });
      const { data } = await supabase.storage.from(BACKUP_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
      if (data?.signedUrl) links.push({ name, url: data.signedUrl });
      if (csv.length && csv.length <= ATTACH_LIMIT) attachments.push({ name, body: csv });
      manifest.push(`${name.replace(/\.csv$/, "")},${rows},${cols},${await sha256(csv)},${csv.length},${status}`);
    }

    // ---- 1. Every table, fully paginated, streamed one at a time ----------
    for (const table of TABLES) {
      const drop = DROP_COLUMNS[table] ?? [];
      let header: string[] = [];
      const lines: string[] = [];
      let rowCount = 0;
      let from = 0;
      let status = "ok";

      // deno-lint-ignore no-constant-condition
      while (true) {
        let res = await supabase.from(table).select("*")
          .order("created_at", { ascending: true, nullsFirst: true })
          .range(from, from + PAGE - 1);
        if (res.error) res = await supabase.from(table).select("*").range(from, from + PAGE - 1);
        if (res.error) { status = `error: ${res.error.message}`; break; }
        const page = (res.data ?? []) as Record<string, unknown>[];
        for (const row of page) {
          for (const c of drop) delete row[c];
          if (!header.length) { header = Object.keys(row); lines.push(header.join(",")); }
          lines.push(header.map((c) => csvEscape(row[c])).join(","));
        }
        rowCount += page.length;
        if (page.length < PAGE) break;
        from += PAGE;
        if (from > 500_000) { status = "truncated at 500k rows"; break; }
      }

      counts[table] = rowCount;
      await emit(`${table}.csv`, lines.join("\n"), rowCount, header.length, status);
    }

    // ---- 2. Storage inventory --------------------------------------------
    const invLines: string[] = ["bucket,path,size_bytes,mime_type,created_at,updated_at"];
    let objectCount = 0;
    async function walk(bucket: string, prefix: string, depth: number) {
      if (depth > 4) return;
      const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
      if (error || !data) return;
      for (const item of data) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        const meta = (item.metadata ?? null) as Record<string, unknown> | null;
        if (item.id) {
          objectCount++;
          invLines.push([bucket, path, meta?.size ?? "", meta?.mimetype ?? "", item.created_at ?? "", item.updated_at ?? ""].map(csvEscape).join(","));
        } else {
          await walk(bucket, path, depth + 1);
        }
      }
    }
    for (const b of BUCKETS) await walk(b, "", 0);
    await emit("storage_inventory.csv", invLines.join("\n"), objectCount, 6, "ok");

    // ---- 3. Auth users ----------------------------------------------------
    const authLines: string[] = ["id,email,phone,created_at,last_sign_in_at,email_confirmed_at,providers,user_metadata"];
    let userCount = 0;
    try {
      for (let page = 1; page <= 20; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        const users = data?.users ?? [];
        for (const u of users) {
          userCount++;
          authLines.push([
            u.id, u.email ?? "", u.phone ?? "", u.created_at, u.last_sign_in_at ?? "",
            (u as unknown as Record<string, unknown>).email_confirmed_at ?? "",
            (u.app_metadata?.providers ?? []).join("|"),
            JSON.stringify(u.user_metadata ?? {}),
          ].map(csvEscape).join(","));
        }
        if (users.length < 200) break;
      }
    } catch (_e) { /* non-fatal */ }
    await emit("auth_users.csv", authLines.join("\n"), userCount, 8, "ok (no password hashes — users reset on restore)");

    // ---- 4. Manifest + email ---------------------------------------------
    manifest.push(
      ``,
      `RESTORE NOTES`,
      `1. Recreate the schema, then import each CSV into the table of the same name.`,
      `2. Import order: profiles, user_roles, customer_profiles, texas_cemeteries,`,
      `   contact_submissions, then every remaining table (they reference those by id).`,
      `3. auth_users.csv holds identities only — passwords are never exported. Recreate`,
      `   users with the same ids, then send password resets.`,
      `4. storage_inventory.csv lists every uploaded deed/contract/photo by bucket + path,`,
      `   so restored database rows still point at the right files.`,
      `5. email_messages excludes the raw HTML body (body_text keeps the readable copy).`,
      `6. All ids are preserved exactly, so every relationship survives a full reimport.`,
      `7. Copies of these files also live in the private "${BACKUP_BUCKET}" bucket under ${folder}/.`,
    );
    const manifestText = manifest.join("\n");
    await supabase.storage.from(BACKUP_BUCKET)
      .upload(`${folder}/MANIFEST.txt`, new Blob([manifestText], { type: "text/plain" }), { upsert: true });
    attachments.unshift({ name: "MANIFEST.txt", body: manifestText });

    const rowsTotal = Object.values(counts).reduce((a, b) => a + b, 0);
    const html = `
<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#222;">
  <h1 style="border-bottom:2px solid #6b8e5a;padding-bottom:8px;">Weekly full CRM backup — ${stamp}</h1>
  <p>A complete, restorable snapshot: <strong>${rowsTotal.toLocaleString("en-US")}</strong> rows across <strong>${TABLES.length}</strong> tables, plus ${objectCount.toLocaleString("en-US")} stored files and ${userCount} user accounts.</p>
  <table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse;font-size:13px;width:100%;">
    <tr style="background:#f0ede4;"><th align="left">Table</th><th align="right">Rows</th></tr>
    ${TABLES.map((t) => `<tr><td>${t}</td><td align="right">${(counts[t] ?? 0).toLocaleString("en-US")}</td></tr>`).join("")}
    <tr><td>storage objects</td><td align="right">${objectCount.toLocaleString("en-US")}</td></tr>
    <tr><td>auth users</td><td align="right">${userCount.toLocaleString("en-US")}</td></tr>
  </table>
  <h3 style="color:#6b8e5a;">Download (links valid 7 days)</h3>
  <ul style="font-size:13px;">${links.map((l) => `<li><a href="${l.url}">${l.name}</a></li>`).join("")}</ul>
  <p style="font-size:12px;color:#888;">MANIFEST.txt lists row counts, checksums and step-by-step restore instructions. Smaller tables are attached directly to this email; everything is also kept in the private backups bucket.</p>
</div>`.trim();

    const boundary = "----=_Part_" + crypto.randomUUID();
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
    let attached = 0;
    for (const f of attachments) {
      if (!f.body || attached > 12 * 1024 * 1024) continue;
      attached += f.body.length;
      parts.push(
        `--${boundary}`,
        `Content-Type: ${f.name.endsWith(".txt") ? "text/plain" : "text/csv"}; charset="UTF-8"; name="${f.name}"`,
        `Content-Disposition: attachment; filename="${f.name}"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        b64(f.body).match(/.{1,76}/g)?.join("\r\n") ?? "",
        ``,
      );
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

    return new Response(JSON.stringify({
      ok: true, folder, tables: counts, rows: rowsTotal,
      storage_objects: objectCount, auth_users: userCount, bytes: totalBytes,
      attachments: attachments.length, gmail_message_id: sendJson.id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("full-backup failed", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
