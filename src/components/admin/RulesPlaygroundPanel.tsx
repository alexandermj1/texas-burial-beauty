// TEMPORARY TEST GROUND — Document rules playground.
// Fill in a family tree by hand and see exactly which documents the master
// rules would ask for. Nothing here writes to the database. Safe to delete
// (this file + its tab in Admin.tsx) once testing is finished.

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { masterRequirements, masterRoster, type V2State, type V2Kid, type V2DeedPerson } from "@/lib/plotInheritanceRules";
import type { CemeteryDocRules } from "@/lib/ownershipRules";
import { Plus, Trash2, FlaskConical, RotateCcw } from "lucide-react";

const uid = () => Math.random().toString(36).slice(2, 9);

type CemRow = { id: string; name: string; doc_rules: CemeteryDocRules | null };
type SubRow = { id: string; name: string | null; email: string | null; ownership_answers: { v2?: V2State } | null };

const emptyState = (): V2State => ({
  deed: [{ id: uid(), n: "", st: "living" }],
  spouse: {}, poa: {}, will: {}, taker: {}, kids: [], sibs: [], parents: [],
  heirSpouse: {}, contacts: {},
});

const SCENARIOS: { label: string; build: () => V2State }[] = [
  {
    label: "One living owner, married",
    build: () => {
      const a = uid();
      return { deed: [{ id: a, n: "John Smith", st: "living" }], spouse: { [a]: { has: "yes", n: "Mary Smith", alive: "living" } } };
    },
  },
  {
    label: "Married couple both on deed, both living",
    build: () => ({
      deed: [{ id: uid(), n: "John Smith", st: "living" }, { id: uid(), n: "Mary Smith", st: "living" }],
      couple: "yes",
    }),
  },
  {
    label: "Deceased owner, surviving spouse + 2 children",
    build: () => {
      const a = uid();
      return {
        deed: [{ id: a, n: "John Smith", st: "deceased" }],
        spouse: { [a]: { has: "yes", n: "Mary Smith", alive: "living" } },
        kids: [
          { id: uid(), n: "Anna Smith", st: "living", of: [a] },
          { id: uid(), n: "Peter Smith", st: "living", of: [a] },
        ],
      };
    },
  },
  {
    label: "Deceased owner, no descendants, two siblings",
    build: () => {
      const a = uid();
      return {
        deed: [{ id: a, n: "John Smith", st: "deceased" }],
        spouse: { [a]: { has: "no" } },
        kids: [],
        sibs: [
          { id: uid(), n: "Carl Smith", st: "living", of: [a] },
          { id: uid(), n: "Dora Smith", st: "deceased", of: [a], kids: [{ id: uid(), n: "Nina Smith" }] },
        ],
      };
    },
  },
  {
    label: "Deceased owner with a will",
    build: () => {
      const a = uid();
      return {
        deed: [{ id: a, n: "John Smith", st: "deceased" }],
        spouse: { [a]: { has: "no" } },
        will: { [a]: "yes" }, taker: { [a]: "Anna Smith" },
      };
    },
  },
  {
    label: "Two owners, not a couple, one deceased",
    build: () => {
      const a = uid(), b = uid();
      return {
        deed: [{ id: a, n: "Ruth Miller", st: "living" }, { id: b, n: "Grace Miller", st: "deceased" }],
        couple: "no", deedRel: "parent_child",
        spouse: { [b]: { has: "no" } },
        kids: [{ id: uid(), n: "Tom Miller", st: "living", of: [b] }],
      };
    },
  },
];

