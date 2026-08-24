// Read-only view of exactly what the seller selected on their family
// confirmation page (/confirm?s=…). Nothing is inferred here — every line is a
// literal answer from the questionnaire, so the office can see the seller's own
// words before deciding which documents to request.
import { CheckCircle2, Users } from "lucide-react";

type Deed = { id: string; n: string; st: string };
type Kid = { id: string; n: string; st: string; of?: string[]; kids?: { id: string; n: string }[] };
type YesNo = { has?: string; n?: string; alive?: string };

const spouseValue = (sp: { has?: string; n?: string; alive?: string }, of: string) => {
  if (!sp.has) return "Not answered";
  if (sp.has === "no") return `No spouse — ${of} is not married`;
  if (sp.has !== "yes") return "They did not know";
  const who = (sp.n || "").trim() || "name not given";
  const alive =
    sp.alive === "deceased" ? "deceased — nothing to sign"
    : sp.alive === "living" ? "living — must sign a consent"
    : "living status not answered";
  return `Married to ${who} (${alive})`;
};

export type V2State = {
  rel?: string; relOther?: string; selfIs?: string; youName?: string;
  deed?: Deed[]; couple?: string;
  poa?: Record<string, YesNo>; spouse?: Record<string, YesNo>;
  will?: Record<string, string>; taker?: Record<string, string>;
  kids?: Kid[]; noKids?: Record<string, boolean>; heirSpouse?: Record<string, YesNo>;
  spaces?: { label: string; used: string; who: string }[];
  contacts?: Record<string, { email?: string; phone?: string; addr?: string }>;
  note?: string; sent?: boolean;
};

const yn = (v?: string) =>
  v === "yes" ? "Yes" : v === "no" ? "No" : v === "unknown" || v === "unsure" ? "Not sure" : "—";

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-1 border-b border-border/40 last:border-0">
    <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
    <span className="text-[11px] text-foreground text-right">{value}</span>
  </div>
);

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{title}</p>
    <div className="rounded-md border border-border/50 bg-background px-2.5 py-1.5">{children}</div>
  </div>
);

