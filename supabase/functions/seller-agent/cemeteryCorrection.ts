import { cemeteryNameKey, resolveBuyerCemetery, type CemeteryEntry } from "../_shared/cemeteryMatching.ts";
type Entry = CemeteryEntry & { id: string; deleted_at?: string | null; canonical_name?: string | null };
type Fields = Record<string, string>;
const literal = (s: string) => s.toLowerCase().replace(/\b m\.?\s*p\.?\b/g, " memorial park ").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
export function correctionTarget(fields: Fields, rows: Entry[]): { existing: Entry } | { create: { name: string; city: string; address: string | null } } {
  const name = String(fields.cemetery ?? "").trim(), city = String(fields.city ?? "").trim();
  if (name.length < 3 || name.length > 200) throw new Error("Cemetery name is required");
  const variants = rows.filter(r => literal(r.name) === literal(name) || (cemeteryNameKey(name) && cemeteryNameKey(r.name) === cemeteryNameKey(name)));
  const local = city ? variants.filter(r => cemeteryNameKey(r.city) === cemeteryNameKey(city)) : variants;
  if (local.length === 1 && !local[0].deleted_at) return { existing: local[0] };
  if (variants.length) throw new Error("Cemetery identity is ambiguous, conflicts with the city, or matches a retired profile; staff guidance is needed");
  const active = rows.filter(r => !r.deleted_at);
  const fuzzy = resolveBuyerCemetery(name, active, city);
  if (fuzzy) {
    if (city && fuzzy.city && cemeteryNameKey(city) !== cemeteryNameKey(fuzzy.city)) throw new Error("Cemetery city conflicts with the existing profile");
    return { existing: fuzzy };
  }
  const tokens = cemeteryNameKey(name).split(" ").filter(Boolean);
  if (tokens.length === 0 || rows.some(r => tokens.some(t => t.length >= 4 && cemeteryNameKey(r.name).split(" ").includes(t)))) throw new Error("Similar cemetery names need further verification before creating a profile");
  if (fields.create_if_missing !== "true" || city.length < 2 || city.length > 100 || String(fields.evidence ?? "").trim().length < 20) throw new Error("A new cemetery needs explicit creation intent, a verified city and source evidence");
  return { create: { name, city, address: fields.address?.trim() || null } };
}

export async function prepareCemeteryCorrection(db: any, fields: Fields) {
  const rows: Entry[] = [];
  for (let offset=0; ; offset+=500) {
    const {data,error} = await db.from("texas_cemeteries").select("id,name,city,canonical_name,deleted_at").order("id").range(offset,offset+499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length<500) break;
  }
  if (fields.cemetery_id) {
    const target=rows.find(r=>r.id===fields.cemetery_id && !r.deleted_at);
    if (!target || target.name!==fields.cemetery || (fields.city && target.city!==fields.city)) throw new Error("The target cemetery changed since this proposal; review it again");
    return {existing:target};
  }
  return correctionTarget(fields,rows);
}

export async function applyCemeteryCorrection(db: any, sub: any, fields: Fields, actionId: string, by: string, generate: (body: any)=>Promise<unknown>) {
  const plan = await prepareCemeteryCorrection(db, fields);
  let target: Entry;
  if ("existing" in plan) target=plan.existing;
  else {
    const {data,error}=await db.from("texas_cemeteries").insert({...plan.create,auto_created:true,notes:`Verified from seller record ${sub.id}: ${fields.evidence}`}).select("id,name,city").single();
    if (error) {
      if (error.code!=="23505") throw error;
      const retry=await prepareCemeteryCorrection(db,{...fields,create_if_missing:"false"});
      if (!("existing" in retry)) throw new Error("A cemetery profile was created concurrently; staff must verify it");
      target=retry.existing;
    } else target=data;
  }
  if (fields.expected_cemetery!==undefined && String(sub.cemetery??"")!==fields.expected_cemetery && sub.cemetery!==target.name) throw new Error("The seller's cemetery changed since the proposal; review again");
  if (sub.cemetery!==target.name || sub.cemetery_city!==target.city) {
    const history=Array.isArray(sub.cemetery_merge_history)?sub.cemetery_merge_history:[];
    const {error}=await db.from("contact_submissions").update({cemetery:target.name,cemetery_city:target.city, cemetery_original:sub.cemetery_original||sub.cemetery||null, cemetery_merge_history:[...history,{at:new Date().toISOString(),from:sub.cemetery??"",to:target.name,kind:"reassign",action_id:actionId,by}]}).eq("id",sub.id);
    if (error) throw error;
  }
  const {data:contracts,error}=await db.from("contracts").select("id,kind,status,fill_data,signed_at,notarized_at,completed_at").eq("submission_id",sub.id).is("deleted_at",null).neq("status","void");
  if (error) throw error;
  let rebuilt=0;
  for (const c of contracts??[]) {
    if (c.signed_at||c.notarized_at||c.completed_at||["signed","notarized","completed"].includes(c.status)) continue;
    const fd=c.fill_data??{}, county=target.city?`${target.city}, TX`:null;
    if (fd.cemetery===target.name && (!county||(fd.county_state??fd.county)===county)) continue;
    await generate({submission_id:sub.id,kind:c.kind,overrides:{...fd,cemetery:target.name,...(county?{county_state:county,county}:{}),supersede_contract_id:c.id}});
    rebuilt++;
  }
  return {target,rebuilt};
}