export default function RulesPlaygroundPanel() {
  const [s, setS] = useState<V2State>(emptyState);
  const [deedMissing, setDeedMissing] = useState(false);
  const [cems, setCems] = useState<CemRow[]>([]);
  const [cemId, setCemId] = useState("");
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loadId, setLoadId] = useState("");

  useEffect(() => {
    supabase.from("texas_cemeteries").select("id, name, doc_rules").is("deleted_at", null).order("name")
      .then(({ data }) => setCems((data ?? []) as CemRow[]));
    supabase.from("contact_submissions")
      .select("id, name, email, ownership_answers")
      .is("deleted_at", null)
      .not("ownership_answers", "is", null)
      .order("created_at", { ascending: false })
      .limit(150)
      .then(({ data }) => setSubs(((data ?? []) as SubRow[]).filter((r) => Array.isArray(r.ownership_answers?.v2?.deed))));
  }, []);

  const rules = useMemo<CemeteryDocRules | null>(() => {
    const c = cems.find((x) => x.id === cemId);
    return (c?.doc_rules && Object.keys(c.doc_rules).length ? c.doc_rules : null) as CemeteryDocRules | null;
  }, [cems, cemId]);

  const reqs = useMemo(() => {
    try { return masterRequirements(s, rules, deedMissing); } catch (e) { return [{ code: "ERR", label: String(e), why: "" }]; }
  }, [s, rules, deedMissing]);
  const roster = useMemo(() => { try { return masterRoster(s); } catch { return []; } }, [s]);

  const patch = (u: Partial<V2State>) => setS((p) => ({ ...p, ...u }));
  const deed = s.deed ?? [];
  const gone = deed.filter((d) => d.st === "deceased");

  const setDeed = (id: string, u: Partial<V2DeedPerson>) =>
    patch({ deed: deed.map((d) => (d.id === id ? { ...d, ...u } : d)) });
  const setSpouse = (id: string, u: Record<string, string>) =>
    patch({ spouse: { ...(s.spouse ?? {}), [id]: { ...(s.spouse ?? {})[id], ...u } } });

  const listOf = (k: "kids" | "sibs" | "parents") => (s[k] ?? []) as V2Kid[];
  const setList = (k: "kids" | "sibs" | "parents", v: V2Kid[]) => patch({ [k]: v } as Partial<V2State>);
  const addPerson = (k: "kids" | "sibs" | "parents") =>
    setList(k, [...listOf(k), { id: uid(), n: "", st: "living", of: gone.map((g) => g.id) }]);

  const box = "rounded-xl border border-border bg-card p-4 space-y-3";
  const lbl = "text-xs font-medium uppercase tracking-wide text-muted-foreground";
  const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";

  const personList = (k: "kids" | "sibs" | "parents", title: string, hint: string) => (
    <div className={box}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
        <Button size="sm" variant="outline" onClick={() => addPerson(k)}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>
      {listOf(k).map((p) => (
        <div key={p.id} className="rounded-lg border border-border/60 p-3 space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <Input className="w-56" placeholder="Full name" value={p.n}
              onChange={(e) => setList(k, listOf(k).map((x) => (x.id === p.id ? { ...x, n: e.target.value } : x)))} />
            <select className={sel} value={p.st ?? "living"}
              onChange={(e) => setList(k, listOf(k).map((x) => (x.id === p.id ? { ...x, st: e.target.value } : x)))}>
              <option value="living">Living</option>
              <option value="deceased">Deceased</option>
            </select>
            {gone.length > 1 && (
              <select className={sel} value={(p.of ?? [])[0] ?? ""}
                onChange={(e) => setList(k, listOf(k).map((x) => (x.id === p.id ? { ...x, of: e.target.value ? [e.target.value] : [] } : x)))}>
                <option value="">Of which deceased owner?</option>
                {gone.map((g) => <option key={g.id} value={g.id}>{g.n || "(unnamed)"}</option>)}
              </select>
            )}
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={(s.heirSpouse ?? {})[p.id]?.has === "yes"}
                onChange={(e) => patch({ heirSpouse: { ...(s.heirSpouse ?? {}), [p.id]: e.target.checked ? { has: "yes", n: "", alive: "living" } : { has: "no" } } })} />
              married
            </label>
            {(s.heirSpouse ?? {})[p.id]?.has === "yes" && (
              <Input className="w-48" placeholder="Spouse name" value={(s.heirSpouse ?? {})[p.id]?.n ?? ""}
                onChange={(e) => patch({ heirSpouse: { ...(s.heirSpouse ?? {}), [p.id]: { ...(s.heirSpouse ?? {})[p.id], n: e.target.value } } })} />
            )}
            <Button size="icon" variant="ghost" onClick={() => setList(k, listOf(k).filter((x) => x.id !== p.id))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {p.st === "deceased" && k !== "parents" && (
            <div className="flex flex-wrap gap-2 items-center pl-4 border-l-2 border-border">
              <span className="text-xs text-muted-foreground">Their children:</span>
              {(p.kids ?? []).map((g) => (
                <Input key={g.id} className="w-44" placeholder="Child name" value={g.n}
                  onChange={(e) => setList(k, listOf(k).map((x) => x.id === p.id ? { ...x, kids: (x.kids ?? []).map((y) => y.id === g.id ? { ...y, n: e.target.value } : y) } : x))} />
              ))}
              <Button size="sm" variant="outline"
                onClick={() => setList(k, listOf(k).map((x) => x.id === p.id ? { ...x, kids: [...(x.kids ?? []), { id: uid(), n: "" }] } : x))}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-3">
        <FlaskConical className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-medium">Test ground — nothing here is saved. Build a family tree and see the document request it produces.</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {SCENARIOS.map((sc) => (
            <Button key={sc.label} size="sm" variant="outline" onClick={() => setS(sc.build())}>{sc.label}</Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setS(emptyState())}><RotateCcw className="h-4 w-4 mr-1" />Clear</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className={box}>
            <div className="flex flex-wrap gap-3 items-center">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={deedMissing} onChange={(e) => setDeedMissing(e.target.checked)} />
                Deed cannot be found
              </label>
              <select className={sel} value={cemId} onChange={(e) => setCemId(e.target.value)}>
                <option value="">No cemetery-specific rules</option>
                {cems.filter((c) => c.doc_rules && Object.keys(c.doc_rules).length).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select className={sel} value={loadId}
                onChange={(e) => {
                  setLoadId(e.target.value);
                  const row = subs.find((x) => x.id === e.target.value);
                  if (row?.ownership_answers?.v2) setS(JSON.parse(JSON.stringify(row.ownership_answers.v2)) as V2State);
                }}>
                <option value="">Load a real family tree…</option>
                {subs.map((r) => <option key={r.id} value={r.id}>{r.name || r.email || r.id.slice(0, 8)}</option>)}
              </select>
            </div>
          </div>

          <div className={box}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Names on the deed</div>
              <Button size="sm" variant="outline" onClick={() => patch({ deed: [...deed, { id: uid(), n: "", st: "living" }] })}>
                <Plus className="h-4 w-4 mr-1" />Add owner
              </Button>
            </div>
            {deed.map((d) => (
              <div key={d.id} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <Input className="w-56" placeholder="Name as on the deed" value={d.n} onChange={(e) => setDeed(d.id, { n: e.target.value })} />
                  <select className={sel} value={d.st ?? "living"} onChange={(e) => setDeed(d.id, { st: e.target.value })}>
                    <option value="living">Living</option>
                    <option value="deceased">Deceased</option>
                  </select>
                  <Button size="icon" variant="ghost" onClick={() => patch({ deed: deed.filter((x) => x.id !== d.id) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 items-center pl-4 border-l-2 border-border">
                  <span className={lbl}>Spouse</span>
                  <select className={sel} value={(s.spouse ?? {})[d.id]?.has ?? ""} onChange={(e) => setSpouse(d.id, { has: e.target.value })}>
                    <option value="">—</option>
                    <option value="yes">Has / had a spouse</option>
                    <option value="no">No spouse</option>
                  </select>
                  {(s.spouse ?? {})[d.id]?.has === "yes" && (
                    <>
                      <Input className="w-48" placeholder="Spouse name" value={(s.spouse ?? {})[d.id]?.n ?? ""} onChange={(e) => setSpouse(d.id, { n: e.target.value })} />
                      <select className={sel} value={(s.spouse ?? {})[d.id]?.alive ?? "living"} onChange={(e) => setSpouse(d.id, { alive: e.target.value })}>
                        <option value="living">Living</option>
                        <option value="deceased">Deceased</option>
                      </select>
                    </>
                  )}
                </div>

                {d.st === "living" && (
                  <div className="flex flex-wrap gap-2 items-center pl-4 border-l-2 border-border">
                    <span className={lbl}>Existing POA</span>
                    <select className={sel} value={(s.poa ?? {})[d.id]?.has ?? ""}
                      onChange={(e) => patch({ poa: { ...(s.poa ?? {}), [d.id]: { ...(s.poa ?? {})[d.id], has: e.target.value } } })}>
                      <option value="">—</option>
                      <option value="yes">Someone holds a POA</option>
                      <option value="no">No</option>
                    </select>
                    {(s.poa ?? {})[d.id]?.has === "yes" && (
                      <Input className="w-48" placeholder="Agent name" value={(s.poa ?? {})[d.id]?.n ?? ""}
                        onChange={(e) => patch({ poa: { ...(s.poa ?? {}), [d.id]: { ...(s.poa ?? {})[d.id], n: e.target.value } } })} />
                    )}
                  </div>
                )}

                {d.st === "deceased" && (
                  <div className="flex flex-wrap gap-2 items-center pl-4 border-l-2 border-border">
                    <span className={lbl}>Will</span>
                    <select className={sel} value={(s.will ?? {})[d.id] ?? ""}
                      onChange={(e) => patch({ will: { ...(s.will ?? {}), [d.id]: e.target.value } })}>
                      <option value="">—</option>
                      <option value="yes">Left a will</option>
                      <option value="no">No will</option>
                    </select>
                    {(s.will ?? {})[d.id] === "yes" && (
                      <Input className="w-48" placeholder="Left to whom?" value={(s.taker ?? {})[d.id] ?? ""}
                        onChange={(e) => patch({ taker: { ...(s.taker ?? {}), [d.id]: e.target.value } })} />
                    )}
                  </div>
                )}
              </div>
            ))}

            {deed.length === 2 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className={lbl}>Were the two owners married to each other?</span>
                <select className={sel} value={s.couple ?? ""} onChange={(e) => patch({ couple: e.target.value })}>
                  <option value="">—</option>
                  <option value="yes">Yes, husband and wife</option>
                  <option value="no">No</option>
                </select>
                {s.couple === "no" && (
                  <select className={sel} value={s.deedRel ?? ""} onChange={(e) => patch({ deedRel: e.target.value })}>
                    <option value="">Relationship…</option>
                    <option value="siblings">Brother and sister</option>
                    <option value="parent_child">Parent and child</option>
                    <option value="other_family">Other family</option>
                    <option value="unrelated">Not related</option>
                  </select>
                )}
              </div>
            )}
          </div>

          {personList("kids", "Children of the deceased owner(s)", "Grandchildren step into a deceased child's share.")}
          {personList("sibs", "Brothers and sisters", "Only used when there are no children or grandchildren.")}
          {personList("parents", "Surviving parents", "Only used when there are no descendants and no siblings.")}
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 self-start">
          <div className={box}>
            <div className="text-sm font-semibold">Signers ({roster.length})</div>
            {roster.length === 0 && <div className="text-sm text-muted-foreground">Nobody yet — name someone on the deed.</div>}
            {roster.map((p) => (
              <div key={p.key} className="text-sm">
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">{p.role}</span>
              </div>
            ))}
          </div>

          <div className={box}>
            <div className="text-sm font-semibold">Documents requested ({reqs.length})</div>
            {reqs.map((r, i) => (
              <div key={i} className={`rounded-lg border p-3 text-sm ${r.review ? "border-red-400 bg-red-50 dark:bg-red-950/20" : "border-border/60"}`}>
                <div className="flex items-start gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">{r.code}</span>
                  <div className="min-w-0">
                    <div className="font-medium">{r.label}</div>
                    <div className="text-xs text-muted-foreground">{r.why}</div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {r.review && <span className="text-red-600 font-semibold">Manual review</span>}
                      {r.issuedByUs && <span>We issue</span>}
                      {r.needsNotary && <span>Notary</span>}
                      {r.fromCemetery && <span>Cemetery form</span>}
                      {r.originalsOnly && <span>Originals only</span>}
                      {r.jointNames && <span>Joint: {r.jointNames.join(" & ")}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <details className={box}>
            <summary className="text-sm font-semibold cursor-pointer">Raw family-tree data</summary>
            <pre className="mt-2 max-h-72 overflow-auto text-[11px]">{JSON.stringify(s, null, 2)}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}