const SellerAnswersSummary = ({
  v2,
  people,
  notes,
  deedNames,
}: {
  v2: V2State;
  people?: { name: string; relationship?: string; deceased?: boolean }[];
  notes?: string;
  /** The owner names we typed in from the deed before sending the link. */
  deedNames?: string;
}) => {
  const deed = (v2.deed ?? []).filter((d) => (d.n || "").trim());
  const nameOf = (id: string) => deed.find((d) => d.id === id)?.n || "";
  const kids = (v2.kids ?? []).filter((k) => (k.n || "").trim() || (k.kids ?? []).some((g) => g.n.trim()));
  const spaces = v2.spaces ?? [];

  // One plain-English line per person, so the office never has to guess who is
  // married to whom or whether that spouse is alive.
  type Marriage = { person: string; text: string; flag: boolean };
  const marriages: Marriage[] = [];
  const pushMarriage = (person: string, sp?: YesNo) => {
    const s = sp ?? {};
    const who = (s.n || "").trim();
    if (!s.has) {
      marriages.push({ person, text: "Marriage question not answered", flag: true });
    } else if (s.has === "no") {
      marriages.push({ person, text: "Not married — no spousal consent needed", flag: false });
    } else if (s.has !== "yes") {
      marriages.push({ person, text: "They did not know — we must check marriage records", flag: true });
    } else if (!who) {
      marriages.push({ person, text: "Married, but the spouse was never named", flag: true });
    } else if (s.alive === "living") {
      marriages.push({ person, text: `Married to ${who} — living, must sign a consent and POA`, flag: false });
    } else if (s.alive === "deceased") {
      marriages.push({ person, text: `Married to ${who} — deceased, nothing to sign`, flag: false });
    } else {
      marriages.push({ person, text: `Married to ${who} — living status not answered`, flag: true });
    }
  };
  if (v2.couple === "yes" && deed.length === 2) {
    marriages.push({
      person: `${deed[0].n} & ${deed[1].n}`,
      text: "Married to each other — both are on the deed, so no extra consent",
      flag: false,
    });
  } else {
    deed.forEach((d) => pushMarriage(`${d.n} (on the deed)`, v2.spouse?.[d.id]));
  }
  (v2.kids ?? []).forEach((k) => {
    if ((k.n || "").trim() && k.st !== "deceased") pushMarriage(`${k.n} (inherits)`, v2.heirSpouse?.[k.id]);
    (k.kids ?? []).forEach((g) => {
      if ((g.n || "").trim()) pushMarriage(`${g.n} (inherits)`, v2.heirSpouse?.[g.id]);
    });
  });


  return (
    <div className="space-y-3">
      {deedNames && deedNames.trim() && (
        <Block title="Names we entered from the deed">
          <p className="text-[11px] text-foreground">{deedNames}</p>
        </Block>
      )}

      <Block title="Who answered">
        <Row
          label="Relationship to the owner"
          value={v2.rel === "Other" ? v2.relOther || "Other" : v2.rel || "—"}
        />
        {v2.selfIs && <Row label="They are" value={nameOf(v2.selfIs) || "on the deed"} />}
        {v2.youName && <Row label="Their name" value={v2.youName} />}
      </Block>

      {deed.length > 0 && (
        <Block title="Named on the deed">
          <div className="space-y-2">
            {v2.couple && deed.length === 2 && (
              <Row label="Married to each other" value={yn(v2.couple)} />
            )}
            {deed.map((d) => {
              const poa = v2.poa?.[d.id] ?? {};
              const sp = v2.spouse?.[d.id] ?? {};
              const will = v2.will?.[d.id];
              return (
                <div key={d.id} className="rounded border border-border/40 px-2 py-1.5">
                  <p className="text-[11px] font-medium">
                    {d.n}{" "}
                    <span className={d.st === "deceased" ? "text-rose-700" : "text-emerald-700"}>
                      · {d.st === "deceased" ? "Has died" : "Living"}
                    </span>
                  </p>
                  {d.st !== "deceased" && (
                    <Row label="Someone holds power of attorney" value={`${yn(poa.has)}${poa.n ? ` — ${poa.n}` : ""}`} />
                  )}
                  <Row
                    label={d.st === "deceased" ? "Spouse (not on the deed)" : "Spouse not on the deed"}
                    value={spouseValue(sp, d.n)}
                  />
                  {d.st === "deceased" && (
                    <>
                      <Row label="Left a will naming the plot" value={yn(will)} />
                      {v2.taker?.[d.id] && <Row label="Left to" value={v2.taker[d.id]} />}
                      <Row
                        label="Children"
                        value={
                          v2.noKids?.[d.id]
                            ? "They had no children"
                            : (v2.kids ?? []).filter((k) => (k.of ?? []).includes(d.id) && (k.n || "").trim())
                                .map((k) => k.n).join(", ") || "—"
                        }
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Block>
      )}

      {marriages.length > 0 && (
        <Block title="Marriages — who is married to whom">
          <div className="space-y-1">
            {marriages.map((m, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-1 border-b border-border/40 last:border-0">
                <span className="text-[11px] text-foreground shrink-0 font-medium">{m.person}</span>
                <span className={`text-[11px] text-right ${m.flag ? "text-amber-700" : "text-muted-foreground"}`}>
                  {m.text}
                </span>
              </div>
            ))}
          </div>
        </Block>
      )}



      {kids.length > 0 && (
        <Block title="Their family">
          <div className="space-y-2">
            {kids.map((k) => {
              const hs = v2.heirSpouse?.[k.id] ?? {};
              const parents = (k.of ?? []).map(nameOf).filter(Boolean).join(" and ");
              return (
                <div key={k.id} className="rounded border border-border/40 px-2 py-1.5">
                  <p className="text-[11px] font-medium">
                    {k.n || "(unnamed child)"}{" "}
                    <span className={k.st === "deceased" ? "text-rose-700" : "text-emerald-700"}>
                      · {k.st === "deceased" ? "Has died" : "Living"}
                    </span>
                    {parents && <span className="text-muted-foreground"> · child of {parents}</span>}
                  </p>
                  {k.st !== "deceased" && (
                    <>
                      <Row label="Married" value={spouseValue(hs, k.n || "this heir")} />
                      {(k.kids ?? []).filter((g) => (g.n || "").trim()).map((g) => (
                        <Row key={g.id} label="Their child" value={g.n} />
                      ))}
                    </>
                  )}
                  {k.st === "deceased" && (
                    <>
                      {hs.has === "yes" && <Row label="Surviving spouse" value={hs.n || "Yes"} />}
                      {v2.noKids?.[`kid:${k.id}`] ? (
                        <Row label="Their children" value="They had no children" />
                      ) : (
                        (k.kids ?? []).filter((g) => g.n.trim()).map((g) => (
                          <Row
                            key={g.id}
                            label="Grandchild — steps into their share"
                            value={`${g.n}${v2.heirSpouse?.[g.id]?.has === "yes" ? ` · ${spouseValue(v2.heirSpouse[g.id], g.n)}` : ""}`}
                          />
                        ))
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Block>
      )}

      {spaces.length > 0 && (
        <Block title="The spaces">
          {spaces.map((s, i) => (
            <Row
              key={i}
              label={s.label}
              value={s.used === "yes" ? `Used — ${s.who || "not named"}` : s.used === "no" ? "Not used" : "—"}
            />
          ))}
        </Block>
      )}

      {v2.contacts && Object.values(v2.contacts).some((c) => c && (c.email || c.phone || c.addr)) && (
        <Block title="Contact details they gave us">
          {Object.entries(v2.contacts).map(([k, c]) =>
            c && (c.email || c.phone || c.addr) ? (
              <Row key={k} label={k} value={[c.email, c.phone, c.addr].filter(Boolean).join(" · ")} />
            ) : null,
          )}
        </Block>
      )}

      {(notes || v2.note) && (
        <Block title="Anything else they told us">
          <p className="text-[11px] whitespace-pre-line">{notes || v2.note}</p>
        </Block>
      )}

      {people && people.length > 0 && (
        <Block title="Who their answers make a signer">
          <div className="space-y-1">
            {people.map((p, i) => (
              <p key={i} className="text-[11px] flex items-start gap-1.5">
                {p.deceased ? (
                  <Users className="w-3 h-3 mt-0.5 text-muted-foreground" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-600" />
                )}
                <span>
                  <strong>{p.name}</strong>
                  {p.relationship && <span className="text-muted-foreground"> — {p.relationship}</span>}
                </span>
              </p>
            ))}
          </div>
        </Block>
      )}
    </div>
  );
};

export default SellerAnswersSummary;
